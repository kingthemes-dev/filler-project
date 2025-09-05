// WooCommerce Search Service - Wyszukiwarka produktów oparta na WooCommerce API

import wooCommerceService from './woocommerce-optimized';

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
    'retinol'
  ];

  /**
   * Search products using WooCommerce API
   */
  async searchProducts(query: string, limit: number = 6): Promise<WooSearchResponse> {
    try {
      const response = await wooCommerceService.getProducts({
        search: query,
        per_page: limit,
        orderby: 'title',
        order: 'asc'
      });

      return {
        products: response.data || [],
        total: response.total || 0,
        page: 1,
        totalPages: Math.ceil((response.total || 0) / limit),
        query
      };
    } catch (error) {
      console.error('WooCommerce search error:', error);
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
   * Get search suggestions based on actual product names
   */
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.length < 2) return [];

    try {
      // Search for products with the query
      const response = await wooCommerceService.getProducts({
        search: query,
        per_page: 20, // Get more products to find better suggestions
        orderby: 'title',
        order: 'asc'
      });

      // Extract unique product names that contain the query
      const suggestions = (response.data || [])
        .map(product => product.name)
        .filter(name => name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit);

      // If no products found, fall back to popular searches
      if (suggestions.length === 0) {
        const popularSuggestions = this.popularSearches.filter(search =>
          search.toLowerCase().includes(query.toLowerCase())
        );
        return popularSuggestions.slice(0, limit);
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      // Fall back to popular searches on error
      const popularSuggestions = this.popularSearches.filter(search =>
        search.toLowerCase().includes(query.toLowerCase())
      );
      return popularSuggestions.slice(0, limit);
    }
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit: number = 8): Promise<string[]> {
    return this.popularSearches.slice(0, limit);
  }

  /**
   * Get search analytics (mock data for now)
   */
  async getSearchAnalytics(): Promise<{
    totalSearches: number;
    popularQueries: Array<{ query: string; count: number }>;
    averageResults: number;
  }> {
    return {
      totalSearches: 0,
      popularQueries: [],
      averageResults: 0
    };
  }
}

// Export singleton instance
export const wooSearchService = new WooCommerceSearchService();
export default wooSearchService;
