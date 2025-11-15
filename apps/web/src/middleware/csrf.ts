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

export async function generateCSRFToken(): Promise<string> {
  // Check if we're in Edge Runtime (use Web Crypto API)
  // Edge Runtime detection: check environment variable or EdgeRuntime global
  const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge' || 
                        typeof EdgeRuntime !== 'undefined';
  
  const timestamp = Date.now().toString();
  
  // Generate random bytes (Edge-compatible)
  let random: string;
  if (isEdgeRuntime) {
    // Use Web Crypto API for Edge Runtime
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    random = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Use Node.js crypto for Node Runtime
    const crypto = require('crypto');
    random = crypto.randomBytes(16).toString('hex');
  }
  
  const data = `${timestamp}-${random}`;

  // Generate HMAC (Edge-compatible)
  let hash: string;
  if (isEdgeRuntime) {
    // Use Web Crypto API for Edge Runtime
    const encoder = new TextEncoder();
    const keyData = encoder.encode(CSRF_SECRET);
    const messageData = encoder.encode(data);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    hash = btoa(String.fromCharCode(...hashArray));
  } else {
    // Use Node.js crypto for Node Runtime
    const crypto = require('crypto');
    hash = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(data)
      .digest('base64');
  }
  
  return `${data}-${hash}`;
}

export async function validateCSRFToken(token: string): Promise<boolean> {
  if (!token || !CSRF_SECRET) return false;

  const parts = token.split('-');
  if (parts.length !== 3) return false;

  // Check if we're in Edge Runtime (use Web Crypto API)
  // Edge Runtime detection: check environment variable or EdgeRuntime global
  const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge' || 
                        typeof EdgeRuntime !== 'undefined';
  
  const [timestamp, random, hash] = parts;
  const data = `${timestamp}-${random}`;

  // Generate expected hash (Edge-compatible)
  let expectedHash: string;
  if (isEdgeRuntime) {
    // Use Web Crypto API for Edge Runtime
    const encoder = new TextEncoder();
    const keyData = encoder.encode(CSRF_SECRET);
    const messageData = encoder.encode(data);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    expectedHash = btoa(String.fromCharCode(...hashArray));
  } else {
    // Use Node.js crypto for Node Runtime
    const crypto = require('crypto');
    expectedHash = crypto
      .createHmac('sha256', CSRF_SECRET)
      .update(data)
      .digest('base64');
  }

  // Use timing-safe comparison to prevent timing attacks
  if (isEdgeRuntime) {
    // Edge-compatible timing-safe comparison
    if (hash.length !== expectedHash.length) return false;
    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return result === 0;
  } else {
    // Node.js timing-safe comparison
    const crypto = require('crypto');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  }
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

  if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  return NextResponse.next();
}
