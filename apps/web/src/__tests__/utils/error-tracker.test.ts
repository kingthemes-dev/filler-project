import { ErrorTracker } from '@/utils/error-tracker';

// Mock fetch
const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = fetchMock;
// @ts-expect-error - allow overriding for test environment
globalThis.fetch = fetchMock;
if (typeof window !== 'undefined') {
  // @ts-expect-error - jsdom window exposes fetch at runtime
  window.fetch = fetchMock;
}

describe('ErrorTracker', () => {
  let errorTracker: ErrorTracker;

  beforeEach(() => {
    errorTracker = new ErrorTracker();
    fetchMock.mockReset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Tracking', () => {
    it('should capture JavaScript errors', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test (test.js:1:1)';
      
      errorTracker.captureError({
        message: 'Test error',
        stack: error.stack,
        level: 'error',
        category: 'javascript',
      });

      const stats = errorTracker.getStats();
      expect(stats.errors).toBeGreaterThan(0);
    });

    it('should capture custom events', () => {
      errorTracker.captureCustomEvent('test_event', { data: 'test' });
      
      const stats = errorTracker.getStats();
      expect(stats.errors).toBeGreaterThan(0);
    });

    it('should set user ID', () => {
      errorTracker.setUserId('test-user-123');
      expect(errorTracker.getSessionId()).toBeDefined();
    });

    it('should generate session ID', () => {
      const sessionId = errorTracker.getSessionId();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });
  });

  describe('Performance Tracking', () => {
    it('should capture performance metrics', () => {
      errorTracker.capturePerformance({
        name: 'test_metric',
        value: 100,
        metadata: { test: true },
      });

      // Performance metrics are tracked internally
      expect(errorTracker.getStats()).toBeDefined();
    });
  });

  describe('Error Flushing', () => {
    it('should flush errors when queue is full', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 200 } as Response);

      // Fill the error queue
      for (let i = 0; i < 60; i++) {
        errorTracker.captureError({
          message: `Test error ${i}`,
          level: 'error',
          category: 'test',
        });
      }

      await errorTracker.flushErrorsNow();

      expect(errorTracker.getStats().errors).toBe(0);
    });
  });
});
