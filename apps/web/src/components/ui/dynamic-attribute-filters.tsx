'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
// removed unused DynamicFilters import

export type FilterValue = string[] | string | number | boolean;

interface AttributeTerm {
  slug: string;
  name: string;
  count: number;
}

interface AttributeResponseItem {
  name?: string;
  terms?: AttributeTerm[];
  order?: number;
}

export type AttributeCollection = Record<string, AttributeResponseItem>;

interface AttributesResponse {
  attributes: AttributeCollection;
}

interface PreparedAttribute {
  name: string;
  slug: string;
  terms: AttributeTerm[];
}

type PreparedAttributeMap = Record<string, PreparedAttribute>;

export interface DynamicFiltersData {
  categories: unknown[];
  attributes: AttributeCollection;
}

export interface ContextualAttributes {
  attributes?: AttributeCollection;
}

interface DynamicAttributeFiltersProps {
  onFilterChange: (key: string, value: string) => void;
  selectedFilters: Record<string, FilterValue>;
  totalProducts: number;
  dynamicFiltersData?: DynamicFiltersData;
  contextualAttributes?: ContextualAttributes; // Contextual attributes na podstawie wybranych kategorii
  contextualLoading?: boolean; // Loading state dla contextual attributes
  currentFilters?: { // Dodaj aktualne filtry
    categories: string[];
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    attributes?: string[];
    attributeValues?: Record<string, FilterValue>; // PRO: Actual attribute values
  };
}

export default function DynamicAttributeFilters({ 
  onFilterChange, 
  selectedFilters,
  totalProducts: _totalProducts,
  dynamicFiltersData,
  contextualAttributes,
  contextualLoading,
  currentFilters = { categories: [] }
}: DynamicAttributeFiltersProps) {
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());

  // Użyj prefetchowanych danych jeśli dostępne, w przeciwnym razie React Query
  const attributesQuery = useQuery<AttributesResponse>({
    queryKey: ['shop','attributes',{ categories: [], search: '', min: 0, max: 10000, selected: [] }],
    queryFn: async () => {
      // attributesQuery queryFn called - fetching all attributes
      const params = new URLSearchParams();
      params.append('endpoint', 'attributes');
      const res = await fetch(`/api/woocommerce?${params.toString()}`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // attributesQuery data received
      return data as AttributesResponse;
    },
    staleTime: 0, // Brak cache - zawsze pobierz świeże dane
    enabled: currentFilters.categories.length === 0, // Włącz gdy nie ma wybranych kategorii
  });

  // Przetwórz dane atrybutów z contextual, prefetchowanych danych lub React Query
  const attributes = useMemo<PreparedAttributeMap>(() => {
    // Priorytet: contextual attributes (tylko gdy są kategorie) > React Query (gdy brak kategorii) > prefetchowane dane
    const attributesData =
      (currentFilters.categories.length > 0 ? contextualAttributes?.attributes : null) ||
      (currentFilters.categories.length === 0 ? attributesQuery.data?.attributes : null) ||
      dynamicFiltersData?.attributes;
    
    // DynamicAttributeFilters attributes debug removed
    
    if (!attributesData) return {};
    
    const attributesMap: PreparedAttributeMap = {};
    Object.entries(attributesData).forEach(([attrSlug, attrData]) => {
      const cleanName = (attrData.name || attrSlug)
        .replace(/^pa_/i, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l: string) => l.toUpperCase());
      attributesMap[attrSlug] = {
        name: cleanName,
        slug: attrSlug,
        terms: attrData.terms ?? [],
      };
    });
    return attributesMap;
  }, [contextualAttributes?.attributes, currentFilters.categories.length, attributesQuery.data?.attributes, dynamicFiltersData?.attributes]);

  // Usunięto główny loading state - dane są prefetchowane
  // Zostaw tylko contextual loading dla dynamicznych aktualizacji

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
    // Ensure filterKey starts with pa_ (attributeSlug may already have it)
    const filterKey = attributeSlug.startsWith('pa_') ? attributeSlug : `pa_${attributeSlug}`;
    onFilterChange(filterKey, termSlug);
  };

  const isAttributeExpanded = (attributeSlug: string) => expandedAttributes.has(attributeSlug);
  const isTermSelected = (attributeSlug: string, termSlug: string) => {
    // Ensure filterKey starts with pa_ (attributeSlug may already have it)
    const filterKey = attributeSlug.startsWith('pa_') ? attributeSlug : `pa_${attributeSlug}`;
    const filterValue = selectedFilters[filterKey];
    let terms: string[] = [];
    
    if (Array.isArray(filterValue)) {
      terms = filterValue;
    } else if (typeof filterValue === 'string') {
      terms = filterValue.split(',').filter(v => v.trim());
    }
    
    // isTermSelected check debug removed
    return terms.includes(termSlug);
  };

  // Usunięto główny loading state - dane są prefetchowane
  // Zostaw tylko contextual loading dla dynamicznych aktualizacji

  const attributeEntries = Object.entries(attributes);
  // DynamicAttributeFilters render debug removed

  if (attributeEntries.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-gray-500">Brak atrybutów do wyświetlenia</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contextual loading indicator */}
      {contextualLoading && currentFilters.categories.length > 0 && (
        <div className="flex items-center justify-center py-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
          <span className="ml-2 text-xs text-gray-500">Aktualizacja atrybutów...</span>
        </div>
      )}
      
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
              const Row = ({ index, style }: ListChildComponentProps) => {
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
                  {Row}
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
