/**
 * Security middleware and utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { checkRateLimit, DEFAULT_RATE_LIMITS } from '@/utils/rate-limiter';

/**
 * Generate nonce for CSP
 */
function generateNonce(): string {
  const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;

  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID().replace(/-/g, '');
  }

  if (globalCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalCrypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return Math.random().toString(36).slice(2, 18);
}

/**
 * Build Content Security Policy with nonce support
 */
function buildCSP(nonce: string): string {
  return [
    "default-src 'self'",
    // Scripts: allow self, Google Analytics, GTM, and nonce for inline scripts
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com`,
    // Styles: allow self, Google Fonts, and nonce-based inline styles
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://qvwltjhdjw.cfolks.pl https://api.brevo.com https://www.google-analytics.com https://www.googletagmanager.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
}

// Security headers configuration
const getSecurityHeaders = (nonce: string): Record<string, string> => {
  const headers: Record<string, string> = {
    // Content Security Policy with nonce
    'Content-Security-Policy': buildCSP(nonce),

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',

    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions policy
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()'
    ].join(', ')
  };

  // Strict transport security (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
};

// FIX: Rate limiting moved to centralized rate-limiter.ts
// Removed duplicate implementation (was here, cache.ts, and error-handler.ts)

// IP whitelist for development
const ALLOWED_IPS = [
  '127.0.0.1',
  '::1',
  'localhost'
];

// IPs exempt from rate limiting (localhost, performance tests)
const RATE_LIMIT_EXEMPT_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
  '0.0.0.0',
];

// User agents exempt from rate limiting (performance testing tools)
const RATE_LIMIT_EXEMPT_USER_AGENTS = [
  'autocannon',
  'k6',
  'performance-test',
  'load-test',
];

// Check if request should be exempt from rate limiting
function isRateLimitExempt(request: NextRequest, clientIp: string): boolean {
  // In development, exempt localhost
  if (process.env.NODE_ENV === 'development' && RATE_LIMIT_EXEMPT_IPS.includes(clientIp)) {
    return true;
  }
  
  // Check user agent for performance testing tools
  const userAgent = request.headers.get('user-agent') || '';
  if (RATE_LIMIT_EXEMPT_USER_AGENTS.some(ua => userAgent.toLowerCase().includes(ua.toLowerCase()))) {
    return true;
  }
  
  // Check for performance test header
  if (request.headers.get('x-performance-test') === 'true') {
    return true;
  }
  
  return false;
}

// Security middleware function
export async function securityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  try {
    const response = NextResponse.next();
    const clientIp = getClientIP(request);

    // Generate nonce for CSP
    const nonce = generateNonce();
    
    // Add nonce to response headers for use in components
    response.headers.set('X-Nonce', nonce);
    
    // Add security headers with CSP including nonce
    const securityHeaders = getSecurityHeaders(nonce);
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Rate limiting - skip for exempt IPs/user agents (performance tests, localhost in dev)
    if (!isRateLimitExempt(request, clientIp)) {
      const rateLimitResult = await checkRateLimit({
        identifier: clientIp,
        maxRequests: DEFAULT_RATE_LIMITS.API.maxRequests,
        windowMs: DEFAULT_RATE_LIMITS.API.windowMs,
        keyPrefix: 'security-middleware',
      });
      
      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded', { 
          ip: clientIp, 
          url: request.url,
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        });
        
        const response = new NextResponse('Too Many Requests', { status: 429 });
        response.headers.set('X-RateLimit-Limit', String(DEFAULT_RATE_LIMITS.API.maxRequests));
        response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
        response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetAt / 1000)));
        if (rateLimitResult.retryAfter) {
          response.headers.set('Retry-After', String(rateLimitResult.retryAfter));
        }
        return response;
      }
    } else {
      // Log exemption for debugging
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Rate limit exempt', { ip: clientIp, url: request.url });
      }
    }

  // IP filtering in development
  if (process.env.NODE_ENV === 'development' && !ALLOWED_IPS.includes(clientIp)) {
    logger.warn('Blocked IP in development', { ip: clientIp });
    return new NextResponse('Forbidden', { status: 403 });
  }

    // Log suspicious activity
    logSuspiciousActivity(request);

    return response;
  } catch (error) {
    logger.error('Security middleware error', { error: error instanceof Error ? error.message : String(error) });
    // Return a basic response if security middleware fails
    return NextResponse.next();
  }
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (remoteAddr) {
    return remoteAddr;
  }
  
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         'unknown';
}

// FIX: checkRateLimit function removed - now using centralized rate-limiter.ts

// Log suspicious activity
function logSuspiciousActivity(request: NextRequest): void {
  const userAgent = request.headers.get('user-agent') || '';
  const url = request.url;
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /<script/i,
    /eval\(/i,
    /document\.cookie/i,
    /\.\.\//, // Path traversal
    /union.*select/i, // SQL injection
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(userAgent)
  );
  
  if (isSuspicious) {
    logger.security('Suspicious activity detected', {
      ip: getClientIP(request),
      userAgent,
      url,
      timestamp: new Date().toISOString()
    });
  }
}

// CORS configuration
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_BASE_URL || 'https://www.filler.pl',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
};

// CORS middleware
export function corsMiddleware(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  
  return null;
}

// API key validation
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.API_KEY;
  
  if (!expectedKey) {
    return true; // No API key required
  }
  
  return apiKey === expectedKey;
}

// Session security
export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;

  if (globalCrypto?.getRandomValues) {
    globalCrypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i += 1) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Hasło musi mieć co najmniej 8 znaków');
  }
  
  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Dodaj wielką literę');
  }
  
  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Dodaj małą literę');
  }
  
  // Number check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Dodaj cyfrę');
  }
  
  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Dodaj znak specjalny');
  }
  
  return {
    isValid: score >= 4,
    score,
    feedback
  };
}

export default securityMiddleware;
