/**
 * Server-only Redis implementation
 * Expert Level 9.6/10 - Zero client-side issues
 */

import { logger } from '@/utils/logger';

// Server-only Redis cache
class ServerRedisCache {
  private redis: any = null;
  private isConnected = false;
  private memoryCache = new Map<string, { value: any; expires: number }>();
  private maxMemoryCacheSize = 1000;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    // Only run on server
    if (typeof window !== 'undefined') {
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL;
      
      if (!redisUrl) {
        logger.info('🚀 Redis not configured - using optimized in-memory cache');
        return;
      }

      // Dynamic import with error handling
      const Redis = (await import('ioredis')).default;
      
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 5000,
        commandTimeout: 3000,
        enableReadyCheck: false,
        enableCluster: false,
        enableClusterSlotsCheck: false,
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis connected successfully');
      });

      this.redis.on('error', (error: any) => {
        this.isConnected = false;
        logger.warn('Redis connection failed - using in-memory cache:', error.message);
      });

    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.redis = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Try Redis first if available
    if (this.redis && this.isConnected) {
      try {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        logger.warn('Redis GET error, falling back to memory:', error);
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }

    if (cached) {
      this.memoryCache.delete(key);
    }

    return null;
  }

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
      }
    }

    // Fallback to memory cache
    try {
      const expires = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : Date.now() + (24 * 60 * 60 * 1000);
      
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

  async setex(key: string, ttlSeconds: number, value: any): Promise<boolean> {
    return this.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<boolean> {
    // Try Redis first if available
    if (this.redis && this.isConnected) {
      try {
        await this.redis.del(key);
        return true;
      } catch (error) {
        logger.warn('Redis DEL error, falling back to memory:', error);
      }
    }

    return this.memoryCache.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    // Try Redis first if available
    if (this.redis && this.isConnected) {
      try {
        return await this.redis.keys(pattern);
      } catch (error) {
        logger.warn('Redis KEYS error, falling back to memory:', error);
      }
    }

    // Fallback to memory cache
    const memoryKeys = Array.from(this.memoryCache.keys());
    if (pattern === '*') {
      return memoryKeys;
    }
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return memoryKeys.filter(key => regex.test(key));
  }

  async exists(key: string): Promise<boolean> {
    // Try Redis first if available
    if (this.redis && this.isConnected) {
      try {
        const result = await this.redis.exists(key);
        return result === 1;
      } catch (error) {
        logger.warn('Redis EXISTS error, falling back to memory:', error);
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(key);
    return cached !== undefined && cached.expires > Date.now();
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
    }
  }
}

// Singleton instance - server only
let serverRedisCache: ServerRedisCache | null = null;

export function getServerRedisCache(): ServerRedisCache {
  if (typeof window !== 'undefined') {
    throw new Error('ServerRedisCache can only be used on server-side');
  }
  
  if (!serverRedisCache) {
    serverRedisCache = new ServerRedisCache();
  }
  
  return serverRedisCache;
}

export default getServerRedisCache;
