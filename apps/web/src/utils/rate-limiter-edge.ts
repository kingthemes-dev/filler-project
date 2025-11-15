/**
 * Edge-Compatible Rate Limiter
 * 
 * Lightweight in-memory rate limiter for Edge Runtime
 * Does not use Redis or Node.js modules (crypto, stream, dns)
 * Uses Web Crypto API for Edge compatibility
 */

import { NextRequest } from 'next/server';

// Rate limit configuration
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// Per-endpoint rate limit configuration (same as rate-limiter.ts)
export interface EndpointRateLimit {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

// In-memory rate limit storage for Edge Runtime
// Note: This is per-instance, not distributed across Edge instances
// Edge Runtime doesn't support setInterval, so cleanup happens on access
const edgeRateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries on access (Edge Runtime doesn't support setInterval)
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of edgeRateLimitStore.entries()) {
    if (value.resetAt < now) {
      edgeRateLimitStore.delete(key);
    }
  }
}

/**
 * Get rate limit config for endpoint (simplified version for Edge)
 */
function getEndpointRateLimit(path: string): EndpointRateLimit | null {
  // Default rate limits for Edge endpoints
  const defaults: Record<string, EndpointRateLimit> = {
    '/api/edge/analytics': {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
    },
    '/api/analytics': {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
    },
    '/api/error-tracking': {
      maxRequests: 50,
      windowMs: 60 * 1000, // 1 minute
    },
  };

  // Check exact match
  if (defaults[path]) {
    return defaults[path];
  }

  // Check path prefix
  for (const [prefix, config] of Object.entries(defaults)) {
    if (path.startsWith(prefix)) {
      return config;
    }
  }

  // Default rate limit for unknown endpoints
  return {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  };
}

/**
 * Generate rate limit key for Edge (simple hash)
 */
async function generateEdgeKey(identifier: string, path: string, prefix?: string): Promise<string> {
  const keyData = `${prefix || 'ratelimit'}:${path}:${identifier}`;
  
  // Use Web Crypto API for Edge compatibility
  const encoder = new TextEncoder();
  const data = encoder.encode(keyData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `edge:${hashHex.substring(0, 16)}`;
}

/**
 * Check rate limit for Edge Runtime
 */
export async function checkEndpointRateLimitEdge(
  path: string,
  identifier: string,
  searchParams?: URLSearchParams
): Promise<RateLimitResult> {
  const config = getEndpointRateLimit(path);
  
  if (!config) {
    // No rate limit configured, allow request
    return {
      allowed: true,
      remaining: Infinity,
      resetAt: Date.now() + 60000,
    };
  }

  const key = await generateEdgeKey(identifier, path, config.keyPrefix);
  const now = Date.now();
  
  // Clean up expired entries before checking
  cleanupExpiredEntries();
  
  // Get current rate limit state
  let rateLimitState = edgeRateLimitStore.get(key);
  
  // Check if rate limit window has expired
  if (!rateLimitState || rateLimitState.resetAt < now) {
    // Reset rate limit window
    rateLimitState = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    edgeRateLimitStore.set(key, rateLimitState);
  }
  
  // Increment request count
  rateLimitState.count += 1;
  
  // Check if rate limit exceeded
  const allowed = rateLimitState.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - rateLimitState.count);
  const retryAfter = allowed ? undefined : Math.ceil((rateLimitState.resetAt - now) / 1000);
  
  return {
    allowed,
    remaining,
    resetAt: rateLimitState.resetAt,
    retryAfter,
  };
}

