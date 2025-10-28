/**
 * UNIVERSAL ATTRIBUTE FILTERS
 * Works with ANY e-commerce API automatically
 */

'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FixedSizeList as List } from 'react-window';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { universalFilterService, UniversalAttribute } from '@/services/universal-filter-service';
import { FilterConfig } from '@/config/filter-config';

interface UniversalAttributeFiltersProps {
  onFilterChange: (key: string, value: string) => void;
  selectedFilters: { [key: string]: string[] | string | number | boolean };
  totalProducts: number;
  config?: Partial<FilterConfig>;
  preset?: 'woocommerce' | 'shopify' | 'custom';
  currentFilters?: {
    categories: string[];
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    attributes?: string[];
    attributeValues?: Record<string, any>;
  };
}

export default function UniversalAttributeFilters({ 
  onFilterChange, 
  selectedFilters,
  totalProducts,
  config,
  preset = 'woocommerce',
  currentFilters = { categories: [] }
}: UniversalAttributeFiltersProps) {
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());

  // 🚀 USE PREFETCHED DATA - No loading, instant display!
  const attributesQuery = useQuery({
    queryKey: ['universal-filters', 'attributes', preset, config],
    queryFn: async () => {
      // This should NEVER run if data is prefetched!
      console.warn('⚠️ Client-side fetch triggered - prefetch may have failed');
      return {};
    },
    staleTime: 10 * 60_000, // 10 minutes
    enabled: true,
  });

  // Use prefetched data - should be instant!
  const attributes = attributesQuery.data || {};
  const loading = attributesQuery.isLoading && !attributesQuery.data; // Only show loading if no data at all

  const toggleAttribute = (attributeSlug: string) => {
    setExpandedAttributes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(attributeSlug)) {
        newSet.delete(attributeSlug);
      } else {
        newSet.add(attributeSlug);
      }
      return newSet;
    });
  };

  const handleAttributeTermClick = (attributeSlug: string, termSlug: string) => {
    const filterValue = selectedFilters[`pa_${attributeSlug}`];
    const currentTerms = Array.isArray(filterValue) ? filterValue : [];
    const newTerms = currentTerms.includes(termSlug)
      ? currentTerms.filter(t => t !== termSlug)
      : [...currentTerms, termSlug];
    
    onFilterChange(`pa_${attributeSlug}`, newTerms.join(','));
  };

  const isAttributeExpanded = (attributeSlug: string) => expandedAttributes.has(attributeSlug);
  const isTermSelected = (attributeSlug: string, termSlug: string) => {
    const filterValue = selectedFilters[`pa_${attributeSlug}`];
    let terms: string[] = [];
    
    if (Array.isArray(filterValue)) {
      terms = filterValue;
    } else if (typeof filterValue === 'string') {
      terms = filterValue.split(',').filter(v => v.trim());
    }
    
    return terms.includes(termSlug);
  };

  // Sort attributes by order and filter by count
  const sortedAttributes = useMemo(() => {
    return Object.entries(attributes)
      .filter(([_, attr]: [string, any]) => attr.terms.length > 0)
      .sort(([_, a]: [string, any], [__, b]: [string, any]) => (a.order || 0) - (b.order || 0))
      .map(([slug, attr]: [string, any]) => ({
        slug,
        ...attr,
        terms: attr.terms
          .filter((term: any) => term.count > 0)
          .sort((a: any, b: any) => b.count - a.count)
      }));
  }, [attributes]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sortedAttributes.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">Brak atrybutów do wyświetlenia</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedAttributes.map(([attributeSlug, attribute]) => (
        <div key={attributeSlug} className="border border-gray-100 rounded-lg overflow-hidden">
          {/* Attribute header */}
          <div className="bg-gray-50">
            <button
              onClick={() => toggleAttribute(attributeSlug)}
              className="flex items-center justify-between w-full p-3 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-sm font-semibold text-gray-800">{attribute.name}</span>
                <span className="ml-2 text-xs text-gray-500">({attribute.terms.length})</span>
              </div>
              {isAttributeExpanded(attributeSlug) ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>

          {/* Attribute terms */}
          <AnimatePresence>
            {isAttributeExpanded(attributeSlug) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden bg-white"
              >
                <div className="border-t border-gray-100">
                  {(() => {
                    const items = attribute.terms;
                    const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
                      const term = items[index];
                      return (
                        <div style={style}>
                          <label className="flex items-center px-2 sm:px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0 min-w-0">
                            <input
                              type="checkbox"
                              name={attributeSlug}
                              value={term.slug}
                              checked={isTermSelected(attributeSlug, term.slug)}
                              onChange={() => handleAttributeTermClick(attributeSlug, term.slug)}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                            />
                            <span className="ml-3 text-xs sm:text-sm font-medium text-gray-700 text-left truncate">{term.name}</span>
                            <span className="ml-auto text-xs text-gray-500">({term.count})</span>
                          </label>
                        </div>
                      );
                    };
                    const itemSize = 44; // px per row
                    const height = Math.min(8, items.length) * itemSize; // show up to 8 rows without scroll
                    return (
                      <List height={height} width={'100%'} itemCount={items.length} itemSize={itemSize} overscanCount={8}>
                        {Row as any}
                      </List>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
