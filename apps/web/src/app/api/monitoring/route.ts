/**
 * HPOS Performance Monitoring API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { hposPerformanceMonitor } from '@/services/hpos-performance-monitor';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'summary';

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

      case 'timeseries':
        const key = searchParams.get('key');
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        if (!key) {
          return NextResponse.json(
            { error: 'Key parameter is required for timeseries' },
            { status: 400 }
          );
        }

        const timeRange = start && end ? {
          start: parseInt(start),
          end: parseInt(end),
        } : undefined;

        return NextResponse.json({
          success: true,
          data: hposPerformanceMonitor.getTimeSeriesData(key, timeRange),
        });

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
    console.error('Performance monitoring API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
