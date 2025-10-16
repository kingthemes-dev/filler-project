'use client';

import React, { useEffect, useRef, useState } from 'react';
import { analytics } from '@headless-woo/shared/utils/analytics';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DynamicCategoryFilters from './dynamic-category-filters';
import DynamicAttributeFilters from './dynamic-attribute-filters';

interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface ShopFiltersProps {
  categories: Category[];
  filters: {
    categories: string[];
    search: string;
    minPrice: number;
    maxPrice: number;
    inStock: boolean;
    onSale: boolean;
    [key: string]: string[] | string | number | boolean; // Dynamiczne atrybuty
  };
  onFilterChange: (key: string, value: string | number | boolean) => void;
  onCategoryChange: (categoryId: string, subcategoryId?: string) => void;
  onClearFilters: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  totalProducts: number;
  attributesLoading: boolean;
  wooCommerceCategories?: Array<{ id: number; name: string; slug: string; parent: number; count: number }>;
  products?: any[]; // Dodaj produkty jako prop
}

export default function ShopFilters({
  categories,
  filters,
  onFilterChange,
  onCategoryChange,
  onClearFilters,
  showFilters,
  onToggleFilters,
  totalProducts,
  attributesLoading,
  wooCommerceCategories,
  products = []
}: ShopFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    attributes: true,
    price: true,
    availability: true,
  });

  // Restore expanded state from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('shopFiltersExpanded');
      if (saved) {
        const parsed = JSON.parse(saved);
        setExpandedSections((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  // Persist expanded state
  React.useEffect(() => {
    try {
      localStorage.setItem('shopFiltersExpanded', JSON.stringify(expandedSections));
    } catch {}
  }, [expandedSections]);
  
  // Price range state for slider
  const [priceRange, setPriceRange] = useState({
    min: filters.minPrice || 0,
    max: filters.maxPrice || 10000
  });

  // Sync priceRange with filters when they change externally
  React.useEffect(() => {
    setPriceRange({
      min: filters.minPrice || 0,
      max: filters.maxPrice || 10000
    });
  }, [filters.minPrice, filters.maxPrice]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };


  // Price ranges use PLN directly (not grosze)

  // Count active filters to show in toggle and to conditionally show "Wyczyść"
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if ((filters.categories || []).length > 0) count++;
    if ((filters.search as string)?.trim()) count++;
    if (filters.minPrice && filters.minPrice > 0) count++;
    if (filters.maxPrice && filters.maxPrice < 10000) count++;
    if (filters.inStock) count++;
    if (filters.onSale) count++;
    Object.keys(filters).forEach((key) => {
      if (key.startsWith('pa_')) {
        const v = filters[key];
        if (Array.isArray(v) ? v.length > 0 : Boolean(v)) count++;
      }
    });
    return count;
  }, [filters]);

  // Close on Esc when mobile panel is open
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFilters) onToggleFilters();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showFilters, onToggleFilters]);

  // Analytics: open/close filters
  useEffect(() => {
    analytics.track('filters_panel_state', { open: showFilters });
  }, [showFilters]);

  // Focus trap and initial focus for mobile panel
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (showFilters && panelRef.current) {
      // initial focus
      closeBtnRef.current?.focus();
      const handleFocus = (e: FocusEvent) => {
        if (!panelRef.current) return;
        if (showFilters && !panelRef.current.contains(e.target as Node)) {
          // keep focus inside
          e.preventDefault?.();
          closeBtnRef.current?.focus();
        }
      };
      document.addEventListener('focusin', handleFocus);
      return () => document.removeEventListener('focusin', handleFocus);
    }
  }, [showFilters]);

  return (
    <>
      {/* Mobile Filter Toggle - Hidden on desktop */}
      <div className="lg:hidden mb-4">
        <button
          onClick={onToggleFilters}
          className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          aria-expanded={showFilters}
          aria-controls="filters-panel"
        >
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            <span className="font-medium">Filtry{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
          </div>
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Filter Panel */}
      <div className={`${showFilters ? 'block' : 'hidden lg:block'} lg:sticky lg:top-24 lg:self-start`}>
        <div
          className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm"
          id="filters-panel"
          role="region"
          aria-labelledby="filters-heading"
          tabIndex={-1}
          ref={panelRef}
        >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-600" />
                  <h3 id="filters-heading" className="text-base sm:text-lg font-semibold text-gray-900">Filtry</h3>
                  <span className="ml-2 text-xs sm:text-sm text-gray-500">({totalProducts} produktów)</span>
                </div>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                  <button
                    onClick={() => { analytics.track('filters_clear'); onClearFilters(); }}
                      className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Wyczyść
                    </button>
                  )}
                  <button
                    onClick={onToggleFilters}
                    className="lg:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Zamknij filtry"
                    ref={closeBtnRef}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search Filter */}
              <div className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Wyszukiwanie</h4>
                <div className="relative" data-testid="filter-search">
                  <input
                    type="text"
                    placeholder="Szukaj produktów..."
                    value={filters.search}
                    onChange={(e) => onFilterChange('search', e.target.value)}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Categories Filter */}
              <div className="mb-4 sm:mb-6">
                <button
                  onClick={() => toggleSection('categories')}
                  className="flex items-center justify-between w-full mb-3 sm:mb-4"
                >
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Kategorie</h4>
                  {expandedSections.categories ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedSections.categories && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <DynamicCategoryFilters
                        onCategoryChange={onCategoryChange}
                        selectedCategories={filters.categories}
                        totalProducts={totalProducts}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>



                  {/* Dynamic Attributes Filter */}
                  <div className="mb-4 sm:mb-6">
                    <button
                      onClick={() => toggleSection('attributes')}
                      className="flex items-center justify-between w-full mb-3 sm:mb-4"
                    >
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900">Atrybuty</h4>
                      {expandedSections.attributes ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {expandedSections.attributes && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <DynamicAttributeFilters
                            onFilterChange={onFilterChange}
                            selectedFilters={filters}
                            totalProducts={totalProducts}
                            currentFilters={{
                              categories: filters.categories,
                              search: filters.search as string,
                              minPrice: filters.minPrice,
                              maxPrice: filters.maxPrice,
                              // PRO: Include all dynamic attributes for tree-like recalculation
                              attributes: Object.keys(filters).filter(key => key.startsWith('pa_')),
                              // PRO: Pass actual attribute values for better tree-like filtering
                              attributeValues: Object.keys(filters)
                                .filter(key => key.startsWith('pa_'))
                                .reduce((acc, key) => {
                                  acc[key] = filters[key];
                                  return acc;
                                }, {} as Record<string, any>)
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Price Range Filter */}
              <div className="mb-4 sm:mb-6">
                <button
                  onClick={() => toggleSection('price')}
                  className="flex items-center justify-between w-full mb-3 sm:mb-4"
                >
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Zakres cen</h4>
                  {expandedSections.price ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedSections.price && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      {/* Price Range Slider */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{priceRange.min} zł</span>
                          <span>{priceRange.max} zł</span>
                        </div>
                        
                        <div className="relative h-6">
                          <div className="absolute top-3 left-0 right-0 h-2 bg-gray-200 rounded-lg"></div>
                          <input
                            type="range"
                            min="0"
                            max="10000"
                            step="100"
                            value={priceRange.min}
                            onWheel={(e) => e.preventDefault()}
                            onChange={(e) => {
                              const newMin = parseInt(e.target.value);
                              if (newMin <= priceRange.max) {
                                setPriceRange(prev => ({ ...prev, min: newMin }));
                                onFilterChange('minPrice', newMin);
                              }
                            }}
                            className="absolute top-3 w-full h-2 bg-transparent appearance-none cursor-pointer slider-thumb z-10"
                          />
                          <input
                            type="range"
                            min="0"
                            max="10000"
                            step="100"
                            value={priceRange.max}
                            onWheel={(e) => e.preventDefault()}
                            onChange={(e) => {
                              const newMax = parseInt(e.target.value);
                              if (newMax >= priceRange.min) {
                                setPriceRange(prev => ({ ...prev, max: newMax }));
                                onFilterChange('maxPrice', newMax);
                              }
                            }}
                            className="absolute top-3 w-full h-2 bg-transparent appearance-none cursor-pointer slider-thumb z-20"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setPriceRange({ min: 0, max: 1000 });
                              onFilterChange('minPrice', 0);
                              onFilterChange('maxPrice', 1000);
                            }}
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Do 1000 zł
                          </button>
                          <button
                            onClick={() => {
                              setPriceRange({ min: 1000, max: 5000 });
                              onFilterChange('minPrice', 1000);
                              onFilterChange('maxPrice', 5000);
                            }}
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            1000-5000 zł
                          </button>
                          <button
                            onClick={() => {
                              setPriceRange({ min: 5000, max: 10000 });
                              onFilterChange('minPrice', 5000);
                              onFilterChange('maxPrice', 10000);
                            }}
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            Powyżej 5000 zł
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Special Offers */}
              <div className="mb-4 sm:mb-6">
                <button
                  onClick={() => toggleSection('availability')}
                  className="flex items-center justify-between w-full mb-3 sm:mb-4"
                >
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900">Oferty specjalne</h4>
                  {expandedSections.availability ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedSections.availability && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <label className={`flex items-center p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                        filters.onSale 
                          ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-sm' 
                          : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-transparent hover:border-gray-200'
                      }`}>
                        <input
                          type="checkbox"
                          checked={filters.onSale}
                          onChange={(e) => onFilterChange('onSale', e.target.checked)}
                          className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                        />
                        <div className="ml-3 sm:ml-4">
                          <span className={`text-xs sm:text-sm font-semibold ${filters.onSale ? 'text-blue-700' : 'text-gray-700'}`}>
                            Promocje
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">Produkty w promocji</p>
                        </div>
                      </label>
                      
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>
    </>
  );
}
