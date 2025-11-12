/**
 * Request Batcher for WooCommerce REST API
 * 
 * Batches multiple compatible requests into a single API call to reduce
 * the number of HTTP requests and improve performance.
 */

import { logger } from './logger';
import { httpAgent } from './http-agent';

/**
 * Batch configuration
 */
interface BatchConfig {
  windowMs?: number; // Time window to collect requests (default: 50ms)
  maxBatchSize?: number; // Maximum number of requests in a batch (default: 10)
  maxWaitMs?: number; // Maximum time to wait before sending batch (default: 100ms)
}

/**
 * Batched request entry
 */
interface BatchedRequest<T = unknown> {
  id: string;
  endpoint: string;
  params: Record<string, string>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Batch-compatible endpoint configuration
 */
interface BatchEndpointConfig {
  endpoint: string;
  batchParam: string; // Parameter name for batching (e.g., 'include', 'id')
  singleParam?: string; // Parameter name for single requests (e.g., 'id')
  maxBatchSize?: number; // Override max batch size for this endpoint
}

/**
 * Supported batch endpoints
 */
const BATCH_ENDPOINTS: BatchEndpointConfig[] = [
  {
    endpoint: 'products',
    batchParam: 'include',
    singleParam: 'id',
    maxBatchSize: 10,
  },
  {
    endpoint: 'products/categories',
    batchParam: 'include',
    singleParam: 'id',
    maxBatchSize: 20,
  },
  {
    endpoint: 'products/attributes',
    batchParam: 'include',
    singleParam: 'id',
    maxBatchSize: 20,
  },
];

/**
 * Request Batcher class
 */
class RequestBatcher {
  private static instance: RequestBatcher | null = null;
  private config: Required<BatchConfig>;
  private batches: Map<string, BatchedRequest<unknown>[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private baseUrl: string;

  private constructor(config: BatchConfig = {}) {
    this.config = {
      windowMs: config.windowMs || 50,
      maxBatchSize: config.maxBatchSize || 10,
      maxWaitMs: config.maxWaitMs || 100,
    };
    // Base URL will be set from environment or request context
    this.baseUrl = '';
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: BatchConfig): RequestBatcher {
    if (!RequestBatcher.instance) {
      RequestBatcher.instance = new RequestBatcher(config);
    }
    return RequestBatcher.instance;
  }

  /**
   * Set base URL for requests
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if endpoint supports batching
   */
  private isBatchable(endpoint: string): BatchEndpointConfig | null {
    return BATCH_ENDPOINTS.find((config) => endpoint.startsWith(config.endpoint)) || null;
  }

  /**
   * Generate batch key from endpoint and common params
   */
  private getBatchKey(endpoint: string, params: Record<string, string>): string {
    // Extract common params that should be the same for batching
    const commonParams = ['per_page', 'orderby', 'order', '_fields'];
    const common = commonParams
      .map((key) => (params[key] ? `${key}=${params[key]}` : null))
      .filter(Boolean)
      .sort()
      .join('&');
    
    return `${endpoint}?${common}`;
  }

  /**
   * Add request to batch
   */
  async batchRequest<T>(
    endpoint: string,
    params: Record<string, string>,
    baseUrl: string,
    authHeaders?: Record<string, string>
  ): Promise<T> {
    const batchConfig = this.isBatchable(endpoint);
    if (!batchConfig) {
      // Endpoint doesn't support batching, make individual request
      return this.makeIndividualRequest<T>(endpoint, params, baseUrl, authHeaders);
    }

    // Check if request has batch parameter
    const batchParamValue = params[batchConfig.batchParam];
    if (!batchParamValue) {
      // No batch parameter, make individual request
      return this.makeIndividualRequest<T>(endpoint, params, baseUrl, authHeaders);
    }

    // Set base URL if not set
    if (!this.baseUrl) {
      this.baseUrl = baseUrl;
    }

    // Generate batch key
    const batchKey = this.getBatchKey(endpoint, params);
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create promise for this request
    return new Promise<T>((resolve, reject) => {
      // Get or create batch for this key
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, []);
      }

      const batch = this.batches.get(batchKey)!;
      const batchedRequest: BatchedRequest<T> = {
        id: requestId,
        endpoint,
        params: { ...params },
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Type assertion needed because batch stores BatchedRequest<unknown>[] but we have BatchedRequest<T>
      // This is safe because each request resolves with its own expected type via the resolve callback
      batch.push(batchedRequest as BatchedRequest<unknown>);

      // Check if batch is full
      const maxSize = batchConfig.maxBatchSize || this.config.maxBatchSize;
      if (batch.length >= maxSize) {
        // Send batch immediately
        this.flushBatch(batchKey, baseUrl, authHeaders);
        return;
      }

      // Schedule batch flush
      this.scheduleBatchFlush(batchKey, baseUrl, authHeaders);
    });
  }

