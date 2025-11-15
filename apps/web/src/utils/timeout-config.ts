/**
 * Adaptive Timeout Configuration for WooCommerce REST API
 *
 * Provides timeout configurations based on endpoint type and operation.
 * Uses exponential backoff for retries.
 * OPTIMIZATION: Supports adaptive timeouts based on metrics.
 */

// OPTIMIZATION: Track endpoint response times for adaptive timeouts
interface EndpointMetrics {
  p50: number; // 50th percentile response time
  p95: number; // 95th percentile response time
  p99: number; // 99th percentile response time
  count: number; // Number of requests
  lastUpdated: number; // Timestamp of last update
}

const endpointMetrics = new Map<string, EndpointMetrics>();

/**
 * Update endpoint metrics for adaptive timeout calculation
 */
export function updateEndpointMetrics(
  endpoint: string,
  responseTime: number
): void {
  const normalizedEndpoint = normalizeEndpointName(endpoint);
  const existing = endpointMetrics.get(normalizedEndpoint);

  if (!existing) {
    endpointMetrics.set(normalizedEndpoint, {
      p50: responseTime,
      p95: responseTime,
      p99: responseTime,
      count: 1,
      lastUpdated: Date.now(),
    });
    return;
  }

  // Simple moving average for p50, p95, p99
  // In production, use proper percentile calculation
  const alpha = 0.1; // Smoothing factor
  existing.p50 = existing.p50 * (1 - alpha) + responseTime * alpha;
  if (responseTime > existing.p95) {
    existing.p95 = existing.p95 * (1 - alpha) + responseTime * alpha;
  }
  if (responseTime > existing.p99) {
    existing.p99 = existing.p99 * (1 - alpha) + responseTime * alpha;
  }
  existing.count++;
  existing.lastUpdated = Date.now();
}

/**
 * Normalize endpoint name for metrics tracking
 */
function normalizeEndpointName(endpoint: string): string {
  const normalized = endpoint.toLowerCase().trim();
  if (normalized === 'shop' || normalized.startsWith('shop')) {
    return 'shop';
  }
  if (normalized === 'products' || normalized.startsWith('products?')) {
    return 'products-list';
  }
  if (normalized.startsWith('products/')) {
    return 'products-single';
  }
  if (normalized.includes('categories')) {
    return 'categories';
  }
  if (normalized.includes('attributes')) {
    return 'attributes';
  }
  if (normalized === 'orders' || normalized.startsWith('orders?')) {
    return 'orders';
  }
  if (normalized.startsWith('orders/')) {
    return 'orders-single';
  }
  return 'default';
}

/**
 * Get adaptive timeout based on metrics
 */
function getAdaptiveTimeout(
  baseTimeout: number,
  endpoint: string
): number {
  const normalizedEndpoint = normalizeEndpointName(endpoint);
  const metrics = endpointMetrics.get(normalizedEndpoint);

  if (!metrics || metrics.count < 10) {
    // Not enough data, use base timeout
    return baseTimeout;
  }

  // OPTIMIZATION: Use p95 as base, add 50% margin for safety
  const adaptiveTimeout = Math.max(
    baseTimeout,
    Math.ceil(metrics.p95 * 1.5)
  );

  // Cap at 2x base timeout to prevent excessive timeouts
  return Math.min(adaptiveTimeout, baseTimeout * 2);
}

/**
 * Timeout configuration based on endpoint type
 */
export interface TimeoutConfig {
  timeout: number; // Initial timeout in milliseconds
  retryDelay: number; // Initial retry delay in milliseconds
  maxRetries: number; // Maximum number of retries
  backoffMultiplier: number; // Exponential backoff multiplier
}

/**
 * Timeout configurations for different endpoint types
 */
