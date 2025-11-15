/**
 * UNIVERSAL FILTER SERVICE
 * Senior-level service that works with ANY e-commerce API
 */

import {
  FilterConfig,
  getFilterConfig,
  validateFilterConfig,
} from '@/config/filter-config';

export interface UniversalCategory {
  id: string;
  name: string;
  slug: string;
  count: number;
  parent?: string;
  level: number;
  subcategories: UniversalCategory[];
  image?: {
    src: string;
    alt: string;
  };
}

export interface UniversalAttribute {
  id: string;
  name: string;
  slug: string;
  type: 'select' | 'multiselect' | 'range' | 'boolean';
  terms: UniversalAttributeTerm[];
  order?: number;
}

export interface UniversalAttributeTerm {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface UniversalFilters {
  categories: UniversalCategory[];
  attributes: Record<string, UniversalAttribute>;
}

class UniversalFilterService {
  private config: FilterConfig;
  private preset: 'woocommerce' | 'shopify' | 'custom';
  private cache: Map<string, unknown> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();

  constructor(
    config?: Partial<FilterConfig>,
    preset: 'woocommerce' | 'shopify' | 'custom' = 'woocommerce'
  ) {
    this.preset = preset;
    this.config = getFilterConfig(preset, config);

    const validation = validateFilterConfig(this.config);
    if (!validation.valid) {
      console.error('Invalid filter configuration:', validation.errors);
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Get full API URL for endpoint
   */
  private getApiUrl(endpoint: string, params?: Record<string, string>): string {
    try {
      // Simple concatenation for relative URLs
      let fullUrl = this.config.api.baseUrl + endpoint;

      // Add additional parameters if any - WITHOUT URLSearchParams!
      if (params) {
        const paramPairs = Object.entries(params).map(
          ([key, value]) => `${key}=${encodeURIComponent(value)}`
        );
        const paramString = paramPairs.join('&');
        if (paramString) {
          fullUrl += (endpoint.includes('?') ? '&' : '?') + paramString;
        }
      }

      console.log(`🔗 Constructed URL:`, fullUrl);
      return fullUrl;
    } catch (error) {
      console.error(`❌ Error constructing URL:`, error);
      console.error(`❌ Base URL:`, this.config.api.baseUrl);
      console.error(`❌ Endpoint:`, endpoint);
      console.error(`❌ Params:`, params);

      // Fallback to simple concatenation
      const fallbackUrl = this.config.api.baseUrl + endpoint;
      console.log(`🔄 Using fallback URL:`, fallbackUrl);
      return fallbackUrl;
    }
  }

  /**
   * Fetch data with caching and error handling
   */
  private async fetchWithCache<T>(
    cacheKey: string,
    url: string,
    transformer: (data: unknown) => T
  ): Promise<T> {
    const now = Date.now();
    const cachedData = this.cache.get(cacheKey) as T | undefined;
    const cacheTime = this.cacheTimestamps.get(cacheKey) || 0;

    // Check if cache is still valid
    if (cachedData && now - cacheTime < this.config.cache.staleTime) {
      return cachedData;
    }

    try {
      console.log(`🔄 Fetching ${cacheKey} from:`, url);
      console.log(`🔄 Base URL:`, this.config.api.baseUrl);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...this.config.api.headers,
        },
      });

      if (!response.ok) {
        console.error(`❌ HTTP ${response.status} for ${cacheKey}:`, url);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const rawData = await response.json();
      console.log(`📦 Raw data for ${cacheKey}:`, rawData);

      const transformedData = transformer(rawData);
      console.log(`🔄 Transformed data for ${cacheKey}:`, transformedData);

      // Cache the result
      this.cache.set(cacheKey, transformedData);
      this.cacheTimestamps.set(cacheKey, now);

      console.log(`✅ Successfully fetched ${cacheKey}`);
      return transformedData;
    } catch (error) {
      console.error(`❌ Error fetching ${cacheKey}:`, error);
      console.error(`❌ URL that failed:`, url);
      console.error(`❌ Cache key:`, cacheKey);

      // Return cached data if available, even if stale
      if (cachedData) {
        console.warn(`🔄 Using stale cache for ${cacheKey}`);
        return cachedData;
      }

      // Return empty data as fallback instead of throwing
      console.warn(`🔄 Returning empty data for ${cacheKey} as fallback`);
      try {
        const emptyData = transformer([]);
        this.cache.set(cacheKey, emptyData);
        this.cacheTimestamps.set(cacheKey, now);
        return emptyData;
      } catch (transformError) {
        console.error(`❌ Error transforming empty data:`, transformError);
        // Return basic empty structure
        const basicEmpty =
          this.preset === 'woocommerce' ? ([] as T) : ({} as T);
        this.cache.set(cacheKey, basicEmpty);
        this.cacheTimestamps.set(cacheKey, now);
        return basicEmpty;
      }
    }
  }

