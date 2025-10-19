/**
 * Algolia Search Service
 * Advanced search with faceting, filtering, and analytics
 */

import algoliasearch, { SearchClient, SearchIndex } from 'algoliasearch/lite';

interface AlgoliaConfig {
  appId: string;
  searchKey: string;
  indexName: string;
}

interface SearchFilters {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
  onSale?: boolean;
  brand?: string;
}

interface SearchResult {
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

class AlgoliaSearchService {
  private client: SearchClient;
  private index: SearchIndex;
  private config: AlgoliaConfig;

  constructor() {
    this.config = {
      appId: process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || '',
      searchKey: process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || '',
      indexName: process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'products',
    };

    if (!this.config.appId || !this.config.searchKey) {
      console.warn('Algolia not configured, using fallback search');
      return;
    }

    this.client = algoliasearch(this.config.appId, this.config.searchKey);
    this.index = this.client.initIndex(this.config.indexName);
  }

  /**
   * Search products with advanced filtering
   */
  async searchProducts(
    query: string,
    filters: SearchFilters = {},
    page: number = 0,
    hitsPerPage: number = 20
  ): Promise<{
    hits: SearchResult[];
    nbHits: number;
    page: number;
    nbPages: number;
    facets: Record<string, Record<string, number>>;
  }> {
    if (!this.client) {
      return this.fallbackSearch(query, filters, page, hitsPerPage);
    }

    try {
      const searchParams = {
        query,
        page,
        hitsPerPage,
        filters: this.buildFilters(filters),
        facets: ['category', 'brand', 'price_range', 'in_stock', 'on_sale'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        attributesToRetrieve: [
          'objectID',
          'name',
          'description',
          'price',
          'regular_price',
          'sale_price',
          'image',
          'category',
          'brand',
          'in_stock',
          'on_sale',
          'rating',
          'review_count',
        ],
        attributesToHighlight: ['name', 'description'],
      };

      const results = await this.index.search(searchParams);
      
      return {
        hits: results.hits as SearchResult[],
        nbHits: results.nbHits,
        page: results.page,
        nbPages: results.nbPages,
        facets: results.facets || {},
      };
    } catch (error) {
      console.error('Algolia search error:', error);
      return this.fallbackSearch(query, filters, page, hitsPerPage);
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(query: string, maxSuggestions: number = 5): Promise<string[]> {
    if (!this.client) {
      return [];
    }

    try {
      const results = await this.index.search({
        query,
        hitsPerPage: maxSuggestions,
        attributesToRetrieve: ['name'],
        attributesToHighlight: ['name'],
      });

      return results.hits.map((hit: any) => hit.name);
    } catch (error) {
      console.error('Algolia suggestions error:', error);
      return [];
    }
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(): Promise<string[]> {
    if (!this.client) {
      return ['kremy', 'serum', 'maseczki', 'kosmetyki', 'pielęgnacja'];
    }

    try {
      // This would typically use Algolia Analytics API
      // For now, return static popular searches
      return ['kremy', 'serum', 'maseczki', 'kosmetyki', 'pielęgnacja'];
    } catch (error) {
      console.error('Algolia popular searches error:', error);
      return ['kremy', 'serum', 'maseczki', 'kosmetyki', 'pielęgnacja'];
    }
  }

  /**
   * Track search analytics
   */
  async trackSearch(query: string, filters: SearchFilters = {}): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      // Track search event for analytics
      await this.index.search({
        query,
        filters: this.buildFilters(filters),
        analytics: true,
        hitsPerPage: 0, // Don't return results, just track
      });
    } catch (error) {
      console.error('Algolia tracking error:', error);
    }
  }

  /**
   * Build Algolia filters from search filters
   */
  private buildFilters(filters: SearchFilters): string {
    const filterParts: string[] = [];

    if (filters.category) {
      filterParts.push(`category:"${filters.category}"`);
    }

    if (filters.brand) {
      filterParts.push(`brand:"${filters.brand}"`);
    }

    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const min = filters.priceMin || 0;
      const max = filters.priceMax || 999999;
      filterParts.push(`price:${min} TO ${max}`);
    }

    if (filters.inStock !== undefined) {
      filterParts.push(`in_stock:${filters.inStock}`);
    }

    if (filters.onSale !== undefined) {
      filterParts.push(`on_sale:${filters.onSale}`);
    }

    return filterParts.join(' AND ');
  }

  /**
   * Fallback search when Algolia is not available
   */
  private async fallbackSearch(
    query: string,
    filters: SearchFilters,
    page: number,
    hitsPerPage: number
  ): Promise<{
    hits: SearchResult[];
    nbHits: number;
    page: number;
    nbPages: number;
    facets: Record<string, Record<string, number>>;
  }> {
    // Fallback to WooCommerce API search
    try {
      const response = await fetch(
        `/api/woocommerce?endpoint=products&search=${encodeURIComponent(query)}&per_page=${hitsPerPage}&page=${page + 1}`
      );
      
      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      return {
        hits: data.map((product: any) => ({
          objectID: product.id.toString(),
          name: product.name,
          description: product.short_description || '',
          price: parseFloat(product.price),
          regular_price: product.regular_price ? parseFloat(product.regular_price) : undefined,
          sale_price: product.sale_price ? parseFloat(product.sale_price) : undefined,
          image: product.images?.[0]?.src || '',
          category: product.categories?.[0]?.name || '',
          brand: product.attributes?.pa_brand?.[0] || '',
          in_stock: product.stock_status === 'instock',
          on_sale: !!product.sale_price,
          rating: product.average_rating ? parseFloat(product.average_rating) : undefined,
          review_count: product.rating_count || 0,
        })),
        nbHits: data.length,
        page,
        nbPages: Math.ceil(data.length / hitsPerPage),
        facets: {},
      };
    } catch (error) {
      console.error('Fallback search error:', error);
      return {
        hits: [],
        nbHits: 0,
        page: 0,
        nbPages: 0,
        facets: {},
      };
    }
  }
}

export default new AlgoliaSearchService();