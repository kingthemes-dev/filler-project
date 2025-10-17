import { AdvancedAnalytics } from '@/utils/advanced-analytics';

// Mock fetch
global.fetch = jest.fn();

describe('AdvancedAnalytics', () => {
  let analytics: AdvancedAnalytics;

  beforeEach(() => {
    analytics = new AdvancedAnalytics();
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Tracking', () => {
    it('should track custom events', () => {
      analytics.trackEvent('test_event', { data: 'test' });
      
      const stats = analytics.getStats();
      expect(stats.events).toBeGreaterThan(0);
    });

    it('should track page views', () => {
      analytics.trackEvent('page_view', {
        page_title: 'Test Page',
        page_location: 'https://test.com',
      });
      
      const stats = analytics.getStats();
      expect(stats.events).toBeGreaterThan(0);
    });

    it('should set user ID', () => {
      analytics.setUserId('test-user-123');
      
      const stats = analytics.getStats();
      expect(stats.userId).toBe('test-user-123');
    });

    it('should generate session ID', () => {
      const sessionId = analytics.getSessionId();
      expect(sessionId).toMatch(/^session_\d+_[a-z0-9]+$/);
    });
  });

  describe('Ecommerce Tracking', () => {
    it('should track purchases', () => {
      analytics.trackPurchase('order-123', 100, [
        { item_id: 'prod-1', item_name: 'Test Product', item_category: 'Test' }
      ]);
      
      const stats = analytics.getStats();
      expect(stats.events).toBeGreaterThan(0);
    });

    it('should track add to cart', () => {
      analytics.trackAddToCart('prod-1', 'Test Product', 'Test Category', 50);
      
      const stats = analytics.getStats();
      expect(stats.events).toBeGreaterThan(0);
    });

    it('should track view item', () => {
      analytics.trackViewItem('prod-1', 'Test Product', 'Test Category', 50);
      
      const stats = analytics.getStats();
      expect(stats.events).toBeGreaterThan(0);
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', () => {
      analytics.trackPerformance({
        event_name: 'web_vitals',
        metrics: { lcp: 2500, fid: 100, cls: 0.1 },
      });
      
      const stats = analytics.getStats();
      expect(stats.events).toBeGreaterThan(0);
    });
  });

  describe('Event Flushing', () => {
    it('should flush events when queue is full', async () => {
      (fetch as jest.Mock).mockResolvedValue({ ok: true });

      // Fill the event queue
      for (let i = 0; i < 25; i++) {
        analytics.trackEvent('test_event', { data: `test-${i}` });
      }

      // Wait for flush
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fetch).toHaveBeenCalled();
    });
  });
});
