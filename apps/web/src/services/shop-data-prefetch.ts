/**
 * Shop Data Prefetch Service
 * 
 * Ten serwis odpowiada za prefetchowanie wszystkich danych sklepu
 * potrzebnych do natychmiastowego otwarcia modala menu sklep.
 * 
 * Dane są pobierane raz przy inicjalizacji aplikacji i cachowane
 * w sessionStorage z możliwością odświeżania.
 */


// Types
export interface ShopCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number;
}

export interface ShopAttribute {
  id: number | string;
  name: string;
  slug: string;
  count?: number; // Added count property
}

export interface ShopAttributes {
  brands: ShopAttribute[];
  capacities: ShopAttribute[];
  zastosowanie: ShopAttribute[];
}

export interface ShopData {
  categories: ShopCategory[];
  attributes: ShopAttributes;
  totalProducts: number;
  lastUpdated: number;
}

export interface PrefetchOptions {
  forceRefresh?: boolean;
  cacheTimeout?: number; // w milisekundach, domyślnie 5 minut
}

class ShopDataPrefetchService {
  private static instance: ShopDataPrefetchService;
  private cacheKey = 'shop-data-prefetch';
  private defaultCacheTimeout = 5 * 60 * 1000; // 5 minut
  private isPrefetching = false;
  private prefetchPromise: Promise<ShopData> | null = null;

  private constructor() {}

  static getInstance(): ShopDataPrefetchService {
    if (!ShopDataPrefetchService.instance) {
      ShopDataPrefetchService.instance = new ShopDataPrefetchService();
    }
    return ShopDataPrefetchService.instance;
  }

  /**
   * Pobiera dane sklepu z cache lub API
   */
  async getShopData(options: PrefetchOptions = {}): Promise<ShopData> {
    const { forceRefresh = false, cacheTimeout = this.defaultCacheTimeout } = options;

    // Sprawdź cache jeśli nie wymuszamy odświeżenia
    if (!forceRefresh) {
      const cachedData = this.getCachedData();
      if (cachedData && this.isCacheValid(cachedData, cacheTimeout)) {
        console.log('🚀 Shop data loaded from cache');
        return cachedData;
      }
    }

    // Jeśli już trwa prefetchowanie, zwróć istniejące promise
    if (this.isPrefetching && this.prefetchPromise) {
      console.log('🚀 Shop data prefetch already in progress, waiting...');
      return this.prefetchPromise;
    }

    // Rozpocznij prefetchowanie
    this.isPrefetching = true;
    this.prefetchPromise = this.fetchShopData();

    try {
      const data = await this.prefetchPromise;
      this.cacheData(data);
      console.log('🚀 Shop data prefetched and cached');
      return data;
    } finally {
      this.isPrefetching = false;
      this.prefetchPromise = null;
    }
  }

  /**
   * Pobiera dane z API
   */
  private async fetchShopData(): Promise<ShopData> {
    console.log('🚀 Fetching shop data from API...');
    
    try {
      const isBrowser = typeof window !== 'undefined';
      const base = isBrowser ? '' : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
      const makeUrl = (qs: string) => `${base}/api/woocommerce?${qs}`;

      // Pobierz wszystkie dane równolegle (toleruj błędy)
      const [categoriesResult, attributesResult, productsResult] = await Promise.allSettled([
        fetch(makeUrl('endpoint=products/categories&per_page=100'), { cache: 'no-store' }),
        fetch(makeUrl('endpoint=attributes'), { cache: 'no-store' }),
        fetch(makeUrl('endpoint=products&per_page=1'), { cache: 'no-store' })
      ]);

      // Parsowanie z bezpiecznymi fallbackami (bez przerywania całego prefetchu)
      let categoriesData: any = [];
      try {
        if (categoriesResult.status === 'fulfilled') {
          const r = categoriesResult.value;
          categoriesData = r.ok ? await r.json() : [];
          if (!r.ok) console.warn('⚠️ Categories API error:', r.status);
        }
      } catch { categoriesData = []; }

      let attributesData: any = {};
      try {
        if (attributesResult.status === 'fulfilled') {
          const r = attributesResult.value;
          attributesData = r.ok ? await r.json() : {};
          if (!r.ok) console.warn('⚠️ Attributes API error:', r.status);
        }
      } catch { attributesData = {}; }

      let totalProducts = 0;
      try {
        if (productsResult.status === 'fulfilled') {
          const r = productsResult.value;
          totalProducts = r.ok ? parseInt(r.headers.get('X-WP-Total') || '0') : 0;
          if (!r.ok) console.warn('⚠️ Products API error:', r.status);
        }
      } catch { totalProducts = 0; }

      // Przetwórz kategorie
      const categories: ShopCategory[] = Array.isArray(categoriesData)
        ? categoriesData.map((cat: any) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            count: cat.count || 0,
            parent: cat.parent || 0
          }))
        : [];

      // Przetwórz atrybuty
      const attributes: ShopAttributes = {
        brands: attributesData.attributes?.marka?.terms || [],
        capacities: attributesData.attributes?.pojemnosc?.terms || [],
        zastosowanie: attributesData.attributes?.zastosowanie?.terms || []
      };

