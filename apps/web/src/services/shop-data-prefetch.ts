/**
 * Shop Data Prefetch Service
 *
 * Ten serwis odpowiada za prefetchowanie wszystkich danych sklepu
 * potrzebnych do natychmiastowego otwarcia modala menu sklep.
 *
 * Dane są pobierane raz przy inicjalizacji aplikacji i cachowane
 * w sessionStorage z możliwością odświeżania.
 */

import { logger } from '@/utils/logger';

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

type RawCategory = Partial<ShopCategory> & {
  display?: string;
  image?: unknown;
  menu_order?: number;
};

interface AttributeTerm {
  id: number | string;
  name: string;
  slug: string;
  count?: number;
}

interface AttributeGroup {
  terms?: AttributeTerm[];
}

interface AttributesApiResponse {
  attributes?: {
    marka?: AttributeGroup;
    pojemnosc?: AttributeGroup;
    zastosowanie?: AttributeGroup;
    [key: string]: AttributeGroup | undefined;
  };
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
    const { forceRefresh = false, cacheTimeout = this.defaultCacheTimeout } =
      options;

    // Sprawdź cache jeśli nie wymuszamy odświeżenia
    if (!forceRefresh) {
      const cachedData = this.getCachedData();
      if (cachedData && this.isCacheValid(cachedData, cacheTimeout)) {
        logger.debug('Shop data loaded from cache', {
          cacheKey: this.cacheKey,
        });
        return cachedData;
      }
    }

    // Jeśli już trwa prefetchowanie, zwróć istniejące promise
    if (this.isPrefetching && this.prefetchPromise) {
      logger.debug('Shop data prefetch in progress, awaiting existing promise');
      return this.prefetchPromise;
    }

    // Rozpocznij prefetchowanie
    this.isPrefetching = true;
    this.prefetchPromise = this.fetchShopData();