  /**
   * Auto-discover categories from API
   */
  async getCategories(): Promise<UniversalCategory[]> {
    return this.fetchWithCache(
      'categories',
      this.getApiUrl(this.config.api.endpoints.categories, { per_page: '100' }),
      data => this.transformCategories(data)
    );
  }

  /**
   * Auto-discover attributes from API
   */
  async getAttributes(): Promise<Record<string, UniversalAttribute>> {
    return this.fetchWithCache(
      'attributes',
      this.getApiUrl(this.config.api.endpoints.attributes, { per_page: '100' }),
      data => this.transformAttributes(data)
    );
  }

  /**
   * Get all filters (categories + attributes)
   */
  async getAllFilters(): Promise<UniversalFilters> {
    const [categories, attributes] = await Promise.all([
      this.getCategories(),
      this.getAttributes(),
    ]);

    return {
      categories,
      attributes,
    };
  }

  /**
   * Transform raw API data to universal category format
   */
  private transformCategories(rawData: unknown): UniversalCategory[] {
    const categoriesRaw = this.normalizeToArray(rawData, [
      'categories',
      'data',
      'collections',
    ]);

    const filteredCategories = categoriesRaw
      .map(item => this.toRecord(item))
      .filter((cat): cat is Record<string, unknown> => Boolean(cat))
      .filter(cat => {
        const slug = this.toString(cat.slug);
        if (!slug) return false;
        if (this.config.categories.excludeSlugs?.includes(slug)) return false;
        if (
          this.config.categories.includeSlugs?.length &&
          !this.config.categories.includeSlugs.includes(slug)
        )
          return false;
        return true;
      });

    const universalCategories: UniversalCategory[] = filteredCategories.map(
      cat => {
        const id = this.toId(cat.id);
        const parent = this.toId(cat.parent, true);
        const imageRecord = this.toRecord(cat.image);
        const imageSrc = imageRecord
          ? this.toString(imageRecord.src) || this.toString(imageRecord.url)
          : undefined;
        const imageAlt = imageRecord
          ? this.toString(imageRecord.alt) || this.toString(cat.name)
          : undefined;

        return {
          id,
          name: this.toString(cat.name),
          slug: this.toString(cat.slug),
          count: this.toNumber(cat.count),
          parent,
          level: 0,
          subcategories: [],
          image: imageSrc
            ? { src: imageSrc, alt: imageAlt || this.toString(cat.name) }
            : undefined,
        };
      }
    );

    return this.buildCategoryHierarchy(universalCategories);
  }

