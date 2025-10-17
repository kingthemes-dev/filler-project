import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Log analytics data
    if (type === 'events') {
      logger.info('Analytics Events Report', {
        count: data.length,
        events: data.map((event: any) => ({
          event_name: event.event_name,
          timestamp: event.timestamp,
          user_id: event.user_id,
          session_id: event.session_id,
        })),
      });

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.group('📊 Analytics Events Report');
        data.forEach((event: any, index: number) => {
          console.log(`${index + 1}. ${event.event_name}`);
          console.log(`   Time: ${event.timestamp}`);
          console.log(`   User: ${event.user_id || 'Anonymous'}`);
          console.log(`   Session: ${event.session_id}`);
          if (Object.keys(event.parameters).length > 0) {
            console.log(`   Parameters:`, event.parameters);
          }
        });
        console.groupEnd();
      }
    }

    return NextResponse.json({ success: true, processed: data.length });
  } catch (error) {
    logger.error('Analytics endpoint failed', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to process analytics data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    features: ['event-tracking', 'ecommerce-tracking', 'performance-tracking'],
    version: '1.0.0',
  });
}
