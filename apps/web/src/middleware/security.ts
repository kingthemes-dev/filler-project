/**
 * Security middleware and utilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

// Security headers configuration
const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://qvwltjhdjw.cfolks.pl https://api.brevo.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; '),

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
  ].join(', '),

  // Strict transport security (only in production with HTTPS)
  ...(process.env.NODE_ENV === 'production' && {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  })
};

// Rate limiting store (in-memory for simplicity)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // Max requests per window
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

// IP whitelist for development
const ALLOWED_IPS = [
  '127.0.0.1',
  '::1',
  'localhost'
];

// Security middleware function
export function securityMiddleware(request: NextRequest): NextResponse | null {
  try {
    const response = NextResponse.next();
    const clientIp = getClientIP(request);

    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      logger.warn('Rate limit exceeded', { ip: clientIp, url: request.url });
      return new NextResponse('Too Many Requests', { status: 429 });
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
    console.error('Security middleware error:', error);
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

// Rate limiting check
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  
  // Clean old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  // Get or create entry for this IP
  const entry = rateLimitStore.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_CONFIG.windowMs };
  
  // Check if limit exceeded
  if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
    return false;
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(ip, entry);
  
  return true;
}

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

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

// Validate and sanitize API input
export function validateApiInput(data: any): any {
  if (typeof data === 'string') {
    return sanitizeInput(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(validateApiInput);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = validateApiInput(value);
    }
    return sanitized;
  }
  
  return data;
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
  crypto.getRandomValues(array);
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
