import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/utils/performance-monitor';
import { performanceMetricsSchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';
import { checkEndpointRateLimit } from '@/utils/rate-limiter';
import { getClientIP } from '@/utils/client-ip';

type MetricMetadata = Record<string, unknown>;
type MetricRecord = {
  name: string;
  value: number;
  timestamp?: string;
  url?: string;
  metadata?: MetricMetadata;
};

interface MetricObject {
  value: number;
  timestamp?: string;
  url?: string;
  metadata?: MetricMetadata;
}

function isMetricObject(value: unknown): value is MetricObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof (value as Record<string, unknown>).value === 'number'
  );
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIP(request);
    const path = request.nextUrl.pathname;
    const rateLimitResult = await checkEndpointRateLimit(path, clientIp);

    if (!rateLimitResult.allowed) {
      logger.warn('Performance metrics: Rate limit exceeded', {
        ip: clientIp,
        remaining: rateLimitResult.remaining,
      });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimitResult.retryAfter || 60) },
        }
      );
    }

    const body = await request.json();
    const sanitizedBody = validateApiInput(body);
    const validationResult = performanceMetricsSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Nieprawidłowe dane metryk wydajności',
          validationResult.error.errors
        ),
        { endpoint: 'performance/metrics', method: 'POST' }
      );
    }

    const payload = validationResult.data;

    const metrics: MetricRecord[] = [];

    if (Array.isArray(payload.metrics)) {
      metrics.push(...payload.metrics);
    } else if (payload.metrics && typeof payload.metrics === 'object') {
      Object.entries(payload.metrics).forEach(([name, value]) => {
        if (typeof value === 'number') {
          metrics.push({
            name,
            value,
            timestamp: payload.timestamp || new Date().toISOString(),
            url: payload.url || 'unknown',
            metadata: payload.metadata || {},
          });
        } else if (isMetricObject(value)) {
          const metricObj = value;
          metrics.push({
            name,
            value: metricObj.value,
            timestamp:
              metricObj.timestamp ||
              payload.timestamp ||
              new Date().toISOString(),
            url: metricObj.url || payload.url || 'unknown',
            metadata: metricObj.metadata || payload.metadata || {},
          });
        }
      });
    }

    const directMetrics: Array<{ key: string; name: string }> = [
      { key: 'lcpTime', name: 'lcp' },
      { key: 'clsScore', name: 'cls' },
      { key: 'fidTime', name: 'fid' },
      { key: 'ttfbTime', name: 'ttfb' },
      { key: 'loadTime', name: 'load' },
    ];

    directMetrics.forEach(({ key, name }) => {
      const value = (payload as Record<string, unknown>)[key];
      if (typeof value === 'number') {
        metrics.push({
          name,
          value,
          timestamp: payload.timestamp || new Date().toISOString(),
          url: payload.url || 'unknown',
          metadata: payload.metadata || {},
        });
      }
    });

    if (metrics.length === 0) {
      return NextResponse.json(
        { error: 'Brak metryk do zapisania' },
        { status: 400 }
      );
    }

    for (const metric of metrics) {
      try {
        performanceMonitor.recordMetric({
          name: metric.name,
          value: metric.value,
          timestamp: metric.timestamp || new Date().toISOString(),
          url: metric.url || 'unknown',
          metadata: metric.metadata || {},
        });
      } catch (error: unknown) {
        logger.warn('Failed to process metric', {
          metric,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: metrics.length,
      message: 'Metrics recorded successfully',
    });
  } catch (error) {
    const err =
      error instanceof Error
        ? error
        : new Error('Unknown metrics processing error');
    logger.error('Error processing performance metrics', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: err.message || 'Failed to process metrics' },
      { status: 500 }
    );
  }
}
