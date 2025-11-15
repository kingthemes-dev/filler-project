import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
import { edgeAnalyticsEventSchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';
import { checkApiRateLimit, addSecurityHeaders } from '@/utils/api-security';

type NextRequestWithGeo = NextRequest & {
  geo?: {
    country?: string;
    city?: string;
  };
  ip?: string | null;
};

export async function POST(request: NextRequest) {
  // Security check: rate limiting only (edge runtime, no CSRF)
  const rateLimitCheck = await checkApiRateLimit(request);
  
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response || NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  try {
    const body = await request.json();
    const sanitizedBody = validateApiInput(body);
    const validationResult = edgeAnalyticsEventSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Nieprawidłowe dane analityczne',
          validationResult.error.errors
        ),
        { endpoint: 'edge/analytics', method: 'POST' }
      );
    }

    const analyticsPayload = validationResult.data;

    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const referer = request.headers.get('referer') || 'Direct';
    const requestWithMeta = request as NextRequestWithGeo;
    const { geo } = requestWithMeta;
    const country =
      geo?.country || request.headers.get('x-vercel-ip-country') || 'Unknown';
    const city =
      geo?.city || request.headers.get('x-vercel-ip-city') || 'Unknown';
    const edgeIp =
      requestWithMeta.ip ||
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('x-vercel-ip') ||
      'Unknown';

    const analyticsEvent = {
      ...analyticsPayload,
      userAgent,
      referer,
      country,
      city,
      ip: edgeIp,
      processedAt: new Date().toISOString(),
    };

    logger.info('Edge analytics event', {
      event: analyticsEvent.event,
      country,
      city,
      referer,
      sessionId: analyticsEvent.sessionId,
    });

    const response = NextResponse.json(
      { success: true, eventId: `evt_${Date.now()}` },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
    return addSecurityHeaders(response);
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error('Edge analytics error');
    logger.error('Edge analytics error', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    const errorResponse = NextResponse.json(
      { error: 'Failed to process analytics event' },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}

export async function GET(_request: NextRequest) {
  try {
    // Get analytics summary (mock data for edge function)
    const summary = {
      totalEvents: 1234,
      uniqueUsers: 567,
      topCountries: [
        { country: 'PL', count: 456 },
        { country: 'DE', count: 234 },
        { country: 'US', count: 123 },
      ],
      topEvents: [
        { event: 'page_view', count: 789 },
        { event: 'product_view', count: 234 },
        { event: 'add_to_cart', count: 123 },
      ],
      timestamp: new Date().toISOString(),
    };

    const response = NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'CDN-Cache-Control': 'max-age=300',
        'Vercel-CDN-Cache-Control': 'max-age=300',
      },
    });
    return addSecurityHeaders(response);
  } catch {
    const errorResponse = NextResponse.json(
      { error: 'Failed to get analytics summary' },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}
