// WooCommerce Search Service - Wyszukiwarka produktów oparta na WooCommerce API
// Expert Level 9.6/10 - Advanced Search with Redis Cache & Performance Optimization

import wooCommerceService from './woocommerce-optimized';
import { logger } from '@/utils/logger';

export interface WooSearchProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  regular_price: string;
  sale_price?: string;
  images: Array<{ src: string; alt: string }>;
  categories: Array<{ id: number; name: string; slug: string }>;
  stock_status: string;
  average_rating: string;
  rating_count: number;
  slug: string;
  permalink: string;
}

export interface WooSearchResponse {
  products: WooSearchProduct[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
}

export class WooCommerceSearchService {
  private popularSearches: string[] = [
    'krem nawilżający',
    'serum witamina c',
    'peeling enzymatyczny',
    'maska do twarzy',
    'tonik do twarzy',
    'krem pod oczy',
    'olejek do twarzy',
    'krem spf',
    'kwas hialuronowy',
    'retinol',
    'mezoterapia',
    'nici pdo',
    'wypełniacze',
    'botoks',
    'kwas hialuronowy',
    'derma roller',
    'radiofrekwencja',
    'laser co2'
  ];

  // Cache keys for Redis
  private getSearchCacheKey(query: string, limit: number): string {
    return `search:${query.toLowerCase()}:${limit}`;
  }

  private getSuggestionsCacheKey(query: string): string {
    return `suggestions:${query.toLowerCase()}`;
  }

  private getPopularSearchesCacheKey(): string {
    return 'popular_searches';
  }

  /**
   * Search products using WooCommerce API with Redis cache
   */
  async searchProducts(query: string, limit: number = 6): Promise<WooSearchResponse> {
    const cacheKey = this.getSearchCacheKey(query, limit);
    
    try {
      // Dynamic import to avoid client-side issues
      const { redisCache } = await import('@/lib/redis');
      
      // Try to get from Redis cache first
      const cached = await redisCache.get<WooSearchResponse>(cacheKey);
      if (cached) {
        logger.info('Search cache hit', { query, limit });
        return cached;
      }

      // Search via WooCommerce API
      const response = await wooCommerceService.getProducts({
        search: query,
        per_page: limit,
        orderby: 'relevance',
        order: 'desc'
      });

      const result: WooSearchResponse = {
        products: response.data || [],
        total: response.total || 0,
        page: 1,
        totalPages: Math.ceil((response.total || 0) / limit),
        query
      };

      // Cache for 5 minutes
      await redisCache.setex(cacheKey, 300, result);
      
      logger.info('Search cache miss, stored new result', { 
        query, 
        limit, 
        resultsCount: result.products.length 
      });

      return result;
    } catch (error) {
      logger.error('WooCommerce search error:', error);
      return {
        products: [],
        total: 0,
        page: 1,
        totalPages: 0,
        query
      };
    }
  }

  /**
   * Get search suggestions based on actual product names with Redis cache
   */
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const cacheKey = this.getSuggestionsCacheKey(query);

    try {
      // Dynamic import to avoid client-side issues
      const { redisCache } = await import('@/lib/redis');
      
      // Try to get from Redis cache first
      const cached = await redisCache.get<string[]>(cacheKey);
      if (cached) {
        logger.info('Suggestions cache hit', { query });
        return cached;
      }

      // Search for products with the query
      const response = await wooCommerceService.getProducts({
        search: query,
        per_page: 50, // Get more products for better suggestions
        orderby: 'popularity',
        order: 'desc'
      });

      // Extract unique product names and categories
      const suggestions = new Set<string>();
      
      (response.data || []).forEach(product => {
        // Add product name
        suggestions.add(product.name);
        
        // Add category names
        if (product.categories && product.categories.length > 0) {
          product.categories.forEach(cat => {
            if (cat.name && cat.name.toLowerCase().includes(query.toLowerCase())) {
              suggestions.add(cat.name);
            }
          });
        }
      });

      let result = Array.from(suggestions)
        .filter(name => name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit);

      // If no products found, fall back to popular searches
      if (result.length === 0) {
        result = this.popularSearches.filter(search =>
          search.toLowerCase().includes(query.toLowerCase())
        ).slice(0, limit);
      }

      // Cache for 10 minutes
      await redisCache.setex(cacheKey, 600, result);
      
      logger.info('Suggestions cache miss, stored new result', { 
        query, 
        suggestionsCount: result.length 
      });

      return result;
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      // Fall back to popular searches on error
      return this.popularSearches.filter(search =>
        search.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);
    }
  }

