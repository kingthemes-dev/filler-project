'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { dynamicCategoriesService, HierarchicalCategory } from '@/services/dynamic-categories';

interface DynamicCategoryFiltersProps {
  onCategoryChange: (categoryId: string, subcategoryId?: string) => void;
  selectedCategories: string[];
  totalProducts: number;
}

export default function DynamicCategoryFilters({ 
  onCategoryChange, 
  selectedCategories,
  totalProducts
}: DynamicCategoryFiltersProps) {
  const [categories, setCategories] = useState<HierarchicalCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading dynamic categories...');
      const dynamicFilters = await dynamicCategoriesService.getDynamicFilters();
      console.log('📦 Dynamic filters received:', dynamicFilters);
      console.log('📂 Categories count:', dynamicFilters.categories.length);
      console.log('📂 Categories structure:', dynamicFilters.categories);
      setCategories(dynamicFilters.categories);
    } catch (error) {
      console.error('❌ Error loading dynamic categories:', error);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Dynamiczne kategorie */}
      {categories.map((category) => (
        <div key={category.id} className="border border-gray-100 rounded-lg overflow-hidden">
          {/* Główna kategoria */}
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

          {/* Podkategorie */}
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
                  {category.subcategories.map((subcategory, index) => (
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
