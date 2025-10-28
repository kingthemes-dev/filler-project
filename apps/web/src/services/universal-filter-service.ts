/**
 * UNIVERSAL FILTER SERVICE
 * Senior-level service that works with ANY e-commerce API
 */

import { FilterConfig, getFilterConfig, validateFilterConfig } from '@/config/filter-config';

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
  private cache: Map<string, any> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();

  constructor(config?: Partial<FilterConfig>, preset: 'woocommerce' | 'shopify' | 'custom' = 'woocommerce') {
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
        const paramPairs = Object.entries(params).map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
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
    transformer: (data: any) => T
  ): Promise<T> {
    const now = Date.now();
    const cachedData = this.cache.get(cacheKey);
    const cacheTime = this.cacheTimestamps.get(cacheKey) || 0;
    
    // Check if cache is still valid
    if (cachedData && (now - cacheTime) < this.config.cache.staleTime) {
      return cachedData;
    }
    
    try {
      console.log(`🔄 Fetching ${cacheKey} from:`, url);
      console.log(`🔄 Base URL:`, this.config.api.baseUrl);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...this.config.api.headers
        }
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
        const basicEmpty = this.preset === 'woocommerce' ? [] as T : {} as T;
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
      (data) => this.transformCategories(data)
    );
  }

  /**
   * Auto-discover attributes from API
   */
  async getAttributes(): Promise<Record<string, UniversalAttribute>> {
    return this.fetchWithCache(
      'attributes',
      this.getApiUrl(this.config.api.endpoints.attributes, { per_page: '100' }),
      (data) => this.transformAttributes(data)
    );
  }

  /**
   * Get all filters (categories + attributes)
   */
  async getAllFilters(): Promise<UniversalFilters> {
    const [categories, attributes] = await Promise.all([
      this.getCategories(),
      this.getAttributes()
    ]);

    return {
      categories,
      attributes
    };
  }

  /**
   * Transform raw API data to universal category format
   */
  private transformCategories(rawData: any): UniversalCategory[] {
    let categories: any[] = [];
    
    // Handle different API response formats
    if (Array.isArray(rawData)) {
      categories = rawData;
    } else if (rawData.categories) {
      categories = rawData.categories;
    } else if (rawData.data) {
      categories = rawData.data;
    } else if (rawData.collections) { // Shopify
      categories = rawData.collections;
    }
    
    // Filter categories based on config
    const filteredCategories = categories.filter(cat => {
      if (this.config.categories.excludeSlugs?.includes(cat.slug)) return false;
      if (this.config.categories.includeSlugs?.length && !this.config.categories.includeSlugs.includes(cat.slug)) return false;
      return true;
    });
    
    // Transform to universal format
    const universalCategories: UniversalCategory[] = filteredCategories.map(cat => ({
      id: String(cat.id),
      name: cat.name,
      slug: cat.slug,
      count: cat.count || 0,
      parent: cat.parent ? String(cat.parent) : undefined,
      level: 0,
      subcategories: [],
      image: cat.image ? {
        src: cat.image.src || cat.image.url,
        alt: cat.image.alt || cat.name
      } : undefined
    }));
    
    // Build hierarchy
    return this.buildCategoryHierarchy(universalCategories);
  }

  /**
   * Transform raw API data to universal attribute format
   */
  private transformAttributes(rawData: any): Record<string, UniversalAttribute> {
    let attributes: any[] = [];
    
    // Handle different API response formats
    if (Array.isArray(rawData)) {
      attributes = rawData;
    } else if (rawData.attributes) {
      attributes = rawData.attributes;
    } else if (rawData.data) {
      attributes = rawData.data;
    } else if (rawData.product_options) { // Shopify
      attributes = rawData.product_options;
    }
    
    const result: Record<string, UniversalAttribute> = {};
    
    attributes.forEach(attr => {
      // Filter based on config
      if (this.config.attributes.excludeSlugs?.includes(attr.slug)) return;
      if (this.config.attributes.includeSlugs?.length && !this.config.attributes.includeSlugs.includes(attr.slug)) return;
      
      const attributeName = this.config.attributes.customNames?.[attr.slug] || attr.name || attr.slug;
      
      result[attr.slug] = {
        id: String(attr.id),
        name: attributeName,
        slug: attr.slug,
        type: this.detectAttributeType(attr),
        terms: (attr.terms || []).map((term: any) => ({
          id: String(term.id),
          name: term.name,
          slug: term.slug,
          count: term.count || 0
        })),
        order: attr.order || 0
      };
    });
    
    return result;
  }

  /**
   * Detect attribute type based on data
   */
  private detectAttributeType(attr: any): 'select' | 'multiselect' | 'range' | 'boolean' {
    if (attr.type) {
      switch (attr.type.toLowerCase()) {
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
    
    // Auto-detect based on terms
    const terms = attr.terms || [];
    if (terms.length === 0) return 'select';
    if (terms.length === 2 && terms.every((t: any) => ['tak', 'nie', 'yes', 'no', 'true', 'false'].includes(t.name.toLowerCase()))) {
      return 'boolean';
    }
    
    return 'select';
  }

  /**
   * Build category hierarchy
   */
  private buildCategoryHierarchy(categories: UniversalCategory[]): UniversalCategory[] {
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
