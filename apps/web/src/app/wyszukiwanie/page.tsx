'use client';

import { useState, useEffect, Suspense } from 'react';
import PageContainer from '@/components/ui/page-container';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Filter, SortAsc, Star, ShoppingCart, Heart } from 'lucide-react';
import { WooCommerceService } from '@/services/woocommerce-optimized';
import { formatPrice } from '@/utils/format-price';
import { WooProduct } from '@/types/woocommerce';
import { useCartStore } from '@/stores/cart-store';
import Image from 'next/image';
import Link from 'next/link';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [searchResults, setSearchResults] = useState<WooProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  
  // Filters and sorting
  const [filters, setFilters] = useState<Record<string, string | number | boolean>>({});
  const [sortBy, setSortBy] = useState<'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('relevance');
  const [showFilters, setShowFilters] = useState(false);
  
  // Cart store
  const { addItem } = useCartStore();
  const [wooService, setWooService] = useState<WooCommerceService | null>(null);

  // Initialize WooCommerce service
  useEffect(() => {
    try {
      setWooService(new WooCommerceService());
    } catch (error) {
      console.error('Error initializing WooCommerceService:', error);
    }
  }, []);

  // Search products when query or filters change
  useEffect(() => {
    if (query && wooService) {
      performSearch();
    }
  }, [query, filters, sortBy, currentPage, wooService]);

  // Perform search
  const performSearch = async () => {
    if (!query || !wooService) return;

    setIsLoading(true);
    
    try {
      const response = await wooService.getProducts({
        search: query,
        page: currentPage,
        per_page: 20,
        orderby: sortBy === 'price_asc' ? 'price' : sortBy === 'price_desc' ? 'price' : 'relevance',
        order: sortBy === 'price_desc' ? 'desc' : 'asc'
      });
      
      setSearchResults(response.data || []);
      setTotalResults(response.total || 0);
      setTotalPages(response.totalPages || 1);
      setProcessingTime(100); // Mock processing time
      
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

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

  // Add to cart
  const handleAddToCart = (product: WooProduct) => {
    addItem({
      id: product.id,
      name: product.name,
      price: parseFloat(product.sale_price || product.price),
      sale_price: product.sale_price ? parseFloat(product.sale_price) : undefined,
      image: product.images && product.images.length > 0 ? product.images[0].src : '/images/placeholder-product.jpg'
    });
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

  const { categories, priceRanges, ratingOptions } = getFilterOptions();

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
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Wyniki wyszukiwania dla &quot;{query}&quot;
        </h1>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Znaleziono {totalResults} produktów
            {processingTime > 0 && ` w ${processingTime}ms`}
          </span>
          
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden flex items-center space-x-2 bg-gradient-to-r from-gray-800 to-black text-white px-4 py-2 rounded-lg font-medium hover:from-gray-700 hover:to-gray-900 hover:scale-105 transition-all duration-300"
          >
            <Filter className="w-4 h-4" />
            <span>Filtry</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <div className={`lg:w-64 lg:block ${showFilters ? 'block' : 'hidden'}`}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filtry</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-black transition-colors"
              >
                Wyczyść
              </button>
            </div>

            {/* Categories */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Kategorie</h4>
              <div className="space-y-2">
                {categories.map((category) => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.category === category}
                      onChange={(e) => handleFilterChange('category', e.target.checked ? category : '')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Cena</h4>
              <div className="space-y-2">
                {priceRanges.map((range) => (
                  <label key={range.label} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.price_min === range.min && filters.price_max === range.max}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('price_min', range.min);
                          handleFilterChange('price_max', range.max);
                        } else {
                          handleFilterChange('price_min', '');
                          handleFilterChange('price_max', '');
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{range.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Dostępność</h4>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.in_stock === true}
                  onChange={(e) => handleFilterChange('in_stock', e.target.checked ? true : false)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">W magazynie</span>
              </label>
            </div>

            {/* Rating */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Ocena</h4>
              <div className="space-y-2">
                {ratingOptions.map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.rating_min === option.value}
                      onChange={(e) => handleFilterChange('rating_min', e.target.checked ? option.value : 0)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

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
                <Link key={product.id} href={`/produkt/${product.slug}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  >
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-200 relative">
                    {product.images && product.images.length > 0 ? (
                      <Image 
                        src={product.images[0].src} 
                        alt={product.images[0].alt || product.name}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300"></div>
                    )}
                    {product.sale_price && (
                      <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                        Promocja
                      </div>
                    )}
                    {product.stock_status !== 'instock' && (
                      <div className="absolute top-2 right-2 bg-gray-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                        Brak w magazynie
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.short_description || product.description}
                    </p>

                    {/* Rating */}
                    <div className="flex items-center mb-3">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">
                          {parseFloat(product.average_rating) || 0}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 mx-2">•</span>
                      <span className="text-xs text-gray-600">
                        {(product as any).review_count || 0} opinii
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(parseFloat(product.sale_price || product.price))}
                        </span>
                        {product.sale_price && (
                          <span className="text-sm text-gray-500 line-through ml-2">
                            {formatPrice(parseFloat(product.price))}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock_status !== 'instock'}
                        className="flex-1 bg-black text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Dodaj do koszyka
                      </button>
                      
                      <button className="p-2 text-gray-400 hover:text-red-500 transition-colors border border-gray-300 rounded-lg hover:border-red-300">
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  </motion.div>
                </Link>
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
