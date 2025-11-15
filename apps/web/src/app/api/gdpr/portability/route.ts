/**
 * GDPR Data Portability API Endpoint
 * POST /api/gdpr/portability
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { checkApiRateLimit, addSecurityHeaders } from '@/utils/api-security';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { gdprPortabilityRequestSchema } from '@/lib/schemas/gdpr';
import { exportCustomerData } from '@/app/api/gdpr/woocommerce-data';
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
 * Convert data to CSV format
 * Note: This is a simplified CSV conversion. For complex nested data,
 * consider using a proper CSV library or returning JSON instead.
 */
function convertToCSV(data: unknown): string {
  if (typeof data !== 'object' || data === null) {
    return '';
  }

  const dataObj = data as Record<string, unknown>;
  
  // For complex nested objects, serialize to JSON within CSV cells
  // This is a simplified approach - for production, consider flattening the structure
  const rows: string[] = [];
  const headers: string[] = [];
  const values: string[] = [];

  const processValue = (key: string, value: unknown): void => {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        headers.push(key);
        values.push(JSON.stringify(value));
      } else {
        // For nested objects, serialize to JSON
        headers.push(key);
        values.push(JSON.stringify(value));
      }
    } else {
      headers.push(key);
      values.push(String(value ?? ''));
    }
  };

  // Process all top-level fields
  Object.keys(dataObj).forEach(key => {
    processValue(key, dataObj[key]);
  });

  // Escape values for CSV
  const escapeCSV = (value: string): string => {
    // Replace quotes with double quotes and wrap in quotes
    return `"${value.replace(/"/g, '""')}"`;
  };

  // Add header row
  rows.push(headers.map(escapeCSV).join(','));
  
  // Add data row
  rows.push(values.map(escapeCSV).join(','));

  return rows.join('\n');
}

/**
 * POST /api/gdpr/portability - Export data in portable format
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
    const validationResult = gdprPortabilityRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Invalid request data',
          validationResult.error.errors
        ),
        { endpoint: 'gdpr/portability', method: 'POST' }
      );
    }

    const { format } = validationResult.data;

    // Get client IP and user agent for audit log
    const clientIp = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    // Log GDPR request
    await logGDPRRequest(
      auth.userId,
      'portability',
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
          message: 'Data exported in JSON format',
          download_url: `/api/gdpr/export/download?format=json&token=${encodeURIComponent(request.headers.get('authorization') || '')}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        },
        {
          status: 200,
        }
      );
      return addSecurityHeaders(response);
    }

    if (format === 'csv') {
      // Convert to CSV (simplified - in production, use a proper CSV library)
      // For nested objects, serialize to JSON within CSV cells
      const csvData = convertToCSV(exportData);

      const response = new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="gdpr-portability-${auth.userId}-${Date.now()}.csv"`,
        },
      });
      return addSecurityHeaders(response);
    }

    return NextResponse.json(
      { error: 'Invalid format', message: 'Format must be json or csv' },
      { status: 400 }
    );
  } catch (error) {
    logger.error('GDPR portability error', {
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

