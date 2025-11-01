import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST(_request: NextRequest): Promise<NextResponse> {
  try {
    // Warm cache by preloading common endpoints
    const endpoints = [
      '/api/woocommerce?endpoint=products&per_page=10',
      '/api/woocommerce?endpoint=products/categories',
      '/api/woocommerce?endpoint=system_status',
      '/api/health'
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${endpoint}`);
        return { endpoint, status: response.status };
      })
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: 'Cache warmed successfully',
      results: {
        successful,
        failed,
        total: endpoints.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error warming cache:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to warm cache',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}