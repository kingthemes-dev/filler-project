import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { performanceMonitor } from '@/utils/performance-monitor';
import { logger } from '@/utils/logger';
import { checkEndpointRateLimit } from '@/utils/rate-limiter';
import { getClientIP } from '@/utils/client-ip';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIP(request);
    const path = request.nextUrl.pathname;
    const rateLimitResult = await checkEndpointRateLimit(path, clientIp);

    if (!rateLimitResult.allowed) {
      logger.warn('Performance stats: Rate limit exceeded', {
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

    const stats = performanceMonitor.getStats();

    return NextResponse.json({
      ...stats,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  } catch (error) {
    logger.error('Performance stats error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch performance stats' },
      { status: 500 }
    );
  }
}