    try {
      const data = await this.prefetchPromise;
      this.cacheData(data);
      logger.info('Shop data prefetched and cached', {
        categories: data.categories.length,
        brands: data.attributes.brands.length,
        totalProducts: data.totalProducts,
      });
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
    logger.debug('Fetching shop data from API');

    try {
      const isBrowser = typeof window !== 'undefined';
      const base = isBrowser
        ? ''
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const makeUrl = (qs: string) => `${base}/api/woocommerce?${qs}`;

      // Pobierz wszystkie dane równolegle (toleruj błędy)
      const [categoriesResult, attributesResult, productsResult] =
        await Promise.allSettled([
          fetch(makeUrl('endpoint=products/categories&per_page=100'), {
            cache: 'no-store',
          }),
          fetch(makeUrl('endpoint=attributes'), { cache: 'no-store' }),
          fetch(makeUrl('endpoint=products&per_page=1'), { cache: 'no-store' }),
        ]);

      // Parsowanie z bezpiecznymi fallbackami (bez przerywania całego prefetchu)
      let categoriesData: ShopCategory[] = [];
      try {
        if (categoriesResult.status === 'fulfilled') {
          const r = categoriesResult.value;
          if (r.ok) {
            const rawCategories = (await r.json()) as RawCategory[];
            categoriesData = Array.isArray(rawCategories)
              ? rawCategories
                  .filter((cat): cat is ShopCategory =>
                    Boolean(cat?.id && cat?.name && cat?.slug)
                  )
                  .map(cat => ({
                    id: Number(cat.id),
                    name: String(cat.name),
                    slug: String(cat.slug),
                    count: typeof cat.count === 'number' ? cat.count : 0,
                    parent: typeof cat.parent === 'number' ? cat.parent : 0,
                  }))
              : [];
          } else if (r.status === 502 || r.status === 503 || r.status === 504) {
            // Fallback do Store API jeśli WooCommerce API zwraca 502/503/504
            logger.warn('Categories API error, attempting Store API fallback', {
              status: r.status,
            });
            try {
              const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
              if (wpUrl) {
                const storeUrl = `${wpUrl}/wp-json/wc/store/v1/products/categories?per_page=100`;
                const storeResp = await fetch(storeUrl, {
                  headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Filler-Store/1.0',
                  },
                  cache: 'no-store',
                  signal: AbortSignal.timeout(5000),
                });
                if (storeResp.ok) {
                  const storeData = (await storeResp.json()) as RawCategory[];
                  // Normalize Store API response to match WooCommerce API format
                  categoriesData = Array.isArray(storeData)
                    ? storeData
                        .filter((cat): cat is ShopCategory =>
                          Boolean(cat?.id && cat?.name && cat?.slug)
                        )
                        .map(cat => ({
                          id: Number(cat.id),
                          name: String(cat.name),
                          slug: String(cat.slug),
                          count: typeof cat.count === 'number' ? cat.count : 0,
                          parent:
                            typeof cat.parent === 'number' ? cat.parent : 0,
                        }))
                    : [];
                  logger.info('Categories loaded from Store API fallback', {
                    count: categoriesData.length,
                  });
                } else {
                  logger.warn('Store API fallback failed', {
                    status: storeResp.status,
                  });
                  categoriesData = [];
                }
              } else {
                categoriesData = [];
              }
            } catch (fallbackError) {
              logger.error('Store API fallback error', {
                error: fallbackError,
              });
              categoriesData = [];
            }
          } else {
            logger.warn('Categories API returned non-success status', {
              status: r.status,
            });
            categoriesData = [];
          }
        }
      } catch (parseError) {
        logger.error('Categories parsing error', { error: parseError });
        categoriesData = [];
      }

      let attributesData: AttributesApiResponse = {};
      try {
        if (attributesResult.status === 'fulfilled') {
          const r = attributesResult.value;
          if (r.ok) {
            const rawData = await r.json();
            // API zwraca {success: true, attributes: {...}} lub bezpośrednio attributes
            attributesData = rawData?.attributes
              ? { attributes: rawData.attributes }
              : rawData;
            logger.debug('Attributes loaded', {
              hasAttributes: Boolean(attributesData.attributes),
              brands: attributesData.attributes?.marka?.terms?.length ?? 0,
              zastosowanie:
                attributesData.attributes?.zastosowanie?.terms?.length ?? 0,
            });
          } else {
            logger.warn('Attributes API error', { status: r.status });
            attributesData = {};
          }
        } else {
          logger.warn('Attributes fetch failed', {
            reason: attributesResult.reason,
          });
        }
      } catch (error) {
        logger.error('Attributes parsing error', { error });
        attributesData = {};
      }

      let totalProducts = 0;
      try {
        if (productsResult.status === 'fulfilled') {
          const r = productsResult.value;
          totalProducts = r.ok
            ? parseInt(r.headers.get('X-WP-Total') || '0')
            : 0;
          if (!r.ok) logger.warn('Products API error', { status: r.status });
        }
      } catch (productError) {
        logger.warn('Products parsing error', { error: productError });
        totalProducts = 0;
      }

      // Przetwórz kategorie
      const categories: ShopCategory[] = categoriesData;

      // Log jeśli brak kategorii
      if (categories.length === 0) {
        logger.warn('No categories loaded, check API endpoint');
      } else {
        logger.info('Categories loaded', {
          total: categories.length,
          main: categories.filter(c => (c.parent || 0) === 0).length,
        });
      }

      // Przetwórz atrybuty
      const attributes: ShopAttributes = {
        brands: attributesData.attributes?.marka?.terms ?? [],
        capacities: attributesData.attributes?.pojemnosc?.terms ?? [],
        zastosowanie: attributesData.attributes?.zastosowanie?.terms ?? [],
      };

      const shopData: ShopData = {
        categories,
        attributes,
        totalProducts,
        lastUpdated: Date.now(),
      };

      logger.info('Shop data fetched successfully', {
        categories: categories.length,
        brands: attributes.brands.length,
        capacities: attributes.capacities.length,
        zastosowanie: attributes.zastosowanie.length,
        totalProducts,
      });

      return shopData;
    } catch (error) {
      logger.error('Error fetching shop data', { error });

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

      const data = JSON.parse(cached) as ShopData;
      return data;
    } catch (error) {
      logger.warn('Error reading cached shop data', { error });
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
      logger.debug('Shop data cached successfully', {
        cacheKey: this.cacheKey,
      });
    } catch (error) {
      logger.warn('Error caching shop data', { error });
    }
  }

  /**
   * Sprawdza czy cache jest ważny
   */
  private isCacheValid(data: ShopData, timeout: number): boolean {
    const now = Date.now();
    const isValid = now - data.lastUpdated < timeout;

    if (!isValid) {
      logger.debug('Shop data cache expired', { cacheKey: this.cacheKey });
    }

    return isValid;
  }

  /**
   * Zwraca fallback data gdy API nie działa
   */
  private getFallbackData(): ShopData {
    logger.warn('Using fallback shop data');

    return {
      categories: [
        {
          id: 1,
          name: 'Wypełniacze',
          slug: 'wypelniacze',
          count: 8,
          parent: 0,
        },
        {
          id: 2,
          name: 'Stymulatory',
          slug: 'stymulatory',
          count: 43,
          parent: 0,
        },
        {
          id: 3,
          name: 'Mezoterapia',
          slug: 'mezoterapia',
          count: 11,
          parent: 0,
        },
        { id: 4, name: 'Peelingi', slug: 'peelingi', count: 6, parent: 0 },
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
          { id: 10, name: 'Ellanse', slug: 'ellanse' },
        ],
        capacities: [
          { id: 1, name: '0.5ml', slug: '0-5ml' },
          { id: 2, name: '1ml', slug: '1ml' },
          { id: 3, name: '1.5ml', slug: '1-5ml' },
          { id: 4, name: '2ml', slug: '2ml' },
          { id: 5, name: '3ml', slug: '3ml' },
        ],
        zastosowanie: [
          { id: 1, name: 'Twarz', slug: 'twarz' },
          { id: 2, name: 'Usta', slug: 'usta' },
          { id: 3, name: 'Nos', slug: 'nos' },
          { id: 4, name: 'Policzki', slug: 'policzki' },
          { id: 5, name: 'Broda', slug: 'broda' },
          { id: 6, name: 'Skronie', slug: 'skronie' },
        ],
      },
      totalProducts: 68,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Czyści cache
   */
  clearCache(): void {
    try {
      if (typeof window === 'undefined') return;

      sessionStorage.removeItem(this.cacheKey);
      logger.info('Shop data cache cleared');
    } catch (error) {
      logger.warn('Error clearing shop data cache', { error });
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
  getSubCategories(
    categories: ShopCategory[],
    parentId: number
  ): ShopCategory[] {
    return categories.filter(cat => cat.parent === parentId);
  }

  /**
   * Pobiera marki z limitem (dla modala)
   */
  getBrandsForModal(
    attributes: ShopAttributes,
    limit: number = 36
  ): ShopAttribute[] {
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
