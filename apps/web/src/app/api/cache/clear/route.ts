import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { logger } from '@/utils/logger';
import { env } from '@/config/env';
import { checkEndpointRateLimit } from '@/utils/rate-limiter';
import { getClientIP } from '@/utils/client-ip';
import { addSecurityHeaders } from '@/utils/api-security';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting (before auth to avoid wasting resources)
    const clientIp = getClientIP(request);
    const path = request.nextUrl.pathname;
    const rateLimitResult = await checkEndpointRateLimit(path, clientIp);

    if (!rateLimitResult.allowed) {
      logger.warn('Cache clear: Rate limit exceeded', {
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

    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const token =
      authHeader?.replace('Bearer ', '') ||
      request.headers.get('x-admin-token');
    const expectedToken =
      env.ADMIN_CACHE_TOKEN || process.env.ADMIN_CACHE_TOKEN;

    if (!token || !expectedToken || token !== expectedToken) {
      logger.warn('Cache clear: Unauthorized attempt', {
        hasToken: !!token,
        hasExpectedToken: !!expectedToken,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear in-memory cache
    const { cache } = await import('@/lib/cache');
    await cache.clear();

    logger.info('Cache cleared successfully', {
      timestamp: new Date().toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString(),
    });
    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('Cache clear error', { error });
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}
