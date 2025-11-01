'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import PageContainer from '@/components/ui/page-container';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Filter, SortAsc } from 'lucide-react';
import { WooCommerceService } from '@/services/woocommerce-optimized';
import { wooSearchService } from '@/services/woocommerce-search';
import { WooProduct } from '@/types/woocommerce';
import SearchTracking from '@/components/seo/search-tracking';
import { logger } from '@/utils/logger';
import KingProductCard from '@/components/king-product-card';
import ShopFilters from '@/components/ui/shop-filters';
// removed unused wooCommerceOptimized import
// removed unused Breadcrumbs import
import { Button } from '@/components/ui/button';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [searchResults, setSearchResults] = useState<WooProduct[]>([]);
  const [_isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  
  // Filters and sorting
  const [filters, setFilters] = useState<Record<string, string | number | boolean>>({});
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  
  const [wooService, setWooService] = useState<WooCommerceService | null>(null);

  // Initialize WooCommerce service
  useEffect(() => {
    try {
      setWooService(new WooCommerceService());
    } catch (error) {
      console.error('Error initializing WooCommerceService:', error);
    }
  }, []);

  // Perform search with advanced search service
  const performSearch = useCallback(async () => {
    if (!query) return;

    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      // Use advanced search service with filters
      const searchParams = {
        query,
        page: currentPage,
        limit: 20,
        sortBy: sortBy as any,
        // Add filters from state
        ...(filters.category && { category: filters.category as string }),
        ...(filters.price_min && { minPrice: filters.price_min as number }),
        ...(filters.price_max && { maxPrice: filters.price_max as number }),
        ...(filters.in_stock !== undefined && { inStock: filters.in_stock as boolean }),
        ...(filters.rating_min && { minRating: filters.rating_min as number })
      };

      const response = await wooSearchService.advancedSearch(searchParams);
      
      setSearchResults(response.products as WooProduct[] || []);
      setTotalResults(response.total || 0);
      setTotalPages(response.totalPages || 1);
      
      const processingTime = Date.now() - startTime;
      setProcessingTime(processingTime);
      
      logger.info('Advanced search completed', {
        query,
        resultsCount: response.products.length,
        processingTime: `${processingTime}ms`,
        filters
      });
      
    } catch (error) {
      logger.error('Search error:', error);
      setSearchResults([]);
      setTotalResults(0);
      setProcessingTime(0);
    } finally {
      setIsLoading(false);
    }
  }, [query, currentPage, sortBy, filters]);

  // Search products when query or filters change
  useEffect(() => {
    if (query && wooService) {
      performSearch();
    }
  }, [performSearch, query, wooService]);

  // Handle filter change
  const handleFilterChange = (filterType: string, value: string | number | boolean) => {
    setFilters((prev: Record<string, string | number | boolean>) => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1); // Reset to first page
  };

  // Handle sort change
  const handleSortChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy);
    setCurrentPage(1); // Reset to first page
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };


  // Get filter options
  const getFilterOptions = () => {
    const categories = Array.from(new Set(searchResults.map(p => 
      p.categories && p.categories.length > 0 ? p.categories[0].name : 'Produkt'
    )));
    const priceRanges = [
      { label: '0 - 50 zł', min: 0, max: 5000 },
      { label: '50 - 100 zł', min: 5000, max: 10000 },
      { label: '100 - 200 zł', min: 10000, max: 20000 },
      { label: '200+ zł', min: 20000, max: 999999 }
    ];
    const ratingOptions = [
      { label: '4+ gwiazdki', value: 4 },
      { label: '4.5+ gwiazdki', value: 4.5 },
      { label: '5 gwiazdek', value: 5 }
    ];

    return { categories, priceRanges, ratingOptions };
  };

  const { categories: _categories, priceRanges: _priceRanges, ratingOptions: _ratingOptions } = getFilterOptions();

  if (!query) {
    return (
      <PageContainer className="py-8">
        <div className="text-center">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Wprowadź wyszukiwanie
          </h1>
          <p className="text-gray-600">
            Użyj wyszukiwarki w górnej części strony, aby znaleźć produkty
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-8">
      <SearchTracking 
        searchQuery={query} 
        resultsCount={totalResults}
        searchEngine="site_search"
      />
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Wyniki wyszukiwania dla &quot;{query}&quot;
        </h1>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Znaleziono {totalResults} produktów
            {processingTime > 0 && ` w ${processingTime}ms`}
            {processingTime > 0 && processingTime < 100 && (
              <span className="ml-2 text-green-600 font-medium">⚡ Szybko!</span>
            )}
          </span>
          
          {/* Mobile filter toggle */}
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filtry</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar - ShopFilters Component */}
        <ShopFilters
          categories={[]}
          filters={{
            categories: [],
            search: query,
            minPrice: filters.price_min as number || 0,
            maxPrice: filters.price_max as number || 10000,
            inStock: filters.in_stock as boolean || false,
            onSale: false
          }}
          priceRange={{
            min: filters.price_min as number || 0,
            max: filters.price_max as number || 10000
          }}
          setPriceRange={(range) => {
            handleFilterChange('price_min', range.min);
            handleFilterChange('price_max', range.max);
          }}
          onFilterChange={handleFilterChange}
          onCategoryChange={(categoryId) => handleFilterChange('category', categoryId)}
          onClearFilters={clearFilters}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          totalProducts={totalResults}
          attributesLoading={false}
          wooCommerceCategories={[]}
          products={searchResults}
        />
        
        {/* Search Results */}
        <div className="flex-1">
          {/* Sort and Results Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {totalResults} produktów
              </span>
              
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="relevance">Najlepsze dopasowanie</option>
                  <option value="price_asc">Cena: od najniższej</option>
                  <option value="price_desc">Cena: od najwyższej</option>
                  <option value="rating">Najwyżej oceniane</option>
                  <option value="newest">Najnowsze</option>
                </select>
                <SortAsc className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>


          {/* Results Grid */}
          {searchResults.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              {searchResults.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <KingProductCard
                    product={product}
                    variant="default"
                    showActions={true}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchResults.length === 0 && totalResults === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nie znaleziono produktów
              </h3>
              <p className="text-gray-600 mb-4">
                Nie znaleziono produktów dla &quot;{query}&quot;. Spróbuj inne słowa kluczowe lub zmień filtry.
              </p>
              <button
                onClick={clearFilters}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Wyczyść filtry
              </button>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center mt-8">
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Poprzednia
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 text-sm border rounded-lg ${
                        currentPage === page
                          ? 'bg-black text-white border-black'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Następna
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchResultsContent />
    </Suspense>
  );
}
