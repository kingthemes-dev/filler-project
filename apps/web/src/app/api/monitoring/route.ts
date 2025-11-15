/**
 * HPOS Performance Monitoring API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { hposPerformanceMonitor } from '@/services/hpos-performance-monitor';
import { z } from 'zod';
import { logger } from '@/utils/logger';

const monitoringQuerySchema = z
  .object({
    action: z
      .enum(['summary', 'metrics', 'timeseries', 'reset'])
      .optional()
      .default('summary'),
    key: z.string().min(1).optional(),
    start: z.string().regex(/^\d+$/).optional(),
    end: z.string().regex(/^\d+$/).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'timeseries' && !value.key) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Parametr key jest wymagany dla timeseries',
        path: ['key'],
      });
    }
  });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = Object.fromEntries(searchParams.entries());
    const validationResult = monitoringQuerySchema.safeParse(rawQuery);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Nieprawidłowe parametry zapytania',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { action, key, start, end } = validationResult.data;

    switch (action) {
      case 'summary':
        return NextResponse.json({
          success: true,
          data: hposPerformanceMonitor.getPerformanceSummary(),
        });

      case 'metrics':
        return NextResponse.json({
          success: true,
          data: hposPerformanceMonitor.getMetrics(),
        });

      case 'timeseries': {
        const timeRange =
          start && end
            ? { start: parseInt(start, 10), end: parseInt(end, 10) }
            : undefined;
        return NextResponse.json({
          success: true,
          data: hposPerformanceMonitor.getTimeSeriesData(key!, timeRange),
        });
      }

      case 'reset':
        hposPerformanceMonitor.resetMetrics();
        return NextResponse.json({
          success: true,
          message: 'Metrics reset successfully',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Performance monitoring API error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
