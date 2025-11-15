/**
 * Circuit Breaker pattern implementation for API resilience
 */

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service is back
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  recoveryTimeout: number; // Time to wait before trying again (ms)
  monitoringPeriod: number; // Time window for failure counting (ms)
  expectedFailureRate: number; // Expected failure rate (0-1)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private nextAttempt = 0;

  constructor(
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 60000, // 1 minute
      expectedFailureRate: 0.5,
    }
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      this.state = CircuitState.HALF_OPEN;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.successCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.resetCounters();
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.shouldOpenCircuit()) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.options.recoveryTimeout;
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    const totalRequests = this.failureCount + this.successCount;

    if (totalRequests < this.options.failureThreshold) {
      return false;
    }

    const failureRate = this.failureCount / totalRequests;
    return failureRate >= this.options.expectedFailureRate;
  }

  /**
   * Reset failure and success counters
   */
  private resetCounters(): void {
    this.failureCount = 0;
    this.successCount = 0;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    totalRequests: number;
    failureRate: number;
    lastFailureTime: number;
    nextAttempt: number;
  } {
    const totalRequests = this.failureCount + this.successCount;
    const failureRate =
      totalRequests > 0 ? this.failureCount / totalRequests : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests,
      failureRate,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.resetCounters();
    this.lastFailureTime = 0;
    this.nextAttempt = 0;
  }
}

// Circuit breaker instances for different services
export const circuitBreakers = {
  wordpress: new CircuitBreaker({
    failureThreshold: 3,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
    expectedFailureRate: 0.6,
  }),

  api: new CircuitBreaker({
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 120000, // 2 minutes
    expectedFailureRate: 0.5,
  }),

  external: new CircuitBreaker({
    failureThreshold: 2,
    recoveryTimeout: 120000, // 2 minutes
    monitoringPeriod: 300000, // 5 minutes
    expectedFailureRate: 0.7,
  }),
};

// Utility function to wrap API calls with circuit breaker
export async function withCircuitBreaker<T>(
  service: keyof typeof circuitBreakers,
  fn: () => Promise<T>
): Promise<T> {
  return circuitBreakers[service].execute(fn);
}

// WordPress API wrapper with circuit breaker
export async function safeWordPressRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  return withCircuitBreaker('wordpress', async () => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Filler-Store/1.0',
        ...options.headers,
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(
        `WordPress API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  });
}

// API wrapper with circuit breaker
export async function safeApiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  return withCircuitBreaker('api', async () => {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  });
}

/**
 * Get state of all circuit breakers for monitoring
 */
export function getCircuitBreakerState(): Record<
  string,
  {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    totalRequests: number;
    failureRate: number;
    lastFailureTime: number;
    nextAttempt: number;
  }
> {
  const states: Record<
    string,
    {
      state: CircuitState;
      failureCount: number;
      successCount: number;
      totalRequests: number;
      failureRate: number;
      lastFailureTime: number;
      nextAttempt: number;
    }
  > = {};

  for (const [service, breaker] of Object.entries(circuitBreakers)) {
    states[service] = breaker.getStats();
  }

  return states;
}

export default CircuitBreaker;
