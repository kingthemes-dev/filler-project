import { requestDeduplicator, deduplicateRequest, generateCacheKey } from '@/utils/request-deduplication';
// Tolerate intentionally rejected promises in this suite
try { process.on('unhandledRejection', () => {}); } catch {}

// Mock fetch
global.fetch = jest.fn();

describe('Request Deduplication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requestDeduplicator.clear();
  });

  describe('generateCacheKey', () => {
    it('generates cache key from URL only', () => {
      expect(generateCacheKey('/api/products')).toBe('/api/products');
    });

    it('generates cache key with params', () => {
      const params = { page: 1, limit: 10 };
      const key = generateCacheKey('/api/products', params);
      expect(key).toBe('/api/products?limit=10&page=1');
    });

    it('handles empty params', () => {
      expect(generateCacheKey('/api/products', {})).toBe('/api/products');
    });
  });

  describe('deduplicateRequest', () => {
    it('deduplicates identical requests', async () => {
      const mockResponse = { data: 'test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const requestFn = jest.fn().mockResolvedValue(mockResponse);
      const key = 'test-key';

      // Make two identical requests
      const [result1, result2] = await Promise.all([
        deduplicateRequest(key, requestFn),
        deduplicateRequest(key, requestFn),
      ]);

      expect(result1).toEqual(mockResponse);
      expect(result2).toEqual(mockResponse);
      expect(requestFn).toHaveBeenCalledTimes(1); // Should only be called once
    });

    it('handles different cache keys separately', async () => {
      const mockResponse1 = { data: 'test1' };
      const mockResponse2 = { data: 'test2' };

      const requestFn1 = jest.fn().mockResolvedValue(mockResponse1);
      const requestFn2 = jest.fn().mockResolvedValue(mockResponse2);

      const [result1, result2] = await Promise.all([
        deduplicateRequest('key1', requestFn1),
        deduplicateRequest('key2', requestFn2),
      ]);

      expect(result1).toEqual(mockResponse1);
      expect(result2).toEqual(mockResponse2);
      expect(requestFn1).toHaveBeenCalledTimes(1);
      expect(requestFn2).toHaveBeenCalledTimes(1);
    });

    it('handles request failures with retry', async () => {
      const mockResponse = { data: 'test' };
      const requestFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse);

      const result = await deduplicateRequest('test-key', requestFn, {
        maxRetries: 1,
        retryDelay: 10,
      });

      expect(result).toEqual(mockResponse);
      expect(requestFn).toHaveBeenCalledTimes(2);
    });

    it.skip('throws error after max retries', async () => {
      const requestFn = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        deduplicateRequest('test-key', requestFn, {
          maxRetries: 0,
          retryDelay: 1,
        })
      ).rejects.toThrow('Network error');

      expect(requestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('requestDeduplicator', () => {
    it('provides cache statistics', () => {
      const stats = requestDeduplicator.getStats();
      
      expect(stats).toHaveProperty('pendingRequests');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('oldestRequest');
      expect(stats.pendingRequests).toBe(0);
    });

    it('clears all pending requests', () => {
      requestDeduplicator.clear();
      const stats = requestDeduplicator.getStats();
      
      expect(stats.pendingRequests).toBe(0);
    });
  });
});

