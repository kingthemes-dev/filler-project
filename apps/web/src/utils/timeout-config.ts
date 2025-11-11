/**
 * Adaptive Timeout Configuration for WooCommerce REST API
 * 
 * Provides timeout configurations based on endpoint type and operation.
 * Uses exponential backoff for retries.
 */

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
  'categories': {
    timeout: 10000, // 10s for categories (static data, can wait longer)
    retryDelay: 1000,
    maxRetries: 2, // Fewer retries for static data
    backoffMultiplier: 2,
  },
  'attributes': {
    timeout: 10000, // 10s for attributes (static data)
    retryDelay: 1000,
    maxRetries: 2,
    backoffMultiplier: 2,
  },
  
  // Orders (HPOS queries)
  'orders': {
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
  'customers': {
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
  'default': {
    timeout: 8000, // 8s default
    retryDelay: 1000,
    maxRetries: 3,
    backoffMultiplier: 2,
  },
};

/**
 * Get timeout configuration for an endpoint
 */
export function getTimeoutConfig(endpoint: string, method: string = 'GET'): TimeoutConfig {
  // Normalize endpoint
  const normalizedEndpoint = endpoint.toLowerCase().trim();
  
  // Check for specific endpoint types
  if (normalizedEndpoint === 'shop' || normalizedEndpoint.startsWith('shop')) {
    // Shop endpoint uses products-list timeout (similar to products)
    return TIMEOUT_CONFIGS['products-list'];
  }
  
  if (normalizedEndpoint === 'products' || normalizedEndpoint.startsWith('products?')) {
    return TIMEOUT_CONFIGS['products-list'];
  }
  
  if (normalizedEndpoint.startsWith('products/') && !normalizedEndpoint.includes('categories') && !normalizedEndpoint.includes('attributes')) {
    return TIMEOUT_CONFIGS['products-single'];
  }
  
  if (normalizedEndpoint.includes('products/categories') || normalizedEndpoint.startsWith('products/categories')) {
    return TIMEOUT_CONFIGS['categories'];
  }
  
  if (normalizedEndpoint.includes('products/attributes') || normalizedEndpoint.startsWith('products/attributes') || normalizedEndpoint === 'attributes') {
    return TIMEOUT_CONFIGS['attributes'];
  }
  
  if (normalizedEndpoint === 'orders' || (normalizedEndpoint.startsWith('orders?') && method === 'GET')) {
    return TIMEOUT_CONFIGS['orders'];
  }
  
  if (normalizedEndpoint.startsWith('orders/') && method === 'GET') {
    return TIMEOUT_CONFIGS['orders-single'];
  }
  
  if (normalizedEndpoint === 'customers' || (normalizedEndpoint.startsWith('customers?') && method === 'GET')) {
    return TIMEOUT_CONFIGS['customers'];
  }
  
  if (normalizedEndpoint.startsWith('customers/') && method === 'GET') {
    return TIMEOUT_CONFIGS['customers-single'];
  }
  
  // Default configuration
  return TIMEOUT_CONFIGS['default'];
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
export function createTimeoutPromise<T>(timeout: number, message: string = 'Request timeout'): Promise<T> {
  return new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, timeout);
  });
}

