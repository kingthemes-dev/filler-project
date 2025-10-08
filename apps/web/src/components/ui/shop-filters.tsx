'use client';

import { useState } from 'react';
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

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };


  // Price ranges use PLN directly (not grosze)

  return (
    <>
      {/* Mobile Filter Toggle - Hidden on desktop */}
      <div className="lg:hidden mb-4">
        <button
          onClick={onToggleFilters}
          className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            <span className="font-medium">Filtry</span>
          </div>
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Filter Panel */}
      <div className={`${showFilters ? 'block' : 'hidden lg:block'} lg:sticky lg:top-24 lg:self-start`}>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-600" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Filtry</h3>
                  <span className="ml-2 text-xs sm:text-sm text-gray-500">({totalProducts} produktów)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClearFilters}
                    className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Wyczyść
                  </button>
                  <button
                    onClick={onToggleFilters}
                    className="lg:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
                              attributes: Object.keys(filters).filter(key => key.startsWith('pa_'))
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
                      {/* Custom Price Inputs */}
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Od (zł)
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={filters.minPrice ? filters.minPrice : ''}
                              onChange={(e) => onFilterChange('minPrice', (Number(e.target.value) || 0))}
                              className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Do (zł)
                            </label>
                            <input
                              type="number"
                              placeholder="9999"
                              value={filters.maxPrice ? filters.maxPrice : ''}
                              onChange={(e) => onFilterChange('maxPrice', (Number(e.target.value) || 999999))}
                              className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
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
