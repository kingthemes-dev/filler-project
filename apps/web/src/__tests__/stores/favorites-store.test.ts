import { act, renderHook } from '@testing-library/react';
import {
  useFavoritesStore,
  useFavoritesItems,
  useFavoritesIsModalOpen,
  useFavoritesIsLoading,
  useFavoritesLastSyncTime,
  useFavoritesCount,
  useFavoritesActions,
} from '@/stores/favorites-store';
import { useAuthStore } from '@/stores/auth-store';
import type { WooProduct } from '@/types/woocommerce';

// Mock fetch
global.fetch = jest.fn();

// Mock auth store
jest.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      isAuthenticated: false,
      user: null,
    })),
  },
}));

describe('Favorites Store', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Mock console.error to avoid noise in tests
    console.error = jest.fn();

    // Reset store state
    useFavoritesStore.setState({
      favorites: [],
      isModalOpen: false,
      isLoading: false,
      lastSyncTime: null,
    });

    // Clear localStorage
    localStorage.clear();

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();

    // Reset auth store mock
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      isAuthenticated: false,
      user: null,
    });
  });

  afterEach(() => {
    console.error = originalConsoleError;
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
    it('should initialize with empty favorites', () => {
      const { result } = renderHook(() => useFavoritesStore());
      expect(result.current.favorites).toEqual([]);
      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.lastSyncTime).toBeNull();
    });
  });

  describe('addToFavorites', () => {
    it('should add product to favorites', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.addToFavorites(mockProduct);
      });

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(1);
      expect(state.favorites[0].id).toBe(1);
    });

    it('should not add duplicate product', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.addToFavorites(mockProduct);
        await result.current.addToFavorites(mockProduct);
      });

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(1);
    });

    it('should revert on API error', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      await act(async () => {
        await result.current.addToFavorites(mockProduct);
      });

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(0);
    });
  });

  describe('removeFromFavorites', () => {
    it('should remove product from favorites', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.addToFavorites(mockProduct);
        await result.current.removeFromFavorites(1);
      });

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(0);
    });

    it('should revert on API error', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockRejectedValueOnce(new Error('API Error'));

      await act(async () => {
        await result.current.addToFavorites(mockProduct);
        await result.current.removeFromFavorites(1);
      });

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(1);
    });
  });

  describe('toggleFavorite', () => {
    it('should add product if not favorite', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.toggleFavorite(mockProduct);
      });

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(1);
      expect(state.isModalOpen).toBe(true); // Modal should open when adding
    });

    it('should remove product if already favorite', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.addToFavorites(mockProduct);
        await result.current.toggleFavorite(mockProduct);
      });

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(0);
    });
  });

  describe('isFavorite', () => {
    it('should return true if product is favorite', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.addToFavorites(mockProduct);
      });

      const state = useFavoritesStore.getState();
      expect(state.isFavorite(1)).toBe(true);
    });

    it('should return false if product is not favorite', () => {
      const { result } = renderHook(() => useFavoritesStore());
      expect(result.current.isFavorite(1)).toBe(false);
    });
  });

  describe('Modal Management', () => {
    it('should open favorites modal', () => {
      const { result } = renderHook(() => useFavoritesActions());

      act(() => {
        result.current.openFavoritesModal();
      });

      const state = useFavoritesStore.getState();
      expect(state.isModalOpen).toBe(true);
    });

    it('should close favorites modal', () => {
      const { result } = renderHook(() => useFavoritesActions());

      act(() => {
        result.current.openFavoritesModal();
        result.current.closeFavoritesModal();
      });

      const state = useFavoritesStore.getState();
      expect(state.isModalOpen).toBe(false);
    });
  });

  describe('clearFavorites', () => {
    it('should clear all favorites', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.addToFavorites(mockProduct);
        await result.current.clearFavorites();
      });

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(0);
    });
  });

  describe('getFavoritesCount', () => {
    it('should return correct count', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.addToFavorites(mockProduct);
      });

      const state = useFavoritesStore.getState();
      expect(state.getFavoritesCount()).toBe(1);
    });
  });

  describe('syncWithAPI', () => {
    it('should sync favorites with API', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      // Add favorite first
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.addToFavorites(mockProduct);
        await result.current.syncWithAPI();
      });

      const state = useFavoritesStore.getState();
      expect(state.lastSyncTime).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadFromAPI', () => {
    it('should load favorites from API', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (useAuthStore.getState as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1 },
      });

      const apiFavorites = [mockProduct];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: apiFavorites,
        }),
      });

      await act(async () => {
        await result.current.loadFromAPI();
      });

      const state = useFavoritesStore.getState();
      expect(state.favorites).toHaveLength(1);
      expect(state.lastSyncTime).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });

    it('should handle load error', async () => {
      const { result } = renderHook(() => useFavoritesActions());

      (useAuthStore.getState as jest.Mock).mockReturnValue({
        isAuthenticated: true,
        user: { id: 1 },
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.loadFromAPI();
      });

      const state = useFavoritesStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Selectors', () => {
    it('useFavoritesItems should return favorites', () => {
      useFavoritesStore.setState({ favorites: [mockProduct] });

      const { result } = renderHook(() => useFavoritesItems());
      expect(result.current).toHaveLength(1);
    });

    it('useFavoritesIsModalOpen should return modal state', () => {
      useFavoritesStore.setState({ isModalOpen: true });
      const { result } = renderHook(() => useFavoritesIsModalOpen());
      expect(result.current).toBe(true);
    });

    it('useFavoritesIsLoading should return loading state', () => {
      useFavoritesStore.setState({ isLoading: true });
      const { result } = renderHook(() => useFavoritesIsLoading());
      expect(result.current).toBe(true);
    });

    it('useFavoritesLastSyncTime should return sync time', () => {
      const syncTime = Date.now();
      useFavoritesStore.setState({ lastSyncTime: syncTime });
      const { result } = renderHook(() => useFavoritesLastSyncTime());
      expect(result.current).toBe(syncTime);
    });

    it('useFavoritesCount should return count', () => {
      useFavoritesStore.setState({ favorites: [mockProduct, { ...mockProduct, id: 2 }] });
      const { result } = renderHook(() => useFavoritesCount());
      expect(result.current).toBe(2);
    });
  });
});

