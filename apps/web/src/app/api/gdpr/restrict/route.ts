/**
 * GDPR Data Restriction API Endpoint
 * POST /api/gdpr/restrict
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { checkApiRateLimit, addSecurityHeaders } from '@/utils/api-security';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { gdprRestrictRequestSchema } from '@/lib/schemas/gdpr';
import { getClientIP } from '@/utils/client-ip';
import type { GDPRAuditLog } from '@/types/gdpr';
import { env } from '@/config/env';

export const runtime = 'nodejs';

/**
 * Log GDPR request for audit trail
 */
async function logGDPRRequest(
  userId: number,
  action: 'export' | 'delete' | 'portability' | 'restrict' | 'rectify',
  details: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const auditLog: GDPRAuditLog = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      action,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    };

    logger.info('GDPR request logged', auditLog as unknown as Record<string, unknown>);
  } catch (error) {
    logger.error('Failed to log GDPR request', { error });
  }
}

/**
 * Verify JWT token and get user ID
 */
async function verifyAuthToken(
  request: NextRequest
): Promise<{ userId: number; email: string } | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.replace('Bearer ', '');
    const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;

    if (!wordpressUrl) {
      logger.error('WordPress URL not configured');
      return null;
    }

    // Verify JWT token with WooCommerce JWT endpoint
    const response = await fetch(
      `${wordpressUrl}/wp-json/king-jwt/v1/validate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      }
    );

    if (!response.ok) {
      logger.error('JWT token validation failed', {
        status: response.status,
      });
      return null;
    }

    const data = (await response.json()) as {
      success: boolean;
      data?: {
        id: number;
        email: string;
        name?: string;
      };
    };

    if (!data.success || !data.data) {
      return null;
    }

    return {
      userId: data.data.id,
      email: data.data.email,
    };
  } catch (error) {
    logger.error('Error verifying auth token', { error });
    return null;
  }
}

/**
 * Restrict processing for customer in WooCommerce
 */
async function restrictCustomerProcessing(
  customerId: number,
  categories: Array<'marketing' | 'analytics' | 'preferences'>
): Promise<boolean> {
  try {
    const auth = Buffer.from(
      `${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`
    ).toString('base64');

    // Add meta data to customer indicating restricted processing
    const metaData = [
      {
        key: '_gdpr_restricted',
        value: 'true',
      },
      {
        key: '_gdpr_restricted_at',
        value: new Date().toISOString(),
      },
      {
        key: '_gdpr_restricted_categories',
        value: JSON.stringify(categories),
      },
    ];

    const response = await fetch(
      `${env.NEXT_PUBLIC_WC_URL}/customers/${customerId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meta_data: metaData,
        }),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      logger.error('Failed to restrict customer processing', {
        customerId,
        status: response.status,
      });
      return false;
    }

    logger.info('Customer processing restricted', { customerId, categories });
    return true;
  } catch (error) {
    logger.error('Error restricting customer processing', {
      customerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * POST /api/gdpr/restrict - Restrict data processing
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitCheck = await checkApiRateLimit(request);
  if (!rateLimitCheck.allowed) {
    return (
      rateLimitCheck.response ||
      NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    );
  }

  try {
    // Verify authentication
    const auth = await verifyAuthToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing authentication token' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validationResult = gdprRestrictRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Invalid request data',
          validationResult.error.errors
        ),
        { endpoint: 'gdpr/restrict', method: 'POST' }
      );
    }

    const { categories, reason } = validationResult.data;

    // Get client IP and user agent for audit log
    const clientIp = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Log GDPR request
    await logGDPRRequest(
      auth.userId,
      'restrict',
      { categories, reason },
      clientIp,
      userAgent
    );

    // Restrict processing for customer
    const restricted = await restrictCustomerProcessing(
      auth.userId,
      categories
    );

    if (!restricted) {
      return NextResponse.json(
        {
          error: 'Failed to restrict processing',
          message: 'An error occurred while restricting data processing',
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        message: 'Przetwarzanie danych zostało ograniczone',
        restricted_categories: categories,
      },
      { status: 200 }
    );
    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('GDPR restrict error', {
      error: error instanceof Error ? error.message : String(error),
    });

    const errorResponse = NextResponse.json(
      {
        error: 'Failed to restrict processing',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}