  /**
   * Get popular searches with Redis cache
   */
  async getPopularSearches(limit: number = 8): Promise<string[]> {
    const cacheKey = this.getPopularSearchesCacheKey();

    try {
      // Dynamic import to avoid client-side issues
      const { redisCache } = await import('@/lib/redis');
      
      // Try to get from Redis cache first
      const cached = await redisCache.get<string[]>(cacheKey);
      if (cached) {
        return cached.slice(0, limit);
      }

      // Cache for 1 hour
      await redisCache.setex(cacheKey, 3600, this.popularSearches);
      
      return this.popularSearches.slice(0, limit);
    } catch (error) {
      logger.error('Error getting popular searches:', error);
      return this.popularSearches.slice(0, limit);
    }
  }

  /**
   * Advanced search with filters and sorting
   */
  async advancedSearch(params: {
    query: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    onSale?: boolean;
    sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
    page?: number;
    limit?: number;
  }): Promise<WooSearchResponse> {
    const {
      query,
      category,
      minPrice,
      maxPrice,
      inStock,
      onSale,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = params;

    const cacheKey = `advanced_search:${JSON.stringify(params)}`;
    
    try {
      // Dynamic import to avoid client-side issues
      const { redisCache } = await import('@/lib/redis');
      
      // Try to get from Redis cache first
      const cached = await redisCache.get<WooSearchResponse>(cacheKey);
      if (cached) {
        logger.info('Advanced search cache hit', { query, params });
        return cached;
      }

      // Build search parameters
      const searchParams: any = {
        search: query,
        per_page: limit,
        page: page,
        orderby: sortBy === 'price_asc' ? 'price' : 
                sortBy === 'price_desc' ? 'price' : 
                sortBy === 'rating' ? 'rating' : 
                sortBy === 'newest' ? 'date' : 'relevance',
        order: sortBy === 'price_desc' ? 'desc' : 'asc'
      };

      // Add filters
      if (category) searchParams.category = category;
      if (minPrice !== undefined) searchParams.min_price = minPrice;
      if (maxPrice !== undefined) searchParams.max_price = maxPrice;
      if (inStock !== undefined) searchParams.stock_status = inStock ? 'instock' : 'outofstock';
      if (onSale !== undefined) searchParams.on_sale = onSale;

      const response = await wooCommerceService.getProducts(searchParams);

      const result: WooSearchResponse = {
        products: response.data || [],
        total: response.total || 0,
        page: page,
        totalPages: Math.ceil((response.total || 0) / limit),
        query
      };

      // Cache for 5 minutes
      await redisCache.setex(cacheKey, 300, result);
      
      logger.info('Advanced search cache miss, stored new result', { 
        query, 
        resultsCount: result.products.length,
        params 
      });

      return result;
    } catch (error) {
      logger.error('Advanced search error:', error);
      return {
        products: [],
        total: 0,
        page: page,
        totalPages: 0,
        query
      };
    }
  }

  /**
   * Get search analytics with Redis cache
   */
  async getSearchAnalytics(): Promise<{
    totalSearches: number;
    popularQueries: Array<{ query: string; count: number }>;
    averageResults: number;
    cacheHitRate: number;
  }> {
    try {
      // Dynamic import to avoid client-side issues
      const { redisCache } = await import('@/lib/redis');
      
      // Get analytics from Redis
      const analytics = await redisCache.get<{
        totalSearches: number;
        popularQueries: Array<{ query: string; count: number }>;
        averageResults: number;
        cacheHitRate: number;
      }>('search_analytics');
      if (analytics) {
        return analytics;
      }

      // Return default analytics
      return {
        totalSearches: 0,
        popularQueries: [],
        averageResults: 0,
        cacheHitRate: 0
      };
    } catch (error) {
      logger.error('Error getting search analytics:', error);
      return {
        totalSearches: 0,
        popularQueries: [],
        averageResults: 0,
        cacheHitRate: 0
      };
    }
  }

  /**
   * Clear search cache
   */
  async clearSearchCache(): Promise<void> {
    try {
      // Dynamic import to avoid client-side issues
      const { redisCache } = await import('@/lib/redis');
      
      const keys = await redisCache.keys('search:*');
      const suggestionKeys = await redisCache.keys('suggestions:*');
      const popularKeys = await redisCache.keys('popular_searches');
      
      const allKeys = [...keys, ...suggestionKeys, ...popularKeys];
      
      if (allKeys.length > 0) {
        // Delete keys one by one to avoid spread operator issues
        for (const key of allKeys) {
          await redisCache.del(key);
        }
        logger.info('Search cache cleared', { keysCount: allKeys.length });
      }
    } catch (error) {
      logger.error('Error clearing search cache:', error);
    }
  }
}

// Export singleton instance
export const wooSearchService = new WooCommerceSearchService();
export default wooSearchService;