  /**
   * Schedule batch flush
   */
  private scheduleBatchFlush(
    batchKey: string,
    baseUrl: string,
    authHeaders?: Record<string, string>
  ): void {
    // Clear existing timer
    if (this.timers.has(batchKey)) {
      clearTimeout(this.timers.get(batchKey)!);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.flushBatch(batchKey, baseUrl, authHeaders);
    }, this.config.windowMs);

    this.timers.set(batchKey, timer);
  }

  /**
   * Flush batch (send all batched requests)
   */
  private async flushBatch(
    batchKey: string,
    baseUrl: string,
    authHeaders?: Record<string, string>
  ): Promise<void> {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear timer
    if (this.timers.has(batchKey)) {
      clearTimeout(this.timers.get(batchKey)!);
      this.timers.delete(batchKey);
    }

    // Remove batch from map
    this.batches.delete(batchKey);

    // Get batch config from first request
    const firstRequest = batch[0];
    const batchConfig = this.isBatchable(firstRequest.endpoint);
    if (!batchConfig) {
      // Should not happen, but handle gracefully
      logger.warn('RequestBatcher: Batch config not found', { batchKey });
      batch.forEach((req) => req.reject(new Error('Batch config not found')));
      return;
    }

    try {
      // Collect all batch parameter values
      const batchParamValues: string[] = [];
      const commonParams: Record<string, string> = { ...firstRequest.params };
      
      batch.forEach((req) => {
        const value = req.params[batchConfig.batchParam];
        if (value) {
          // Support comma-separated values
          const values = value.split(',').map((v) => v.trim());
          batchParamValues.push(...values);
        }
      });

      // Remove batch parameter from common params
      delete commonParams[batchConfig.batchParam];

      // Build batch URL
      const url = new URL(`${baseUrl}/${firstRequest.endpoint}`);
      url.searchParams.set(batchConfig.batchParam, batchParamValues.join(','));
      
      // Add common params
      Object.entries(commonParams).forEach(([key, value]) => {
        if (value) {
          url.searchParams.set(key, value);
        }
      });

      // Make batch request
      const response = await httpAgent.fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Filler-Store/1.0',
          ...authHeaders,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Batch request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const results = Array.isArray(data) ? data : [];

      // Map results back to requests
      const resultsMap = new Map<string, unknown>();
      results.forEach((item: unknown) => {
        if (item && typeof item === 'object' && 'id' in item) {
          const id = String(item.id);
          resultsMap.set(id, item);
        }
      });

      // Resolve or reject each request
      batch.forEach((req) => {
        const batchParamValue = req.params[batchConfig.batchParam];
        if (!batchParamValue) {
          req.reject(new Error('Batch parameter missing'));
          return;
        }

        // Try to find matching result
        const values = batchParamValue.split(',').map((v) => v.trim());
        const matchingResult = values.find((v) => resultsMap.has(v));
        
        if (matchingResult && resultsMap.has(matchingResult)) {
          // Type assertion needed because batch contains requests with different generic types
          // Each request resolves with its own expected type
          req.resolve(resultsMap.get(matchingResult) as unknown);
        } else {
          // Result not found, reject request
          req.reject(new Error(`Result not found for batch parameter: ${batchParamValue}`));
        }
      });

      logger.info('RequestBatcher: Batch request completed', {
        batchKey,
        batchSize: batch.length,
        resultsCount: results.length,
      });
    } catch (error) {
      // Reject all requests in batch
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('RequestBatcher: Batch request failed', {
        batchKey,
        batchSize: batch.length,
        error: errorMessage,
      });

      batch.forEach((req) => {
        req.reject(error instanceof Error ? error : new Error(errorMessage));
      });
    }
  }

  /**
   * Make individual request (fallback for non-batchable endpoints)
   */
  private async makeIndividualRequest<T>(
    endpoint: string,
    params: Record<string, string>,
    baseUrl: string,
    authHeaders?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${baseUrl}/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    const response = await httpAgent.fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Filler-Store/1.0',
        ...authHeaders,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Flush all pending batches
   */
  async flushAll(baseUrl: string, authHeaders?: Record<string, string>): Promise<void> {
    const batchKeys = Array.from(this.batches.keys());
    await Promise.all(
      batchKeys.map((key) => this.flushBatch(key, baseUrl, authHeaders))
    );
  }

  /**
   * Get batch statistics
   */
  getStats(): {
    pendingBatches: number;
    pendingRequests: number;
  } {
    let pendingRequests = 0;
    this.batches.forEach((batch) => {
      pendingRequests += batch.length;
    });

    return {
      pendingBatches: this.batches.size,
      pendingRequests,
    };
  }
}

// Export singleton instance
export const requestBatcher = RequestBatcher.getInstance({
  windowMs: 50,
  maxBatchSize: 10,
  maxWaitMs: 100,
});

// Export class for testing
export { RequestBatcher };
export type { BatchConfig, BatchedRequest, BatchEndpointConfig };

