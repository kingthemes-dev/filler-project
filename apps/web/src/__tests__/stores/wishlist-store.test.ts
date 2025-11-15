import { act, renderHook } from '@testing-library/react';
import {
  useWishlistStore,
  useWishlistItems,
  useWishlistIsLoading,
  useWishlistError,
  useWishlistItemCount,
  useWishlistActions,
} from '@/stores/wishlist-store';
import type { WooProduct } from '@/types/woocommerce';

// Mock fetch
global.fetch = jest.fn();

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Wishlist Store', () => {
  beforeEach(() => {
    // Reset store state
    useWishlistStore.setState({
      items: [],
      isLoading: false,
      error: null,
    });

    // Clear localStorage
    localStorage.clear();

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  const mockProduct: WooProduct = {
    id: 1,
    name: 'Test Product',
    slug: 'test-product',
    price: '100.00',
    regular_price: '120.00',
    sale_price: '100.00',
    images: [{ src: 'test.jpg', alt: 'Test' }],
    stock_status: 'instock',
    variations: [],
    attributes: [],
    rating_count: 0,
    average_rating: '0',
    short_description: '',
    categories: [],
  } as WooProduct;

  describe('Initial State', () => {
    it('should initialize with empty wishlist', () => {
      const { result } = renderHook(() => useWishlistStore());
      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('addItem', () => {
    it('should add item to wishlist', () => {
      const { result } = renderHook(() => useWishlistActions());

      act(() => {
        result.current.addItem(mockProduct);
      });

      const state = useWishlistStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe(1);
      expect(state.items[0].name).toBe('Test Product');
    });

    it('should not add duplicate item', () => {
      const { result } = renderHook(() => useWishlistActions());

      act(() => {
        result.current.addItem(mockProduct);
        result.current.addItem(mockProduct);
      });

      const state = useWishlistStore.getState();
      expect(state.items).toHaveLength(1);
    });

    it('should sync with server after adding item', async () => {
      const { result } = renderHook(() => useWishlistActions());

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      act(() => {
        result.current.addItem(mockProduct);
      });

      // Wait for async sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      });
    });
  });

  describe('removeItem', () => {
    it('should remove item from wishlist', () => {
      const { result } = renderHook(() => useWishlistActions());

      act(() => {
        result.current.addItem(mockProduct);
        result.current.removeItem(1);
      });

      const state = useWishlistStore.getState();
      expect(state.items).toHaveLength(0);
    });

    it('should sync with server after removing item', async () => {
      const { result } = renderHook(() => useWishlistActions());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      act(() => {
        result.current.addItem(mockProduct);
        result.current.removeItem(1);
      });

      // Wait for async sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('toggleItem', () => {
    it('should add item if not in wishlist', () => {
      const { result } = renderHook(() => useWishlistActions());

      act(() => {
        result.current.toggleItem(mockProduct);
      });

      const state = useWishlistStore.getState();
      expect(state.items).toHaveLength(1);
    });

    it('should remove item if already in wishlist', () => {
      const { result } = renderHook(() => useWishlistActions());

      act(() => {
        result.current.addItem(mockProduct);
        result.current.toggleItem(mockProduct);
      });

      const state = useWishlistStore.getState();
      expect(state.items).toHaveLength(0);
    });
  });

  describe('clearWishlist', () => {
    it('should clear all items', () => {
      const { result } = renderHook(() => useWishlistActions());

      act(() => {
        result.current.addItem(mockProduct);
        result.current.clearWishlist();
      });

      const state = useWishlistStore.getState();
      expect(state.items).toHaveLength(0);
    });
  });

  describe('isInWishlist', () => {
    it('should return true if item is in wishlist', () => {
      const { result } = renderHook(() => useWishlistActions());

      act(() => {
        result.current.addItem(mockProduct);
      });

      const state = useWishlistStore.getState();
      expect(state.isInWishlist(1)).toBe(true);
    });

    it('should return false if item is not in wishlist', () => {
      const { result } = renderHook(() => useWishlistStore());
      expect(result.current.isInWishlist(1)).toBe(false);
    });
  });

  describe('getItemCount', () => {
    it('should return correct item count', () => {
      const { result } = renderHook(() => useWishlistActions());

      act(() => {
        result.current.addItem(mockProduct);
      });

      const state = useWishlistStore.getState();
      expect(state.getItemCount()).toBe(1);
    });
  });

  describe('syncWithServer', () => {
    it('should sync wishlist with server successfully', async () => {
      const { result } = renderHook(() => useWishlistActions());

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Add item first
      act(() => {
        result.current.addItem(mockProduct);
      });

      // Wait for initial sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Manual sync
      await act(async () => {
        await result.current.syncWithServer();
      });

      const state = useWishlistStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle sync error', async () => {
      const { result } = renderHook(() => useWishlistActions());

      // Clear any previous items
      useWishlistStore.setState({ items: [] });

      // Add item first
      act(() => {
        result.current.addItem(mockProduct);
      });

      // Wait for initial sync
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Now set up error for manual sync
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      // Manual sync should fail
      await act(async () => {
        await result.current.syncWithServer();
      });

      const state = useWishlistStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadFromServer', () => {
    it('should load wishlist from server successfully', async () => {
      const { result } = renderHook(() => useWishlistActions());

      const serverItems = [
        {
          product_id: 1,
          added_at: new Date().toISOString(),
          product_name: 'Server Product',
          product_price: '100.00',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          favorites: serverItems,
        }),
      });

      await act(async () => {
        await result.current.loadFromServer();
      });

      const state = useWishlistStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].name).toBe('Server Product');
      expect(state.isLoading).toBe(false);
    });

    it('should handle load error', async () => {
      const { result } = renderHook(() => useWishlistActions());

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.loadFromServer();
      });

      const state = useWishlistStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Selectors', () => {
    it('useWishlistItems should return items', () => {
      useWishlistStore.setState({
        items: [{ id: 1, name: 'Test', price: '100', regular_price: '100', sale_price: '', images: [], slug: 'test', stock_status: 'instock', addedAt: Date.now() }],
      });

      const { result } = renderHook(() => useWishlistItems());
      expect(result.current).toHaveLength(1);
    });

    it('useWishlistIsLoading should return loading state', () => {
      useWishlistStore.setState({ isLoading: true });
      const { result } = renderHook(() => useWishlistIsLoading());
      expect(result.current).toBe(true);
    });

    it('useWishlistError should return error', () => {
      useWishlistStore.setState({ error: 'Test error' });
      const { result } = renderHook(() => useWishlistError());
      expect(result.current).toBe('Test error');
    });

    it('useWishlistItemCount should return item count', () => {
      useWishlistStore.setState({
        items: [
          { id: 1, name: 'Test', price: '100', regular_price: '100', sale_price: '', images: [], slug: 'test', stock_status: 'instock', addedAt: Date.now() },
          { id: 2, name: 'Test 2', price: '200', regular_price: '200', sale_price: '', images: [], slug: 'test-2', stock_status: 'instock', addedAt: Date.now() },
        ],
      });

      const { result } = renderHook(() => useWishlistItemCount());
      expect(result.current).toBe(2);
    });
  });
});

