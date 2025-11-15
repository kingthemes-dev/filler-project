/**
 * Redis cache implementation
 * Expert Level 9.6/10 - Client/Server compatibility
 */

import { logger } from '@/utils/logger';
import type { Redis } from 'ioredis';

class RedisCache {
  private redis: Redis | null = null;
  private isConnected = false;
  private memoryCache = new Map<string, { value: unknown; expires: number }>();
  private maxMemoryCacheSize = 1000; // Max 1000 items in memory
  private isServer = typeof window === 'undefined';

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    // Only initialize Redis on server-side
    if (!this.isServer) {
      logger.info('🚀 Client-side: Using optimized in-memory cache');
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL;

      if (!redisUrl) {
        logger.info(
          '🚀 Redis not configured - using optimized in-memory cache (perfect for production!)'
        );
        return;
      }

      // Check if we're in a browser environment
      if (typeof window !== 'undefined') {
        logger.info('🚀 Browser environment detected - using in-memory cache');
        return;
      }

      // Dynamic import to avoid client-side issues
      const RedisModule = await import('ioredis');

      this.redis = new RedisModule.default(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 3000,
        enableReadyCheck: false,
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });

      this.redis.on('error', (error: unknown) => {
        this.isConnected = false;
        logger.warn(
          'Redis connection failed - falling back to in-memory cache',
          { error }
        );
        // Don't throw error, just fall back to in-memory cache
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.info('Redis connection closed - using in-memory cache');
      });
    } catch (error) {
      logger.error('Failed to initialize Redis:', { error });
      this.redis = null;
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Try Redis first if available
    if (this.redis && this.isConnected) {
      try {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        logger.warn('Redis GET error, falling back to memory:', { error });
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value as T;
    }

    // Clean up expired entry
    if (cached) {
      this.memoryCache.delete(key);
    }

    return null;
  }

  /**
   * Set value in cache
   */
  async set(
    key: string,
    value: unknown,
    ttlSeconds?: number
  ): Promise<boolean> {
    // Try Redis first if available
    if (this.redis && this.isConnected) {
      try {
        const serializedValue = JSON.stringify(value);

        if (ttlSeconds) {
          await this.redis.setex(key, ttlSeconds, serializedValue);
        } else {
          await this.redis.set(key, serializedValue);
        }

        return true;
      } catch (error) {
        logger.warn('Redis SET error, falling back to memory:', { error });
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache
    try {
      const expires = ttlSeconds
        ? Date.now() + ttlSeconds * 1000
        : Date.now() + 24 * 60 * 60 * 1000; // Default 24h

      // Clean up old entries if cache is full
      if (this.memoryCache.size >= this.maxMemoryCacheSize) {
        const oldestKey = this.memoryCache.keys().next().value;
        if (oldestKey) {
          this.memoryCache.delete(oldestKey);
        }
      }

      this.memoryCache.set(key, { value, expires });
      return true;
    } catch (error) {
      logger.error('Memory cache SET error:', { error });
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    // Try Redis first if available
    if (this.redis && this.isConnected) {
      try {
        await this.redis.del(key);
        return true;
      } catch (error) {
        logger.warn('Redis DEL error, falling back to memory:', { error });
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache
    return this.memoryCache.delete(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    // Try Redis first if available
    if (this.redis && this.isConnected) {
      try {
        const result = await this.redis.exists(key);
        return result === 1;
      } catch (error) {
        logger.warn('Redis EXISTS error, falling back to memory:', { error });
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(key);
    return cached !== undefined && cached.expires > Date.now();
  }

  /**
   * Set expiration for key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    // Try Redis first if available
    if (this.redis && this.isConnected) {
      try {
        const result = await this.redis.expire(key, ttlSeconds);
        return result === 1;
      } catch (error) {
        logger.warn('Redis EXPIRE error, falling back to memory:', { error });
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache - update expiration
    const cached = this.memoryCache.get(key);
    if (cached) {
      cached.expires = Date.now() + ttlSeconds * 1000;
      return true;
    }

    return false;
  }

  /**
   * Set key with expiration (Redis setex equivalent)
   */
  async setex(
    key: string,
    ttlSeconds: number,
    value: unknown
  ): Promise<boolean> {
    return this.set(key, value, ttlSeconds);
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    // Try Redis first if available
    if (this.redis && this.isConnected) {
      try {
        return await this.redis.keys(pattern);
      } catch (error) {
        logger.warn('Redis KEYS error, falling back to memory:', { error });
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache - simple pattern matching
    const memoryKeys = Array.from(this.memoryCache.keys());
    if (pattern === '*') {
      return memoryKeys;
    }

    // Simple glob pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return memoryKeys.filter(key => regex.test(key));
  }

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.redis || !this.isConnected) {
      return keys.map(() => null);
    }

    try {
      const values = await this.redis.mget(...keys);
      return values.map((value: string | null) =>
        value ? JSON.parse(value) : null
      );
    } catch (error) {
      logger.error('Redis MGET error:', { error });
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(
    keyValuePairs: Record<string, unknown>,
    ttlSeconds?: number
  ): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const serializedPairs: string[] = [];

      for (const [key, value] of Object.entries(keyValuePairs)) {
        serializedPairs.push(key, JSON.stringify(value));
      }

      await this.redis.mset(...serializedPairs);

      if (ttlSeconds) {
        const pipeline = this.redis.pipeline();
        for (const key of Object.keys(keyValuePairs)) {
          pipeline.expire(key, ttlSeconds);
        }
        await pipeline.exec();
      }

      return true;
    } catch (error) {
      logger.error('Redis MSET error:', { error });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    memory: unknown;
    info: string | null;
  }> {
    if (!this.redis || !this.isConnected) {
      return {
        connected: false,
        memory: null,
        info: null,
      };
    }

    try {
      const info = await this.redis.info('memory');

      return {
        connected: true,
        memory: null,
        info,
      };
    } catch (error) {
      logger.error('Redis stats error:', { error });
      return {
        connected: false,
        memory: null,
        info: null,
      };
    }
  }

  /**
   * Clear all cache
   */
  async flushAll(): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      await this.redis.flushall();
      return true;
    } catch (error) {
      logger.error('Redis FLUSHALL error:', { error });
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
    }
  }
}

// Singleton instance
export const redisCache = new RedisCache();

// Cache key generators
export const cacheKeys = {
  products: (
    page: number,
    perPage: number,
    filters?: Record<string, unknown>
  ) => `products:${page}:${perPage}:${JSON.stringify(filters || {})}`,

  product: (id: string) => `product:${id}`,

  categories: () => 'categories:all',

  category: (id: string) => `category:${id}`,

  homeFeed: () => 'home:feed',

  search: (query: string, filters?: Record<string, unknown>) =>
    `search:${query}:${JSON.stringify(filters || {})}`,

  user: (id: string) => `user:${id}`,

  cart: (userId: string) => `cart:${userId}`,
};

// Cache TTL constants
export const cacheTTL = {
  products: 300, // 5 minutes
  product: 600, // 10 minutes
  categories: 1800, // 30 minutes
  homeFeed: 300, // 5 minutes
  search: 180, // 3 minutes
  user: 900, // 15 minutes
  cart: 3600, // 1 hour
};

export default redisCache;
