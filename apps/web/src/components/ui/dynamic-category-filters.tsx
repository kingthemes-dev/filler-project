'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { dynamicCategoriesService, HierarchicalCategory } from '@/services/dynamic-categories';
import { useQuery } from '@tanstack/react-query';

interface DynamicCategoryFiltersProps {
  onCategoryChange: (categoryId: string, subcategoryId?: string) => void;
  selectedCategories: string[];
  totalProducts: number;
  dynamicFiltersData?: { categories: any[]; attributes: any };
}

export default function DynamicCategoryFilters({ 
  onCategoryChange, 
  selectedCategories,
  totalProducts,
  dynamicFiltersData
}: DynamicCategoryFiltersProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Użyj React Query jako fallback jeśli nie ma prefetchowanych danych
  const dynamicFiltersQuery = useQuery({
    queryKey: ['shop','dynamic-filters'],
    queryFn: async () => {
      console.log('🔄 Loading dynamic categories from prefetched data...');
      return await dynamicCategoriesService.getDynamicFilters();
    },
    staleTime: 10 * 60_000, // 10 minut
    enabled: !dynamicFiltersData, // Tylko jeśli nie ma prefetchowanych danych
  });

  // Użyj prefetchowanych danych jeśli dostępne, w przeciwnym razie React Query
  const categories = dynamicFiltersData?.categories || dynamicFiltersQuery.data?.categories || [];
  // Usunięto główny loading state - dane są prefetchowane

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

  const handleCategoryClick = (categorySlug: string) => {
    onCategoryChange(categorySlug);
  };

  const isCategoryExpanded = (categoryId: string) => expandedCategories.has(categoryId);
  const isCategorySelected = (categorySlug: string) => selectedCategories.includes(categorySlug);

  // Usunięto główny loading state - dane są prefetchowane

  return (
    <div className="space-y-2">
      {/* Dynamiczne kategorie */}
      {categories.map((category) => (
        <div key={category.id} className="border border-gray-100 rounded-lg overflow-hidden">
          {/* Główna kategoria */}
          <div className="bg-gray-50">
            <button
              onClick={() => toggleCategory(category.id)}
              className="flex items-center justify-between w-full p-2 sm:p-3 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-xs sm:text-sm font-semibold text-gray-800">{category.name}</span>
                <span className="ml-2 text-xs text-gray-500">({category.count})</span>
              </div>
              {category.subcategories && category.subcategories.length > 0 && (
                isCategoryExpanded(category.id) ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )
              )}
            </button>
          </div>

          {/* Podkategorie */}
          <AnimatePresence>
            {isCategoryExpanded(category.id) && category.subcategories && category.subcategories.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden bg-white"
              >
                <div className="border-t border-gray-100">
                  {category.subcategories && category.subcategories.map((subcategory: any, index: number) => (
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

      {categories.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Brak kategorii do wyświetlenia</p>
        </div>
      )}
    </div>
  );
}
