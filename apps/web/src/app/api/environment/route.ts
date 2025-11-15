import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const environment = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      nextVersion: '15.5.2',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cwd: process.cwd(),
      pid: process.pid,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      environment,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get environment info',
      },
      { status: 500 }
    );
  }
}
