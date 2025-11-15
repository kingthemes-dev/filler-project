import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

// Liveness: minimalne potwierdzenie, że proces żyje
export async function GET(_req: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    {
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: typeof process !== 'undefined' ? process.pid : 'edge',
      uptime: typeof process !== 'undefined' ? process.uptime() : 0,
      environment: process.env.NODE_ENV || 'development',
    },
    { status: 200 }
  );
}

export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200 });
}
