import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { WooProduct } from '@/types/woocommerce';

// Safe storage for SSR
const safeStorage = {
  getItem: (name: string) => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (name: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore storage errors
    }
  }
};

interface WishlistItem {
  id: number;
  name: string;
  price: string;
  regular_price: string;
  sale_price: string;
  images: Array<{ src: string; alt: string }>;
  slug: string;
  stock_status: string;
  addedAt: number;
}

interface WishlistStore {
  items: WishlistItem[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  addItem: (product: WooProduct) => void;
  removeItem: (productId: number) => void;
  toggleItem: (product: WooProduct) => void;
  clearWishlist: () => void;
  isInWishlist: (productId: number) => boolean;
  getItemCount: () => number;
  
  // Sync with server
  syncWithServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      error: null,

      addItem: (product: WooProduct) => {
        const { items } = get();
        
        // Check if already in wishlist
        if (items.find(item => item.id === product.id)) {
          return;
        }

        const wishlistItem: WishlistItem = {
          id: product.id,
          name: product.name,
          price: product.price,
          regular_price: product.regular_price,
          sale_price: product.sale_price || '',
          images: product.images || [],
          slug: product.slug,
          stock_status: product.stock_status,
          addedAt: Date.now()
        };

        set(state => ({
          items: [...state.items, wishlistItem],
          error: null
        }));

        // Sync with server in background
        get().syncWithServer();
      },

      removeItem: (productId: number) => {
        set(state => ({
          items: state.items.filter(item => item.id !== productId),
          error: null
        }));

        // Sync with server in background
        get().syncWithServer();
      },

      toggleItem: (product: WooProduct) => {
        const { items, addItem, removeItem } = get();
        
        if (items.find(item => item.id === product.id)) {
          removeItem(product.id);
        } else {
          addItem(product);
        }
      },

      clearWishlist: () => {
        set({ items: [], error: null });
        get().syncWithServer();
      },

      isInWishlist: (productId: number) => {
        const { items } = get();
        return items.some(item => item.id === productId);
      },

      getItemCount: () => {
        const { items } = get();
        return items.length;
      },

      syncWithServer: async () => {
        const { items } = get();
        
        try {
          set({ isLoading: true, error: null });

          // Send wishlist to server
          const response = await fetch('/api/favorites', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              items: items.map(item => ({
                product_id: item.id,
                added_at: item.addedAt
              }))
            }),
          });

          if (!response.ok) {
            throw new Error('Nie udało się zsynchronizować listy życzeń');
          }

          set({ isLoading: false });
        } catch (error: any) {
          console.error('Wishlist sync error:', error);
          set({ 
            isLoading: false, 
            error: error.message || 'Błąd synchronizacji listy życzeń' 
          });
        }
      },

      loadFromServer: async () => {
        try {
          set({ isLoading: true, error: null });

          const response = await fetch('/api/favorites');
          
          if (!response.ok) {
            throw new Error('Nie udało się pobrać listy życzeń');
          }

          const data = await response.json();
          
          if (data.success && data.favorites) {
            set({ 
              items: data.favorites.map((fav: any) => ({
                id: fav.product_id,
                name: fav.product_name || `Produkt ${fav.product_id}`,
                price: fav.product_price || '0',
                regular_price: fav.product_regular_price || '0',
                sale_price: fav.product_sale_price || '',
                images: fav.product_images || [],
                slug: fav.product_slug || '',
                stock_status: fav.product_stock_status || 'instock',
                addedAt: new Date(fav.added_at).getTime() || Date.now()
              })),
              isLoading: false 
            });
          } else {
            set({ items: [], isLoading: false });
          }
        } catch (error: any) {
          console.error('Wishlist load error:', error);
          set({ 
            isLoading: false, 
            error: error.message || 'Błąd ładowania listy życzeń' 
          });
        }
      }
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ items: state.items })
    }
  )
);
