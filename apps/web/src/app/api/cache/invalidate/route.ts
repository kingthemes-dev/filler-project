import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache';
import { logger } from '@/utils/logger';

/**
 * Cache Invalidation Webhook Endpoint
 * Invalidates cache by tags (e.g., product:123, category:5)
 * 
 * POST /api/cache/invalidate
 * Body: { tags: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tags } = body;

    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'tags must be a non-empty array',
        },
        { status: 400 }
      );
    }

    // Invalidate cache by tags
    const deletedCount = await cache.invalidateByTags(tags);

    logger.info('Cache invalidated by tags', {
      tags,
      deletedCount,
    });

    return NextResponse.json(
      {
        success: true,
        tags,
        deletedCount,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    logger.error('Cache invalidation error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to invalidate cache',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

