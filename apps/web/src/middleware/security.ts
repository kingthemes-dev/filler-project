/**
 * Security middleware and utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { checkRateLimit, DEFAULT_RATE_LIMITS } from '@/utils/rate-limiter';
import { getClientIP } from '@/utils/client-ip';
import { getCorsHeaders } from '@/utils/cors';

/**
 * Generate nonce for CSP
 */
function generateNonce(): string {
  const globalCrypto =
    typeof globalThis !== 'undefined'
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;

  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID().replace(/-/g, '');
  }

  if (globalCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalCrypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(
      ''
    );
  }

  return Math.random().toString(36).slice(2, 18);
}

/**
 * Build Content Security Policy with nonce support
 */
function buildCSP(nonce: string): string {
  // Get WordPress URL from environment (default to known URL for backward compatibility)
  const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.filler.pl';
  
  // Extract domain from WordPress URL for CSP
  let wordpressDomain = wordpressUrl;
  try {
    const url = new URL(wordpressUrl);
    wordpressDomain = url.origin;
  } catch {
    // If URL parsing fails, use as-is
  }
  
  // Extract domain from base URL for CSP
  let baseDomain = baseUrl;
  try {
    const url = new URL(baseUrl);
    baseDomain = url.origin;
  } catch {
    // If URL parsing fails, use as-is
  }
  
  // Build CSP directives
  const directives = [
    "default-src 'self'",
    // Scripts: allow self, Google Analytics, GTM, and nonce for inline scripts
    // Note: Next.js automatically adds nonce to inline scripts in production
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com`,
    // Styles: allow self, Google Fonts, and nonce-based inline styles
    // Note: Next.js automatically adds nonce to inline styles in production
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https: blob:",
    // Connect: allow self, WordPress API, Brevo API, Google Analytics
    `connect-src 'self' ${wordpressDomain} https://api.brevo.com https://www.google-analytics.com https://www.googletagmanager.com https://www.google.com`,
    // Media: allow self and blob (for audio/video)
    "media-src 'self' blob:",
    // Frame: none (prevent embedding)
    "frame-src 'none'",
    // Object: none (prevent plugins)
    "object-src 'none'",
    // Base: self (prevent base tag injection)
    "base-uri 'self'",
    // Form action: self (prevent form hijacking)
    "form-action 'self'",
    // Frame ancestors: none (prevent clickjacking, same as X-Frame-Options)
    "frame-ancestors 'none'",
    // Upgrade insecure requests (force HTTPS)
    'upgrade-insecure-requests',
  ];
  
  // Add report-uri in production (optional, for CSP violation reporting)
  if (process.env.NODE_ENV === 'production' && process.env.CSP_REPORT_URI) {
    directives.push(`report-uri ${process.env.CSP_REPORT_URI}`);
  } else if (process.env.NODE_ENV === 'production') {
    // Use default report endpoint (can be added later)
    // directives.push(`report-uri ${baseDomain}/api/csp-report`);
  }
  
  return directives.join('; ');
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
      'interest-cohort=()',
    ].join(', '),
  };

  // Strict transport security (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] =
      'max-age=31536000; includeSubDomains; preload';
  }

  return headers;
};

// FIX: Rate limiting moved to centralized rate-limiter.ts
// Removed duplicate implementation (was here, cache.ts, and error-handler.ts)

// IP whitelist for development
const ALLOWED_IPS = ['127.0.0.1', '::1', 'localhost'];

// IPs exempt from rate limiting (localhost, performance tests)
const RATE_LIMIT_EXEMPT_IPS = ['127.0.0.1', '::1', 'localhost', '0.0.0.0'];

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
  if (
    process.env.NODE_ENV === 'development' &&
    RATE_LIMIT_EXEMPT_IPS.includes(clientIp)
  ) {
    return true;
  }

  // Check user agent for performance testing tools
  const userAgent = request.headers.get('user-agent') || '';
  if (
    RATE_LIMIT_EXEMPT_USER_AGENTS.some(ua =>
      userAgent.toLowerCase().includes(ua.toLowerCase())
    )
  ) {
    return true;
  }

  // Check for performance test header
  if (request.headers.get('x-performance-test') === 'true') {
    return true;
  }

  return false;
}

// Security middleware function
export async function securityMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  try {
    // Handle OPTIONS requests for CORS preflight
    const corsResponse = corsMiddleware(request);
    if (corsResponse) {
      return corsResponse;
    }

    const response = NextResponse.next();
    const clientIp = getClientIP(request);

    // Generate nonce for CSP
    const nonce = generateNonce();

    // Add nonce to response headers for use in components
    response.headers.set('X-Nonce', nonce);

    // Add CORS headers to all responses (configurable via CORS_ALLOWED_ORIGIN env var)
    const corsHeaders = getCorsHeaders();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

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
        response.headers.set(
          'X-RateLimit-Limit',
          String(DEFAULT_RATE_LIMITS.API.maxRequests)
        );
        response.headers.set(
          'X-RateLimit-Remaining',
          String(rateLimitResult.remaining)
        );
        response.headers.set(
          'X-RateLimit-Reset',
          String(Math.ceil(rateLimitResult.resetAt / 1000))
        );
        if (rateLimitResult.retryAfter) {
          response.headers.set(
            'Retry-After',
            String(rateLimitResult.retryAfter)
          );
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
    if (
      process.env.NODE_ENV === 'development' &&
      !ALLOWED_IPS.includes(clientIp)
    ) {
      logger.warn('Blocked IP in development', { ip: clientIp });
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Log suspicious activity
    logSuspiciousActivity(request);

    return response;
  } catch (error) {
    logger.error('Security middleware error', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return a basic response if security middleware fails
    return NextResponse.next();
  }
}

// NOTE: getClientIP is now imported from '@/utils/client-ip'
// Removed duplicate implementation

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
    /<embed/i,
  ];

  const isSuspicious = suspiciousPatterns.some(
    pattern => pattern.test(url) || pattern.test(userAgent)
  );

  if (isSuspicious) {
    logger.security('Suspicious activity detected', {
      ip: getClientIP(request),
      userAgent,
      url,
      timestamp: new Date().toISOString(),
    });
  }
}

// CORS middleware - handles OPTIONS requests
export function corsMiddleware(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    // Use dynamic getCorsHeaders() to respect env var changes
    return new NextResponse(null, {
      status: 200,
      headers: getCorsHeaders(),
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
  const globalCrypto =
    typeof globalThis !== 'undefined'
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;

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
    feedback,
  };
}

export default securityMiddleware;
