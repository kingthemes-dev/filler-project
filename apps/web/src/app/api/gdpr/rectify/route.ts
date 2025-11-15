/**
 * GDPR Data Rectification API Endpoint
 * POST /api/gdpr/rectify
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { checkApiRateLimit, addSecurityHeaders } from '@/utils/api-security';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { gdprRectifyRequestSchema } from '@/lib/schemas/gdpr';
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

    logger.info('GDPR request logged', auditLog as Record<string, unknown>);
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
 * Update customer field in WooCommerce
 */
async function updateCustomerField(
  customerId: number,
  field: string,
  newValue: string
): Promise<boolean> {
  try {
    const auth = Buffer.from(
      `${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`
    ).toString('base64');

    // Map field names to WooCommerce customer structure
    const updateData: Record<string, unknown> = {};

    if (field.startsWith('billing.')) {
      const billingField = field.replace('billing.', '');
      updateData.billing = {
        [billingField]: newValue,
      };
    } else if (field.startsWith('shipping.')) {
      const shippingField = field.replace('shipping.', '');
      updateData.shipping = {
        [shippingField]: newValue,
      };
    } else {
      updateData[field] = newValue;
    }

    const response = await fetch(
      `${env.NEXT_PUBLIC_WC_URL}/customers/${customerId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      logger.error('Failed to update customer field', {
        customerId,
        field,
        status: response.status,
      });
      return false;
    }

    logger.info('Customer field updated', { customerId, field });
    return true;
  } catch (error) {
    logger.error('Error updating customer field', {
      customerId,
      field,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * POST /api/gdpr/rectify - Rectify user data
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
    const validationResult = gdprRectifyRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Invalid request data',
          validationResult.error.errors
        ),
        { endpoint: 'gdpr/rectify', method: 'POST' }
      );
    }

    const { field, old_value, new_value, reason } = validationResult.data;

    // Get client IP and user agent for audit log
    const clientIp = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Log GDPR request
    await logGDPRRequest(
      auth.userId,
      'rectify',
      { field, old_value, new_value, reason },
      clientIp,
      userAgent
    );

    // Update customer field
    const updated = await updateCustomerField(auth.userId, field, new_value);

    if (!updated) {
      return NextResponse.json(
        {
          error: 'Failed to update data',
          message: 'An error occurred while updating your data',
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        message: 'Dane zostały zaktualizowane',
        updated_field: field,
      },
      { status: 200 }
    );
    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('GDPR rectify error', {
      error: error instanceof Error ? error.message : String(error),
    });

    const errorResponse = NextResponse.json(
      {
        error: 'Failed to update data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}

