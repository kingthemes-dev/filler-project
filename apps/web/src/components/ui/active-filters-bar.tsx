'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';

type FilterValue = string | number | boolean | string[];

interface BaseFilters {
  search: string;
  categories: string[];
  minPrice: number | string;
  maxPrice: number | string;
  inStock: boolean;
  onSale: boolean;
}

type FilterState = BaseFilters &
  Record<string, FilterValue | number | string | boolean>;

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
  onFilterChange: (
    key: string,
    value: FilterValue | string | number | boolean
  ) => void;
  onClearFilters: () => void;
  onPriceRangeReset: () => void;
}

export default function ActiveFiltersBar({
  filters,
  categories,
  totalProducts: _totalProducts,
  activeFiltersCount,
  onFilterChange,
  onClearFilters,
  onPriceRangeReset,
}: ActiveFiltersBarProps) {
  // Don't show if no active filters
  if (activeFiltersCount === 0) return null;

  // Get category names for display
  const getCategoryName = (slug: string) => {
    const category = categories.find(cat => cat.slug === slug);
    return category ? category.name : slug;
  };

  // Get active filter chips
  type FilterChip = {
    id: string;
    label: string;
    onRemove: () => void;
  };

  const asStringArray = (
    value: FilterValue | number | string | boolean | undefined
  ): string[] => {
    if (Array.isArray(value)) {
      return value.map(item => String(item));
    }
    if (typeof value === 'string' && value.length > 0) {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const getActiveFilterChips = (): FilterChip[] => {
    const chips: FilterChip[] = [];

    // ActiveFiltersBar current filters debug removed

    // Search filter
    if (filters.search) {
      chips.push({
        id: 'search',
        label: `"${filters.search}"`,
        onRemove: () => onFilterChange('search', ''),
      });
    }

    // Categories
    if (filters.categories.length > 0) {
      filters.categories.forEach((category, index) => {
        chips.push({
          id: `category-${index}`,
          label: getCategoryName(category),
          onRemove: () => {
            // Removing category debug removed
            onFilterChange('categories', category);
          },
        });
      });
    }

    // Brands - handle both brands array and pa_marka attribute
    const brandValues = asStringArray(filters.brands ?? filters['pa_marka']);

    if (brandValues.length > 0) {
      brandValues.forEach((brand, index) => {
        chips.push({
          id: `brand-${index}`,
          label: brand,
          onRemove: () => {
            // Remove brand - use brands key for backward compatibility
            // handleFilterChange will handle the toggle logic
            onFilterChange('brands', brand);
          },
        });
      });
    }

    // Price range
    const minPriceNum =
      typeof filters.minPrice === 'number'
        ? filters.minPrice
        : Number(filters.minPrice) || 0;
    const maxPriceNum =
      typeof filters.maxPrice === 'number'
        ? filters.maxPrice
        : Number(filters.maxPrice) || 0;

    if (minPriceNum > 0 || (maxPriceNum > 0 && maxPriceNum < 10000)) {
      const minPrice = minPriceNum > 0 ? minPriceNum : 0;
      const maxPrice = maxPriceNum > 0 ? maxPriceNum : '∞';
      chips.push({
        id: 'price',
        label: `${minPrice} - ${maxPrice} zł`,
        onRemove: () => {
          onFilterChange('minPrice', '');
          onFilterChange('maxPrice', '');
          onPriceRangeReset();
        },
      });
    }

    // On sale
    if (filters.onSale) {
      chips.push({
        id: 'onSale',
        label: 'Promocje',
        onRemove: () => onFilterChange('onSale', false),
      });
    }

    // Dynamic attributes (pa_*)
    Object.keys(filters).forEach(key => {
      if (
        key.startsWith('pa_') &&
        Array.isArray(filters[key]) &&
        filters[key].length > 0
      ) {
        // Processing attribute debug removed
        asStringArray(filters[key]).forEach((value, index) => {
          chips.push({
            id: `${key}-${index}`,
            label: value,
            onRemove: () => {
              // Removing attribute value debug removed
              const newValues = asStringArray(filters[key]).filter(
                v => v !== value
              );
              onFilterChange(key, newValues);
            },
          });
        });
      }
    });

    // ActiveFiltersBar generated chips debug removed
    return chips;
  };

  const filterChips = getActiveFilterChips();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white sticky top-[7.5rem] z-30 rounded-2xl mx-0 mb-5 border border-gray-200"
    >
      <div className="px-3 sm:px-4 py-2.5">
        {/* Mobile Layout - Button left, filters right */}
        <div className="flex items-center gap-3 sm:hidden">
          {/* Clear button - left side */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClearFilters}
            className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-black border border-gray-300 hover:border-gray-400 rounded-lg transition-all duration-300 font-medium text-xs flex-shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Wyczyść filtry</span>
          </motion.button>

          {/* Filter chips - right side */}
          <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
            <AnimatePresence mode="popLayout">
              {filterChips
                .filter(
                  chip =>
                    chip.label &&
                    typeof chip.label === 'string' &&
                    chip.label.trim()
                )
                .map((chip, index) => (
                  <motion.div
                    key={chip.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: 20 }}
                    transition={{
                      duration: 0.2,
                      delay: index * 0.05,
                      layout: { duration: 0.3 },
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-white border border-gray-300 text-black hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                  >
                    <span className="truncate max-w-[100px]">{chip.label}</span>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={chip.onRemove}
                      className="flex items-center justify-center flex-shrink-0 hover:bg-gray-200 rounded-full p-0.5 transition-colors duration-200"
                      aria-label={`Usuń filtr ${chip.label}`}
                    >
                      <X className="w-3 h-3" />
                    </motion.button>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Layout - Button left, filters right */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Clear button - left side */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClearFilters}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-black border border-gray-300 hover:border-gray-400 rounded-lg transition-all duration-300 font-medium text-sm flex-shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Wyczyść filtry</span>
          </motion.button>

          {/* Filter chips - right side */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5 min-w-0">
              <AnimatePresence mode="popLayout">
                {filterChips
                  .filter(
                    chip =>
                      chip.label &&
                      typeof chip.label === 'string' &&
                      chip.label.trim()
                  )
                  .map((chip, index) => (
                    <motion.div
                      key={chip.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8, x: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8, x: 20 }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.05,
                        layout: { duration: 0.3 },
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 border border-gray-300 text-black hover:bg-gray-200 hover:border-gray-400 transition-all duration-200"
                    >
                      <span className="truncate max-w-[120px]">
                        {chip.label}
                      </span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={chip.onRemove}
                        className="flex-shrink-0 hover:bg-gray-200 rounded-full p-0.5 transition-colors duration-200"
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
      </div>
    </motion.div>
  );
}
