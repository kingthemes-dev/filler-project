'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp, Star, ArrowRight } from 'lucide-react';
import ModalCloseButton from './modal-close-button';
import { WooProduct } from '@/types/woocommerce';
import { formatPrice } from '@/utils/format-price';
import Link from 'next/link';
import Image from 'next/image';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [suggestions, setSuggestions] = useState<WooProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const history = localStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    }
  }, []);

  // Save search to history
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    
    const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, 5);
    setSearchHistory(newHistory);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    }
  }, [searchHistory]);

  // Debounced search function
  const debouncedSearch = useDebouncedCallback((query: string) => {
    if (!query.trim()) {
      setProducts([]);
      setSuggestions([]);
      setHasSearched(false);
      return;
    }

    // Show loading only if there are no results yet
    if (products.length === 0 && !hasSearched) {
      setIsLoading(true);
    }
    
    // Search products
    fetch(`/api/woocommerce?endpoint=products&search=${encodeURIComponent(query)}&per_page=10`)
      .then(res => res.json())
      .then(data => {
        setProducts(data || []);
        setSuggestions(data?.slice(0, 5) || []);
        setIsLoading(false);
        setHasSearched(true);
      })
      .catch(error => {
        console.error('Search error:', error);
        setIsLoading(false);
      });
  }, 300);

  // Handle search input change
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    saveToHistory(query);
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    saveToHistory(query);
    inputRef.current?.focus();
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('searchHistory');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Stop debounce and trigger immediate search
      const query = searchQuery.trim();
      setIsLoading(true);
      
      fetch(`/api/woocommerce?endpoint=products&search=${encodeURIComponent(query)}&per_page=10`)
        .then(res => res.json())
        .then(data => {
          setProducts(data || []);
          setSuggestions(data?.slice(0, 5) || []);
          setIsLoading(false);
          setHasSearched(true);
          saveToHistory(query);
        })
        .catch(error => {
          console.error('Search error:', error);
          setIsLoading(false);
        });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[70]"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[80] flex items-start justify-center pt-16"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <div 
              className="bg-white rounded-3xl shadow-xl w-full max-w-[600px] mx-auto max-h-[80vh] flex flex-col m-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center border-b border-gray-200 px-4 py-3">
                <div className="flex items-center flex-1">
                  <Search className="w-5 h-5 text-gray-400 mr-3" />
                  <input
                    ref={inputRef}
                    type="search"
                    placeholder="Szukaj produktów..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 text-base focus:outline-none text-gray-900 placeholder-gray-400"
                    autoFocus
                  />
                </div>
                <ModalCloseButton onClick={onClose} size="sm" />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {searchQuery.trim() === '' ? (
                  // Show history and trending when no search
                  <div className="p-4 space-y-6">
                    {/* Search History */}
                    {searchHistory.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            Ostatnie wyszukiwania
                          </h3>
                          <button
                            onClick={handleClearHistory}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Wyczyść
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {searchHistory.map((item, index) => (
                            <button
                              key={index}
                              onClick={() => handleHistoryClick(item)}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Trending / Popular */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center mb-3">
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Popularne
                      </h3>
                      <div className="text-sm text-gray-500">
                        Wpisz aby wyszukać produkty
                      </div>
                    </div>
                  </div>
                ) : isLoading ? (
                  // Loading state
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                  </div>
                ) : hasSearched && products.length === 0 ? (
                  // No results
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Brak wyników
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Spróbuj wpisać inną frazę
                    </p>
                  </div>
                ) : (
                  // Results
                  <div className="p-4 space-y-4">
                    {/* Suggestions (top 5) */}
                    {suggestions.length > 0 && (
                      <>
                        {suggestions.map((product, index) => (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <SearchResultItem product={product} onClose={onClose} />
                          </motion.div>
                        ))}
                        
                        {products.length > 5 && (
                          <Link
                            href={`/wyszukiwanie?q=${encodeURIComponent(searchQuery)}`}
                            onClick={onClose}
                            className="flex items-center justify-center text-sm text-gray-600 hover:text-gray-900 py-3 border-t border-gray-200"
                          >
                            Zobacz wszystkie wyniki ({products.length})
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Search result item component
function SearchResultItem({ product, onClose }: { product: WooProduct; onClose: () => void }) {
  const imageUrl = product.images?.[0]?.src || '/images/placeholder-product.jpg';
  const categories = product.categories || [];
  const mainCategory = Array.isArray(categories) && categories.length > 0 
    ? (typeof categories[0] === 'string' ? categories[0] : categories[0]?.name)
    : null;
  
  return (
    <Link
      href={`/produkt/${product.slug}`}
      onClick={onClose}
      className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors group"
    >
      {/* Image */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform"
          sizes="80px"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 text-sm sm:text-base line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.name}
        </h4>
        
        {/* Category */}
        {mainCategory && (
          <div className="text-xs text-gray-500 mt-1">
            {mainCategory}
          </div>
        )}
        
        {/* Rating & Price */}
        <div className="flex items-center justify-between mt-2">
          {product.average_rating && parseFloat(product.average_rating) > 0 && (
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="text-xs text-gray-600">
                {parseFloat(product.average_rating).toFixed(1)}
              </span>
            </div>
          )}
          <div className="text-sm font-bold text-gray-900">
            {formatPrice(parseFloat(product.price))}
          </div>
        </div>
      </div>
    </Link>
  );
}

