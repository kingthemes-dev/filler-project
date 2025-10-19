/**
 * Health Check Endpoint
 * System health monitoring and diagnostics
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  services: {
    redis: ServiceStatus;
    wordpress: ServiceStatus;
    database: ServiceStatus;
  };
  performance: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      load: number;
    };
  };
  circuitBreakers?: any;
  cache?: any;
  version: string;
  environment: string;
}

interface ServiceStatus {
  status: 'ok' | 'error' | 'unknown' | 'degraded';
  responseTime?: number;
  lastCheck: string;
  error?: string;
  message?: string;
}

class HealthChecker {
  private redis: Redis | null = null;
  private startTime: number = Date.now();

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          connectTimeout: 5000,
          commandTimeout: 3000,
        });
      }
    } catch (error) {
      console.warn('Health check: Redis not available', error);
    }
  }

  /**
   * Check Redis connection
   */
  private async checkRedis(): Promise<ServiceStatus> {
    if (!this.redis) {
      return {
        status: 'ok',
        lastCheck: new Date().toISOString(),
        message: 'Using in-memory cache fallback',
      };
    }

    try {
      const startTime = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'ok',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      // Redis is not available - return degraded instead of error
      return {
        status: 'degraded',
        lastCheck: new Date().toISOString(),
        error: 'Redis connection failed - using memory cache fallback',
      };
    }
  }

  /**
   * Check WordPress API
   */
  private async checkWordPress(): Promise<ServiceStatus> {
    try {
      const startTime = Date.now();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        status: 'ok',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check database (WooCommerce API)
   */
  private async checkDatabase(): Promise<ServiceStatus> {
    try {
      const startTime = Date.now();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_WC_URL}/products?per_page=1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(
              `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`
            ).toString('base64')}`,
          },
          signal: AbortSignal.timeout(5000),
        }
      );

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        status: 'ok',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): { used: number; total: number; percentage: number } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      const used = memory.heapUsed;
      const total = memory.heapTotal;
      const percentage = Math.round((used / total) * 100);

      return { used, total, percentage };
    }

    return { used: 0, total: 0, percentage: 0 };
  }

  /**
   * Get CPU load (simplified)
   */
  private getCpuLoad(): { load: number } {
    // In a real implementation, you'd use a library like 'os' or 'systeminformation'
    // For now, return a placeholder
    return { load: 0 };
  }

  /**
   * Check Circuit Breakers
   */
  private async checkCircuitBreakers(): Promise<any> {
    try {
      const { circuitBreakers } = await import('@/utils/circuit-breaker');
      return {
        wordpress: circuitBreakers.wordpress.getStats(),
        api: circuitBreakers.api.getStats(),
        external: circuitBreakers.external.getStats()
      };
    } catch (error) {
      console.warn('Circuit breaker stats not available:', error);
      return {
        wordpress: { state: 'UNKNOWN', failureRate: 0 },
        api: { state: 'UNKNOWN', failureRate: 0 },
        external: { state: 'UNKNOWN', failureRate: 0 }
      };
    }
  }

  /**
   * Check Cache Status
   */
  private async checkCache(): Promise<any> {
    try {
      const { cache } = await import('@/lib/cache');
      const stats = cache.getStats();
      return {
        status: 'ok',
        ...stats
      };
    } catch (error) {
      console.warn('Cache stats not available:', error);
      return {
        status: 'error',
        size: 0,
        entries: 0
      };
    }
  }

  /**
   * Perform comprehensive health check
   */
  async checkHealth(): Promise<HealthStatus> {
    const [redisStatus, wordpressStatus, databaseStatus, circuitBreakers, cacheStatus] = await Promise.all([
      this.checkRedis(),
      this.checkWordPress(),
      this.checkDatabase(),
      this.checkCircuitBreakers(),
      this.checkCache(),
    ]);

    const memory = this.getMemoryUsage();
    const cpu = this.getCpuLoad();

    // Determine overall status
    const serviceStatuses = [redisStatus, wordpressStatus, databaseStatus];
    const errorCount = serviceStatuses.filter(s => s.status === 'error').length;
    const unknownCount = serviceStatuses.filter(s => s.status === 'unknown').length;

    let overallStatus: 'ok' | 'degraded' | 'error';
    if (errorCount === 0) {
      overallStatus = 'ok';
    } else if (errorCount === 1 || unknownCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'error';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        redis: redisStatus,
        wordpress: wordpressStatus,
        database: databaseStatus,
      },
      performance: {
        memory,
        cpu,
      },
      circuitBreakers,
      cache: cacheStatus,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}

const healthChecker = new HealthChecker();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const health = await healthChecker.checkHealth();
    
    const statusCode = health.status === 'ok' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  // Simple health check for load balancers
  try {
    const health = await healthChecker.checkHealth();
    const statusCode = health.status === 'ok' ? 200 : 503;
    
    return new NextResponse(null, { status: statusCode });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}