export const TIMEOUT_CONFIGS: Record<string, TimeoutConfig> = {
  // Products
  'products-list': {
    timeout: 8000, // 8s for product lists
    retryDelay: 1000, // 1s initial delay
    maxRetries: 3,
    backoffMultiplier: 2, // 1s, 2s, 4s
  },
  'products-single': {
    timeout: 5000, // 5s for single product
    retryDelay: 1000,
    maxRetries: 3,
    backoffMultiplier: 2,
  },

  // Static data (categories, attributes)
  categories: {
    timeout: 10000, // 10s for categories (static data, can wait longer)
    retryDelay: 1000,
    maxRetries: 2, // Fewer retries for static data
    backoffMultiplier: 2,
  },
  attributes: {
    timeout: 10000, // 10s for attributes (static data)
    retryDelay: 1000,
    maxRetries: 2,
    backoffMultiplier: 2,
  },

  // Orders (HPOS queries)
  orders: {
    timeout: 12000, // 12s for orders (HPOS queries can be slower)
    retryDelay: 1000,
    maxRetries: 3,
    backoffMultiplier: 2,
  },
  'orders-single': {
    timeout: 10000, // 10s for single order
    retryDelay: 1000,
    maxRetries: 3,
    backoffMultiplier: 2,
  },

  // Customers
  customers: {
    timeout: 8000, // 8s for customers
    retryDelay: 1000,
    maxRetries: 3,
    backoffMultiplier: 2,
  },
  'customers-single': {
    timeout: 6000, // 6s for single customer
    retryDelay: 1000,
    maxRetries: 3,
    backoffMultiplier: 2,
  },

  // Default
  default: {
    timeout: 8000, // 8s default
    retryDelay: 1000,
    maxRetries: 3,
    backoffMultiplier: 2,
  },
};

/**
 * Get timeout configuration for an endpoint with adaptive timeouts
 */
export function getTimeoutConfig(
  endpoint: string,
  method: string = 'GET'
): TimeoutConfig {
  // Normalize endpoint
  const normalizedEndpoint = endpoint.toLowerCase().trim();

  let baseConfig: TimeoutConfig;

  // Check for specific endpoint types
  if (normalizedEndpoint === 'shop' || normalizedEndpoint.startsWith('shop')) {
    // Shop endpoint uses products-list timeout (similar to products)
    baseConfig = TIMEOUT_CONFIGS['products-list'];
  } else if (
    normalizedEndpoint === 'products' ||
    normalizedEndpoint.startsWith('products?')
  ) {
    baseConfig = TIMEOUT_CONFIGS['products-list'];
  } else if (
    normalizedEndpoint.startsWith('products/') &&
    !normalizedEndpoint.includes('categories') &&
    !normalizedEndpoint.includes('attributes')
  ) {
    baseConfig = TIMEOUT_CONFIGS['products-single'];
  } else if (
    normalizedEndpoint.includes('products/categories') ||
    normalizedEndpoint.startsWith('products/categories')
  ) {
    baseConfig = TIMEOUT_CONFIGS['categories'];
  } else if (
    normalizedEndpoint.includes('products/attributes') ||
    normalizedEndpoint.startsWith('products/attributes') ||
    normalizedEndpoint === 'attributes'
  ) {
    baseConfig = TIMEOUT_CONFIGS['attributes'];
  } else if (
    normalizedEndpoint === 'orders' ||
    (normalizedEndpoint.startsWith('orders?') && method === 'GET')
  ) {
    baseConfig = TIMEOUT_CONFIGS['orders'];
  } else if (normalizedEndpoint.startsWith('orders/') && method === 'GET') {
    baseConfig = TIMEOUT_CONFIGS['orders-single'];
  } else if (
    normalizedEndpoint === 'customers' ||
    (normalizedEndpoint.startsWith('customers?') && method === 'GET')
  ) {
    baseConfig = TIMEOUT_CONFIGS['customers'];
  } else if (normalizedEndpoint.startsWith('customers/') && method === 'GET') {
    baseConfig = TIMEOUT_CONFIGS['customers-single'];
  } else {
    // Default configuration
    baseConfig = TIMEOUT_CONFIGS['default'];
  }

  // OPTIMIZATION: Apply adaptive timeout based on metrics
  const adaptiveTimeout = getAdaptiveTimeout(baseConfig.timeout, endpoint);

  return {
    ...baseConfig,
    timeout: adaptiveTimeout,
  };
}

/**
 * Get endpoint metrics for monitoring
 */
export function getEndpointMetrics(): Record<string, EndpointMetrics> {
  return Object.fromEntries(endpointMetrics.entries());
}

/**
 * Calculate retry delay using exponential backoff
 */
export function getRetryDelay(attempt: number, config: TimeoutConfig): number {
  return config.retryDelay * Math.pow(config.backoffMultiplier, attempt - 1);
}

/**
 * Create AbortSignal with timeout
 */
export function createTimeoutSignal(timeout: number): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Clean up timeout if signal is aborted manually
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
  });

  return controller.signal;
}

/**
 * Create timeout promise that rejects after specified time
 */
export function createTimeoutPromise<T>(
  timeout: number,
  message: string = 'Request timeout'
): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, timeout);
  });
}
