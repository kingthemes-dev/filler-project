import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { env } from '@/config/env';
import { addSecurityHeaders } from '@/utils/api-security';
import { logger } from '@/utils/logger';
import { createErrorResponse, InternalError } from '@/lib/errors';

/**
 * GET /api/settings/status
 * Admin endpoint - returns system settings status
 * Requires ADMIN_CACHE_TOKEN authorization
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authorization (admin endpoint)
    // Check token from cookie (set by admin login) or header
    const adminToken =
      request.headers.get('x-admin-token') ||
      request.cookies.get('admin-token')?.value;
    const expectedToken = env.ADMIN_CACHE_TOKEN || process.env.ADMIN_TOKEN;

    if (!adminToken || !expectedToken || adminToken !== expectedToken) {
      logger.warn('Settings status: Unauthorized attempt', {
        hasToken: !!adminToken,
        hasExpectedToken: !!expectedToken,
      });
      const errorResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      return addSecurityHeaders(errorResponse);
    }

    // Check environment variables (server-side only)
    // Mask secrets - only show if configured (not actual values)
    const woocommerce = {
      url: (env.NEXT_PUBLIC_WORDPRESS_URL || '') + '/wp-json/wc/v3',
      consumerKey: env.WC_CONSUMER_KEY ? '***configured***' : '',
      consumerSecret: env.WC_CONSUMER_SECRET ? '***configured***' : '',
      webhookSecret: env.WOOCOMMERCE_WEBHOOK_SECRET ? '***configured***' : '',
    };

    const redis = {
      url: process.env.REDIS_URL ? '***configured***' : '',
      enabled: !!process.env.REDIS_URL,
    };

    const performance = {
      cacheEnabled: true,
      cacheTtl: 60,
      monitoringEnabled: true,
    };

    const security = {
      csrfEnabled: true,
      rateLimitEnabled: true,
      corsEnabled: true,
    };

    const response = NextResponse.json({
      woocommerce,
      redis,
      performance,
      security,
    });
    return addSecurityHeaders(response);
  } catch (error) {
    // Mask secrets in error before logging
    const isProduction = process.env.NODE_ENV === 'production';
    const errorMessage = error instanceof Error ? error.message : String(error);
    const maskedMessage = isProduction
      ? errorMessage.replace(/consumer_key|consumer_secret|api_key|token|password/gi, '***masked***')
      : errorMessage;
    
    logger.error('Error fetching settings status', {
      error: isProduction ? maskedMessage : error,
    });
    
    // Use createErrorResponse for consistent error handling (masks secrets in production)
    const errorResponse = createErrorResponse(
      new InternalError(
        'Failed to fetch settings status',
        isProduction ? undefined : { originalError: errorMessage }
      ),
      { endpoint: 'settings/status', method: 'GET' }
    );
    return addSecurityHeaders(errorResponse);
  }
}
