import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_WC_API_URL = 'https://test.com/wp-json/wc/v3';
process.env.NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_KEY = 'test_key';
process.env.NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET = 'test_secret';

// Polyfill performance.getEntriesByType for jsdom and ensure 'resource' entries won't break
if (!globalThis.performance || typeof globalThis.performance.getEntriesByType !== 'function') {
  globalThis.performance = globalThis.performance || {};
  globalThis.performance.getEntriesByType = () => [{ fetchStart: 0, loadEventEnd: 0 }];
}
try {
  const __originalGetEntriesByType = globalThis.performance.getEntriesByType.bind(globalThis.performance);
  globalThis.performance.getEntriesByType = (type) => {
    if (type === 'resource') return [];
    return __originalGetEntriesByType(type);
  };
} catch {}

// Basic fetch mock to avoid real network calls in tests and ensure jest.fn interface
(() => {
  const defaultResponse = {
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '',
    headers: new Map(),
  };
  const mockFetch = jest.fn().mockResolvedValue(defaultResponse);
  try {
    // Force override even if already defined by environment
    Object.defineProperty(globalThis, 'fetch', { value: mockFetch, configurable: true, writable: true });
  } catch {
    // Fallback assignment
    // @ts-expect-error - jsdom does not provide a writable fetch property
    globalThis.fetch = mockFetch;
  }
  // Ensure each test gets a fresh mock with default behavior
  beforeEach(() => {
    // Always reset to a fresh jest.fn for predictability across tests
    // @ts-expect-error - jsdom lacks a native fetch implementation per test run
    globalThis.fetch = jest.fn().mockResolvedValue(defaultResponse);
  });
})();

// Stub global Request if missing (some Next internals import it)
if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = class {};
}

// Stub global Response if missing
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class {};
}

// Swallow unhandled promise rejections in tests that intentionally reject
try {
  process.on('unhandledRejection', () => {});
} catch {}
