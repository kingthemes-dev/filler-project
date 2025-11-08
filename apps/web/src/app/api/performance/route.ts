import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { logger } from '@/utils/logger';
import { performanceReportSchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sanitizedBody = validateApiInput(body);
    const validationResult = performanceReportSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError('Nieprawidłowe dane raportu wydajności', validationResult.error.errors),
        { endpoint: 'performance', method: 'POST' }
      );
    }

    const { type, data } = validationResult.data;

    if (type === 'performance') {
      logger.info('Performance Metrics Report', {
        count: data.length,
        metrics: data.map((metric) => ({
          name: metric.name,
          value: metric.value,
          url: metric.url,
          timestamp: metric.timestamp,
          metadata: metric.metadata,
        })),
      });

      if (process.env.NODE_ENV === 'development') {
        logger.debug('Dev performance metrics', {
          entries: data.map((metric, index) => ({
            index,
            name: metric.name,
            value: metric.value,
            url: metric.url,
            timestamp: metric.timestamp,
            metadata: metric.metadata ? '[metadata]' : undefined
          }))
        });
      }
    }

    return NextResponse.json({ success: true, processed: data.length });
  } catch (error) {
    logger.error('Performance endpoint failed', { error });
    return NextResponse.json({ success: false, error: 'Failed to process performance data' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    features: ['web-vitals', 'api-monitoring', 'bundle-size', 'memory-usage'],
    version: '1.0.0',
  });
}
