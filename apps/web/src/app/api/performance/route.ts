import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Log performance data
    if (type === 'performance') {
      logger.info('Performance Metrics Report', {
        count: data.length,
        metrics: data.map((metric: any) => ({
          name: metric.name,
          value: metric.value,
          url: metric.url,
          timestamp: metric.timestamp,
        })),
      });

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('⚡ Performance Metrics Report');
        data.forEach((metric: any, index: number) => {
          console.log(`${index + 1}. ${metric.name}: ${metric.value}ms`);
          console.log(`   URL: ${metric.url}`);
          console.log(`   Time: ${metric.timestamp}`);
          if (metric.metadata) {
            console.log(`   Metadata:`, metric.metadata);
          }
        });
        console.groupEnd();
      }
    }

    return NextResponse.json({ success: true, processed: data.length });
  } catch (error) {
    logger.error('Performance endpoint failed', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to process performance data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    features: ['web-vitals', 'api-monitoring', 'bundle-size', 'memory-usage'],
    version: '1.0.0',
  });
}
