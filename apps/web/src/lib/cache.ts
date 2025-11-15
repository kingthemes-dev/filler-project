// Production-grade cache layer with Redis fallback
import crypto from 'crypto';
import type { Redis } from 'ioredis';
// FIX: Rate limiting moved to centralized rate-limiter.ts
import { checkRateLimit, DEFAULT_RATE_LIMITS } from '@/utils/rate-limiter';

// Simple in-memory cache as fallback
type CacheEntry = {
  body: string;
  expiresAt: number;
  etag: string;
  headers: Record<string, string>;
  tags?: string[]; // OPTIMIZATION: Cache tags for invalidation
};

const memoryCache = new Map<string, CacheEntry>();
const tagIndex = new Map<string, Set<string>>(); // tag -> Set of cache keys
const DEFAULT_TTL_MS = 60 * 1000; // 60s
const MAX_MEMORY_ENTRIES = 1000;

// OPTIMIZATION: Cache hit/miss tracking for metrics
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}

const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
};

// Optional Redis client (lazy)
let redisClient: Redis | null = null;
let redisInitialized = false;

async function initializeRedis(): Promise<void> {
  if (redisInitialized) return;
  redisInitialized = true;

  // Only server-side
  if (typeof window !== 'undefined') return;

  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;
    const RedisModule = await import('ioredis');
    redisClient = new RedisModule.default(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
      enableReadyCheck: false,
    });
    await redisClient.connect().catch(() => {
      redisClient = null;
    });
  } catch {
    redisClient = null;
  }
}

export class CacheManager {
  private static instance: CacheManager;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Generate cache key from URL
  generateKey(url: string, method: string = 'GET'): string {
    return `cache:${method}:${crypto.createHash('md5').update(url).digest('hex')}`;
  }

  // Generate ETag from content
  generateETag(content: string): string {
    return `"${crypto.createHash('md5').update(content).digest('hex').slice(0, 16)}"`;
  }

