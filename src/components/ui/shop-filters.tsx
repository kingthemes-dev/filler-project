'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface ShopFiltersProps {
  categories: Category[];
  capacities: Array<{ id: string; name: string; slug: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  filters: {
    categories: string[];
    capacities: string[];
    brands: string[];
    minPrice: number;
    maxPrice: number;
    inStock: boolean;
    onSale: boolean;
  };
  onFilterChange: (key: keyof ShopFiltersProps['filters'], value: string | number | boolean) => void;
  onClearFilters: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  totalProducts: number;
  attributesLoading: boolean;
}

export default function ShopFilters({
  categories,
  capacities,
  brands,
  filters,
  onFilterChange,
  onClearFilters,
  showFilters,
  onToggleFilters,
  totalProducts,
  attributesLoading
}: ShopFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    capacities: true,
    brands: true,
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
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-6">
        <Button
          onClick={onToggleFilters}
          variant="outline"
          className="w-full justify-between rounded-xl"
        >
          <div className="flex items-center">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filtry
          </div>
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Filter Panel */}
      <div className={`${showFilters ? 'block' : 'hidden lg:block'} lg:sticky lg:top-24 lg:self-start`}>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Filter className="w-5 h-5 mr-2 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Filtry</h3>
                  <span className="ml-2 text-sm text-gray-500">({totalProducts} produktów)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onClearFilters}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Wyczyść
                  </Button>
                  <button
                    onClick={onToggleFilters}
                    className="lg:hidden p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Categories Filter */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('categories')}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <h4 className="font-semibold text-gray-900">Kategorie</h4>
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
                      className="space-y-2"
                    >
                      
                      {categories
                        .sort((a, b) => {
                          if (a.name === 'Wszystkie kategorie') return -1;
                          if (b.name === 'Wszystkie kategorie') return 1;
                          return a.name.localeCompare(b.name);
                        })
                        .map((category) => {
                          const categoryId = category.name === 'Wszystkie kategorie' ? '' : category.slug;
                          const isSelected = filters.categories && filters.categories.includes(categoryId);
                          
                          return (
                            <label key={category.id} className="flex items-center p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                name="categories"
                                value={categoryId}
                                checked={isSelected}
                                onChange={() => onFilterChange('categories', categoryId)}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                              />
                              <span className="ml-3 text-sm font-medium text-gray-700">{category.name}</span>
                              <span className="ml-auto text-xs text-gray-500">({category.count})</span>
                            </label>
                          );
                        })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Capacities Filter */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('capacities')}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <h4 className="font-semibold text-gray-900">Pojemności</h4>
                  {expandedSections.capacities ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedSections.capacities && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      {attributesLoading ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, index) => (
                            <div key={index} className="flex items-center p-3 rounded-xl">
                              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                              <div className="ml-3 h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                              <div className="ml-auto h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                            </div>
                          ))}
                        </div>
                      ) : capacities && capacities.length > 0 ? (
                        capacities
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((capacity) => {
                            const isSelected = filters.capacities && filters.capacities.includes(String(capacity.slug));
                            
                            return (
                              <label key={capacity.id} className="flex items-center p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                name="capacities"
                                value={String(capacity.slug)}
                                checked={isSelected}
                                onChange={() => onFilterChange('capacities', String(capacity.slug))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-700">{capacity.name}</span>
                                <span className="ml-auto text-xs text-gray-500">({(capacity as { count?: number }).count || 0})</span>
                              </label>
                            );
                          })
                      ) : (
                        <div className="p-3 text-sm text-gray-500">Brak danych o pojemnościach</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Brands Filter */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('brands')}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <h4 className="font-semibold text-gray-900">Marki</h4>
                  {expandedSections.brands ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedSections.brands && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      {attributesLoading ? (
                        <div className="space-y-2">
                          {[...Array(2)].map((_, index) => (
                            <div key={index} className="flex items-center p-3 rounded-xl">
                              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                              <div className="ml-3 h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                              <div className="ml-auto h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                            </div>
                          ))}
                        </div>
                      ) : brands && brands.length > 0 ? (
                        brands
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((brand) => {
                            const isSelected = filters.brands && filters.brands.includes(String(brand.slug));
                            
                            return (
                              <label key={brand.id} className="flex items-center p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                name="brands"
                                value={String(brand.slug)}
                                checked={isSelected}
                                onChange={() => onFilterChange('brands', String(brand.slug))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-700">{brand.name}</span>
                                <span className="ml-auto text-xs text-gray-500">({(brand as { count?: number }).count || 0})</span>
                              </label>
                            );
                          })
                      ) : (
                        <div className="p-3 text-sm text-gray-500">Brak danych o markach</div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Price Range Filter */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('price')}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <h4 className="font-semibold text-gray-900">Zakres cen</h4>
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Special Offers */}
              <div className="mb-6">
                <button
                  onClick={() => toggleSection('availability')}
                  className="flex items-center justify-between w-full mb-4"
                >
                  <h4 className="font-semibold text-gray-900">Oferty specjalne</h4>
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
                      <label className={`flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 ${
                        filters.onSale 
                          ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 shadow-sm' 
                          : 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 border-transparent hover:border-gray-200'
                      }`}>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={filters.onSale}
                            onChange={(e) => onFilterChange('onSale', e.target.checked)}
                            className="w-5 h-5 text-red-600 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
                          />
                          {filters.onSale && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                              <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${filters.onSale ? 'bg-red-100' : 'bg-gray-100'}`}>
                            <svg className={`w-5 h-5 ${filters.onSale ? 'text-red-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <div>
                            <span className={`text-sm font-semibold ${filters.onSale ? 'text-red-700' : 'text-gray-700'}`}>
                              Promocje
                            </span>
                            <p className="text-xs text-gray-500 mt-0.5">Produkty w promocji</p>
                          </div>
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
