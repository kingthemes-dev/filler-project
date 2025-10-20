'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';

interface FilterState {
  search: string;
  categories: string[];
  minPrice: number | string;
  maxPrice: number | string;
  inStock: boolean;
  onSale: boolean;
  [key: string]: any;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

interface ActiveFiltersBarProps {
  filters: FilterState;
  categories: Category[];
  totalProducts: number;
  activeFiltersCount: number;
  onFilterChange: (key: string, value: any) => void;
  onClearFilters: () => void;
  onPriceRangeReset: () => void;
}

export default function ActiveFiltersBar({
  filters,
  categories,
  totalProducts,
  activeFiltersCount,
  onFilterChange,
  onClearFilters,
  onPriceRangeReset
}: ActiveFiltersBarProps) {
  // Don't show if no active filters
  if (activeFiltersCount === 0) return null;

  // Get category names for display
  const getCategoryName = (slug: string) => {
    const category = categories.find(cat => cat.slug === slug);
    return category ? category.name : slug;
  };

  // Get active filter chips
  const getActiveFilterChips = () => {
    const chips = [];

    // Search filter
    if (filters.search) {
      chips.push({
        id: 'search',
        label: `"${filters.search}"`,
        type: 'search',
        onRemove: () => onFilterChange('search', '')
      });
    }

    // Categories
    if (filters.categories.length > 0) {
      filters.categories.forEach((category, index) => {
        chips.push({
          id: `category-${index}`,
          label: getCategoryName(category),
          type: 'category',
          onRemove: () => {
            const newCategories = filters.categories.filter(cat => cat !== category);
            onFilterChange('categories', newCategories);
          }
        });
      });
    }

    // Price range
    if (filters.minPrice || filters.maxPrice) {
      const minPrice = filters.minPrice || 0;
      const maxPrice = filters.maxPrice || '∞';
      chips.push({
        id: 'price',
        label: `${minPrice} - ${maxPrice} zł`,
        type: 'price',
        onRemove: () => {
          onFilterChange('minPrice', '');
          onFilterChange('maxPrice', '');
          onPriceRangeReset();
        }
      });
    }

    // On sale
    if (filters.onSale) {
      chips.push({
        id: 'onSale',
        label: 'Promocje',
        type: 'sale',
        onRemove: () => onFilterChange('onSale', false)
      });
    }

    // Dynamic attributes (pa_*)
    Object.keys(filters).forEach(key => {
      if (key.startsWith('pa_') && Array.isArray(filters[key]) && filters[key].length > 0) {
        filters[key].forEach((value: string, index: number) => {
          chips.push({
            id: `${key}-${index}`,
            label: value,
            type: 'attribute',
            onRemove: () => {
              const newValues = filters[key].filter((v: string) => v !== value);
              onFilterChange(key, newValues);
            }
          });
        });
      }
    });

    return chips;
  };

  const filterChips = getActiveFilterChips();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-white/95 backdrop-blur-sm sticky top-0 z-40"
    >
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Filter info */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Aktywne filtry
                </h3>
                <p className="text-xs text-gray-500">
                  {totalProducts} produktów
                </p>
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex flex-wrap gap-2 min-w-0">
                <AnimatePresence mode="popLayout">
                  {filterChips.map((chip, index) => (
                    <motion.div
                      key={chip.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8, x: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: 20 }}
                      transition={{ 
                        duration: 0.2, 
                        delay: index * 0.05,
                        layout: { duration: 0.3 }
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 hover:scale-105 ${
                        chip.type === 'search' 
                          ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                          : chip.type === 'category'
                          ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200'
                          : chip.type === 'price'
                          ? 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200'
                          : chip.type === 'sale'
                          ? 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                          : 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200'
                      }`}
                    >
                      <span className="truncate max-w-[120px]">{chip.label}</span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={chip.onRemove}
                        className="flex-shrink-0 hover:bg-white/50 rounded-full p-0.5 transition-colors duration-200"
                        aria-label={`Usuń filtr ${chip.label}`}
                      >
                        <X className="w-3 h-3" />
                      </motion.button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right side - Clear all button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClearFilters}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 rounded-lg border border-gray-200 hover:border-red-200 transition-all duration-300 font-medium text-sm flex-shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Wyczyść wszystkie</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