  /**
   * Transform raw API data to universal attribute format
   */
  private transformAttributes(
    rawData: unknown
  ): Record<string, UniversalAttribute> {
    const attributesRaw = this.normalizeToArray(rawData, [
      'attributes',
      'data',
      'product_options',
    ]);

    const result: Record<string, UniversalAttribute> = {};

    attributesRaw
      .map(item => this.toRecord(item))
      .filter((attr): attr is Record<string, unknown> => Boolean(attr))
      .forEach(attr => {
        const slug = this.toString(attr.slug);
        if (!slug) return;

        if (this.config.attributes.excludeSlugs?.includes(slug)) return;
        if (
          this.config.attributes.includeSlugs?.length &&
          !this.config.attributes.includeSlugs.includes(slug)
        )
          return;

        const attributeName =
          this.config.attributes.customNames?.[slug] ||
          this.toString(attr.name) ||
          slug;
        const termsRaw = this.normalizeToArray(attr.terms, []);

        const rawOrder = attr.order;

        result[slug] = {
          id: this.toId(attr.id),
          name: attributeName,
          slug,
          type: this.detectAttributeType(attr),
          terms: termsRaw
            .map(term => this.toRecord(term))
            .filter((termRecord): termRecord is Record<string, unknown> =>
              Boolean(termRecord)
            )
            .map(term => ({
              id: this.toId(term.id),
              name: this.toString(term.name),
              slug: this.toString(term.slug),
              count: this.toNumber(term.count),
            })),
          order: typeof rawOrder === 'number' ? rawOrder : undefined,
        };
      });

    return result;
  }

  /**
   * Detect attribute type based on data
   */
  private detectAttributeType(
    attr: Record<string, unknown>
  ): 'select' | 'multiselect' | 'range' | 'boolean' {
    const rawType = this.toString(attr.type).toLowerCase();
    if (rawType) {
      switch (rawType) {
        case 'boolean':
        case 'checkbox':
          return 'boolean';
        case 'range':
        case 'number':
          return 'range';
        case 'multiselect':
        case 'multiple':
          return 'multiselect';
        default:
          return 'select';
      }
    }

    const terms = this.normalizeToArray(attr.terms, [])
      .map(term => this.toRecord(term))
      .filter((termRecord): termRecord is Record<string, unknown> =>
        Boolean(termRecord)
      );

    if (terms.length === 0) return 'select';

    const booleanTerms = ['tak', 'nie', 'yes', 'no', 'true', 'false'];
    if (
      terms.length === 2 &&
      terms.every(term =>
        booleanTerms.includes(this.toString(term.name).toLowerCase())
      )
    ) {
      return 'boolean';
    }

    return 'select';
  }

  /**
   * Build category hierarchy
   */
  private buildCategoryHierarchy(
    categories: UniversalCategory[]
  ): UniversalCategory[] {
    const categoryMap = new Map<string, UniversalCategory>();
    const rootCategories: UniversalCategory[] = [];

    // Create map
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, subcategories: [] });
    });

    // Build hierarchy
    categories.forEach(cat => {
      const universalCat = categoryMap.get(cat.id)!;

      if (cat.parent && categoryMap.has(cat.parent)) {
        const parent = categoryMap.get(cat.parent)!;
        universalCat.level = parent.level + 1;
        parent.subcategories.push(universalCat);
      } else {
        universalCat.level = 0;
        rootCategories.push(universalCat);
      }
    });

    return rootCategories;
  }

  private normalizeToArray(rawData: unknown, keys: string[]): unknown[] {
    if (Array.isArray(rawData)) {
      return rawData;
    }

    if (typeof rawData === 'object' && rawData !== null) {
      const record = rawData as Record<string, unknown>;
      for (const key of keys) {
        const value = record[key];
        if (Array.isArray(value)) {
          return value;
        }
      }
    }

    return [];
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private toString(value: unknown, fallback = ''): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return fallback;
  }

  private toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }

  private toId(value: unknown): string;
  private toId(value: unknown, allowUndefined: false): string;
  private toId(value: unknown, allowUndefined: true): string | undefined;
  private toId(value: unknown, allowUndefined = false): string | undefined {
    const stringValue = this.toString(value);
    if (!stringValue) {
      return allowUndefined ? undefined : '';
    }
    return stringValue;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<FilterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.clearCache(); // Clear cache when config changes
  }

  /**
   * Get current configuration
   */
  getConfig(): FilterConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const universalFilterService = new UniversalFilterService();

// Export class for custom instances
export { UniversalFilterService };
