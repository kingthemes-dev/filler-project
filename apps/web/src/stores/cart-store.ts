import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useMemo } from 'react';
import wooCommerceService from '@/services/woocommerce-optimized';
import { calculatePriceWithVAT } from '@/utils/format-price';
import { logger } from '@/utils/logger';

// Types
export interface CartItem {
  id: number;
  name: string;
  price: number;
  regular_price?: number;
  sale_price?: number;
  quantity: number;
  image?: string;
  permalink?: string;
  slug?: string;
  capacity?: string;
  attributes?: Record<string, string>;
  variant?: {
    id: number;
    name: string;
    value: string;
  };
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
  total: number;
  itemCount: number;
}

export interface CartActions {
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (itemId: number, variantId?: number) => void;
  updateQuantity: (itemId: number, quantity: number, variantId?: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  calculateTotal: () => void;
}

export type CartStore = CartState & CartActions;

// Cart Store
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // Initial State
      items: [],
      isOpen: false,
      total: 0,
      itemCount: 0,

      // Actions
      addItem: async (item) => {
        try {
          // For headless setup, use local state only
          // WooCommerce API sync can be added later if needed
          
          // Update local state
          const { items } = get();
          const existingItemIndex = items.findIndex(
            (existingItem) => 
              existingItem.id === item.id && 
              existingItem.variant?.id === item.variant?.id
          );

          if (existingItemIndex > -1) {
            // Update existing item quantity
            const updatedItems = [...items];
            updatedItems[existingItemIndex].quantity += (item.quantity || 1);
            
            set({ items: updatedItems });
          } else {
            // Add new item
            const newItem: CartItem = { ...item, quantity: item.quantity || 1 };
            set({ items: [...items, newItem] });
          }

          // Recalculate totals
          get().calculateTotal();
          
          // Item added to local cart debug removed
          
          // Optional: Try to sync with WooCommerce API (non-blocking)
          try {
            const apiResponse = await wooCommerceService.addToCart(
              item.id, 
              item.quantity || 1, 
              item.variant ? { id: item.variant.id, attributes: item.attributes || {} } : undefined
            );
            
            if (apiResponse.success) {
              // WooCommerce API sync successful debug removed
            } else {
              // WooCommerce API sync skipped debug removed
            }
          } catch {
            // This should not happen anymore, but just in case
            // WooCommerce API sync skipped debug removed
          }
        } catch (error) {
          logger.error('CartStore: Error adding item', {
            error: error instanceof Error ? error.message : error,
            itemId: item.id,
            variantId: item.variant?.id,
          });
          throw error;
        }
      },

      removeItem: async (itemId, variantId) => {
        try {
          // Find item to get item_key for WooCommerce
          const { items } = get();
          const itemToRemove = items.find(
            (item) => 
              item.id === itemId && 
              (variantId ? item.variant?.id === variantId : true)
          );

          if (itemToRemove) {
            // Remove from WooCommerce cart via Store API
            // Note: We need item_key from WooCommerce response
            // For now, we'll remove from local state
            const filteredItems = items.filter(
              (item) => 
                !(item.id === itemId && 
                  (variantId ? item.variant?.id === variantId : true))
            );
            
            set({ items: filteredItems });
            get().calculateTotal();
          }
        } catch (error) {
          logger.warn('CartStore: Error removing item, falling back to local removal', {
            error: error instanceof Error ? error.message : error,
            itemId,
            variantId,
          });
          // Fallback to local state only
          const { items } = get();
          const filteredItems = items.filter(
            (item) => 
              !(item.id === itemId && 
                (variantId ? item.variant?.id === variantId : true))
          );
          
          set({ items: filteredItems });
          get().calculateTotal();
        }
      },

      updateQuantity: async (itemId, quantity, variantId) => {
        if (quantity <= 0) {
          await get().removeItem(itemId, variantId);
          return;
        }

        try {
          // Update quantity in WooCommerce cart via Store API
          // Note: We need item_key from WooCommerce response
          // For now, we'll update local state
          const { items } = get();
          const updatedItems = items.map((item) => {
            if (item.id === itemId && 
                (variantId ? item.variant?.id === variantId : true)) {
              return { ...item, quantity };
            }
            return item;
          });

          set({ items: updatedItems });
          get().calculateTotal();
        } catch (error) {
          logger.warn('CartStore: Error updating quantity, falling back to local update', {
            error: error instanceof Error ? error.message : error,
            itemId,
            variantId,
          });
          // Fallback to local state only
          const { items } = get();
          const updatedItems = items.map((item) => {
            if (item.id === itemId && 
                (variantId ? item.variant?.id === variantId : true)) {
              return { ...item, quantity };
            }
            return item;
          });

          set({ items: updatedItems });
          get().calculateTotal();
        }
      },

      clearCart: () => {
        set({ items: [], total: 0, itemCount: 0 });
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }));
      },

      openCart: () => {
        // openCart called debug removed
        set({ isOpen: true });
        // isOpen set to true debug removed
      },

      closeCart: () => {
        set({ isOpen: false });
      },

      calculateTotal: () => {
        const { items } = get();
        const total = items.reduce((sum, item) => {
          const price = item.sale_price || item.price;
          // Price is netto (without VAT), calculate with VAT
          const priceWithVAT = calculatePriceWithVAT(price);
          const itemTotal = priceWithVAT * item.quantity;
          // Item calculation debug removed
          return sum + itemTotal;
        }, 0);
        
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        
        // Cart calculateTotal result debug removed
        
        set({ total, itemCount });
      },
    }),
    {
      name: 'filler-cart-storage',
      partialize: (state) => ({ 
        items: state.items,
        total: state.total,
        itemCount: state.itemCount
      }),
      onRehydrateStorage: () => (state) => {
        // Recalculate total when loading from localStorage
        if (state?.items && state.items.length > 0) {
          state.calculateTotal();
          logger.debug('CartStore: Recalculated totals after hydration', {
            itemCount: state.items.length,
          });
        }
      },
    }
  )
);

// Selectors for optimized subscriptions
export const useCartItems = () => useCartStore((state) => state.items);
export const useCartIsOpen = () => useCartStore((state) => state.isOpen);
export const useCartTotal = () => useCartStore((state) => state.total);
export const useCartItemCount = () => useCartStore((state) => state.itemCount);

// Memoized selectors for actions to prevent re-renders
export const useCartActions = () => {
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const toggleCart = useCartStore((state) => state.toggleCart);
  const openCart = useCartStore((state) => state.openCart);
  const closeCart = useCartStore((state) => state.closeCart);
  const calculateTotal = useCartStore((state) => state.calculateTotal);
  
  return useMemo(() => ({
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
    calculateTotal,
  }), [addItem, removeItem, updateQuantity, clearCart, toggleCart, openCart, closeCart, calculateTotal]);
};

export const useCartState = () => {
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const total = useCartStore((state) => state.total);
  const itemCount = useCartStore((state) => state.itemCount);
  
  return useMemo(() => ({
    items,
    isOpen,
    total,
    itemCount,
  }), [items, isOpen, total, itemCount]);
};
