// Algolia Search Service - Wyszukiwarka produktów
// TODO: Zastąpić prawdziwymi danymi z WooCommerce API

import { algoliasearch } from 'algoliasearch';

export interface SearchProduct {
  objectID: string;
  name: string;
  description: string;
  price: number;
  sale_price?: number;
  image: string;
  category: string;
  tags: string[];
  in_stock: boolean;
  rating: number;
  review_count: number;
  slug: string;
}

export interface SearchFilters {
  category?: string;
  price_min?: number;
  price_max?: number;
  in_stock?: boolean;
  rating_min?: number;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  page?: number;
  hitsPerPage?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
}

export interface SearchResponse {
  hits: SearchProduct[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  query: string;
}

export class AlgoliaSearchService {
  private client: unknown;
  private index: unknown;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize with mock data for now
    // TODO: Replace with real Algolia credentials
    this.initializeMockData();
  }

  /**
   * Initialize Algolia client
   */
  private async initializeAlgolia() {
    try {
      // TODO: Replace with real credentials from environment variables
      const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || 'mock-app-id';
      const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || 'mock-search-key';
      const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || 'filler_products';

      if (appId === 'mock-app-id') {
        console.log('🔍 Using mock Algolia data');
        return;
      }

      this.client = algoliasearch(appId, searchKey);
      this.index = (this.client as any).initIndex(indexName);
      this.isInitialized = true;

      console.log('🔍 Algolia initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Algolia:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Initialize mock data for testing
   */
  private initializeMockData() {
    console.log('🔍 Initializing mock search data');
    // Mock data will be used until real Algolia is configured
  }

  /**
   * Search products
   */
  async searchProducts(options: SearchOptions): Promise<SearchResponse> {
    try {
      if (this.isInitialized && this.index) {
        return await this.searchWithAlgolia(options);
      } else {
        return await this.searchWithMockData(options);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      return await this.searchWithMockData(options);
    }
  }

  /**
   * Search using real Algolia
   */
  private async searchWithAlgolia(options: SearchOptions): Promise<SearchResponse> {
    const searchParams: Record<string, unknown> = {
      query: options.query,
      page: (options.page || 1) - 1, // Algolia uses 0-based pagination
      hitsPerPage: options.hitsPerPage || 20,
    };

    // Add filters
    if (options.filters) {
      const filters: string[] = [];
      
      if (options.filters.category) {
        filters.push(`category:${options.filters.category}`);
      }
      
      if (options.filters.in_stock !== undefined) {
        filters.push(`in_stock:${options.filters.in_stock}`);
      }
      
      if (options.filters.price_min !== undefined || options.filters.price_max !== undefined) {
        let priceFilter = 'price:';
        if (options.filters.price_min !== undefined) {
          priceFilter += `${options.filters.price_min}`;
        }
        priceFilter += ' TO ';
        if (options.filters.price_max !== undefined) {
          priceFilter += `${options.filters.price_max}`;
        } else {
          priceFilter += '999999';
        }
        filters.push(priceFilter);
      }
      
      if (options.filters.rating_min !== undefined) {
        filters.push(`rating >= ${options.filters.rating_min}`);
      }

      if (filters.length > 0) {
        searchParams.filters = filters.join(' AND ');
      }
    }

    // Add sorting
    if (options.sortBy) {
      switch (options.sortBy) {
        case 'price_asc':
          searchParams.sortFacetBy = 'price';
          break;
        case 'price_desc':
          searchParams.sortFacetBy = 'price';
          searchParams.sortFacetOrder = 'desc';
          break;
        case 'rating':
          searchParams.sortFacetBy = 'rating';
          break;
        case 'newest':
          searchParams.sortFacetBy = 'created_at';
          break;
        default:
          // relevance is default
          break;
      }
    }

    const response = await (this.index as any).search(options.query, searchParams);
    
    return {
      hits: response.hits,
      nbHits: response.nbHits,
      page: response.page + 1, // Convert back to 1-based pagination
      nbPages: response.nbPages,
      hitsPerPage: response.hitsPerPage,
      processingTimeMS: response.processingTimeMS,
      query: options.query
    };
  }

  /**
   * Search using mock data
   */
  private async searchWithMockData(options: SearchOptions): Promise<SearchResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const mockProducts: SearchProduct[] = [
      {
        objectID: '1',
        name: 'Krem nawilżający do twarzy',
        description: 'Intensywnie nawilżający krem do twarzy z kwasem hialuronowym',
        price: 8900,
        sale_price: 6900,
        image: '/images/products/krem-nawilzajacy.jpg',
        category: 'Kremy',
        tags: ['nawilżający', 'kwas hialuronowy', 'anti-aging'],
        in_stock: true,
        rating: 4.8,
        review_count: 127,
        slug: 'krem-nawilzajacy-do-twarzy'
      },
      {
        objectID: '2',
        name: 'Serum z witaminą C',
        description: 'Antyoksydacyjne serum z witaminą C dla rozświetlonej cery',
        price: 12000,
        image: '/images/products/serum-witamina-c.jpg',
        category: 'Sera',
        tags: ['witamina C', 'antyoksydant', 'rozświetlający'],
        in_stock: true,
        rating: 4.9,
        review_count: 89,
        slug: 'serum-z-witamina-c'
      },
      {
        objectID: '3',
        name: 'Peeling enzymatyczny',
        description: 'Delikatny peeling enzymatyczny do wrażliwej skóry',
        price: 7500,
        image: '/images/products/peeling-enzymatyczny.jpg',
        category: 'Peelingi',
        tags: ['enzymatyczny', 'delikatny', 'wrażliwa skóra'],
        in_stock: false,
        rating: 4.6,
        review_count: 56,
        slug: 'peeling-enzymatyczny'
      },
      {
        objectID: '4',
        name: 'Maska do twarzy',
        description: 'Odmładzająca maska do twarzy z kolagenem',
        price: 4500,
        image: '/images/products/maska-do-twarzy.jpg',
        category: 'Maski',
        tags: ['odmładzająca', 'kolagen', 'intensywna pielęgnacja'],
        in_stock: true,
        rating: 4.7,
        review_count: 73,
        slug: 'maska-do-twarzy'
      },
      {
        objectID: '5',
        name: 'Tonik do twarzy',
        description: 'Oczyszczający tonik do twarzy z kwasem salicylowym',
        price: 5500,
        image: '/images/products/tonik-do-twarzy.jpg',
        category: 'Toniki',
        tags: ['oczyszczający', 'kwas salicylowy', 'przeciwtrądzikowy'],
        in_stock: true,
        rating: 4.5,
        review_count: 42,
        slug: 'tonik-do-twarzy'
      },
      {
        objectID: '6',
        name: 'Krem pod oczy',
        description: 'Redukujący cienie i worki pod oczami',
        price: 6800,
        image: '/images/products/krem-pod-oczy.jpg',
        category: 'Kremy',
        tags: ['pod oczy', 'redukcja cieni', 'antyaging'],
        in_stock: true,
        rating: 4.4,
        review_count: 38,
        slug: 'krem-pod-oczy'
      },
      {
        objectID: '7',
        name: 'Olejek do twarzy',
        description: 'Nawilżający olejek do twarzy z olejkiem arganowym',
        price: 9500,
        image: '/images/products/olejek-do-twarzy.jpg',
        category: 'Olejki',
        tags: ['nawilżający', 'olejek arganowy', 'intensywna pielęgnacja'],
        in_stock: true,
        rating: 4.8,
        review_count: 61,
        slug: 'olejek-do-twarzy'
      },
      {
        objectID: '8',
        name: 'Krem z filtrem SPF 50',
        description: 'Ochronny krem z wysokim filtrem przeciwsłonecznym',
        price: 7800,
        image: '/images/products/krem-spf-50.jpg',
        category: 'Kremy',
        tags: ['SPF 50', 'ochrona przeciwsłoneczna', 'codzienna pielęgnacja'],
        in_stock: true,
        rating: 4.9,
        review_count: 94,
        slug: 'krem-spf-50'
      }
    ];

    // Filter products based on query
    let filteredProducts = mockProducts;
    
    if (options.query) {
      const query = options.query.toLowerCase();
      filteredProducts = mockProducts.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply additional filters
    if (options.filters) {
      if (options.filters.category) {
        filteredProducts = filteredProducts.filter(product => 
          product.category.toLowerCase() === options.filters!.category!.toLowerCase()
        );
      }
      
      if (options.filters.in_stock !== undefined) {
        filteredProducts = filteredProducts.filter(product => 
          product.in_stock === options.filters!.in_stock
        );
      }
      
      if (options.filters.price_min !== undefined) {
        filteredProducts = filteredProducts.filter(product => 
          (product.sale_price || product.price) >= options.filters!.price_min!
        );
      }
      
      if (options.filters.price_max !== undefined) {
        filteredProducts = filteredProducts.filter(product => 
          (product.sale_price || product.price) <= options.filters!.price_max!
        );
      }
      
      if (options.filters.rating_min !== undefined) {
        filteredProducts = filteredProducts.filter(product => 
          product.rating >= options.filters!.rating_min!
        );
      }
    }

    // Apply sorting
    if (options.sortBy) {
      switch (options.sortBy) {
        case 'price_asc':
          filteredProducts.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));
          break;
        case 'price_desc':
          filteredProducts.sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price));
          break;
        case 'rating':
          filteredProducts.sort((a, b) => b.rating - a.rating);
          break;
        case 'newest':
          // Mock data doesn't have creation dates, so we'll use objectID
          filteredProducts.sort((a, b) => parseInt(b.objectID) - parseInt(a.objectID));
          break;
        default:
          // relevance - keep original order
          break;
      }
    }

    // Apply pagination
    const hitsPerPage = options.hitsPerPage || 20;
    const page = options.page || 1;
    const startIndex = (page - 1) * hitsPerPage;
    const endIndex = startIndex + hitsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    return {
      hits: paginatedProducts,
      nbHits: filteredProducts.length,
      page: page,
      nbPages: Math.ceil(filteredProducts.length / hitsPerPage),
      hitsPerPage: hitsPerPage,
      processingTimeMS: Math.floor(Math.random() * 50) + 10,
      query: options.query
    };
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const mockSuggestions = [
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
      'niacynamid',
      'kwas salicylowy',
      'peptydy',
      'antyoksydanty',
      'nawilżanie',
      'oczyszczanie',
      'odmładzanie',
      'ochrona przeciwsłoneczna'
    ];

    const suggestions = mockSuggestions.filter(suggestion =>
      suggestion.toLowerCase().includes(query.toLowerCase())
    );

    return suggestions.slice(0, limit);
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    return [
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
    ].slice(0, limit);
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(): Promise<{
    totalSearches: number;
    popularQueries: Array<{ query: string; count: number }>;
    averageResults: number;
  }> {
    return {
      totalSearches: 1247,
      popularQueries: [
        { query: 'krem nawilżający', count: 156 },
        { query: 'serum witamina c', count: 134 },
        { query: 'peeling', count: 98 },
        { query: 'maska', count: 87 },
        { query: 'tonik', count: 76 }
      ],
      averageResults: 6.8
    };
  }

  /**
   * Initialize real Algolia (call this when ready to go live)
   */
  async initializeRealAlgolia() {
    await this.initializeAlgolia();
  }
}

// Export singleton instance
export const algoliaSearchService = new AlgoliaSearchService();
export default algoliaSearchService;
