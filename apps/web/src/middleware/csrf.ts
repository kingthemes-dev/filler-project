import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';

const CSRF_SECRET = env.CSRF_SECRET;

export function generateCSRFToken(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2);
  const data = `${timestamp}-${random}`;
  
  // Simple HMAC-like hash (in production use crypto.createHmac)
  const hash = Buffer.from(data + CSRF_SECRET).toString('base64');
  return `${data}-${hash}`;
}

export function validateCSRFToken(token: string): boolean {
  if (!token) return false;
  
  const parts = token.split('-');
  if (parts.length !== 3) return false;
  
  const [timestamp, random, hash] = parts;
  const data = `${timestamp}-${random}`;
  const expectedHash = Buffer.from(data + CSRF_SECRET).toString('base64');
  
  return hash === expectedHash;
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
