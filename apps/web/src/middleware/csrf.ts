import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';

const CSRF_SECRET = env.CSRF_SECRET;

export function generateCSRFToken(): string {
  const crypto = require('crypto');
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString('hex');
  const data = `${timestamp}-${random}`;
  
  // FIX: Użyj crypto.createHmac zamiast prostego hash (bezpieczniejsze)
  const hash = crypto.createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('base64');
  return `${data}-${hash}`;
}

export function validateCSRFToken(token: string): boolean {
  if (!token || !CSRF_SECRET) return false;
  
  const parts = token.split('-');
  if (parts.length !== 3) return false;
  
  const crypto = require('crypto');
  const [timestamp, random, hash] = parts;
  const data = `${timestamp}-${random}`;
  
  // FIX: Użyj crypto.createHmac i timingSafeEqual (bezpieczniejsze)
  const expectedHash = crypto.createHmac('sha256', CSRF_SECRET)
    .update(data)
    .digest('base64');
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expectedHash)
  );
}

export async function csrfMiddleware(request: NextRequest) {
  // Disable CSRF checks in development to avoid edge runtime limitations
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }
  // Only check POST, PUT, DELETE, PATCH requests
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return NextResponse.next();
  }

  // Skip CSRF for API routes that don't need it
  const pathname = request.nextUrl.pathname;
  const skipPaths = [
    '/api/health',
    '/api/performance',
    '/api/analytics',
    '/api/error-tracking',
    '/api/cache/',
    '/api/revalidate',
    '/api/webhooks', // WooCommerce webhooks
  ];

  if (skipPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get CSRF token from header or form data
  const csrfToken = request.headers.get('x-csrf-token') || 
                   request.headers.get('csrf-token') ||
                   (await request.formData()).get('_csrf') as string;

  if (!csrfToken || !validateCSRFToken(csrfToken)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}
