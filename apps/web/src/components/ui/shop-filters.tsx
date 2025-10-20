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
  priceRange: { min: number; max: number };
  setPriceRange: (range: { min: number; max: number }) => void;
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
  priceRange,
  setPriceRange,
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
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-800 to-black text-white border border-gray-200 rounded-xl hover:from-gray-700 hover:to-gray-900 hover:scale-105 transition-all duration-300"
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

      {/* Mobile Backdrop - przezroczysty */}
      {showFilters && (
        <div 
          className="fixed inset-0 bg-transparent z-40 lg:hidden"
          onClick={onToggleFilters}
        />
      )}

      {/* Filter Panel */}
      <div className={`${showFilters ? 'block' : 'hidden lg:block'} lg:sticky lg:top-24 lg:self-start`}>
        <div
          className={`bg-white border border-gray-200/50 p-4 sm:p-6 shadow-sm lg:block rounded-2xl ${
            showFilters 
              ? 'fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50 transform translate-x-0 transition-transform duration-300 ease-out lg:relative lg:inset-auto lg:w-80 lg:max-w-none lg:transform-none lg:transition-none lg:shadow-md lg:backdrop-blur-md' 
              : 'fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50 transform -translate-x-full transition-transform duration-300 ease-out lg:relative lg:inset-auto lg:w-80 lg:max-w-none lg:transform-none lg:transition-none lg:shadow-md lg:backdrop-blur-md lg:block'
          }`}
          id="filters-panel"
          role="region"
          aria-labelledby="filters-heading"
          tabIndex={-1}
          ref={panelRef}
        >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center group">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 group-hover:from-blue-100 group-hover:to-indigo-100 transition-all duration-300">
                    <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
                  </div>
                  <div className="ml-3">
                    <h3 id="filters-heading" className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">Filtry</h3>
                    <span className="text-xs sm:text-sm text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                      {totalProducts} produktów
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mobile Close Button */}
                  <motion.button
                    onClick={onToggleFilters}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-300"
                    aria-label="Zamknij filtry"
                    ref={closeBtnRef}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>



              {/* Search Filter */}
              <div className="mb-4 sm:mb-6">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Wyszukiwanie</h4>
                <div className="relative group" data-testid="filter-search">
                  <input
                    type="text"
                    placeholder="Szukaj produktów..."
                    value={filters.search}
                    onChange={(e) => onFilterChange('search', e.target.value)}
                    className="w-full px-4 py-3 pl-12 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all duration-300 placeholder:text-gray-400 group-hover:border-gray-300 group-hover:bg-white/80"
                  />
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {filters.search && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => onFilterChange('search', '')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Categories Filter */}
              <div className="mb-4 sm:mb-6">
                <div className="h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-4"></div>
                <motion.button
                  onClick={() => toggleSection('categories')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between w-full mb-3 sm:mb-4 p-3 rounded-xl hover:bg-gray-50/50 transition-all duration-300 group"
                >
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">Kategorie</h4>
                  <motion.div
                    animate={{ rotate: expandedSections.categories ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors duration-300" />
                  </motion.div>
                </motion.button>
                
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
                    <div className="h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-4"></div>
                    <motion.button
                      onClick={() => toggleSection('attributes')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-between w-full mb-3 sm:mb-4 p-3 rounded-xl hover:bg-gray-50/50 transition-all duration-300 group"
                    >
                      <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">Atrybuty</h4>
                      <motion.div
                        animate={{ rotate: expandedSections.attributes ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors duration-300" />
                      </motion.div>
                    </motion.button>
                    
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
                <div className="h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-4"></div>
                <motion.button
                  onClick={() => toggleSection('price')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between w-full mb-3 sm:mb-4 p-3 rounded-xl hover:bg-gray-50/50 transition-all duration-300 group"
                >
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">Zakres cen</h4>
                  <motion.div
                    animate={{ rotate: expandedSections.price ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors duration-300" />
                  </motion.div>
                </motion.button>
                
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
                        
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Special Offers */}
              <div className="mb-4 sm:mb-6">
                <div className="h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-4"></div>
                <motion.button
                  onClick={() => toggleSection('availability')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-between w-full mb-3 sm:mb-4 p-3 rounded-xl hover:bg-gray-50/50 transition-all duration-300 group"
                >
                  <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">Oferty specjalne</h4>
                  <motion.div
                    animate={{ rotate: expandedSections.availability ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors duration-300" />
                  </motion.div>
                </motion.button>
                
                <AnimatePresence>
                  {expandedSections.availability && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <motion.label 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 group ${
                          filters.onSale 
                            ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 shadow-lg shadow-red-100/50' 
                            : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-transparent hover:border-gray-200 hover:shadow-md'
                        }`}
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={filters.onSale}
                            onChange={(e) => onFilterChange('onSale', e.target.checked)}
                            className="w-5 h-5 text-red-600 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 appearance-none checked:bg-red-500 checked:border-red-500"
                          />
                          {filters.onSale && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </motion.div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold transition-colors duration-300 ${filters.onSale ? 'text-red-700' : 'text-gray-700 group-hover:text-gray-800'}`}>
                              Promocje
                            </span>
                            {filters.onSale && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full"
                              >
                                AKTYWNE
                              </motion.span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 group-hover:text-gray-600 transition-colors duration-300">Produkty w promocji</p>
                        </div>
                      </motion.label>
                      
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </div>
    </>
  );
}
