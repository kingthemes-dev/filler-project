/**
 * Redis cache implementation
 */

import Redis from 'ioredis';
import { logger } from '@/utils/logger';

class RedisCache {
  private redis: Redis | null = null;
  private isConnected = false;
  private memoryCache = new Map<string, { value: any; expires: number }>();
  private maxMemoryCacheSize = 1000; // Max 1000 items in memory

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl) {
        logger.info('🚀 Redis not configured - using optimized in-memory cache (perfect for production!)');
        return;
      }

      this.redis = new Redis(redisUrl, {
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

      this.redis.on('error', (error) => {
        this.isConnected = false;
        logger.warn('Redis connection failed - falling back to in-memory cache:', error.message);
        // Don't throw error, just fall back to in-memory cache
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        logger.info('Redis connection closed - using in-memory cache');
      });

    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
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
        logger.warn('Redis GET error, falling back to memory:', error);
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
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
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
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
        logger.warn('Redis SET error, falling back to memory:', error);
        // Fall through to memory cache
      }
    }

    // Fallback to memory cache
    try {
      const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : Date.now() + (24 * 60 * 60 * 1000); // Default 24h
      
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
      logger.error('Memory cache SET error:', error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  /**
   * Set expiration for key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      return false;
    }
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
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      logger.error('Redis MGET error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<boolean> {
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
      logger.error('Redis MSET error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    memory: any;
    info: any;
  }> {
    if (!this.redis || !this.isConnected) {
      return {
        connected: false,
        memory: null,
        info: null
      };
    }

    try {
      const info = await this.redis.info('memory');

      return {
        connected: true,
        memory: null,
        info
      };
    } catch (error) {
      logger.error('Redis stats error:', error);
      return {
        connected: false,
        memory: null,
        info: null
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
      logger.error('Redis FLUSHALL error:', error);
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
  products: (page: number, perPage: number, filters?: any) => 
    `products:${page}:${perPage}:${JSON.stringify(filters || {})}`,
  
  product: (id: string) => `product:${id}`,
  
  categories: () => 'categories:all',
  
  category: (id: string) => `category:${id}`,
  
  homeFeed: () => 'home:feed',
  
  search: (query: string, filters?: any) => 
    `search:${query}:${JSON.stringify(filters || {})}`,
  
  user: (id: string) => `user:${id}`,
  
  cart: (userId: string) => `cart:${userId}`,
};

// Cache TTL constants
export const cacheTTL = {
  products: 300,      // 5 minutes
  product: 600,       // 10 minutes
  categories: 1800,   // 30 minutes
  homeFeed: 300,      // 5 minutes
  search: 180,        // 3 minutes
  user: 900,          // 15 minutes
  cart: 3600,         // 1 hour
};

export default redisCache;
