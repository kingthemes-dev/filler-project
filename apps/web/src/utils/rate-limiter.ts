/**
 * Centralized Rate Limiter
 * FIX: Ujednolicenie 3 implementacji rate limiting do jednej centralnej
 * 
 * Features:
 * - Redis-based (if available) with in-memory fallback
 * - Configurable limits per endpoint/route
 * - Distributed rate limiting support (multiple instances)
 * - Per-endpoint rate limits
 */

import { logger } from '@/utils/logger';

// Rate limit configuration
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
  identifier: string; // IP, user ID, etc.
  keyPrefix?: string; // Redis key prefix (default: 'ratelimit')
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // Seconds until reset
}

// Per-endpoint rate limit configuration
export interface EndpointRateLimit {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

// Per-endpoint rate limits configuration
export const ENDPOINT_RATE_LIMITS: Record<string, EndpointRateLimit> = {
  // Public read endpoints (more lenient)
  '/api/home-feed': {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'ratelimit:home-feed',
  },
  '/api/woocommerce': {
    maxRequests: 150,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'ratelimit:woocommerce',
  },
  // Products endpoints
  '/api/woocommerce?endpoint=products': {
    maxRequests: 100,
    windowMs: 10 * 60 * 1000, // 10 minutes
    keyPrefix: 'ratelimit:products',
  },
  '/api/woocommerce?endpoint=products/categories': {
    maxRequests: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes (cached data)
    keyPrefix: 'ratelimit:categories',
  },
  // Auth endpoints (strict)
  '/api/admin/auth': {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'ratelimit:auth',
  },
  '/api/woocommerce?endpoint=customers': {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'ratelimit:customers',
  },
  // Mutations (strict)
  '/api/woocommerce?endpoint=orders': {
    maxRequests: 30,
    windowMs: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'ratelimit:orders',
  },
  // Search (moderate)
  '/api/woocommerce?endpoint=products&search': {
    maxRequests: 50,
    windowMs: 1 * 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:search',
  },
  // Reviews
  '/api/reviews': {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'ratelimit:reviews',
  },
  // Webhooks (very lenient)
  '/api/webhooks': {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ratelimit:webhooks',
  },
};

/**
 * Get rate limit config for endpoint
 */
export function getEndpointRateLimit(path: string, searchParams?: URLSearchParams): EndpointRateLimit | null {
  // Try exact match first
  if (ENDPOINT_RATE_LIMITS[path]) {
    return ENDPOINT_RATE_LIMITS[path];
  }

  // Try with query params for woocommerce endpoints
  if (searchParams) {
    const endpoint = searchParams.get('endpoint');
    if (endpoint) {
      // Check for specific endpoint patterns
      if (endpoint === 'products' && searchParams.has('search')) {
        return ENDPOINT_RATE_LIMITS['/api/woocommerce?endpoint=products&search'] || null;
      }
      if (endpoint === 'products') {
        return ENDPOINT_RATE_LIMITS['/api/woocommerce?endpoint=products'] || null;
      }
      if (endpoint === 'products/categories') {
        return ENDPOINT_RATE_LIMITS['/api/woocommerce?endpoint=products/categories'] || null;
      }
      if (endpoint === 'customers') {
        return ENDPOINT_RATE_LIMITS['/api/woocommerce?endpoint=customers'] || null;
      }
      if (endpoint === 'orders') {
        return ENDPOINT_RATE_LIMITS['/api/woocommerce?endpoint=orders'] || null;
      }
    }
  }

  // Check path patterns
  if (path.startsWith('/api/admin/auth')) {
    return ENDPOINT_RATE_LIMITS['/api/admin/auth'] || null;
  }
  if (path.startsWith('/api/home-feed')) {
    return ENDPOINT_RATE_LIMITS['/api/home-feed'] || null;
  }
  if (path.startsWith('/api/woocommerce')) {
    return ENDPOINT_RATE_LIMITS['/api/woocommerce'] || null;
  }
  if (path.startsWith('/api/reviews')) {
    return ENDPOINT_RATE_LIMITS['/api/reviews'] || null;
  }
  if (path.startsWith('/api/webhooks')) {
    return ENDPOINT_RATE_LIMITS['/api/webhooks'] || null;
  }

  // Default: no specific limit (use global)
  return null;
}

// In-memory store as fallback
const memoryStore = new Map<string, { count: number; resetAt: number }>();

type RedisClient = import('ioredis').Redis;

// Redis client (optional, lazy-loaded)
let redisClient: RedisClient | null = null;
let redisInitialized = false;

/**
 * Initialize Redis client (lazy)
 */
async function initializeRedis(): Promise<void> {
  if (redisInitialized) return;
  redisInitialized = true;

  // Only on server-side
  if (typeof window !== 'undefined') {
    return;
  }

  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.debug('Redis not configured for rate limiting, using in-memory store');
      return;
    }