      const shopData: ShopData = {
        categories,
        attributes,
        totalProducts,
        lastUpdated: Date.now()
      };

      console.log('🚀 Shop data fetched successfully:', {
        categories: categories.length,
        brands: attributes.brands.length,
        capacities: attributes.capacities.length,
        zastosowanie: attributes.zastosowanie.length,
        totalProducts
      });

      return shopData;

    } catch (error) {
      console.error('❌ Error fetching shop data:', error);
      
      // Zwróć fallback data jeśli API nie działa
      return this.getFallbackData();
    }
  }

  /**
   * Pobiera dane z cache
   */
  private getCachedData(): ShopData | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const cached = sessionStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);
      return data as ShopData;
    } catch (error) {
      console.warn('⚠️ Error reading cached shop data:', error);
      return null;
    }
  }

  /**
   * Zapisuje dane w cache
   */
  private cacheData(data: ShopData): void {
    try {
      if (typeof window === 'undefined') return;
      
      sessionStorage.setItem(this.cacheKey, JSON.stringify(data));
      console.log('💾 Shop data cached successfully');
    } catch (error) {
      console.warn('⚠️ Error caching shop data:', error);
    }
  }

  /**
   * Sprawdza czy cache jest ważny
   */
  private isCacheValid(data: ShopData, timeout: number): boolean {
    const now = Date.now();
    const isValid = (now - data.lastUpdated) < timeout;
    
    if (!isValid) {
      console.log('⏰ Shop data cache expired');
    }
    
    return isValid;
  }

  /**
   * Zwraca fallback data gdy API nie działa
   */
  private getFallbackData(): ShopData {
    console.log('🔄 Using fallback shop data');
    
    return {
      categories: [
        { id: 1, name: 'Wypełniacze', slug: 'wypelniacze', count: 8, parent: 0 },
        { id: 2, name: 'Stymulatory', slug: 'stymulatory', count: 43, parent: 0 },
        { id: 3, name: 'Mezoterapia', slug: 'mezoterapia', count: 11, parent: 0 },
        { id: 4, name: 'Peelingi', slug: 'peelingi', count: 6, parent: 0 }
      ],
      attributes: {
        brands: [
          { id: 1, name: 'Allergan', slug: 'allergan' },
          { id: 2, name: 'Merz', slug: 'merz' },
          { id: 3, name: 'Galderma', slug: 'galderma' },
          { id: 4, name: 'Teoxane', slug: 'teoxane' },
          { id: 5, name: 'Juvederm', slug: 'juvederm' },
          { id: 6, name: 'Restylane', slug: 'restylane' },
          { id: 7, name: 'Sculptra', slug: 'sculptra' },
          { id: 8, name: 'Radiesse', slug: 'radiesse' },
          { id: 9, name: 'Belotero', slug: 'belotero' },
          { id: 10, name: 'Ellanse', slug: 'ellanse' }
        ],
        capacities: [
          { id: 1, name: '0.5ml', slug: '0-5ml' },
          { id: 2, name: '1ml', slug: '1ml' },
          { id: 3, name: '1.5ml', slug: '1-5ml' },
          { id: 4, name: '2ml', slug: '2ml' },
          { id: 5, name: '3ml', slug: '3ml' }
        ],
        zastosowanie: [
          { id: 1, name: 'Twarz', slug: 'twarz' },
          { id: 2, name: 'Usta', slug: 'usta' },
          { id: 3, name: 'Nos', slug: 'nos' },
          { id: 4, name: 'Policzki', slug: 'policzki' },
          { id: 5, name: 'Broda', slug: 'broda' },
          { id: 6, name: 'Skronie', slug: 'skronie' }
        ]
      },
      totalProducts: 68,
      lastUpdated: Date.now()
    };
  }

  /**
   * Czyści cache
   */
  clearCache(): void {
    try {
      if (typeof window === 'undefined') return;
      
      sessionStorage.removeItem(this.cacheKey);
      console.log('🗑️ Shop data cache cleared');
    } catch (error) {
      console.warn('⚠️ Error clearing shop data cache:', error);
    }
  }

  /**
   * Sprawdza czy dane są w cache
   */
  hasCachedData(): boolean {
    return this.getCachedData() !== null;
  }

  /**
   * Pobiera tylko kategorie główne (parent = 0)
   */
  getMainCategories(categories: ShopCategory[]): ShopCategory[] {
    return categories.filter(cat => cat.parent === 0);
  }

  /**
   * Pobiera podkategorie dla danej kategorii głównej
   */
  getSubCategories(categories: ShopCategory[], parentId: number): ShopCategory[] {
    return categories.filter(cat => cat.parent === parentId);
  }

  /**
   * Pobiera marki z limitem (dla modala)
   */
  getBrandsForModal(attributes: ShopAttributes, limit: number = 36): ShopAttribute[] {
    return attributes.brands.slice(0, limit);
  }

  /**
   * Pobiera wszystkie marki (dla mobile menu)
   */
  getAllBrands(attributes: ShopAttributes): ShopAttribute[] {
    return attributes.brands;
  }
}

// Export singleton instance
export const shopDataPrefetch = ShopDataPrefetchService.getInstance();
export default shopDataPrefetch;
