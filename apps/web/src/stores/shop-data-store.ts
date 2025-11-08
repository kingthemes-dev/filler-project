/**
 * Shop Data Store
 * 
 * Globalny store Zustand dla danych sklepu z automatycznym prefetchowaniem.
 * Zapewnia natychmiastowy dostęp do danych bez API calls przy każdym otwarciu modala.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import shopDataPrefetch, { ShopCategory, ShopAttribute, ShopAttributes } from '@/services/shop-data-prefetch';
import { logger } from '@/utils/logger';

// Types
export interface ShopDataState {
  // Data
  categories: ShopCategory[];
  attributes: ShopAttributes;
  totalProducts: number;
  
  // State
  isLoading: boolean;
  isInitialized: boolean;
  lastUpdated: number | null;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
  
  // Getters
  getMainCategories: () => ShopCategory[];
  getSubCategories: (parentId: number) => ShopCategory[];
  getBrandsForModal: (limit?: number) => ShopAttribute[];
  getAllBrands: () => ShopAttribute[];
  getCapacities: () => ShopAttribute[];
  getZastosowanie: () => ShopAttribute[];
  
  // Computed
  hasData: boolean;
  isDataFresh: (timeout?: number) => boolean;
}

// Helper functions
const getMainCategories = (categories: ShopCategory[]): ShopCategory[] => {
  return categories.filter(cat => cat.parent === 0);
};

const getSubCategories = (categories: ShopCategory[], parentId: number): ShopCategory[] => {
  return categories.filter(cat => cat.parent === parentId);
};

// Funkcja do przekształcania płaskiej listy kategorii w hierarchiczną strukturę
interface HierarchicalCategory extends ShopCategory {
  subcategories: ShopCategory[];
}

const buildHierarchicalCategories = (categories: ShopCategory[]): HierarchicalCategory[] => {
  const mainCategories = categories.filter(cat => cat.parent === 0);
  
  return mainCategories.map(mainCat => ({
    ...mainCat,
    subcategories: categories.filter(cat => cat.parent === mainCat.id),
  }));
};

const getBrandsForModal = (attributes: ShopAttributes, limit: number = 36): ShopAttribute[] => {
  return attributes.brands.slice(0, limit);
};

const getAllBrands = (attributes: ShopAttributes): ShopAttribute[] => {
  return attributes.brands;
};

const getCapacities = (attributes: ShopAttributes): ShopAttribute[] => {
  return attributes.capacities;
};

const getZastosowanie = (attributes: ShopAttributes): ShopAttribute[] => {
  return attributes.zastosowanie;
};

// Store
export const useShopDataStore = create<ShopDataState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    categories: [],
    attributes: { brands: [], capacities: [], zastosowanie: [] },
    totalProducts: 0,
    isLoading: false,
    isInitialized: false,
    lastUpdated: null,
    error: null,

    // Actions
    initialize: async () => {
      const state = get();
      
      // Jeśli już zainicjalizowane i dane są świeże, nie rób nic
      if (state.isInitialized && state.isDataFresh()) {
        logger.debug('ShopDataStore: Data already initialized and fresh');
        return;
      }

      set({ isLoading: true, error: null });

      try {
        logger.debug('ShopDataStore: Initializing');
        
        const shopData = await shopDataPrefetch.getShopData({
          forceRefresh: false,
          cacheTimeout: 5 * 60 * 1000 // 5 minut
        });

        set({
          categories: shopData.categories,
          attributes: shopData.attributes,
          totalProducts: shopData.totalProducts,
          isLoading: false,
          isInitialized: true,
          lastUpdated: shopData.lastUpdated,
          error: null
        });

        logger.info('ShopDataStore: Initialized', {
          categories: shopData.categories.length,
          brands: shopData.attributes.brands.length,
          totalProducts: shopData.totalProducts,
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nie udało się załadować danych sklepu';
        logger.error('ShopDataStore: Error during initialization', { error: message });
        
        set({
          isLoading: false,
          error: message
        });
      }
    },

    refresh: async () => {
      set({ isLoading: true, error: null });

      try {
        logger.debug('ShopDataStore: Refreshing data');
        
        const shopData = await shopDataPrefetch.getShopData({
          forceRefresh: true,
          cacheTimeout: 5 * 60 * 1000
        });

        set({
          categories: shopData.categories,
          attributes: shopData.attributes,
          totalProducts: shopData.totalProducts,
          isLoading: false,
          isInitialized: true,
          lastUpdated: shopData.lastUpdated,
          error: null
        });

        logger.info('ShopDataStore: Data refreshed', {
          categories: shopData.categories.length,
          brands: shopData.attributes.brands.length,
          totalProducts: shopData.totalProducts,
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nie udało się odświeżyć danych sklepu';
        logger.error('ShopDataStore: Error refreshing data', { error: message });
        
        set({
          isLoading: false,
          error: message
        });
      }
    },

    clearError: () => {
      set({ error: null });
    },

    // Getters
    getMainCategories: () => {
      const { categories } = get();
      return getMainCategories(categories);
    },

    getSubCategories: (parentId: number) => {
      const { categories } = get();
      return getSubCategories(categories, parentId);
    },

    getBrandsForModal: (limit: number = 36) => {
      const { attributes } = get();
      return getBrandsForModal(attributes, limit);
    },

    getAllBrands: () => {
      const { attributes } = get();
      return getAllBrands(attributes);
    },

    getCapacities: () => {
      const { attributes } = get();
      return getCapacities(attributes);
    },

    getZastosowanie: () => {
      const { attributes } = get();
      return getZastosowanie(attributes);
    },

    // Computed
    get hasData() {
      const { categories, attributes } = get();
      return categories.length > 0 && attributes.brands.length > 0;
    },

    get isDataFresh() {
      return (timeout: number = 5 * 60 * 1000) => {
        const { lastUpdated } = get();
        if (!lastUpdated) return false;
        
        const now = Date.now();
        return (now - lastUpdated) < timeout;
      };
    }
  }))
);

// Auto-initialize store when first accessed
let isAutoInitialized = false;

useShopDataStore.subscribe(
  (state) => state.isInitialized,
  (isInitialized) => {
    if (isInitialized && !isAutoInitialized) {
      isAutoInitialized = true;
      logger.debug('ShopDataStore: Auto-initialized');
    }
  }
);

// Export hooks for specific data - uproszczone bez selektorów
export const useShopCategories = () => {
  const store = useShopDataStore();
  const mainCategories = store.categories.filter(c => (c.parent || 0) === 0);
  const hierarchicalCategories = buildHierarchicalCategories(store.categories);
  
  return {
    categories: store.categories,
    mainCategories,
    hierarchicalCategories, // Dodaj hierarchiczną strukturę
    getSubCategories: store.getSubCategories,
    isLoading: store.isLoading
  };
};

export const useShopAttributes = () => {
  const store = useShopDataStore();
  
  return {
    attributes: store.attributes,
    brands: store.attributes.brands,
    brandsForModal: store.attributes.brands.slice(0, 50), // Zwiększono z 36 do 50
    capacities: store.attributes.capacities,
    zastosowanie: store.attributes.zastosowanie,
    isLoading: store.isLoading
  };
};

export const useShopStats = () => {
  const store = useShopDataStore();
  
  return {
    totalProducts: store.totalProducts,
    totalCategories: store.categories.length,
    totalBrands: store.attributes.brands.length,
    totalCapacities: store.attributes.capacities.length,
    lastUpdated: store.lastUpdated,
    isDataFresh: store.isDataFresh()
  };
};

export const useShopDataActions = () => useShopDataStore((state) => ({
  initialize: state.initialize,
  refresh: state.refresh,
  clearError: state.clearError,
  isLoading: state.isLoading,
  error: state.error
}));

// Export default
export default useShopDataStore;
