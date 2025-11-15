/**
 * ISR Revalidation Endpoint
 * Triggered by webhooks to invalidate cache
 */

import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { env } from '@/config/env';
import { revalidatePath, revalidateTag } from 'next/cache';
import { revalidateSchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';
import { addSecurityHeaders } from '@/utils/api-security';
import { checkApiRateLimit } from '@/utils/api-security';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Security check: rate limiting only (admin endpoint, no CSRF)
  const rateLimitCheck = await checkApiRateLimit(request);
  
  if (!rateLimitCheck.allowed) {
    return rateLimitCheck.response || NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const expectedToken = env.REVALIDATE_SECRET;

    if (
      !authHeader ||
      !expectedToken ||
      authHeader !== `Bearer ${expectedToken}`
    ) {
      logger.warn('Revalidate: Unauthorized attempt', {
        hasAuthHeader: !!authHeader,
        hasExpectedToken: !!expectedToken,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const rawBody = await request.json().catch(() => ({}));
    const sanitizedBody = validateApiInput(rawBody);
    const validationResult = revalidateSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Invalid revalidation data',
          validationResult.error.errors
        ),
        { endpoint: 'revalidate', method: 'POST' }
      );
    }

    const { paths, tags } = validationResult.data;

    const results = [];

    // Revalidate paths (already validated by schema)
    if (paths && paths.length > 0) {
      for (const path of paths) {
        try {
          revalidatePath(path);
          results.push({ path, status: 'revalidated' });
          logger.info('Path revalidated', { path });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          results.push({ path, status: 'error', error: errorMessage });
          logger.error('Path revalidation failed', {
            path,
            error: errorMessage,
          });
        }
      }
    }

    // Revalidate tags (already validated by schema)
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        try {
          revalidateTag(tag);
          results.push({ tag, status: 'revalidated' });
          logger.info('Tag revalidated', { tag });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          results.push({ tag, status: 'error', error: errorMessage });
          logger.error('Tag revalidation failed', { tag, error: errorMessage });
        }
      }
    }

    logger.info('Revalidation completed', {
      pathsCount: paths?.length || 0,
      tagsCount: tags?.length || 0,
      resultsCount: results.length,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Revalidation completed',
      results,
      timestamp: new Date().toISOString(),
    });
    return addSecurityHeaders(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Revalidation failed', { error: errorMessage });
    const errorResponse = NextResponse.json(
      { error: 'Revalidation failed', message: errorMessage },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}

export async function GET(): Promise<NextResponse> {
  const response = NextResponse.json({
    status: 'ok',
    message: 'Revalidation endpoint is active',
    timestamp: new Date().toISOString(),
  });
  return addSecurityHeaders(response);
}
