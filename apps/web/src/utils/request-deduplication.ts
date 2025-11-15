/**
 * Request deduplication utility to prevent duplicate API calls
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private readonly CACHE_DURATION = 1000; // 1 second
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Deduplicate requests by key
   */
  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      cacheDuration?: number;
      maxRetries?: number;
      retryDelay?: number;
    } = {}
  ): Promise<T> {
    const {
      cacheDuration = this.CACHE_DURATION,
      maxRetries = 3,
      retryDelay = 1000,
    } = options;

    // Clean expired requests
    this.cleanExpiredRequests();

    // Check if request is already pending
    const existing = this.pendingRequests.get(key) as
      | PendingRequest<T>
      | undefined;
    if (existing && Date.now() - existing.timestamp < cacheDuration) {
      return existing.promise;
    }

    // Create new request
    const promise = this.executeWithRetry(requestFn, maxRetries, retryDelay);

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    // Clean up after completion
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });

    return promise;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number,
    retryDelay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Clean expired requests
   */
  private cleanExpiredRequests(): void {
    const now = Date.now();

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > this.CACHE_DURATION) {
        this.pendingRequests.delete(key);
      }
    }

    // Limit cache size
    if (this.pendingRequests.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.pendingRequests.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toDelete = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => this.pendingRequests.delete(key));
    }
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    pendingRequests: number;
    cacheSize: number;
    oldestRequest: number | null;
  } {
    const timestamps = Array.from(this.pendingRequests.values()).map(
      r => r.timestamp
    );

    return {
      pendingRequests: this.pendingRequests.size,
      cacheSize: this.MAX_CACHE_SIZE,
      oldestRequest: timestamps.length > 0 ? Math.min(...timestamps) : null,
    };
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

// Utility function for common use cases
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  options?: {
    cacheDuration?: number;
    maxRetries?: number;
    retryDelay?: number;
  }
): Promise<T> {
  return requestDeduplicator.deduplicate(key, requestFn, options);
}

// Generate cache key from URL and params
export function generateCacheKey(
  url: string,
  params?: Record<string, string | number | boolean>
): string {
  const sortedParams = params
    ? Object.keys(params)
        .sort()
        .map(key => `${key}=${encodeURIComponent(String(params[key]))}`)
        .join('&')
    : '';

  return `${url}${sortedParams ? `?${sortedParams}` : ''}`;
}

export default requestDeduplicator;
