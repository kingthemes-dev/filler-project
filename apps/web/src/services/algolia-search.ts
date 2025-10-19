/**
 * Algolia Search Service
 * Advanced search with faceting, filtering, and analytics
 * TODO: Configure Algolia when ready
 */

// Temporary fallback implementation until Algolia is configured
export interface SearchResult {
  objectID: string;
  name: string;
  description: string;
  price: number;
  regular_price?: number;
  sale_price?: number;
  image: string;
  category: string;
  brand: string;
  in_stock: boolean;
  on_sale: boolean;
  rating?: number;
  review_count?: number;
  _highlightResult?: {
    name?: { value: string };
    description?: { value: string };
  };
}

export interface SearchFilters {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  onSale?: boolean;
  brand?: string;
}

class AlgoliaSearchService {
  constructor() {
    console.warn('Algolia not configured, using fallback search');
  }

  async search(query: string, filters: SearchFilters = {}): Promise<SearchResult[]> {
    // Fallback: return empty results until Algolia is configured
    console.log('Algolia search fallback:', { query, filters });
    return [];
  }

  async getRecommendations(productId: string): Promise<SearchResult[]> {
    // Fallback: return empty results until Algolia is configured
    console.log('Algolia recommendations fallback:', productId);
    return [];
  }

  async getFacets(): Promise<Record<string, any>> {
    // Fallback: return empty facets until Algolia is configured
    return {};
  }

  async getPopularSearches(): Promise<string[]> {
    // Fallback: return empty array until Algolia is configured
    return [];
  }

  async getTrendingProducts(): Promise<SearchResult[]> {
    // Fallback: return empty results until Algolia is configured
    return [];
  }
}

// Export singleton instance
export const algoliaSearch = new AlgoliaSearchService();
export default algoliaSearch;