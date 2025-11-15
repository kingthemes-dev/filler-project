import { act, renderHook } from '@testing-library/react';
import {
  useCartStore,
  useCartItems,
  useCartIsOpen,
  useCartTotal,
  useCartItemCount,
  useCartActions,
  useCartState,
  type CartItem,
} from '@/stores/cart-store';

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

// Mock format-price
jest.mock('@/utils/format-price', () => ({
  calculatePriceWithVAT: (price: number) => price * 1.23, // 23% VAT
}));

describe('Cart Store', () => {
  beforeEach(() => {
    // Reset store state
    useCartStore.setState({
      items: [],
      isOpen: false,
      total: 0,
      itemCount: 0,
    });

    // Clear localStorage
    localStorage.clear();

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Initial State', () => {
    it('should initialize with empty cart', () => {
      const { result } = renderHook(() => useCartStore());
      expect(result.current.items).toEqual([]);
      expect(result.current.isOpen).toBe(false);
      expect(result.current.total).toBe(0);
      expect(result.current.itemCount).toBe(0);
    });
  });

  describe('addItem', () => {
    it('should add a new item to cart', async () => {
      const { result } = renderHook(() => useCartActions());

      const newItem: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 100,
        regular_price: 120,
        image: 'test.jpg',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { cart: {} } }),
      });

      await act(async () => {
        await result.current.addItem(newItem);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toMatchObject({
        id: 1,
        name: 'Test Product',
        quantity: 1,
      });
    });

    it('should update quantity when adding existing item', async () => {
      const { result } = renderHook(() => useCartActions());

      const item: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 100,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { cart: {} } }),
      });

      await act(async () => {
        await result.current.addItem(item);
        await result.current.addItem({ ...item, quantity: 2 });
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(3);
    });

    it('should handle items with variants separately', async () => {
      const { result } = renderHook(() => useCartActions());

      const item1: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 100,
        variant: { id: 1, name: 'Variant 1', value: 'Red' },
      };

      const item2: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 100,
        variant: { id: 2, name: 'Variant 2', value: 'Blue' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { cart: {} } }),
      });

      await act(async () => {
        await result.current.addItem(item1);
        await result.current.addItem(item2);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      const { result } = renderHook(() => useCartActions());

      // Add item first
      const item: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 100,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { cart: {} } }),
      });

      await act(async () => {
        await result.current.addItem(item);
        await result.current.removeItem(1);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
    });

    it('should remove specific variant', async () => {
      const { result } = renderHook(() => useCartActions());

      const item1: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 100,
        variant: { id: 1, name: 'Variant 1', value: 'Red' },
      };

      const item2: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 100,
        variant: { id: 2, name: 'Variant 2', value: 'Blue' },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { cart: {} } }),
      });

      await act(async () => {
        await result.current.addItem(item1);
        await result.current.addItem(item2);
        await result.current.removeItem(1, 1);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].variant?.id).toBe(2);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', async () => {
      const { result } = renderHook(() => useCartActions());

      const item: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 100,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { cart: {} } }),
      });

      await act(async () => {
        await result.current.addItem(item);
        await result.current.updateQuantity(1, 5);
      });

      const state = useCartStore.getState();
      expect(state.items[0].quantity).toBe(5);
    });

    it('should remove item when quantity is 0', async () => {
      const { result } = renderHook(() => useCartActions());

      const item: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 100,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { cart: {} } }),
      });

      await act(async () => {
        await result.current.addItem(item);
        await result.current.updateQuantity(1, 0);
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
    });
  });

  describe('calculateTotal', () => {
    it('should calculate total correctly with VAT', async () => {
      const { result } = renderHook(() => useCartActions());

      const item: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 100, // Net price
        quantity: 2,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { cart: {} } }),
      });

      await act(async () => {
        await result.current.addItem({ ...item, quantity: 2 });
      });

      const state = useCartStore.getState();
      // Price 100 * 1.23 VAT * 2 quantity = 246
      expect(state.total).toBeCloseTo(246, 2);
      expect(state.itemCount).toBe(2);
    });

    it('should use sale_price when available', async () => {
      const { result } = renderHook(() => useCartActions());

      const item: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 120,
        regular_price: 120,
        sale_price: 100,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { cart: {} } }),
      });

      await act(async () => {
        await result.current.addItem(item);
      });

      const state = useCartStore.getState();
      // Should use sale_price (100) * 1.23 VAT = 123
      expect(state.total).toBeCloseTo(123, 2);
    });
  });

  describe('Cart State Management', () => {
    it('should toggle cart open/close', () => {
      const { result } = renderHook(() => useCartActions());

      act(() => {
        result.current.toggleCart();
      });

      expect(useCartStore.getState().isOpen).toBe(true);

      act(() => {
        result.current.toggleCart();
      });

      expect(useCartStore.getState().isOpen).toBe(false);
    });

    it('should open cart', () => {
      const { result } = renderHook(() => useCartActions());

      act(() => {
        result.current.openCart();
      });

      expect(useCartStore.getState().isOpen).toBe(true);
    });

    it('should close cart', () => {
      const { result } = renderHook(() => useCartActions());

      // Open first
      act(() => {
        result.current.openCart();
      });

      // Then close
      act(() => {
        result.current.closeCart();
      });

      expect(useCartStore.getState().isOpen).toBe(false);
    });

    it('should clear cart', async () => {
      const { result } = renderHook(() => useCartActions());

      const item: Omit<CartItem, 'quantity'> = {
        id: 1,
        name: 'Test Product',
        price: 100,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { cart: {} } }),
      });

      await act(async () => {
        await result.current.addItem(item);
        result.current.clearCart();
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.total).toBe(0);
      expect(state.itemCount).toBe(0);
    });
  });

  describe('Selectors', () => {
    it('useCartItems should return items', () => {
      useCartStore.setState({
        items: [{ id: 1, name: 'Test', price: 100, quantity: 1 }],
      });

      const { result } = renderHook(() => useCartItems());
      expect(result.current).toHaveLength(1);
    });

    it('useCartIsOpen should return isOpen state', () => {
      useCartStore.setState({ isOpen: true });
      const { result } = renderHook(() => useCartIsOpen());
      expect(result.current).toBe(true);
    });

    it('useCartTotal should return total', () => {
      useCartStore.setState({ total: 123.45 });
      const { result } = renderHook(() => useCartTotal());
      expect(result.current).toBe(123.45);
    });

    it('useCartItemCount should return item count', () => {
      useCartStore.setState({ itemCount: 5 });
      const { result } = renderHook(() => useCartItemCount());
      expect(result.current).toBe(5);
    });

    it('useCartState should return all state', () => {
      const state = {
        items: [{ id: 1, name: 'Test', price: 100, quantity: 1 }],
        isOpen: true,
        total: 123,
        itemCount: 1,
      };
      useCartStore.setState(state);

      const { result } = renderHook(() => useCartState());
      expect(result.current).toMatchObject(state);
    });
  });
});

