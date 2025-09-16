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
  capacities: any[];
  brands: any[];
  filters: {
    categories: string[];
    capacities: string[];
    brands: string[];
    minPrice: number;
    maxPrice: number;
    inStock: boolean;
    onSale: boolean;
    featured: boolean;
  };
  onFilterChange: (key: keyof ShopFiltersProps['filters'], value: any) => void;
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
  const priceRanges = [
    { label: '0 - 50 zł', min: 0, max: 50 },
    { label: '50 - 100 zł', min: 50, max: 100 },
    { label: '100 - 200 zł', min: 100, max: 200 },
    { label: '200+ zł', min: 200, max: 999999 }
  ];

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
                          const categoryId = category.name === 'Wszystkie kategorie' ? '' : category.id.toString();
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
                            const isSelected = filters.capacities && filters.capacities.includes(String(capacity.id));
                            
                            return (
                              <label key={capacity.id} className="flex items-center p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  name="capacities"
                                  value={String(capacity.id)}
                                  checked={isSelected}
                                  onChange={() => onFilterChange('capacities', String(capacity.id))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-700">{capacity.name}</span>
                                <span className="ml-auto text-xs text-gray-500">({capacity.count || 0})</span>
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
                            const isSelected = filters.brands && filters.brands.includes(String(brand.id));
                            
                            return (
                              <label key={brand.id} className="flex items-center p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  name="brands"
                                  value={String(brand.id)}
                                  checked={isSelected}
                                  onChange={() => onFilterChange('brands', String(brand.id))}
                                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                                />
                                <span className="ml-3 text-sm font-medium text-gray-700">{brand.name}</span>
                                <span className="ml-auto text-xs text-gray-500">({brand.count || 0})</span>
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
                      {/* Quick Price Ranges */}
                      <div className="grid grid-cols-2 gap-2">
                        {priceRanges.map((range) => (
                          <button
                            key={range.label}
                            onClick={() => {
                              onFilterChange('minPrice', range.min);
                              onFilterChange('maxPrice', range.max);
                            }}
                            className={`p-3 text-sm rounded-xl border transition-colors ${
                              filters.minPrice === range.min && filters.maxPrice === range.max
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                      
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
                      <label className="flex items-center p-4 rounded-xl hover:bg-red-50 cursor-pointer transition-colors border border-transparent hover:border-red-100">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={filters.onSale}
                            onChange={(e) => onFilterChange('onSale', e.target.checked)}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          {filters.onSale && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                          )}
                        </div>
                        <div className="ml-3 flex items-center">
                          <span className="text-sm font-semibold text-red-700">🔥 Promocje</span>
                          <span className="ml-2 text-xs text-red-500 bg-red-100 px-2 py-1 rounded-full">-20%</span>
                        </div>
                      </label>
                      
                      <label className="flex items-center p-4 rounded-xl hover:bg-yellow-50 cursor-pointer transition-colors border border-transparent hover:border-yellow-100">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={filters.featured}
                            onChange={(e) => onFilterChange('featured', e.target.checked)}
                            className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                          />
                          {filters.featured && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full"></div>
                          )}
                        </div>
                        <div className="ml-3 flex items-center">
                          <span className="text-sm font-semibold text-yellow-700">⭐ Polecane</span>
                          <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">TOP</span>
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
