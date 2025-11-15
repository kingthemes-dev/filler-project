import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache';
import { httpAgent } from '@/utils/http-agent';
import { requestDeduplicator } from '@/utils/request-deduplicator';
import { logger } from '@/utils/logger';
import { getCircuitBreakerState } from '@/utils/circuit-breaker';
import { getEndpointMetrics } from '@/utils/timeout-config';

/**
 * Performance Metrics Dashboard
 * Returns aggregated performance metrics including p50, p95, p99, cache hit rate, and circuit breaker status
 */
export async function GET(request: NextRequest) {
  try {
    // Get cache statistics (includes hit rate metrics)
    const cacheStats = cache.getStats();

    // Get HTTP agent statistics
    const httpAgentStats = httpAgent.getStats();

    // Get request deduplicator statistics
    const dedupStats = requestDeduplicator.getStats();

    // Get circuit breaker states
    const circuitBreakerStates = getCircuitBreakerState();

    // Performance metrics structure
    const metrics = {
      timestamp: new Date().toISOString(),
      cache: cacheStats,
      httpAgent: httpAgentStats,
      requestDeduplication: dedupStats,
      circuitBreakers: circuitBreakerStates,
      // OPTIMIZATION: API response times from adaptive timeout metrics
      apiResponseTimes: getEndpointMetrics(),
      bundleSize: {
        // Placeholder - should be collected from build process
        total: 0,
        chunks: [],
      },
    };

    return NextResponse.json(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    logger.error('Performance dashboard error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch performance metrics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

