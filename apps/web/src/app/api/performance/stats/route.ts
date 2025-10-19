import { NextResponse } from 'next/server';
import { performanceMonitor } from '@/utils/performance-monitor';

export async function GET() {
  try {
    const stats = performanceMonitor.getStats();
    
    return NextResponse.json({
      ...stats,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Error fetching performance stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance stats' },
      { status: 500 }
    );
  }
}
