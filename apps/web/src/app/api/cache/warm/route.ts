import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { logger } from '@/utils/logger';
import { checkEndpointRateLimit } from '@/utils/rate-limiter';
import { getClientIP } from '@/utils/client-ip';
import { env } from '@/config/env';
import { addSecurityHeaders } from '@/utils/api-security';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting (before auth to avoid wasting resources)
    const clientIp = getClientIP(request);
    const path = request.nextUrl.pathname;
    const rateLimitResult = await checkEndpointRateLimit(path, clientIp);

    if (!rateLimitResult.allowed) {
      logger.warn('Cache warm: Rate limit exceeded', {
        ip: clientIp,
        remaining: rateLimitResult.remaining,
      });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimitResult.retryAfter || 60) },
        }
      );
    }

    // Verify authorization (optional, but recommended for admin endpoints)
    const authHeader = request.headers.get('authorization');
    const token =
      authHeader?.replace('Bearer ', '') ||
      request.headers.get('x-admin-token');
    const expectedToken =
      env.ADMIN_CACHE_TOKEN || process.env.ADMIN_CACHE_TOKEN;

    // Allow cache warm without auth in development, but require it in production
    if (process.env.NODE_ENV === 'production' && expectedToken) {
      if (!token || token !== expectedToken) {
        logger.warn('Cache warm: Unauthorized attempt', {
          hasToken: !!token,
          hasExpectedToken: !!expectedToken,
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Warm cache by preloading common endpoints
    const endpoints = [
      '/api/woocommerce?endpoint=products&per_page=10',
      '/api/woocommerce?endpoint=products/categories',
      '/api/woocommerce?endpoint=system_status',
      '/api/health',
    ];

    const results = await Promise.allSettled(
      endpoints.map(async endpoint => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${endpoint}`
        );
        return { endpoint, status: response.status };
      })
    );

    const successful = results.filter(
      result => result.status === 'fulfilled'
    ).length;
    const failed = results.filter(
      result => result.status === 'rejected'
    ).length;

    const response = NextResponse.json({
      success: true,
      message: 'Cache warmed successfully',
      results: {
        successful,
        failed,
        total: endpoints.length,
      },
      timestamp: new Date().toISOString(),
    });
    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('Cache warm error', { error });
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: 'Failed to warm cache',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}
