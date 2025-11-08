// Production-grade cache layer with Redis fallback
import crypto from 'crypto';
// FIX: Rate limiting moved to centralized rate-limiter.ts
import { checkRateLimit, DEFAULT_RATE_LIMITS } from '@/utils/rate-limiter';

// Simple in-memory cache as fallback
type CacheEntry = { 
  body: string; 
  expiresAt: number; 
  etag: string;
  headers: Record<string, string>;
};

const memoryCache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 60 * 1000; // 60s
const MAX_MEMORY_ENTRIES = 1000;

// Optional Redis client (lazy)
let redisClient: any = null;
let redisInitialized = false;

async function initializeRedis(): Promise<void> {
  if (redisInitialized) return;
  redisInitialized = true;
  
  // Only server-side
  if (typeof window !== 'undefined') return;
  
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return;
    const Redis = (await import('ioredis')).default;
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
      enableReadyCheck: false,
    });
    await redisClient.connect().catch(() => { redisClient = null; });
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
  async get(key: string): Promise<{ body: string; etag: string; headers: Record<string, string> } | null> {
    await initializeRedis();
    // Try Redis first
    if (redisClient) {
      try {
        const raw = await redisClient.get(key);
        if (raw) {
          const parsed = JSON.parse(raw) as { body: string; etag: string; headers: Record<string, string> };
          return parsed;
        }
      } catch {
        // fall through to memory
      }
    }

    const entry = memoryCache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      memoryCache.delete(key);
      return null;
    }
    
    return {
      body: entry.body,
      etag: entry.etag,
      headers: entry.headers
    };
  }

  // Set in cache
  async set(key: string, body: string, ttlMs: number = DEFAULT_TTL_MS, headers: Record<string, string> = {}): Promise<void> {
    const etag = this.generateETag(body);
    await initializeRedis();

    // Prefer Redis when available
    if (redisClient) {
      try {
        const payload = JSON.stringify({ body, etag, headers });
        const ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));
        await redisClient.set(key, payload, 'EX', ttlSeconds);
        return;
      } catch {
        // fall back to memory
      }
    }
    
    // Cleanup old entries if cache is full
    if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) memoryCache.delete(oldestKey);
    }
    
    memoryCache.set(key, {
      body,
      expiresAt: Date.now() + ttlMs,
      etag,
      headers
    });
  }

  // Delete from cache
  async delete(key: string): Promise<void> {
    await initializeRedis();
    if (redisClient) {
      try { await redisClient.del(key); } catch {}
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

  // Rate limiting - using centralized rate limiter
  async checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
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
  getStats(): { size: number; entries: number } {
    return {
      size: memoryCache.size,
      entries: memoryCache.size,
      // FIX: rateLimitEntries removed - rate limiting moved to centralized rate-limiter.ts
    };
  }
}

export const cache = CacheManager.getInstance();

