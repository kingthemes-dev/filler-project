import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Log to console with proper formatting
    if (type === 'errors') {
      logger.error('Error Tracking Report', {
        count: data.length,
        errors: data.map((error: any) => ({
          message: error.message,
          category: error.category,
          level: error.level,
          url: error.url,
          timestamp: error.timestamp,
        })),
      });

      // Store in localStorage for development (in production, this would go to a database)
      if (process.env.NODE_ENV === 'development') {
        console.group('🚨 Error Tracking Report');
        data.forEach((error: any, index: number) => {
          console.log(`${index + 1}. [${error.level.toUpperCase()}] ${error.category}`);
          console.log(`   Message: ${error.message}`);
          console.log(`   URL: ${error.url}`);
          console.log(`   Time: ${error.timestamp}`);
          if (error.metadata) {
            console.log(`   Metadata:`, error.metadata);
          }
        });
        console.groupEnd();
      }
    } else if (type === 'performance') {
      logger.info('Performance Metrics Report', {
        count: data.length,
        metrics: data.map((metric: any) => ({
          name: metric.name,
          value: metric.value,
          url: metric.url,
          timestamp: metric.timestamp,
        })),
      });

      // Log performance metrics
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
