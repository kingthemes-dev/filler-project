import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/middleware/security';
import { csrfMiddleware } from '@/middleware/csrf';

export async function middleware(request: NextRequest) {
  // Apply CSRF protection first
  const csrfResponse = await csrfMiddleware(request);
  if (csrfResponse.status !== 200) {
    return csrfResponse;
  }
  
  // Then apply security middleware
  return securityMiddleware(request);
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
