import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { logger } from '@/utils/logger';

export async function POST(_request: NextRequest): Promise<NextResponse> {
  try {
    // Clear in-memory cache
    const { cache } = await import('@/lib/cache');
    await cache.clear();
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Cache clear error', { error });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
