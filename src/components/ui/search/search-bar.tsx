'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import wooSearchService from '@/services/woocommerce-search';

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
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    loadRecentSearches();
  }, []);

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
      
      // Keep only last 5
      searches = searches.slice(0, 5);
      
      localStorage.setItem('filler_recent_searches', JSON.stringify(searches));
      setRecentSearches(searches);
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  // Handle search input change with suggestions
  const handleInputChange = useCallback(async (value: string) => {
    setQuery(value);
    
    if (value.length >= 3) {
      setIsLoading(true);
      try {
        // Get search suggestions
        const suggestions = await wooSearchService.getSearchSuggestions(value, 5);
        setSuggestions(suggestions);
        setIsOpen(true);
      } catch (error) {
        console.error('Search suggestions error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    } else if (value.length === 0) {
      // Show recent searches when input is empty
      setSuggestions([]);
      setIsOpen(recentSearches.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [recentSearches.length]);

  // Handle search submit
  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      setIsOpen(false);
      setQuery('');
      
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        // Default behavior - navigate to shop page with search
        window.location.href = `/sklep?search=${encodeURIComponent(searchQuery.trim())}`;
      }
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    handleSearch(suggestion);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
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
    <div className={`relative ${className}`} ref={searchRef}>
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
            if (query.length >= 3 || recentSearches.length > 0) {
              setIsOpen(true);
            }
          }}
          className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-black focus:border-transparent text-sm"
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
            className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Loading State */}
            {isLoading && (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto"></div>
                <p className="mt-2">Wyszukiwanie...</p>
              </div>
            )}

            {/* Search Suggestions */}
            {!isLoading && suggestions.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Sugestie
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center"
                    >
                      <Search className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {!isLoading && query.length === 0 && recentSearches.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Ostatnie wyszukiwania
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(search)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center"
                    >
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-700">{search}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {!isLoading && query.length >= 3 && suggestions.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>Nie znaleziono sugestii dla "{query}"</p>
                <p className="text-sm mt-1">Spróbuj inne słowa kluczowe</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && query.length === 0 && recentSearches.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>Wpisz nazwę produktu, aby rozpocząć wyszukiwanie</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
