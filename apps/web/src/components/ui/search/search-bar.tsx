'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Star } from 'lucide-react';
import { WooCommerceService } from '@/services/woocommerce-optimized';
import { wooSearchService } from '@/services/woocommerce-search';
import { formatPrice } from '@/utils/format-price';
import { WooProduct } from '@/types/woocommerce';
import SearchErrorBoundary from './search-error-boundary';
import Image from 'next/image';
import { logger } from '@/utils/logger';

// Google Analytics gtag type declaration
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
}

export default function SearchBar({ 
  placeholder = "Szukaj produktów...", 
  className = "",
  onSearch 
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<WooProduct[]>([]);
  const [wooService, setWooService] = useState<WooCommerceService | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [searchTime, setSearchTime] = useState(0);
  
  // Analytics tracking functions
  const trackSearchQuery = useCallback((query: string, resultsCount: number) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'search', {
        search_term: query,
        results_count: resultsCount,
        event_category: 'Search',
        event_label: 'SearchBar'
      });
    }
    
    // Console log for development
    console.log(`🔍 Search tracked: "${query}" - ${resultsCount} results`);
  }, []);

  const trackSearchResultClick = useCallback((product: WooProduct, query: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'select_content', {
        content_type: 'product',
        item_id: product.id.toString(),
        item_name: product.name,
        search_term: query,
        event_category: 'Search',
        event_label: 'SearchResultClick'
      });
    }
    
    console.log(`🛒 Search result clicked: "${product.name}" from query: "${query}"`);
  }, []);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<Map<string, WooProduct[]>>(new Map());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mount
  useEffect(() => {
    loadRecentSearches();
    loadPopularSearches();
    // Initialize WooCommerce service after mount
    try {
      setWooService(new WooCommerceService());
    } catch (error) {
      logger.error('Error initializing WooCommerceService:', error);
    }
  }, []);

  // Load popular searches
  const loadPopularSearches = async () => {
    try {
      const popular = await wooSearchService.getPopularSearches(8);
      setPopularSearches(popular);
    } catch (error) {
      logger.error('Error loading popular searches:', error);
    }
  };

  // Memoized position update function
  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    
    const rect = inputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Calculate position - bezpośrednio pod input (bez przerwy)
    let top = rect.bottom;
    let left = rect.left;
    let width = rect.width;
    
    // Ensure dropdown doesn't go below viewport
    if (top + 400 > viewportHeight) {
      top = rect.top - 8; // Show above input instead
    }
    
    // Ensure dropdown doesn't go outside viewport horizontally
    if (left + width > viewportWidth) {
      left = viewportWidth - width - 16; // 16px margin from edge
    }
    if (left < 16) {
      left = 16; // 16px margin from left edge
    }
    
    setDropdownPosition({
      top,
      left,
      width
    });
  }, []);

  // Calculate dropdown position when opening and on resize/scroll
  useEffect(() => {
    if (isOpen) {
      updatePosition();

      // Update position on scroll and resize
      window.addEventListener('scroll', updatePosition, { passive: true });
      window.addEventListener('resize', updatePosition, { passive: true });

      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Popular searches disabled (no mockups)

  // Load recent searches from localStorage
  const loadRecentSearches = () => {
    try {
      const recent = localStorage.getItem('filler_recent_searches');
      if (recent) {
        setRecentSearches(JSON.parse(recent));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  // Save search to recent searches
  const saveRecentSearch = (searchQuery: string) => {
    try {
      const recent = localStorage.getItem('filler_recent_searches');
      let searches = recent ? JSON.parse(recent) : [];
      
      // Remove if already exists
      searches = searches.filter((s: string) => s !== searchQuery);
      
      // Add to beginning
      searches.unshift(searchQuery);
      
      // Keep only last 10
      searches = searches.slice(0, 10);
      
      localStorage.setItem('filler_recent_searches', JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  // Handle search input change (debounced + cached + suggestions)
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    if (value.length < 2) {
      setSuggestions([]);
      setSearchResults([]);
      setHasResults(false);
      setIsOpen(false);
      return;
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      const startTime = Date.now();
      
      try {
        setIsLoading(true);
        setIsOpen(true);

        // Get suggestions and search results in parallel
        const [suggestionsResult, searchResult] = await Promise.allSettled([
          wooSearchService.getSearchSuggestions(value, 5),
          wooSearchService.searchProducts(value, 8)
        ]);

        // Handle suggestions
        if (suggestionsResult.status === 'fulfilled') {
          setSuggestions(suggestionsResult.value);
        }

        // Handle search results
        if (searchResult.status === 'fulfilled') {
          const searchData = searchResult.value;
          setSearchResults(searchData.products as WooProduct[]);
          setHasResults(searchData.products.length > 0);
          
          // Track search query with performance metrics
          const searchTime = Date.now() - startTime;
          setSearchTime(searchTime);
          trackSearchQuery(value, searchData.products.length);
          
          logger.info('Search completed', { 
            query: value, 
            resultsCount: searchData.products.length,
            searchTime: `${searchTime}ms`
          });
        } else {
          logger.error('Search failed:', searchResult.reason);
          setSearchResults([]);
          setHasResults(false);
        }
      } catch (error) {
        logger.error('Search error:', error);
        setSearchResults([]);
        setHasResults(false);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Slightly longer debounce for better performance
  }, [trackSearchQuery]);

  // Handle search submit
  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      setIsOpen(false);
      setQuery('');
      
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        // Default behavior - navigate to search page
        window.location.href = `/wyszukiwanie?q=${encodeURIComponent(searchQuery.trim())}`;
      }
    }
  };

  // Handle recent search click
  const handleRecentSearchClick = (recentQuery: string) => {
    // Track recent search click
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'select_content', {
        content_type: 'recent_search',
        item_name: recentQuery,
        event_category: 'Search',
        event_label: 'RecentSearchClick'
      });
    }
    
    console.log(`🕒 Recent search clicked: "${recentQuery}"`);
    
    setQuery(recentQuery);
    setIsOpen(false);
    
    if (onSearch) {
      onSearch(recentQuery);
    } else {
      // Default behavior - navigate to search page
      window.location.href = `/wyszukiwanie?q=${encodeURIComponent(recentQuery)}`;
    }
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    try {
      localStorage.removeItem('filler_recent_searches');
      setRecentSearches([]);
    } catch (error) {
      console.error('Error clearing recent searches:', error);
    }
  };

  // Handle suggestion click
  // const handleSuggestionClick = (suggestion: string) => {
  //   handleSearch(suggestion);
  // };

  // Handle result click
  const handleResultClick = (product: WooProduct) => {
    // Track search result click
    trackSearchResultClick(product, query);
    
    saveRecentSearch(query);
    setIsOpen(false);
    setQuery('');
    // Navigate to product page
    window.location.href = `/produkt/${product.slug}`;
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setSearchResults([]);
    setHasResults(false);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <SearchErrorBoundary>
      <div className={`relative ${className}`} ref={searchRef} style={{ position: 'relative' }}>
        {/* Search Input */}
        <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyPress}
          onFocus={() => {
            // Show recent searches when focusing on empty search
            if (query.length === 0 && recentSearches.length > 0) {
              setIsOpen(true);
            } else if (query.length >= 2 || suggestions.length > 0 || popularSearches.length > 0) {
              setIsOpen(true);
            }
          }}
          className={`block w-full pl-10 pr-10 py-3 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-gray-400 text-sm border border-gray-300 ${
            isOpen ? 'rounded-lg border-b-0' : 'rounded-lg'
          }`}
          placeholder={placeholder}
        />
        
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
          </button>
        )}
      </div>

      {/* Search Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed z-[60] bg-white rounded-b-lg shadow-lg border-l border-r border-b border-gray-200 overflow-hidden max-h-[80vh] sm:max-h-[70vh] will-change-transform"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Loading State */}
            {isLoading && (
              <div className="p-4 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                <p className="text-sm text-gray-500 mt-2">Wyszukiwanie...</p>
              </div>
            )}

            {/* Search Results */}
            {!isLoading && hasResults && searchResults.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Produkty ({searchResults.length})
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleResultClick(product)}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-lg mr-3">
                        {product.images && product.images.length > 0 ? (
                          <Image 
                            src={product.images[0].src} 
                            alt={product.images[0].alt || product.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300 rounded-lg"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {product.categories && product.categories.length > 0 ? (product.categories[0].name || 'Produkt') : 'Produkt'}
                        </p>
                        <div className="flex items-center mt-1">
                          <div className="flex items-center">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-600 ml-1">
                              {parseFloat(product.average_rating) || 0}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 mx-2">•</span>
                          <span className="text-xs text-gray-600">
                            {product.rating_count} opinii
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 ml-3 text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatPrice(parseFloat(product.sale_price || product.price || '0'))}
                        </p>
                        {product.sale_price && (
                          <p className="text-xs text-gray-500 line-through">
                            {formatPrice(parseFloat(product.price || '0'))}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Suggestions */}
            {!isLoading && query.length >= 2 && suggestions.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Sugestie
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSearch(suggestion)}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full mr-3 flex items-center justify-center">
                        <Search className="w-4 h-4 text-blue-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-black">
                          {suggestion}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Searches */}
            {!isLoading && query.length === 0 && popularSearches.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Popularne wyszukiwania
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {popularSearches
                      .filter(query => query !== 'wszystkie kategorie')
                      .slice(0, 8)
                      .map((popularQuery, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearch(popularQuery)}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                      >
                        {popularQuery}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {!isLoading && query.length === 0 && recentSearches.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600 uppercase tracking-wide flex items-center justify-between">
                  <span>Ostatnio wyszukiwane</span>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    title="Wyczyść historię"
                  >
                    Wyczyść
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {recentSearches.slice(0, 8).map((recentQuery, index) => (
                    <div
                      key={index}
                      onClick={() => handleRecentSearchClick(recentQuery)}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full mr-3 flex items-center justify-center">
                        <Search className="w-4 h-4 text-gray-500" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-black">
                          {recentQuery}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {!isLoading && query.length >= 2 && !hasResults && suggestions.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>Nie znaleziono produktów dla &quot;{query}&quot;</p>
                <p className="text-sm mt-1">Spróbuj inne słowa kluczowe</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && query.length === 0 && suggestions.length === 0 && searchResults.length === 0 && recentSearches.length === 0 && popularSearches.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>Wpisz nazwę produktu, aby rozpocząć wyszukiwanie</p>
              </div>
            )}

            {/* Search Performance Info */}
            {searchTime > 0 && !isLoading && (
              <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t border-gray-100">
                Wyszukiwanie ukończone w {searchTime}ms
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </SearchErrorBoundary>
  );
}
