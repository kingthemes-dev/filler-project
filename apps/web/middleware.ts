import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/middleware/security';
import { csrfMiddleware } from '@/middleware/csrf';
import { applyCDNCache, shouldBypassCDNCache } from '@/middleware/cdn-cache';
import { adminAuthMiddleware } from '@/middleware/admin-auth';

export async function middleware(request: NextRequest) {
  console.log('🚀 Main middleware called for:', request.nextUrl.pathname);
  
  // Apply admin authentication for admin routes
  const adminResponse = adminAuthMiddleware(request);
  console.log('🔍 Admin response status:', adminResponse?.status);
  
  if (adminResponse && adminResponse.status !== 200) {
    console.log('🔄 Returning admin response');
    return adminResponse;
  }

  // Apply CSRF protection first
  const csrfResponse = await csrfMiddleware(request);
  if (csrfResponse.status !== 200) {
    return csrfResponse;
  }
  
  // Apply security middleware
  const securityResponse = securityMiddleware(request);
  
  // If security middleware returned a response (error), return it
  if (securityResponse && securityResponse.status !== 200) {
    return securityResponse;
  }
  
  // Apply CDN cache strategy
  if (!shouldBypassCDNCache(request)) {
    return applyCDNCache(request, securityResponse || NextResponse.next());
  }
  
  return securityResponse || NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
