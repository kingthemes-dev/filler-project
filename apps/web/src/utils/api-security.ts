/**
 * API Security Utilities
 * 
 * Centralized security functions for API routes:
 * - Rate limiting
 * - CSRF protection
 * - Request validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientIP } from '@/utils/client-ip';
import { validateCSRFToken, shouldEnforceCsrf } from '@/middleware/csrf';
import { logger } from '@/utils/logger';
import { getCorsHeaders } from '@/utils/cors';

// Dynamic imports for Edge/Node runtime compatibility
// Define types locally to avoid importing modules during build time
type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
};

type CheckRateLimitFunction = (
  path: string,
  identifier: string,
  searchParams?: URLSearchParams
) => Promise<RateLimitResult>;

let checkEndpointRateLimit: CheckRateLimitFunction | undefined;
let checkEndpointRateLimitEdge: CheckRateLimitFunction | undefined;

// Lazy load rate limiters based on runtime
async function getRateLimiter() {
  // Check if we're in Edge Runtime
  // Edge Runtime detection: check environment variable or try to import rate-limiter (will fail if Edge)
  const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge' || 
                        typeof (globalThis as any).EdgeRuntime !== 'undefined';
  
  if (isEdgeRuntime) {
    // Use Edge-compatible rate limiter (no Redis, no Node.js modules)
    if (!checkEndpointRateLimitEdge) {
      const edgeModule = await import('@/utils/rate-limiter-edge');
      checkEndpointRateLimitEdge = edgeModule.checkEndpointRateLimitEdge as CheckRateLimitFunction;
    }
    return { checkLimit: checkEndpointRateLimitEdge!, isEdge: true };
  } else {
    // Use Node.js rate limiter (with Redis support)
    if (!checkEndpointRateLimit) {
      const nodeModule = await import('@/utils/rate-limiter');
      checkEndpointRateLimit = nodeModule.checkEndpointRateLimit as CheckRateLimitFunction;
    }
    return { checkLimit: checkEndpointRateLimit!, isEdge: false };
  }
}

/**
 * Security check result
 */
export interface SecurityCheckResult {
  allowed: boolean;
  response?: NextResponse;
  rateLimitRemaining?: number;
  rateLimitResetAt?: number;
}

/**
 * Check rate limiting for API route (Edge/Node compatible)
 */
export async function checkApiRateLimit(
  request: NextRequest,
  pathname?: string
): Promise<SecurityCheckResult> {
  const path = pathname || request.nextUrl.pathname;
  const clientIp = getClientIP(request);
  
  try {
    const { checkLimit } = await getRateLimiter();
    const rateLimitResult = await checkLimit(path, clientIp, request.nextUrl.searchParams);
    
    if (!rateLimitResult.allowed) {
      logger.warn('API rate limit exceeded', {
        path,
        ip: clientIp,
        remaining: rateLimitResult.remaining,
        retryAfter: rateLimitResult.retryAfter,
      });
      
      return {
        allowed: false,
        rateLimitRemaining: rateLimitResult.remaining,
        rateLimitResetAt: rateLimitResult.resetAt,
        response: NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: rateLimitResult.retryAfter,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimitResult.remaining?.toString() || '0',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
              'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            },
          }
        ),
      };
    }
    
    return {
      allowed: true,
      rateLimitRemaining: rateLimitResult.remaining,
      rateLimitResetAt: rateLimitResult.resetAt,
    };
  } catch (error) {
    logger.error('Rate limit check error', { error, path, ip: clientIp });
    // On error, allow request (fail open for availability)
    return { allowed: true };
  }
}

/**
 * Check CSRF token for mutating requests (async for Edge compatibility)
 */
export async function checkApiCSRF(request: NextRequest): Promise<SecurityCheckResult> {
  // Skip if CSRF is not enforced
  if (!shouldEnforceCsrf()) {
    return { allowed: true };
  }
  
  // Only check mutating methods
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return { allowed: true };
  }
  
  // Skip webhooks (they use HMAC verification)
  const pathname = request.nextUrl.pathname;
  const skipPaths = [
    '/api/webhooks',
    '/api/health',
    '/api/revalidate', // Admin endpoint with separate auth
  ];
  
  if (skipPaths.some(path => pathname.startsWith(path))) {
    return { allowed: true };
  }
  
  // Get CSRF token from header
  const csrfToken = request.headers.get('x-csrf-token') || 
                   request.headers.get('csrf-token');
  
  if (!csrfToken) {
    logger.warn('CSRF token missing', {
      path: pathname,
      method,
      ip: getClientIP(request),
    });
    
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'CSRF token required',
          message: 'Request must include a valid CSRF token in x-csrf-token header',
        },
        { status: 403 }
      ),
    };
  }
  
  // Validate CSRF token (async for Edge compatibility)
  const isValid = await validateCSRFToken(csrfToken);
  if (!isValid) {
    logger.warn('CSRF token invalid', {
      path: pathname,
      method,
      ip: getClientIP(request),
    });
    
    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: 'Invalid CSRF token',
          message: 'The provided CSRF token is invalid or expired',
        },
        { status: 403 }
      ),
    };
  }
  
  return { allowed: true };
}

/**
 * Combined security check for API routes
 * Checks both rate limiting and CSRF protection
 * 
 * @param request NextRequest object
 * @param options Configuration options
 * @returns SecurityCheckResult with allowed status and optional response
 */
export async function checkApiSecurity(
  request: NextRequest,
  options: {
    enforceRateLimit?: boolean;
    enforceCSRF?: boolean;
    pathname?: string;
  } = {}
): Promise<SecurityCheckResult> {
  const {
    enforceRateLimit = true,
    enforceCSRF = true,
    pathname,
  } = options;
  
  // Check rate limiting
  if (enforceRateLimit) {
    const rateLimitResult = await checkApiRateLimit(request, pathname);
    if (!rateLimitResult.allowed) {
      return rateLimitResult;
    }
  }
  
  // Check CSRF protection
  if (enforceCSRF) {
    const csrfResult = await checkApiCSRF(request);
    if (!csrfResult.allowed) {
      return csrfResult;
    }
  }
  
  return { allowed: true };
}

/**
 * Add security headers to response
 * Includes CORS headers (configurable via CORS_ALLOWED_ORIGIN env var)
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Add CORS headers (configurable via CORS_ALLOWED_ORIGIN env var)
  // Default: '*' for starter template, specific domain for production
  const corsHeaders = getCorsHeaders();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Rate limit headers (if available in response)
  const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
  if (!rateLimitRemaining) {
    // Add default rate limit headers
    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', '99');
  }
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

