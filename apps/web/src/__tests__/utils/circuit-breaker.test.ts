import {
  CircuitBreaker,
  CircuitState,
  circuitBreakers as _circuitBreakers,
  withCircuitBreaker,
} from '@/utils/circuit-breaker';

describe('Circuit Breaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 5000,
      expectedFailureRate: 0.5,
    });
  });

  describe('Circuit States', () => {
    it('starts in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('opens circuit after failure threshold', async () => {
      const failingFn = jest
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));

      // Make requests that will fail
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('fails fast when circuit is open', async () => {
      const failingFn = jest
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected to fail
        }
      }

      // Try to execute when circuit is open
      await expect(circuitBreaker.execute(failingFn)).rejects.toThrow(
        'Circuit breaker is OPEN - service unavailable'
      );
    });

    it('allows probe after recovery timeout (HALF_OPEN window)', async () => {
      const failingFn = jest
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 2200));

      // After timeout, a probe may occur; state can remain OPEN on failure
      // Ensure state is not CLOSED without a successful probe
      expect([CircuitState.OPEN, CircuitState.HALF_OPEN]).toContain(
        circuitBreaker.getState()
      );
    });

    it('closes circuit after successful request in HALF_OPEN', async () => {
      const failingFn = jest
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));
      const successFn = jest.fn().mockResolvedValue('success');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected to fail
        }
      }

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 2200));

      // Execute successful request
      const result = await circuitBreaker.execute(successFn);

      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('Statistics', () => {
    it('tracks request statistics', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const failingFn = jest
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));

      // Make some successful requests
      await circuitBreaker.execute(successFn);
      await circuitBreaker.execute(successFn);

      // Make some failing requests
      try {
        await circuitBreaker.execute(failingFn);
      } catch {
        // Expected to fail
      }

      const stats = circuitBreaker.getStats();

      expect(stats.successCount).toBe(2);
      expect(stats.failureCount).toBe(1);
      expect(stats.totalRequests).toBe(3);
      expect(stats.failureRate).toBeCloseTo(0.33, 2);
    });
  });

  describe('Reset', () => {
    it('resets circuit breaker state', async () => {
      const failingFn = jest
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(failingFn);
        } catch {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Reset the circuit
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.getStats().failureCount).toBe(0);
      expect(circuitBreaker.getStats().successCount).toBe(0);
    });
  });

  describe('withCircuitBreaker utility', () => {
    it('uses correct circuit breaker for service', async () => {
      const successFn = jest.fn().mockResolvedValue('success');

      const result = await withCircuitBreaker('wordpress', successFn);

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('handles circuit breaker failures', async () => {
      const failingFn = jest
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));

      // Open the wordpress circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await withCircuitBreaker('wordpress', failingFn);
        } catch {
          // Expected to fail
        }
      }

      // Try to execute when circuit is open
      await expect(withCircuitBreaker('wordpress', failingFn)).rejects.toThrow(
        'Circuit breaker is OPEN - service unavailable'
      );
    });
  });
});
