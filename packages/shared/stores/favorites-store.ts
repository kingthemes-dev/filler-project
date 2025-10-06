import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WooProduct } from '@/types/woocommerce';
import { useAuthStore } from './auth-store';

interface FavoritesStore {
  favorites: WooProduct[];
  isModalOpen: boolean;
  isLoading: boolean;
  lastSyncTime: number | null;
  
  // Actions
  addToFavorites: (product: WooProduct) => Promise<void>;
  removeFromFavorites: (productId: number) => Promise<void>;
  toggleFavorite: (product: WooProduct) => Promise<void>;
  isFavorite: (productId: number) => boolean;
  openFavoritesModal: () => void;
  closeFavoritesModal: () => void;
  clearFavorites: () => Promise<void>;
  getFavoritesCount: () => number;
  syncWithAPI: () => Promise<void>;
  loadFromAPI: () => Promise<void>;
}

// Helper function to get user ID
const getUserId = () => {
  if (typeof window !== 'undefined') {
    try {
      const authState = useAuthStore.getState();
      return authState.isAuthenticated ? authState.user?.id || 'anonymous' : 'anonymous';
    } catch (error) {
      console.warn('Error getting auth state:', error);
      return 'anonymous';
    }
  }
  return 'anonymous';
};

// API helper functions
const apiCall = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`Wywołanie API nie powiodło się: ${response.statusText}`);
  }
  
  return response.json();
};

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      isModalOpen: false,
      isLoading: false,
      lastSyncTime: null,

      addToFavorites: async (product: WooProduct) => {
        const { favorites } = get();
        const isAlreadyFavorite = favorites.some(fav => fav.id === product.id);
        
        if (isAlreadyFavorite) return;
        
        set({ isLoading: true });
        
        try {
          // Update local state immediately for better UX
          set({ favorites: [...favorites, product] });
          console.log('❤️ Added to favorites:', product.name);
          
          // Sync with API
          const userId = getUserId();
          await apiCall('/api/favorites', {
            method: 'POST',
            body: JSON.stringify({ userId, product }),
          });
          
          set({ lastSyncTime: Date.now() });
        } catch (error) {
          console.error('Nie udało się dodać do ulubionych:', error);
          // Revert local state on error
          set({ favorites });
        } finally {
          set({ isLoading: false });
        }
      },

      removeFromFavorites: async (productId: number) => {
        const { favorites } = get();
        const newFavorites = favorites.filter(fav => fav.id !== productId);
        
        set({ isLoading: true });
        
        try {
          // Update local state immediately
          set({ favorites: newFavorites });
          console.log('💔 Removed from favorites:', productId);
          
          // Sync with API
          const userId = getUserId();
          await apiCall(`/api/favorites?userId=${userId}&productId=${productId}`, {
            method: 'DELETE',
          });
          
          set({ lastSyncTime: Date.now() });
        } catch (error) {
          console.error('Nie udało się usunąć z ulubionych:', error);
          // Revert local state on error
          set({ favorites });
        } finally {
          set({ isLoading: false });
        }
      },

      toggleFavorite: async (product: WooProduct) => {
        const { favorites, isFavorite } = get();
        
        if (isFavorite(product.id)) {
          await get().removeFromFavorites(product.id);
        } else {
          await get().addToFavorites(product);
          // Open modal when adding to favorites
          get().openFavoritesModal();
        }
      },

      isFavorite: (productId: number) => {
        const { favorites } = get();
        return favorites.some(fav => fav.id === productId);
      },

      openFavoritesModal: () => {
        set({ isModalOpen: true });
        console.log('❤️ Opening favorites modal');
      },

      closeFavoritesModal: () => {
        set({ isModalOpen: false });
        console.log('❤️ Closing favorites modal');
      },

      clearFavorites: async () => {
        set({ isLoading: true });
        
        try {
          // Update local state immediately
          set({ favorites: [] });
          console.log('❤️ Cleared all favorites');
          
          // Sync with API
          const userId = getUserId();
          await apiCall('/api/favorites/sync', {
            method: 'POST',
            body: JSON.stringify({ userId, favorites: [] }),
          });
          
          set({ lastSyncTime: Date.now() });
        } catch (error) {
          console.error('Nie udało się wyczyścić ulubionych:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      getFavoritesCount: () => {
        const { favorites } = get();
        return favorites.length;
      },

      syncWithAPI: async () => {
        const { favorites } = get();
        set({ isLoading: true });
        
        try {
          const userId = getUserId();
          await apiCall('/api/favorites/sync', {
            method: 'POST',
            body: JSON.stringify({ userId, favorites }),
          });
          
          set({ lastSyncTime: Date.now() });
          console.log('🔄 Favorites synced with API');
        } catch (error) {
          console.error('Nie udało się zsynchronizować ulubionych:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadFromAPI: async () => {
        set({ isLoading: true });
        
        try {
          const userId = getUserId();
          const response = await apiCall(`/api/favorites?userId=${userId}`);
          
          if (response.success) {
            set({ 
              favorites: response.data,
              lastSyncTime: Date.now()
            });
            console.log('📥 Loaded favorites from API:', response.data.length);
          }
        } catch (error) {
          console.error('Nie udało się załadować ulubionych z API:', error);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'favorites-storage',
      partialize: (state) => ({ 
        favorites: state.favorites,
        lastSyncTime: state.lastSyncTime 
      }),
    }
  )
);
