import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple admin authentication middleware
 * In production, this should be replaced with proper authentication
 */
export function adminAuthMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('🔍 AdminAuth Middleware called for:', pathname);
  
  // Skip admin auth for non-admin routes
  if (!pathname.startsWith('/admin')) {
    console.log('⏭️ Skipping non-admin route:', pathname);
    return NextResponse.next();
  }

  // Skip admin login page itself
  if (pathname === '/admin/king') {
    console.log('⏭️ Skipping login page:', pathname);
    return NextResponse.next();
  }

  // Check for admin token in headers or cookies
  const adminToken = request.headers.get('x-admin-token') || 
                    request.cookies.get('admin-token')?.value;

  console.log('🔑 Admin token found:', !!adminToken);

  // Simple token check (in production, use proper JWT validation)
  const validToken = process.env.ADMIN_TOKEN || 'admin-2024-secure-token';
  
  if (!adminToken || adminToken !== validToken) {
    console.log('❌ Invalid or missing token, redirecting to login');
    // Redirect to admin login page
    const loginUrl = new URL('/admin/king', request.url);
    return NextResponse.redirect(loginUrl, { status: 302 });
  }

  console.log('✅ Valid token, allowing access');
  return NextResponse.next();
}
