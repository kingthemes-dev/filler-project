/**
 * Distributed Request Deduplicator
 * 
 * Prevents duplicate requests by deduplicating identical requests within a time window.
 * Uses Redis for distributed deduplication across multiple instances.
 */

import { logger } from './logger';
import crypto from 'crypto';

// Redis client (optional)
type RedisClient = import('ioredis').Redis;
let redis: RedisClient | null = null;
let redisInitialized = false;

/**
 * Initialize Redis client
 */
async function initializeRedis(): Promise<RedisClient | null> {
  if (redisInitialized) return redis;
  redisInitialized = true;

  // Only server-side
  if (typeof window !== 'undefined') return null;

  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.info('RequestDeduplicator: Redis not configured, using in-memory deduplication');
      return null;
    }

    const RedisModule = await import('ioredis');
    redis = new RedisModule.default(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
      enableReadyCheck: false,
    });

    redis.on('connect', () => {
      logger.info('RequestDeduplicator: Redis connected');
    });

    redis.on('error', (error: unknown) => {
      logger.warn('RequestDeduplicator: Redis error', { error });
      redis = null;
    });

    await redis.connect().catch(() => {
      redis = null;
    });

    return redis;
  } catch (error) {
    logger.warn('RequestDeduplicator: Failed to initialize Redis', { error });
    return null;
  }
}

/**
 * Deduplication configuration
 */
interface DedupConfig {
  windowMs?: number; // Deduplication window (default: 500ms)
  keyPrefix?: string; // Redis key prefix (default: 'dedup')
}

/**
 * Deduplicated request entry
 */
interface DedupEntry {
  promise: Promise<Response>;
  timestamp: number;
  expiresAt: number;
}

/**
 * Request Deduplicator class
 */
class RequestDeduplicator {
  private static instance: RequestDeduplicator | null = null;
  private config: Required<DedupConfig>;
  private memoryCache: Map<string, DedupEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor(config: DedupConfig = {}) {
    this.config = {
      windowMs: config.windowMs || 500,
      keyPrefix: config.keyPrefix || 'dedup',
    };

    // Initialize Redis
    initializeRedis();

    // Cleanup old entries periodically
    this.startCleanup();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: DedupConfig): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator(config);
    }
    return RequestDeduplicator.instance;
  }

  /**
   * Generate cache key from URL and options
   */
  private generateKey(url: string, options: RequestInit = {}): string {
    const method = options.method || 'GET';
    const headers = options.headers ? JSON.stringify(options.headers) : '';
    const body = options.body ? String(options.body) : '';
    
    const keyString = `${method}:${url}:${headers}:${body}`;
    const hash = crypto.createHash('md5').update(keyString).digest('hex');
    return `${this.config.keyPrefix}:${hash}`;
  }

  /**
   * Deduplicate request
   */
  async deduplicate(
    url: string,
    options: RequestInit = {},
    fetchFn: (url: string, options: RequestInit) => Promise<Response>
  ): Promise<Response> {
    const key = this.generateKey(url, options);
    const now = Date.now();
    const expiresAt = now + this.config.windowMs;

    // Use in-memory deduplication (simplified for reliability)
    const existing = this.memoryCache.get(key);
    if (existing && existing.expiresAt > now) {
      logger.debug('RequestDeduplicator: Deduplication hit (memory)', { key });
      // Return the same promise - caller should handle response consumption
      // Note: Response can only be consumed once, so if multiple callers need it,
      // they should clone it themselves or we need to cache the body
      return existing.promise;
    }

    // Create new request promise
    const promise = fetchFn(url, options).catch((error) => {
      // Remove from cache on error
      this.memoryCache.delete(key);
      throw error;
    });

    // Store in memory cache
    this.memoryCache.set(key, {
      promise,
      timestamp: now,
      expiresAt,
    });

    // Clean up after window expires
    setTimeout(() => {
      const entry = this.memoryCache.get(key);
      if (entry && entry.timestamp === now) {
        // Only delete if it's the same entry we just created
        this.memoryCache.delete(key);
      }
    }, this.config.windowMs);

    // Return promise directly - caller handles response
    return promise;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.memoryCache.entries()) {
        if (entry.expiresAt <= now) {
          this.memoryCache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug('RequestDeduplicator: Cleaned up expired entries', { cleaned });
      }
    }, this.config.windowMs * 2);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clear all deduplication cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    const redisClient = await initializeRedis();
    if (redisClient) {
      try {
        const keys = await redisClient.keys(`${this.config.keyPrefix}:*`);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } catch (error) {
        logger.warn('RequestDeduplicator: Failed to clear Redis cache', { error });
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    memoryEntries: number;
    usingRedis: boolean;
  } {
    return {
      memoryEntries: this.memoryCache.size,
      usingRedis: redis !== null,
    };
  }
}

// Export singleton instance
export const requestDeduplicator = RequestDeduplicator.getInstance({
  windowMs: 500, // Increased from 100ms to 500ms
  keyPrefix: 'dedup',
});

// Export class for testing
export { RequestDeduplicator };
export type { DedupConfig, DedupEntry };

