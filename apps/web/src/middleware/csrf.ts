import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';

const CSRF_SECRET = env.CSRF_SECRET;

export function shouldEnforceCsrf(): boolean {
  const forceEnable = process.env.CSRF_FORCE_ENABLE === 'true';
  const forceDisable = process.env.CSRF_FORCE_DISABLE === 'true';
  if (forceDisable) {
    return false;
  }
  if (forceEnable) {
    return true;
  }
  return process.env.NODE_ENV === 'production';
}

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
  if (!shouldEnforceCsrf()) {
    return NextResponse.next();
  }

  const getCsrfToken = async (): Promise<string | null> => {
    const headerToken =
      request.headers.get('x-csrf-token') || request.headers.get('csrf-token');
    if (headerToken) {
      return headerToken;
    }

    const contentType = request.headers.get('content-type') || '';
    const isFormSubmission =
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data');

    if (!isFormSubmission) {
      return null;
    }

    const formData = await request.formData();
    const token = formData.get('_csrf');
    return typeof token === 'string' ? token : null;
  };

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
  const csrfToken = await getCsrfToken();

  if (!csrfToken || !validateCSRFToken(csrfToken)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}
