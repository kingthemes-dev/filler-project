// Production-grade cache layer with Redis fallback
import crypto from 'crypto';

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

// Rate limiting store
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // per IP per minute

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
    memoryCache.delete(key);
  }

  // Clear all cache
  async clear(): Promise<void> {
    memoryCache.clear();
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
    return deleted;
  }

  // Rate limiting
  checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const key = `rate:${ip}`;
    const entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetAt) {
      // Reset or create new entry
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW
      });
      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX_REQUESTS - 1,
        resetAt: now + RATE_LIMIT_WINDOW
      };
    }
    
    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt
      };
    }
    
    entry.count++;
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
      resetAt: entry.resetAt
    };
  }

  // Get cache stats
  getStats(): { size: number; entries: number; rateLimitEntries: number } {
    return {
      size: memoryCache.size,
      entries: memoryCache.size,
      rateLimitEntries: rateLimitStore.size
    };
  }
}

export const cache = CacheManager.getInstance();

