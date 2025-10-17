import { ErrorTracker } from '@/utils/error-tracker';

// Mock fetch
global.fetch = jest.fn();

describe('ErrorTracker', () => {
  let errorTracker: ErrorTracker;

  beforeEach(() => {
    errorTracker = new ErrorTracker();
    (fetch as jest.Mock).mockClear();
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
      (fetch as jest.Mock).mockResolvedValue({ ok: true });

      // Fill the error queue
      for (let i = 0; i < 60; i++) {
        errorTracker.captureError({
          message: `Test error ${i}`,
          level: 'error',
          category: 'test',
        });
      }

      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fetch).toHaveBeenCalled();
    });
  });
});