  // Get from cache
  async get(key: string): Promise<{
    body: string;
    etag: string;
    headers: Record<string, string>;
  } | null> {
    await initializeRedis();
    // Try Redis first
    if (redisClient) {
      try {
        const raw = await redisClient.get(key);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            body: string;
            etag: string;
            headers: Record<string, string>;
          };
          // OPTIMIZATION: Track cache hit
          cacheMetrics.hits++;
          return parsed;
        }
      } catch {
        // fall through to memory
      }
    }

    const entry = memoryCache.get(key);

    if (!entry) {
      // OPTIMIZATION: Track cache miss
      cacheMetrics.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      // OPTIMIZATION: Track cache miss (expired)
      cacheMetrics.misses++;
      return null;
    }

    // OPTIMIZATION: Track cache hit
    cacheMetrics.hits++;
    return {
      body: entry.body,
      etag: entry.etag,
      headers: entry.headers,
    };
  }

  // Set in cache
  async set(
    key: string,
    body: string,
    ttlMs: number = DEFAULT_TTL_MS,
    headers: Record<string, string> = {},
    tags: string[] = [] // OPTIMIZATION: Cache tags for invalidation
  ): Promise<void> {
    const etag = this.generateETag(body);
    await initializeRedis();

    // OPTIMIZATION: Track cache set
    cacheMetrics.sets++;

    // OPTIMIZATION: Index tags for invalidation
    if (tags.length > 0) {
      for (const tag of tags) {
        if (!tagIndex.has(tag)) {
          tagIndex.set(tag, new Set());
        }
        tagIndex.get(tag)!.add(key);
      }
    }

    // Prefer Redis when available
    if (redisClient) {
      try {
        const payload = JSON.stringify({ body, etag, headers, tags });
        const ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));
        await redisClient.set(key, payload, 'EX', ttlSeconds);
        // Store tags in Redis for invalidation
        if (tags.length > 0) {
          for (const tag of tags) {
            await redisClient.sadd(`cache:tags:${tag}`, key);
            await redisClient.expire(`cache:tags:${tag}`, ttlSeconds);
          }
        }
        return;
      } catch {
        // fall back to memory
      }
    }

    // Cleanup old entries if cache is full
    if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) {
        const oldEntry = memoryCache.get(oldestKey);
        if (oldEntry?.tags) {
          for (const tag of oldEntry.tags) {
            tagIndex.get(tag)?.delete(oldestKey);
            if (tagIndex.get(tag)?.size === 0) {
              tagIndex.delete(tag);
            }
          }
        }
        memoryCache.delete(oldestKey);
      }
    }

    memoryCache.set(key, {
      body,
      expiresAt: Date.now() + ttlMs,
      etag,
      headers,
      tags: tags.length > 0 ? tags : undefined,
    });
  }

  // Delete from cache
  async delete(key: string): Promise<void> {
    await initializeRedis();
    // OPTIMIZATION: Track cache delete
    cacheMetrics.deletes++;
    if (redisClient) {
      try {
        await redisClient.del(key);
      } catch {}
    }
    memoryCache.delete(key);
  }

  // Clear all cache
  async clear(): Promise<void> {
    memoryCache.clear();
    await initializeRedis();
    if (redisClient) {
      try {
        const keys: string[] = await redisClient.keys('cache:*');
        if (keys.length) await redisClient.del(...keys);
      } catch {}
    }
  }

  // Purge cache by pattern
  async purge(pattern: string): Promise<number> {
    let deleted = 0;
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        const entry = memoryCache.get(key);
        if (entry?.tags) {
          for (const tag of entry.tags) {
            tagIndex.get(tag)?.delete(key);
            if (tagIndex.get(tag)?.size === 0) {
              tagIndex.delete(tag);
            }
          }
        }
        memoryCache.delete(key);
        deleted++;
      }
    }
    await initializeRedis();
    if (redisClient) {
      try {
        const keys: string[] = await redisClient.keys(`*${pattern}*`);
        if (keys.length) await redisClient.del(...keys);
        deleted += keys.length;
      } catch {}
    }
    return deleted;
  }

  // OPTIMIZATION: Invalidate cache by tags
  async invalidateByTags(tags: string[]): Promise<number> {
    let deleted = 0;
    const keysToDelete = new Set<string>();

    // Collect keys from memory cache
    for (const tag of tags) {
      const keys = tagIndex.get(tag);
      if (keys) {
        for (const key of keys) {
          keysToDelete.add(key);
        }
      }
    }

    // Delete from memory cache
    for (const key of keysToDelete) {
      const entry = memoryCache.get(key);
      if (entry?.tags) {
        for (const tag of entry.tags) {
          tagIndex.get(tag)?.delete(key);
          if (tagIndex.get(tag)?.size === 0) {
            tagIndex.delete(tag);
          }
        }
      }
      memoryCache.delete(key);
      deleted++;
    }

    // Delete from Redis
    await initializeRedis();
    if (redisClient) {
      try {
        for (const tag of tags) {
          const keys = await redisClient.smembers(`cache:tags:${tag}`);
          if (keys.length > 0) {
            await redisClient.del(...keys);
            await redisClient.del(`cache:tags:${tag}`);
            deleted += keys.length;
          }
        }
      } catch {}
    }

    return deleted;
  }

  // Rate limiting - using centralized rate limiter
  async checkRateLimit(
    ip: string
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const result = await checkRateLimit({
      identifier: ip,
      maxRequests: DEFAULT_RATE_LIMITS.API.maxRequests,
      windowMs: DEFAULT_RATE_LIMITS.API.windowMs,
      keyPrefix: 'cache-manager',
    });

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetAt: result.resetAt,
    };
  }

  // Get cache stats
  getStats(): {
    size: number;
    entries: number;
    metrics: CacheMetrics & {
      hitRate: number;
      totalRequests: number;
    };
  } {
    const totalRequests = cacheMetrics.hits + cacheMetrics.misses;
    const hitRate = totalRequests > 0 ? cacheMetrics.hits / totalRequests : 0;

    return {
      size: memoryCache.size,
      entries: memoryCache.size,
      metrics: {
        ...cacheMetrics,
        hitRate,
        totalRequests,
      },
    };
  }
}

export const cache = CacheManager.getInstance();
