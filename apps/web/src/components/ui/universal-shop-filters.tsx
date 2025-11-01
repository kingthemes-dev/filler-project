/**
 * UNIVERSAL SHOP FILTERS
 * Senior-level universal filter component that works with ANY e-commerce API
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { analytics } from '@headless-woo/shared/utils/analytics';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, ChevronDown, ArrowLeft, ArrowRight } from 'lucide-react';
import UniversalCategoryFilters from './universal-category-filters';
import UniversalAttributeFilters from './universal-attribute-filters';
import { FilterConfig } from '@/config/filter-config';

interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface UniversalShopFiltersProps {
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
  // Universal configuration
  filterConfig?: Partial<FilterConfig>;
  preset?: 'woocommerce' | 'shopify' | 'custom';
  wooCommerceCategories?: Array<{ id: number; name: string; slug: string; parent: number; count: number }>;
  products?: any[];
}

export default function UniversalShopFilters({
  categories: _categories,
  filters,
  priceRange,
  setPriceRange,
  onFilterChange,
  onCategoryChange,
  onClearFilters: _onClearFilters,
  showFilters,
  onToggleFilters,
  totalProducts,
  filterConfig,
  preset = 'woocommerce',
  wooCommerceCategories: _wooCommerceCategories,
  products: _products = []
}: UniversalShopFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    attributes: true,
    price: true,
    availability: true,
  });

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);

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

  // Swipe gesture functions
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
    setSwipeProgress(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    
    if (touchStart && showFilters) {
      const distance = touchStart - e.targetTouches[0].clientX;
      const progress = Math.min(Math.max(distance / 150, 0), 1);
      setSwipeProgress(progress);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeProgress(0);
      setIsDragging(false);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    
    if (isLeftSwipe && distance > minSwipeDistance * 2) {
      onToggleFilters();
    }
    
    setSwipeProgress(0);
    setIsDragging(false);
  };

  // Count active filters
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
  
  // Block body scroll when mobile panel is open
  useEffect(() => {
    if (showFilters) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [showFilters]);

  // Desktop sidebar scroll management
  const desktopSidebarRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const desktopSidebar = desktopSidebarRef.current;
    if (!desktopSidebar) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      desktopSidebar.scrollTop += e.deltaY;
    };

    const handleMouseEnter = () => {
      desktopSidebar.addEventListener('wheel', handleWheel, { passive: false });
    };

    const handleMouseLeave = () => {
      desktopSidebar.removeEventListener('wheel', handleWheel);
    };

    desktopSidebar.addEventListener('mouseenter', handleMouseEnter);
    desktopSidebar.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      desktopSidebar.removeEventListener('mouseenter', handleMouseEnter);
      desktopSidebar.removeEventListener('mouseleave', handleMouseLeave);
      desktopSidebar.removeEventListener('wheel', handleWheel);
    };
  }, []);
  
  useEffect(() => {
    if (showFilters && panelRef.current) {
      closeBtnRef.current?.focus();
      const handleFocus = (e: FocusEvent) => {
        if (!panelRef.current) return;
        if (showFilters && !panelRef.current.contains(e.target as Node)) {
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
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={onToggleFilters}
          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-800 to-black text-white border border-gray-200 rounded-xl hover:bg-gradient-to-l hover:from-gray-700 hover:to-gray-900 transition-all duration-300"
          aria-expanded={showFilters}
          aria-controls="filters-panel"
        >
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            <span className="font-medium">Filtry{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}</span>
          </div>
          {showFilters ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {showFilters && (
        <motion.div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[115] lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onToggleFilters}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      )}

      {/* Global swipe area */}
      {!showFilters && (
        <div
          className="fixed left-0 top-0 w-6 h-full z-20 lg:hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      )}

      {/* Pinned Filter Icon */}
      {!showFilters && (
        <motion.div
          className="fixed left-0 top-1/2 transform -translate-y-1/2 z-30 lg:hidden"
          style={{ top: 'calc(50% - 40px)' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <button
            onClick={onToggleFilters}
            className="flex items-center justify-center w-6 h-20 bg-gradient-to-r from-gray-800 to-black rounded-r-full shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
            style={{
              animation: 'swipePulse 2s ease-in-out infinite'
            }}
          >
            <ArrowRight className="w-3 h-3 text-white" />
          </button>
        </motion.div>
      )}

      {/* Mobile Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="fixed inset-y-0 left-0 w-80 max-w-[85vw] z-[120] lg:hidden"
            id="filters-panel"
            role="region"
            aria-labelledby="filters-heading"
            tabIndex={-1}
            ref={panelRef}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="bg-white border border-gray-200/50 shadow-sm rounded-r-2xl h-full flex flex-col relative pr-4">
              {/* Enhanced swipe indicator */}
              <button
                onClick={onToggleFilters}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 w-6 h-20 bg-gradient-to-r from-gray-800 to-black rounded-l-full transition-all duration-200 flex items-center justify-center cursor-pointer hover:shadow-lg"
                style={{
                  opacity: isDragging ? 1 : 0.8,
                  transform: `translateY(-50%) translateX(1px) scaleX(${1 + swipeProgress * 0.5})`,
                  boxShadow: isDragging ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none'
                }}
              >
                <ArrowLeft className="w-3 h-3 text-white" />
              </button>
              
              {/* Progress bar */}
              {isDragging && (
                <div className="absolute right-0 top-0 w-1 h-full bg-blue-200">
                  <div 
                    className="h-full bg-gradient-to-b from-blue-400 to-blue-600 transition-all duration-100"
                    style={{ height: `${swipeProgress * 100}%` }}
                  ></div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 flex-shrink-0">
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
                  <motion.button
                    onClick={onToggleFilters}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-300"
                    aria-label="Zamknij filtry"
                    ref={closeBtnRef}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* Search Filter */}
                <div className="mb-4 sm:mb-6">
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
                  
                  {/* Promocje Toggle */}
                  <div className="mt-3">
                    <button
                      onClick={() => onFilterChange('onSale', !filters.onSale)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                        filters.onSale 
                          ? 'bg-red-50 border border-red-200 text-red-700' 
                          : 'hover:bg-gray-50 border border-transparent text-gray-700'
                      }`}
                    >
                      <span className="text-sm font-medium">Promocje</span>
                      <div className={`w-4 h-4 rounded border-2 transition-colors ${
                        filters.onSale 
                          ? 'bg-red-500 border-red-500' 
                          : 'border-gray-300 group-hover:border-gray-400'
                      }`}>
                        {filters.onSale && (
                          <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                {/* Categories Filter */}
                <div className="mb-4 sm:mb-6">
                  <motion.button
                    onClick={() => toggleSection('categories')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-between w-full mb-3 sm:mb-4 p-3 rounded-xl hover:bg-gray-50/50 transition-all duration-300 group"
                  >
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">Kategorie</h4>
                    <div className="hidden sm:block flex-1 mx-4 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
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
                        <UniversalCategoryFilters
                          onCategoryChange={onCategoryChange}
                          selectedCategories={filters.categories}
                          totalProducts={totalProducts}
                          config={filterConfig}
                          preset={preset}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Dynamic Attributes Filter */}
                <div className="mb-4 sm:mb-6">
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
                        <UniversalAttributeFilters
                          onFilterChange={onFilterChange}
                          selectedFilters={filters}
                          totalProducts={totalProducts}
                          config={filterConfig}
                          preset={preset}
                          currentFilters={{
                            categories: filters.categories,
                            search: filters.search as string,
                            minPrice: filters.minPrice,
                            maxPrice: filters.maxPrice,
                            attributes: Object.keys(filters).filter(key => key.startsWith('pa_')),
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
                  <motion.button
                    onClick={() => toggleSection('price')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-between w-full mb-3 sm:mb-4 p-3 rounded-xl hover:bg-gray-50/50 transition-all duration-300 group"
                  >
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">Zakres cen</h4>
                    <div className="hidden sm:block flex-1 mx-4 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
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
                                  setPriceRange({ ...priceRange, min: newMin });
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
                                  setPriceRange({ ...priceRange, max: newMax });
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Desktop version */}
      <div className="hidden lg:block lg:sticky lg:top-[7rem] lg:self-start">
        <div 
          ref={desktopSidebarRef}
          className="bg-white border border-gray-200/50 shadow-sm rounded-2xl p-4 sm:p-6 lg:shadow-md lg:backdrop-blur-md max-h-[calc(100vh-6rem)] overflow-y-auto"
        >
          {/* Desktop Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center group">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 group-hover:from-blue-100 group-hover:to-indigo-100 transition-all duration-300">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 group-hover:text-blue-700 transition-colors duration-300" />
              </div>
              <div className="ml-3">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">Filtry</h3>
                <span className="text-xs sm:text-sm text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                  {totalProducts} produktów
                </span>
              </div>
            </div>
          </div>
          
          {/* Desktop content - same as mobile but without scroll container */}
          <div className="space-y-4 sm:space-y-6">
            {/* Search Filter */}
            <div className="mb-4 sm:mb-6">
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
              
              {/* Promocje Toggle */}
              <div className="mt-3">
                <button
                  onClick={() => onFilterChange('onSale', !filters.onSale)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${
                    filters.onSale 
                      ? 'bg-red-50 border border-red-200 text-red-700' 
                      : 'hover:bg-gray-50 border border-transparent text-gray-700'
                  }`}
                >
                  <span className="text-sm font-medium">Promocje</span>
                  <div className={`w-4 h-4 rounded border-2 transition-colors ${
                    filters.onSale 
                      ? 'bg-red-500 border-red-500' 
                      : 'border-gray-300 group-hover:border-gray-400'
                  }`}>
                    {filters.onSale && (
                      <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Categories Filter */}
            <div className="mb-4 sm:mb-6">
              <motion.button
                onClick={() => toggleSection('categories')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-between w-full mb-3 sm:mb-4 p-3 rounded-xl hover:bg-gray-50/50 transition-all duration-300 group"
              >
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">Kategorie</h4>
                <div className="hidden sm:block flex-1 mx-4 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
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
                    <UniversalCategoryFilters
                      onCategoryChange={onCategoryChange}
                      selectedCategories={filters.categories}
                      totalProducts={totalProducts}
                      config={filterConfig}
                      preset={preset}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dynamic Attributes Filter */}
            <div className="mb-4 sm:mb-6">
              <motion.button
                onClick={() => toggleSection('attributes')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-between w-full mb-3 sm:mb-4 p-3 rounded-xl hover:bg-gray-50/50 transition-all duration-300 group"
              >
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">Atrybuty</h4>
                <div className="hidden sm:block flex-1 mx-4 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
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
                    <UniversalAttributeFilters
                      onFilterChange={onFilterChange}
                      selectedFilters={filters}
                      totalProducts={totalProducts}
                      config={filterConfig}
                      preset={preset}
                      currentFilters={{
                        categories: filters.categories,
                        search: filters.search as string,
                        minPrice: filters.minPrice,
                        maxPrice: filters.maxPrice,
                        attributes: Object.keys(filters).filter(key => key.startsWith('pa_')),
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
              <motion.button
                onClick={() => toggleSection('price')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-between w-full mb-3 sm:mb-4 p-3 rounded-xl hover:bg-gray-50/50 transition-all duration-300 group"
              >
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">Zakres cen</h4>
                <div className="hidden sm:block flex-1 mx-4 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
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
                              setPriceRange({ ...priceRange, min: newMin });
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
                              setPriceRange({ ...priceRange, max: newMax });
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
          </div>
        </div>
      </div>
    </>
  );
}
