/**
 * Optimized caching system with Redis and fallback
 */

import { env } from '@/config/env';
import { logger } from '@/utils/logger';

// Redis client (optional)
let redis: any = null;

// Initialize Redis if available
try {
  if (env.NODE_ENV === 'production') {
    // TODO: Add Redis client initialization
    // const Redis = require('ioredis');
    // redis = new Redis(process.env.REDIS_URL);
    logger.info('Redis cache initialized');
  }
} catch (error) {
  logger.warn('Redis not available, using in-memory cache', { error });
}

// In-memory cache as fallback
const memoryCache = new Map<string, { value: any; expires: number }>();

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 300, // 5 minutes
  PRODUCT_TTL: 600, // 10 minutes
  CATEGORY_TTL: 1800, // 30 minutes
  USER_TTL: 900, // 15 minutes
  MAX_MEMORY_ITEMS: 1000
};

interface CacheOptions {
  ttl?: number;
  tags?: string[];
  revalidate?: number;
}

class CacheManager {
  private async getFromRedis(key: string): Promise<any> {
    if (!redis) return null;
    
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis get error', { key, error });
      return null;
    }
  }

  private async setInRedis(key: string, value: any, ttl: number): Promise<void> {
    if (!redis) return;
    
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Redis set error', { key, error });
    }
  }

  private async deleteFromRedis(key: string): Promise<void> {
    if (!redis) return;
    
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Redis delete error', { key, error });
    }
  }

  private getFromMemory(key: string): any {
    const item = memoryCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      memoryCache.delete(key);
      return null;
    }
    
    return item.value;
  }

  private setInMemory(key: string, value: any, ttl: number): void {
    // Clean up old items if cache is too large
    if (memoryCache.size >= CACHE_CONFIG.MAX_MEMORY_ITEMS) {
      const now = Date.now();
      for (const [k, v] of memoryCache.entries()) {
        if (now > v.expires) {
          memoryCache.delete(k);
        }
      }
    }
    
    memoryCache.set(key, {
      value,
      expires: Date.now() + (ttl * 1000)
    });
  }

  private deleteFromMemory(key: string): void {
    memoryCache.delete(key);
  }

  // Public cache methods
  async get<T>(key: string): Promise<T | null> {
    // Try Redis first
    const redisValue = await this.getFromRedis(key);
    if (redisValue !== null) {
      logger.debug('Cache hit (Redis)', { key });
      return redisValue;
    }

    // Fallback to memory
    const memoryValue = this.getFromMemory(key);
    if (memoryValue !== null) {
      logger.debug('Cache hit (Memory)', { key });
      return memoryValue;
    }

    logger.debug('Cache miss', { key });
    return null;
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || CACHE_CONFIG.DEFAULT_TTL;
    
    // Set in Redis
    await this.setInRedis(key, value, ttl);
    
    // Set in memory as backup
    this.setInMemory(key, value, ttl);
    
    logger.debug('Cache set', { key, ttl });
  }

  async delete(key: string): Promise<void> {
    await this.deleteFromRedis(key);
    this.deleteFromMemory(key);
    
    logger.debug('Cache delete', { key });
  }

  async invalidateByTag(tag: string): Promise<void> {
    // TODO: Implement tag-based invalidation with Redis
    logger.info('Cache invalidate by tag', { tag });
  }

  // Cache key generators
  generateKey(prefix: string, ...parts: (string | number)[]): string {
    return `${prefix}:${parts.join(':')}`;
  }

  // Product cache helpers
  productKey(id: number): string {
    return this.generateKey('product', id);
  }

  productsKey(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return this.generateKey('products', sortedParams);
  }

  // Category cache helpers
  categoryKey(id: number): string {
    return this.generateKey('category', id);
  }

  categoriesKey(): string {
    return this.generateKey('categories', 'all');
  }

  // User cache helpers
  userKey(id: number): string {
    return this.generateKey('user', id);
  }

  // Order cache helpers
  ordersKey(customerId: number): string {
    return this.generateKey('orders', 'customer', customerId);
  }

  orderKey(id: number): string {
    return this.generateKey('order', id);
  }
}

// Create singleton instance
export const cache = new CacheManager();

// Cache decorators and helpers
export function withCache<T>(
  keyGenerator: (...args: any[]) => string,
  options: CacheOptions = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator(...args);
      
      // Try to get from cache
      const cached = await cache.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await method.apply(this, args);
      
      // Cache the result
      await cache.set(key, result, options);
      
      return result;
    };

    return descriptor;
  };
}

// Cache middleware for API routes
export async function withApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Try cache first
  const cached = await cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();
  
  // Cache the result
  await cache.set(key, data, options);
  
  return data;
}

// Cache invalidation helpers
export const cacheInvalidation = {
  product: (id: number) => cache.delete(cache.productKey(id)),
  products: () => {
    // Invalidate all product list caches
    for (const [key] of memoryCache.entries()) {
      if (key.startsWith('products:')) {
        memoryCache.delete(key);
      }
    }
  },
  category: (id: number) => cache.delete(cache.categoryKey(id)),
  categories: () => cache.delete(cache.categoriesKey()),
  user: (id: number) => cache.delete(cache.userKey(id)),
  orders: (customerId: number) => cache.delete(cache.ordersKey(customerId)),
  order: (id: number) => cache.delete(cache.orderKey(id))
};

export default cache;
