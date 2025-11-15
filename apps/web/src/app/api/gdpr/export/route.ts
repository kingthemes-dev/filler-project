/**
 * GDPR Data Export API Endpoint
 * GET /api/gdpr/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { checkApiRateLimit, addSecurityHeaders } from '@/utils/api-security';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { gdprExportQuerySchema } from '@/lib/schemas/gdpr';
import {
  exportCustomerData,
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

    // Log to console (in production, this should be stored in a database)
    logger.info('GDPR request logged', auditLog as unknown as Record<string, unknown>);

    // TODO: Store in database for audit trail
    // await db.gdprAuditLogs.insert(auditLog);
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
 * GET /api/gdpr/export - Export user data
 */
export async function GET(request: NextRequest) {
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

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      format: searchParams.get('format') || 'json',
    };

    const validationResult = gdprExportQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Invalid query parameters',
          validationResult.error.errors
        ),
        { endpoint: 'gdpr/export', method: 'GET' }
      );
    }

    const { format } = validationResult.data;

    // Get client IP and user agent for audit log
    const clientIp = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Log GDPR request
    await logGDPRRequest(
      auth.userId,
      'export',
      { format },
      clientIp,
      userAgent
    );

    // Export customer data
    const exportData = await exportCustomerData(
      auth.userId,
      auth.email
    );

    // Format response based on requested format
    if (format === 'json') {
      const response = NextResponse.json(
        {
          success: true,
          data: exportData,
          message: 'Data exported successfully',
        },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="gdpr-export-${auth.userId}-${Date.now()}.json"`,
          },
        }
      );
      return addSecurityHeaders(response);
    }

    // For PDF/CSV formats, return data with instructions
    // (PDF/CSV generation should be implemented separately)
    const response = NextResponse.json(
      {
        success: true,
        data: exportData,
        message: `Data exported in ${format} format. PDF/CSV generation not yet implemented.`,
        download_url: `/api/gdpr/export/download?format=${format}&token=${encodeURIComponent(request.headers.get('authorization') || '')}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      },
      {
        status: 200,
      }
    );
    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('GDPR export error', {
      error: error instanceof Error ? error.message : String(error),
    });

    const errorResponse = NextResponse.json(
      {
        error: 'Failed to export data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}

