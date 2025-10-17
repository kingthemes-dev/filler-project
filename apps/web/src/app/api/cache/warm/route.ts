import { NextRequest, NextResponse } from 'next/server';
import { warmCache, getCacheWarmingStatus } from '@/utils/cache-warming';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { config } = body;

    // Start cache warming
    warmCache(config);

    return NextResponse.json({
      success: true,
      message: 'Cache warming started',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cache warming API error:', error);
    return NextResponse.json(
      { error: 'Failed to start cache warming' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = getCacheWarmingStatus();

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cache warming status API error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache warming status' },
      { status: 500 }
    );
  }
}

