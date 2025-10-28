'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FixedSizeList as List } from 'react-window';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { dynamicCategoriesService, DynamicFilters } from '@/services/dynamic-categories';

interface DynamicAttributeFiltersProps {
  onFilterChange: (key: string, value: string) => void;
  selectedFilters: { [key: string]: string[] | string | number | boolean };
  totalProducts: number;
  dynamicFiltersData?: { categories: any[]; attributes: any };
  currentFilters?: { // Dodaj aktualne filtry
    categories: string[];
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    attributes?: string[];
    attributeValues?: Record<string, any>; // PRO: Actual attribute values
  };
}

export default function DynamicAttributeFilters({ 
  onFilterChange, 
  selectedFilters,
  totalProducts,
  dynamicFiltersData,
  currentFilters = { categories: [] }
}: DynamicAttributeFiltersProps) {
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());

  // Użyj prefetchowanych danych jeśli dostępne, w przeciwnym razie React Query
  const attributesQuery = useQuery({
    queryKey: ['shop','attributes',{ categories: [], search: '', min: 0, max: 10000, selected: [] }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('endpoint', 'attributes');
      const res = await fetch(`/api/woocommerce?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 10 * 60_000,
    enabled: !dynamicFiltersData, // Tylko jeśli nie ma prefetchowanych danych
  });

  // Przetwórz dane atrybutów z prefetchowanych danych lub React Query
  const attributes = useMemo(() => {
    const attributesData = dynamicFiltersData?.attributes || attributesQuery.data?.attributes;
    if (!attributesData) return {};
    
    const attributesMap: { [key: string]: { name: string; slug: string; terms: any[] } } = {};
    Object.entries(attributesData).forEach(([attrSlug, attrData]: [string, any]) => {
      const cleanName = (attrData.name || attrSlug)
        .replace(/^pa_/i, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l: string) => l.toUpperCase());
      attributesMap[attrSlug] = { name: cleanName, slug: attrSlug, terms: attrData.terms || [] };
    });
    return attributesMap;
  }, [dynamicFiltersData?.attributes, attributesQuery.data?.attributes]);

  const loading = !dynamicFiltersData && attributesQuery.isLoading;

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
    console.log('🔧 handleAttributeTermClick called:', { attributeSlug, termSlug });
    const filterValue = selectedFilters[`pa_${attributeSlug}`];
    const currentTerms = Array.isArray(filterValue) ? filterValue : [];
    const newTerms = currentTerms.includes(termSlug)
      ? currentTerms.filter(t => t !== termSlug)
      : [...currentTerms, termSlug];
    
    console.log('🔧 New terms:', newTerms);
    console.log('🔧 Calling onFilterChange with:', `pa_${attributeSlug}`, newTerms.join(','));
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
    
    console.log('🔍 isTermSelected check:', { attributeSlug, termSlug, filterValue, terms, result: terms.includes(termSlug) });
    return terms.includes(termSlug);
  };

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

  const attributeEntries = Object.entries(attributes);
  console.log('🔧 DynamicAttributeFilters render - attributes:', attributes);
  console.log('🔧 DynamicAttributeFilters render - attributeEntries:', attributeEntries);

  if (attributeEntries.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">Brak atrybutów do wyświetlenia</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {attributeEntries.map(([attributeSlug, attribute]) => (
        <div key={attributeSlug} className="border border-gray-100 rounded-lg overflow-hidden">
          {/* Nagłówek atrybutu */}
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

          {/* Terminy atrybutu */}
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
              const items = attribute.terms
                .filter(term => term.count > 0)
                .sort((a, b) => b.count - a.count);
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
