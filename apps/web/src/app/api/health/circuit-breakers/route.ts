import { NextResponse } from 'next/server';
import { getCircuitBreakerState } from '@/utils/circuit-breaker';
import { logger } from '@/utils/logger';

/**
 * Circuit Breaker Dashboard Endpoint
 * Returns the state and metrics of all circuit breakers
 */
export async function GET() {
  try {
    const circuitBreakerStates = getCircuitBreakerState();

    // Calculate overall health
    const allStates = Object.values(circuitBreakerStates);
    const openCount = allStates.filter(s => s.state === 'OPEN').length;
    const halfOpenCount = allStates.filter(s => s.state === 'HALF_OPEN').length;
    const closedCount = allStates.filter(s => s.state === 'CLOSED').length;

    const health = {
      status: openCount > 0 ? 'degraded' : halfOpenCount > 0 ? 'warning' : 'healthy',
      total: allStates.length,
      open: openCount,
      halfOpen: halfOpenCount,
      closed: closedCount,
    };

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        health,
        circuitBreakers: circuitBreakerStates,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=30', // Cache for 30s
        },
      }
    );
  } catch (error) {
    logger.error('Circuit breaker dashboard error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch circuit breaker states',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

