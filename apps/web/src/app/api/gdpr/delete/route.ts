/**
 * GDPR Data Deletion API Endpoint
 * POST /api/gdpr/delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { checkApiRateLimit, addSecurityHeaders } from '@/utils/api-security';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { gdprDeleteRequestSchema } from '@/lib/schemas/gdpr';
import {
  anonymizeCustomerData,
  fetchCustomerData,
} from '../woocommerce-data';
import { getClientIP } from '@/utils/client-ip';
import type { GDPRAuditLog } from '@/types/gdpr';

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
 * POST /api/gdpr/delete - Delete user data
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
    const validationResult = gdprDeleteRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Invalid request data',
          validationResult.error.errors
        ),
        { endpoint: 'gdpr/delete', method: 'POST' }
      );
    }

    const { email, confirmation, reason } = validationResult.data;

    // Verify email matches authenticated user
    if (email !== auth.email) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Email does not match authenticated user',
        },
        { status: 403 }
      );
    }

    // Verify confirmation
    if (!confirmation) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Confirmation is required to delete data',
        },
        { status: 400 }
      );
    }

    // Get client IP and user agent for audit log
    const clientIp = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Log GDPR request
    await logGDPRRequest(
      auth.userId,
      'delete',
      { email, reason },
      clientIp,
      userAgent
    );

    // Anonymize customer data in WooCommerce
    const anonymized = await anonymizeCustomerData(auth.userId);

    if (!anonymized) {
      return NextResponse.json(
        {
          error: 'Failed to delete data',
          message: 'An error occurred while deleting your data',
        },
        { status: 500 }
      );
    }

    // Data that must be retained for legal reasons (e.g., invoices)
    const dataRetained = [
      'Faktury (wymagane prawnie - 5 lat)',
      'Dane zamówień (wymagane prawnie - 5 lat)',
    ];

    const response = NextResponse.json(
      {
        success: true,
        message: 'Twoje dane zostały usunięte/anonimizowane',
        anonymized_at: new Date().toISOString(),
        data_retained: dataRetained,
      },
      { status: 200 }
    );
    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('GDPR delete error', {
      error: error instanceof Error ? error.message : String(error),
    });

    const errorResponse = NextResponse.json(
      {
        error: 'Failed to delete data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}