    const Redis = (await import('ioredis')).default;
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
      enableReadyCheck: false,
    });

    redisClient.on('connect', () => {
      logger.info('Rate limiter: Redis connected');
    });

    redisClient.on('error', (error: Error) => {
      logger.warn('Rate limiter: Redis connection failed, using in-memory store', { error: error.message });
      redisClient = null;
    });

    redisClient.on('close', () => {
      logger.info('Rate limiter: Redis connection closed');
      redisClient = null;
    });

    // Try to connect
    await redisClient.connect().catch(() => {
      redisClient = null;
    });
  } catch (error) {
    logger.warn('Rate limiter: Failed to initialize Redis, using in-memory store', { error });
    redisClient = null;
  }
}

/**
 * Get rate limit key
 */
function getRateLimitKey(identifier: string, keyPrefix: string = 'ratelimit'): string {
  return `${keyPrefix}:${identifier}`;
}

/**
 * Check rate limit using Redis (if available)
 */
async function checkRateLimitRedis(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!redisClient) {
    return checkRateLimitMemory(key, maxRequests, windowMs);
  }

  try {
    const now = Date.now();
    const windowSeconds = Math.ceil(windowMs / 1000);
    
    // Use Redis INCR with TTL (sliding window)
    const current = await redisClient.incr(key);
    
    // Set TTL on first request
    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }
    
    // Get TTL to calculate reset time
    const ttl = await redisClient.ttl(key);
    const resetAt = now + (ttl * 1000);
    
    const remaining = Math.max(0, maxRequests - current);
    const allowed = current <= maxRequests;
    
    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil(ttl),
    };
  } catch (error) {
    logger.warn('Rate limiter: Redis error, falling back to memory', { error });
    return checkRateLimitMemory(key, maxRequests, windowMs);
  }
}

/**
 * Check rate limit using in-memory store
 */
function checkRateLimitMemory(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  
  // Clean old entries (every 1000 requests to avoid performance hit)
  if (Math.random() < 0.001) {
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetAt < now) {
        memoryStore.delete(k);
      }
    }
  }
  
  // Get or create entry
  let entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }
  
  // Check limit
  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  
  // Increment and update
  entry.count++;
  memoryStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Main rate limit check function
 * 
 * @param config Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { maxRequests, windowMs, identifier, keyPrefix } = config;
  const key = getRateLimitKey(identifier, keyPrefix);
  
  // Initialize Redis if not done yet
  await initializeRedis();
  
  // Use Redis if available, otherwise memory
  if (redisClient) {
    return checkRateLimitRedis(key, maxRequests, windowMs);
  }
  
  return checkRateLimitMemory(key, maxRequests, windowMs);
}

/**
 * Check rate limit for endpoint (with per-endpoint config)
 */
export async function checkEndpointRateLimit(
  path: string,
  identifier: string,
  searchParams?: URLSearchParams
): Promise<RateLimitResult> {
  const endpointConfig = getEndpointRateLimit(path, searchParams);
  
  if (!endpointConfig) {
    // No specific limit, use default
    return checkRateLimit({
      maxRequests: DEFAULT_RATE_LIMITS.API.maxRequests,
      windowMs: DEFAULT_RATE_LIMITS.API.windowMs,
      identifier,
      keyPrefix: 'ratelimit:api',
    });
  }

  return checkRateLimit({
    maxRequests: endpointConfig.maxRequests,
    windowMs: endpointConfig.windowMs,
    identifier,
    keyPrefix: endpointConfig.keyPrefix || 'ratelimit',
  });
}

/**
 * Reset rate limit for identifier
 */
export async function resetRateLimit(identifier: string, keyPrefix: string = 'ratelimit'): Promise<void> {
  const key = getRateLimitKey(identifier, keyPrefix);
  
  if (redisClient) {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.warn('Rate limiter: Failed to reset in Redis', { error });
    }
  }
  
  memoryStore.delete(key);
}

/**
 * Get rate limit status (without incrementing)
 */
export async function getRateLimitStatus(
  identifier: string,
  maxRequests: number,
  windowMs: number,
  keyPrefix: string = 'ratelimit'
): Promise<RateLimitResult> {
  const key = getRateLimitKey(identifier, keyPrefix);
  await initializeRedis();
  
  if (redisClient) {
    try {
      const current = await redisClient.get(key);
      const count = current ? parseInt(current, 10) : 0;
      const ttl = await redisClient.ttl(key);
      const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);
      
      return {
        allowed: count < maxRequests,
        remaining: Math.max(0, maxRequests - count),
        resetAt,
      };
    } catch (error) {
      logger.debug('Rate limiter: Falling back to memory status lookup', { error });
    }
  }
  
  const entry = memoryStore.get(key);
  if (!entry) {
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + windowMs,
    };
  }
  
  const now = Date.now();
  if (entry.resetAt < now) {
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: now + windowMs,
    };
  }
  
  return {
    allowed: entry.count < maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Default rate limit configurations
 */
export const DEFAULT_RATE_LIMITS = {
  // General API: 100 requests per 15 minutes
  API: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Auth endpoints: 10 requests per 5 minutes
  AUTH: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  // Webhooks: 1000 requests per minute
  WEBHOOK: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // 1 minute
  },
  // Search: 50 requests per minute
  SEARCH: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;
