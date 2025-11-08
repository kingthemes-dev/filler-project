import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { performanceMonitor } from '@/utils/performance-monitor';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    const stats = performanceMonitor.getStats();
    
    return NextResponse.json({
      ...stats,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    logger.error('Performance stats error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch performance stats' },
      { status: 500 }
    );
  }
}
