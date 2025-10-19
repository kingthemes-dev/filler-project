/**
 * ISR Revalidation Endpoint
 * Triggered by webhooks to invalidate cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.REVALIDATE_SECRET;
    
    if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { paths, tags } = body;

    if (!paths && !tags) {
      return NextResponse.json(
        { error: 'No paths or tags provided' },
        { status: 400 }
      );
    }

    const results = [];

    // Revalidate paths
    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        try {
          revalidatePath(path);
          results.push({ path, status: 'revalidated' });
          console.log(`✅ Path revalidated: ${path}`);
        } catch (error) {
          results.push({ path, status: 'error', error: error.message });
          console.error(`❌ Path revalidation failed: ${path}`, error);
        }
      }
    }

    // Revalidate tags
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        try {
          revalidateTag(tag);
          results.push({ tag, status: 'revalidated' });
          console.log(`✅ Tag revalidated: ${tag}`);
        } catch (error) {
          results.push({ tag, status: 'error', error: error.message });
          console.error(`❌ Tag revalidation failed: ${tag}`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Revalidation completed',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Revalidation failed:', error);
    return NextResponse.json(
      { error: 'Revalidation failed', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    message: 'Revalidation endpoint is active',
    timestamp: new Date().toISOString(),
  });
}