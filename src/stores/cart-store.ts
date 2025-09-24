import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import wooCommerceService from '@/services/woocommerce-optimized';

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
          
          console.log('✅ Item added to local cart:', item);
          
          // Optional: Try to sync with WooCommerce API (non-blocking)
          try {
            const apiResponse = await wooCommerceService.addToCart(
              item.id, 
              item.quantity || 1, 
              item.variant ? { id: item.variant.id, attributes: item.attributes || {} } : undefined
            );
            
            if (apiResponse.success) {
              console.log('✅ WooCommerce API sync successful');
            } else {
              console.log('ℹ️ WooCommerce API sync skipped (headless mode)');
            }
          } catch (apiError) {
            // This should not happen anymore, but just in case
            console.log('ℹ️ WooCommerce API sync skipped (headless mode)');
          }
        } catch (error) {
          console.error('❌ Error adding item to cart:', error);
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
          console.error('Error removing item from cart:', error);
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
          console.error('Error updating item quantity:', error);
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
        console.log('🛒 openCart called! Setting isOpen to true');
        set({ isOpen: true });
        console.log('🛒 isOpen set to true');
      },

      closeCart: () => {
        set({ isOpen: false });
      },

      calculateTotal: () => {
        const { items } = get();
        const total = items.reduce((sum, item) => {
          const price = item.sale_price || item.price;
          return sum + (price * item.quantity);
        }, 0);
        
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        
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
    }
  )
);
