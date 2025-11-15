import { renderHook } from '@testing-library/react';
import { useWishlist } from '@/hooks/use-wishlist';

// Mock wishlist store selectors
const mockItems = [
  { id: 1, name: 'Test', price: '100', regular_price: '100', sale_price: '', images: [], slug: 'test', stock_status: 'instock', addedAt: Date.now() },
];

const mockActions = {
  addItem: jest.fn(),
  removeItem: jest.fn(),
  toggleItem: jest.fn(),
  clearWishlist: jest.fn(),
  isInWishlist: jest.fn(() => false),
  getItemCount: jest.fn(() => 1),
  syncWithServer: jest.fn(),
  loadFromServer: jest.fn(),
};

jest.mock('@/stores/wishlist-store', () => ({
  useWishlistItems: () => mockItems,
  useWishlistIsLoading: () => false,
  useWishlistError: () => null,
  useWishlistActions: () => mockActions,
}));

describe('useWishlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return items, loading, error, and actions', () => {
    const { result } = renderHook(() => useWishlist());

    expect(result.current.items).toEqual(mockItems);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.addItem).toBeDefined();
    expect(result.current.removeItem).toBeDefined();
    expect(result.current.toggleItem).toBeDefined();
    expect(result.current.clearWishlist).toBeDefined();
    expect(result.current.isInWishlist).toBeDefined();
    expect(result.current.getItemCount).toBeDefined();
    expect(result.current.syncWithServer).toBeDefined();
    expect(result.current.loadFromServer).toBeDefined();
  });

  it('should expose all actions', () => {
    const { result } = renderHook(() => useWishlist());

    expect(typeof result.current.addItem).toBe('function');
    expect(typeof result.current.removeItem).toBe('function');
    expect(typeof result.current.toggleItem).toBe('function');
    expect(typeof result.current.clearWishlist).toBe('function');
    expect(typeof result.current.isInWishlist).toBe('function');
    expect(typeof result.current.getItemCount).toBe('function');
    expect(typeof result.current.syncWithServer).toBe('function');
    expect(typeof result.current.loadFromServer).toBe('function');
  });
});

