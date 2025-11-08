import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { errorTrackingSchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sanitizedBody = validateApiInput(body);
    const validationResult = errorTrackingSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError('Nieprawidłowe dane raportu błędów', validationResult.error.errors),
        { endpoint: 'error-tracking', method: 'POST' }
      );
    }

    const { type, data } = validationResult.data;

    if (type === 'errors') {
      logger.error('Error Tracking Report', {
        count: data.length,
        errors: data.map((error) => ({
          message: error.message,
          category: error.category,
          level: error.level,
          url: error.url,
          timestamp: error.timestamp,
          metadata: error.metadata,
        })),
      });

      if (process.env.NODE_ENV === 'development') {
        logger.debug('Dev error report (console mirror)', {
          entries: data.map((error, index) => ({
            index,
            level: (error.level || 'info').toUpperCase(),
            category: error.category || 'general',
            message: error.message,
            url: error.url,
            timestamp: error.timestamp,
            metadata: error.metadata ? '[metadata]' : undefined
          }))
        });
      }
    } else if (type === 'performance') {
      logger.info('Performance Metrics Report', {
        count: data.length,
        metrics: data,
      });

      if (process.env.NODE_ENV === 'development') {
        logger.debug('Dev performance metrics (console mirror)', {
          entries: data.map((metric, index) => ({ index, metric }))
        });
      }
    }

    return NextResponse.json({ success: true, processed: data.length });
  } catch (error) {
    logger.error('Error tracking endpoint failed', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to process tracking data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    features: ['error-tracking', 'performance-monitoring'],
    version: '1.0.0',
  });
}
