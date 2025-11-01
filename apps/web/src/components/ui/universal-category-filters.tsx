/**
 * UNIVERSAL CATEGORY FILTERS
 * Works with ANY e-commerce API automatically
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
// removed unused imports from universal-filter-service
import { FilterConfig } from '@/config/filter-config';

interface UniversalCategoryFiltersProps {
  onCategoryChange: (categoryId: string, subcategoryId?: string) => void;
  selectedCategories: string[];
  totalProducts: number;
  config?: Partial<FilterConfig>;
  preset?: 'woocommerce' | 'shopify' | 'custom';
}

export default function UniversalCategoryFilters({ 
  onCategoryChange, 
  selectedCategories,
  totalProducts,
  config,
  preset = 'woocommerce'
}: UniversalCategoryFiltersProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 🚀 USE PREFETCHED DATA - No loading, instant display!
  const categoriesQuery = useQuery({
    queryKey: ['universal-filters', 'categories', preset, config],
    queryFn: async () => {
      // This should NEVER run if data is prefetched!
      console.warn('⚠️ Client-side fetch triggered - prefetch may have failed');
      return [];
    },
    staleTime: 10 * 60_000, // 10 minutes
    enabled: true,
  });

  // Use prefetched data - should be instant!
  const categories = categoriesQuery.data || [];
  const loading = categoriesQuery.isLoading && !categoriesQuery.data; // Only show loading if no data at all

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // removed unused handleCategoryClick helper

  const isCategoryExpanded = (categoryId: string) => expandedCategories.has(categoryId);
  const isCategorySelected = (categorySlug: string) => selectedCategories.includes(categorySlug);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* All categories option */}
      <div className="border border-gray-100 rounded-lg overflow-hidden">
        <label className="flex items-center p-2 sm:p-3 hover:bg-gray-50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            name="categories"
            value=""
            checked={selectedCategories.length === 0}
            onChange={() => onCategoryChange('')}
            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
          />
          <span className="ml-3 text-xs sm:text-sm font-medium text-gray-700">Wszystkie kategorie</span>
          <span className="ml-auto text-xs text-gray-500">({totalProducts})</span>
        </label>
      </div>

      {/* Dynamic categories from API */}
      {categories.map((category: any) => (
        <div key={category.id} className="border border-gray-100 rounded-lg overflow-hidden">
          {/* Main category */}
          <div className="bg-gray-50">
            <div className="flex items-center p-2 sm:p-3 hover:bg-gray-100 transition-colors">
              <div 
                className="flex items-center flex-1 cursor-pointer"
                onClick={() => {
                  if (category.subcategories.length > 0) {
                    toggleCategory(category.id);
                  } else {
                    onCategoryChange(category.slug);
                  }
                }}
              >
                <input
                  type="checkbox"
                  name="categories"
                  value={category.slug}
                  checked={isCategorySelected(category.slug)}
                  onChange={() => onCategoryChange(category.slug)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="ml-3 text-xs sm:text-sm font-semibold text-gray-800 hover:text-gray-600 transition-colors">
                  {category.name}
                </span>
                <span className="ml-2 text-xs text-gray-500">({category.count})</span>
              </div>
              
              {category.subcategories.length > 0 && (
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-200 transition-colors ml-2"
                >
                  {isCategoryExpanded(category.id) ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Subcategories */}
          <AnimatePresence>
            {isCategoryExpanded(category.id) && category.subcategories.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden bg-white"
              >
                <div className="border-t border-gray-100">
                  {category.subcategories.map((subcategory: any, index: number) => (
                    <motion.label
                      key={subcategory.id}
                      className="flex items-center p-2 sm:p-3 pl-8 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <input
                        type="checkbox"
                        name="categories"
                        value={subcategory.slug}
                        checked={isCategorySelected(subcategory.slug)}
                        onChange={() => onCategoryChange(category.slug, subcategory.slug)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                      />
                      <span className="ml-3 text-xs sm:text-sm font-medium text-gray-700">{subcategory.name}</span>
                      <span className="ml-auto text-xs text-gray-500">({subcategory.count})</span>
                    </motion.label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {categories.length === 0 && !loading && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Brak kategorii do wyświetlenia</p>
        </div>
      )}
    </div>
  );
}
