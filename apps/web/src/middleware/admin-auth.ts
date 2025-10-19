import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple admin authentication middleware
 * In production, this should be replaced with proper authentication
 */
export function adminAuthMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip admin auth for non-admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Skip admin login page itself
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Check for admin token in headers or cookies
  const adminToken = request.headers.get('x-admin-token') || 
                    request.cookies.get('admin-token')?.value;

  // Simple token check (in production, use proper JWT validation)
  const validToken = process.env.ADMIN_TOKEN || 'admin-2024-secure-token';
  
  if (!adminToken || adminToken !== validToken) {
    // Redirect to admin login page
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl, { status: 302 });
  }

  return NextResponse.next();
}
