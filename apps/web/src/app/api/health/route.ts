import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      // Check external dependencies
      dependencies: {
        wordpress: await checkWordPressHealth(),
        redis: await checkRedisHealth(),
      }
    };

    return NextResponse.json(healthData, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Health check failed',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? error : undefined
      }, 
      { status: 500 }
    );
  }
}

async function checkWordPressHealth(): Promise<{ status: string; responseTime?: number }> {
  try {
    const start = Date.now();
    const response = await fetch(`${process.env.WP_BASE_URL}/wp-json/wp/v2/posts?per_page=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Filler-Health-Check/1.0'
      },
      signal: AbortSignal.timeout(5000) // 5s timeout
    });
    
    const responseTime = Date.now() - start;
    
    if (response.ok) {
      return { status: 'ok', responseTime };
    } else {
      return { status: 'error', responseTime };
    }
  } catch (error) {
    return { status: 'error' };
  }
}

async function checkRedisHealth(): Promise<{ status: string }> {
  try {
    // TODO: Implement Redis health check when Redis is added
    return { status: 'not_configured' };
  } catch (error) {
    return { status: 'error' };
  }
}

