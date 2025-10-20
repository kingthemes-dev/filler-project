'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Star, Clock, TrendingUp, Filter, ChevronRight } from 'lucide-react';
import { WooCommerceService } from '@/services/woocommerce-optimized';
import { wooSearchService } from '@/services/woocommerce-search';
import { formatPrice } from '@/utils/format-price';
import { WooProduct } from '@/types/woocommerce';
import Image from 'next/image';
import { logger } from '@/utils/logger';
import Link from 'next/link';
import SearchErrorBoundary from './search-error-boundary';

// Google Analytics gtag type declaration
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

export default function SearchModal({ 
  isOpen,
  onClose,
  placeholder = "Szukaj produktów...", 
  onSearch 
}: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<WooProduct[]>([]);
  const [wooService, setWooService] = useState<WooCommerceService | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Analytics tracking functions
  const trackSearchQuery = useCallback((query: string, resultsCount: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'search', {
        search_term: query,
        results_count: resultsCount,
        event_category: 'Search',
        event_label: 'Modal Search'
      });
    }
  }, []);

  const trackSearchSuggestion = useCallback((suggestion: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'select_content', {
        content_type: 'search_suggestion',
        item_id: suggestion,
        event_category: 'Search',
        event_label: 'Modal Suggestion'
      });
    }
  }, []);

  // Initialize WooCommerce service
  useEffect(() => {
    const initService = async () => {
      try {
        const service = new WooCommerceService();
        setWooService(service);
        
        // Load popular searches
        const popular = await wooSearchService.getPopularSearches(8);
        setPopularSearches(popular);
        
        // Load recent searches from localStorage
        const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        setRecentSearches(recent.slice(0, 5));
        
        logger.info('Search modal initialized', { popularCount: popular.length, recentCount: recent.length });
      } catch (error) {
        logger.error('Error initializing search modal:', error);
      }
    };

    if (isOpen) {
      initService();
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle search
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !wooService) return;

    const startTime = Date.now();
    setIsLoading(true);
    setHasResults(false);
    setSearchResults([]);

    try {
      const response = await wooService.getProducts({
        search: searchQuery,
        per_page: 12,
        orderby: 'popularity',
        order: 'desc'
      });

      const results = response.data || [];
      setSearchResults(results);
      setHasResults(results.length > 0);
      setSearchTime(Date.now() - startTime);

      // Track search
      trackSearchQuery(searchQuery, results.length);

      // Save to recent searches
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      const updatedRecent = [searchQuery, ...recent.filter((s: string) => s !== searchQuery)].slice(0, 10);
      localStorage.setItem('recentSearches', JSON.stringify(updatedRecent));
      setRecentSearches(updatedRecent.slice(0, 5));

      // Get suggestions
      const newSuggestions = await wooSearchService.getSearchSuggestions(searchQuery, 6);
      setSuggestions(newSuggestions);

      logger.info('Search completed', { 
        query: searchQuery, 
        resultsCount: results.length, 
        searchTime: Date.now() - startTime 
      });

    } catch (error) {
      logger.error('Search error:', error);
      setHasResults(false);
    } finally {
      setIsLoading(false);
    }
  }, [wooService, trackSearchQuery]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (value.trim().length >= 2) {
      handleSearch(value);
    } else {
      setSearchResults([]);
      setHasResults(false);
      setSuggestions([]);
    }
  }, [handleSearch]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    trackSearchSuggestion(suggestion);
    handleSearch(suggestion);
  }, [handleSearch, trackSearchSuggestion]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && selectedIndex >= 0 && suggestions[selectedIndex]) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    }
  }, [selectedIndex, suggestions, handleSuggestionClick, onClose]);

  // Handle popular search click
  const handlePopularSearchClick = useCallback((popularQuery: string) => {
    setQuery(popularQuery);
    handleSearch(popularQuery);
  }, [handleSearch]);

  // Handle recent search click
  const handleRecentSearchClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    handleSearch(recentQuery);
  }, [handleSearch]);

  // Handle result click
  const handleResultClick = useCallback((product: WooProduct) => {
    if (onSearch) {
      onSearch(product.name);
    }
    onClose();
  }, [onSearch, onClose]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setHasResults(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setHasResults(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    onClose();
  }, [onClose]);

  return (
    <SearchErrorBoundary>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={closeModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-x-0 top-0 z-[101] bg-white shadow-2xl flex flex-col"
            style={{ height: '100vh' }}
          >
            {/* Header */}
            <div className="border-b border-gray-200 bg-white">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                <div className="flex items-center gap-4">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholder}
                      className="block w-full pl-12 pr-12 py-4 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-gray-500"
                    />
                    {query && (
                      <button
                        onClick={clearSearch}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={closeModal}
                    className="flex items-center justify-center w-12 h-12 rounded-xl border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-20">
                {isLoading && (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Wyszukiwanie...</span>
                  </div>
                )}

                {!isLoading && query.length >= 2 && hasResults && (
                  <>
                    {/* Search Results */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Wyniki wyszukiwania ({searchResults.length})
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.map((product) => (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => handleResultClick(product)}
                          >
                            <div className="aspect-square relative mb-3 rounded-lg overflow-hidden bg-gray-100">
                              {product.images?.[0]?.src ? (
                                <Image
                                  src={product.images[0].src}
                                  alt={product.images[0].alt || product.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Search className="h-8 w-8" />
                                </div>
                              )}
                            </div>
                            <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
                              {product.name}
                            </h4>
                            
                            {/* Categories */}
                            {product.categories && product.categories.length > 0 && (
                              <div className="mb-2">
                                <div className="flex flex-wrap gap-1">
                                  {product.categories.slice(0, 2).map((category) => (
                                    <span
                                      key={category.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                    >
                                      {category.name}
                                    </span>
                                  ))}
                                  {product.categories.length > 2 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                      +{product.categories.length - 2}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-semibold text-gray-900">
                                {formatPrice(product.price)}
                              </span>
                              {product.sale_price && (
                                <span className="text-sm text-gray-500 line-through">
                                  {formatPrice(product.regular_price)}
                                </span>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* View All Results */}
                    <div className="text-center pt-6 border-t border-gray-100">
                      <Link
                        href={`/wyszukiwanie?q=${encodeURIComponent(query)}`}
                        onClick={closeModal}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium"
                      >
                        Zobacz wszystkie wyniki
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </>
                )}

                {!isLoading && query.length >= 2 && !hasResults && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Brak wyników
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Nie znaleziono produktów dla "{query}"
                    </p>
                    <button
                      onClick={clearSearch}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Wyczyść wyszukiwanie
                    </button>
                  </div>
                )}

                {!isLoading && query.length < 2 && (
                  <div className="space-y-8">
                    {/* Popular Searches */}
                    {popularSearches.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="h-5 w-5 text-gray-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            Popularne wyszukiwania
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {popularSearches.map((popularQuery) => (
                            <button
                              key={popularQuery}
                              onClick={() => handlePopularSearchClick(popularQuery)}
                              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                            >
                              {popularQuery}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Searches */}
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Clock className="h-5 w-5 text-gray-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            Ostatnie wyszukiwania
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {recentSearches.map((recentQuery) => (
                            <button
                              key={recentQuery}
                              onClick={() => handleRecentSearchClick(recentQuery)}
                              className="flex items-center gap-3 w-full p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                            >
                              <Clock className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-700">{recentQuery}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Categories */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Filter className="h-5 w-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          Kategorie
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {['Mezoterapia', 'Peelingi', 'Stymulatory', 'Wypełniacze', 'Botoks', 'Retinol'].map((category) => (
                          <button
                            key={category}
                            onClick={() => handlePopularSearchClick(category)}
                            className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                          >
                            <span className="font-medium text-gray-900">{category}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </SearchErrorBoundary>
  );
}
