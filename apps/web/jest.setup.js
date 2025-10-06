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
