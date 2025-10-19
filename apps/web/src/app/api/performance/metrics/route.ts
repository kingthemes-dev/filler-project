import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/utils/performance-monitor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.metrics || !Array.isArray(body.metrics)) {
      return NextResponse.json(
        { error: 'Invalid metrics data' },
        { status: 400 }
      );
    }

    // Process each metric
    for (const metric of body.metrics) {
      try {
        // Add metric to performance monitor
        performanceMonitor.recordMetric({
          name: metric.name,
          value: metric.value,
          timestamp: metric.timestamp || new Date().toISOString(),
          url: metric.url || 'unknown',
          metadata: metric.metadata || {}
        });
      } catch (error) {
        console.warn('Failed to process metric:', metric, error);
      }
    }

    return NextResponse.json({
      success: true,
      processed: body.metrics.length,
      message: 'Metrics recorded successfully'
    });
  } catch (error) {
    console.error('Error processing performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 }
    );
  }
}
