/**
 * Testing utilities and helpers
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { AuthProvider } from '@/components/ui/auth/auth-provider';
// import { CartProvider } from '@/stores/cart-store';

// Mock environment variables for testing
export const mockEnv = {
  NODE_ENV: 'test' as const,
  NEXT_PUBLIC_WC_URL: 'https://test.example.com/wp-json/wc/v3',
  WC_CONSUMER_KEY: 'test_consumer_key',
  WC_CONSUMER_SECRET: 'test_consumer_secret',
  NEXT_PUBLIC_WORDPRESS_URL: 'https://test.example.com',
  NEXT_PUBLIC_BASE_URL: 'http://localhost:3000'
};

// Mock fetch for API testing
export function mockFetch(response: any, status: number = 200) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response))
  });
}

// Mock localStorage
export function mockLocalStorage() {
  const store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
}

// Mock sessionStorage
export function mockSessionStorage() {
  const store: Record<string, string> = {};
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
}

// Mock user data
export const mockUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  username: 'testuser',
  role: 'customer',
  billing: {
    first_name: 'Test',
    last_name: 'User',
    company: 'Test Company',
    address_1: 'Test Street 123',
    city: 'Test City',
    postcode: '12-345',
    country: 'PL',
    email: 'test@example.com',
    phone: '+48123456789',
    nip: '1234567890'
  },
  shipping: {
    first_name: 'Test',
    last_name: 'User',
    company: 'Test Company',
    address_1: 'Test Street 123',
    city: 'Test City',
    postcode: '12-345',
    country: 'PL'
  },
  meta_data: [
    { id: 1, key: '_billing_nip', value: '1234567890' },
    { id: 2, key: '_invoice_request', value: 'yes' }
  ]
};

// Mock product data
export const mockProduct = {
  id: 1,
  name: 'Test Product',
  slug: 'test-product',
  description: 'Test product description',
  short_description: 'Test short description',
  price: '99.00',
  regular_price: '99.00',
  sale_price: '',
  stock_status: 'instock',
  stock_quantity: 10,
  images: [
    {
      id: 1,
      src: 'https://example.com/image.jpg',
      alt: 'Test Product Image'
    }
  ],
  categories: [
    {
      id: 1,
      name: 'Test Category',
      slug: 'test-category'
    }
  ],
  attributes: [],
  variations: []
};

// Mock order data
export const mockOrder = {
  id: 1,
  number: '001',
  status: 'processing',
  date_created: '2024-01-01T00:00:00',
  date_modified: '2024-01-01T00:00:00',
  total: '99.00',
  currency: 'PLN',
  payment_method: 'cod',
  payment_method_title: 'Za pobraniem',
  billing: mockUser.billing,
  shipping: mockUser.shipping,
  line_items: [
    {
      id: 1,
      name: 'Test Product',
      quantity: 1,
      price: '99.00',
      total: '99.00',
      image: {
        src: 'https://example.com/image.jpg',
        alt: 'Test Product Image'
      }
    }
  ],
  meta_data: [
    { id: 1, key: '_invoice_generated', value: 'yes' },
    { id: 2, key: '_invoice_number', value: 'FV/001/2024' },
    { id: 3, key: '_invoice_date', value: '2024-01-01' }
  ]
};

// Mock cart item
export const mockCartItem = {
  id: 1,
  name: 'Test Product',
  price: 9900, // Price in grosze
  quantity: 1,
  image: 'https://example.com/image.jpg',
  variation: {}
};

// Custom render function with providers
// TODO: Uncomment when QueryClient, AuthProvider, CartProvider are available
/*
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0
      }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
*/

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  // TODO: Uncomment when AllTheProviders is available
  // return render(ui, { wrapper: AllTheProviders, ...options });
  return render(ui, options);
}

// Test utilities for forms
export function createMockFormEvent(values: Record<string, any>) {
  return {
    preventDefault: jest.fn(),
    target: {
      elements: Object.keys(values).reduce((acc, key) => {
        acc[key] = { value: values[key] };
        return acc;
      }, {} as Record<string, { value: any }>)
    }
  } as any;
}

// Test utilities for async operations
export function waitForAsync() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

// Test utilities for error boundaries
export function createMockError(error: Error) {
  return {
    error,
    errorInfo: {
      componentStack: 'Mock component stack'
    }
  };
}

// Mock IntersectionObserver
export function mockIntersectionObserver() {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  });
  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
}

// Mock ResizeObserver
export function mockResizeObserver() {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null
  });
  window.ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
}

// Test data generators
export function generateMockProducts(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...mockProduct,
    id: index + 1,
    name: `Test Product ${index + 1}`,
    slug: `test-product-${index + 1}`,
    price: (99 + index * 10).toFixed(2)
  }));
}

export function generateMockOrders(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...mockOrder,
    id: index + 1,
    number: `00${index + 1}`,
    total: (99 + index * 10).toFixed(2)
  }));
}

// Validation test helpers
export const testValidationData = {
  validEmail: 'test@example.com',
  invalidEmail: 'invalid-email',
  validPhone: '+48123456789',
  invalidPhone: '123',
  validNIP: '1234567890',
  invalidNIP: '123456789',
  validPostcode: '12-345',
  invalidPostcode: '12345',
  validPassword: 'TestPassword123!',
  invalidPassword: 'weak'
};

// API response mocks
export const mockApiResponses = {
  success: { success: true, message: 'Operation successful' },
  error: { success: false, error: 'Operation failed' },
  validationError: { 
    success: false, 
    error: 'Validation failed',
    validationErrors: ['Field is required']
  },
  unauthorized: { success: false, error: 'Unauthorized' },
  notFound: { success: false, error: 'Not found' }
};

// Mock router
export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/'
};

const testHelpersExports = {
  mockEnv,
  mockFetch,
  mockLocalStorage,
  mockSessionStorage,
  mockUser,
  mockProduct,
  mockOrder,
  mockCartItem,
  renderWithProviders,
  createMockFormEvent,
  waitForAsync,
  createMockError,
  mockIntersectionObserver,
  mockResizeObserver,
  generateMockProducts,
  generateMockOrders,
  testValidationData,
  mockApiResponses,
  mockRouter
};
export default testHelpersExports;
