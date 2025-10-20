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
  currentFilters = { categories: [] }
}: DynamicAttributeFiltersProps) {
  const [attributes, setAttributes] = useState<DynamicFilters['attributes']>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // PRO: Separate state for refreshing
  const [expandedAttributes, setExpandedAttributes] = useState<Set<string>>(new Set());
  const [lastFiltersHash, setLastFiltersHash] = useState<string>('');
  const [attributesCache, setAttributesCache] = useState<Map<string, DynamicFilters['attributes']>>(new Map()); // PRO: Cache for performance

  useEffect(() => {
    console.log('🔄 DynamicAttributeFilters useEffect triggered - loading attributes with current filters:', currentFilters);
    console.log('🔄 selectedFilters:', selectedFilters);
    
    // PRO: Create hash of current filters to check if we need to reload
    const filtersHash = JSON.stringify({
      categories: currentFilters.categories.sort(),
      search: currentFilters.search,
      minPrice: currentFilters.minPrice,
      maxPrice: currentFilters.maxPrice,
      // PRO: Include all dynamic attributes in the hash
      attributes: Object.keys(selectedFilters).filter(key => key.startsWith('pa_')).sort()
    });
    
    // PRO: Check cache first for performance
    if (attributesCache.has(filtersHash)) {
      console.log('🚀 Using cached attributes for filters:', filtersHash);
      setAttributes(attributesCache.get(filtersHash)!);
      setLastFiltersHash(filtersHash);
      return;
    }
    
    // PRO: Only reload if filters actually changed
    if (filtersHash === lastFiltersHash) {
      console.log('🔄 Filters unchanged, skipping reload');
      return;
    }
    
    // PRO: Immediate load for better UX (no debounce for attributes)
    loadAttributes(filtersHash).then(() => setLastFiltersHash(filtersHash));
  }, [currentFilters, selectedFilters]); // PRO: Also reload when selectedFilters change

  // React Query: fetch attributes with current filters (deduplicated, cached)
  const attributesQuery = useQuery({
    queryKey: ['shop','attributes',{ categories: (currentFilters.categories||[]).slice().sort(), search: currentFilters.search||'', min: currentFilters.minPrice||0, max: currentFilters.maxPrice||0, selected: Object.keys(selectedFilters).filter(k=>k.startsWith('pa_')).sort() }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('endpoint', 'attributes');
      if (currentFilters.categories?.length) params.append('category', currentFilters.categories.join(','));
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.minPrice !== undefined) params.append('min_price', String(currentFilters.minPrice));
      if (currentFilters.maxPrice !== undefined) params.append('max_price', String(currentFilters.maxPrice));
      if (currentFilters.attributeValues) {
        Object.keys(currentFilters.attributeValues).forEach(key => {
          if (key.startsWith('pa_') && currentFilters.attributeValues![key]) {
            const attributeName = key.replace('pa_', '');
            const filterValue = currentFilters.attributeValues![key];
            const values = Array.isArray(filterValue) ? filterValue : [String(filterValue)];
            values.forEach((value: string) => params.append(`attribute_${attributeName}`, value));
          }
        });
      }
      const res = await fetch(`/api/woocommerce?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 10 * 60_000,
    enabled: true,
  });

  useEffect(() => {
    if (attributesQuery.data?.attributes) {
      const attributesMap: { [key: string]: { name: string; slug: string; terms: any[] } } = {};
      Object.entries(attributesQuery.data.attributes).forEach(([attrSlug, attrData]: [string, any]) => {
        const cleanName = (attrData.name || attrSlug)
          .replace(/^pa_/i, '')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
        attributesMap[attrSlug] = { name: cleanName, slug: attrSlug, terms: attrData.terms || [] };
      });
      setAttributes(attributesMap);
    }
  }, [attributesQuery.data]);

  const loadAttributes = async (filtersHash?: string) => {
    try {
      // PRO: Use refreshing for subsequent loads, loading only for initial load
      if (Object.keys(attributes).length > 0) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      console.log('🔄 Loading dynamic attributes with filters:', currentFilters);
      
      // PRO Architecture: Użyj dedykowanego endpoint'u /attributes dla dynamicznych atrybutów
      const params = new URLSearchParams();
      params.append('endpoint', 'attributes');
      
      // Przekaż aktualne filtry do WordPress
      if (currentFilters.categories.length > 0) {
        params.append('category', currentFilters.categories.join(','));
      }
      if (currentFilters.search) {
        params.append('search', currentFilters.search);
      }
      if (currentFilters.minPrice !== undefined) {
        params.append('min_price', currentFilters.minPrice.toString());
      }
      if (currentFilters.maxPrice !== undefined) {
        params.append('max_price', currentFilters.maxPrice.toString());
      }
      
      // PRO: Przekaż wszystkie atrybuty dla tree-like recalculation
      if (currentFilters.attributeValues) {
        Object.keys(currentFilters.attributeValues).forEach(key => {
          if (key.startsWith('pa_') && currentFilters.attributeValues![key]) {
            const attributeName = key.replace('pa_', '');
            const filterValue = currentFilters.attributeValues![key];
            const values = Array.isArray(filterValue) 
              ? filterValue 
              : [String(filterValue)];
            values.forEach((value: string) => {
              params.append(`attribute_${attributeName}`, value);
            });
          }
        });
      }
      
      const apiUrl = `/api/woocommerce?${params.toString()}`;
      console.log('🌐 Fetching dynamic attributes from:', apiUrl);
      const response = await fetch(apiUrl, { cache: 'no-store' }); // Always fetch fresh attributes
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Dynamic attributes from API:', data);
      
      if (data.success && data.attributes) {
        // PRO: Use direct attributes from API response
        const attributesMap: { [key: string]: { name: string; slug: string; terms: any[] } } = {};
        
        // Process attributes from API response
        Object.entries(data.attributes).forEach(([attrSlug, attrData]: [string, any]) => {
          // PRO: Clean attribute name - remove pa_ prefix and format nicely
          const cleanName = (attrData.name || attrSlug)
            .replace(/^pa_/i, '') // Remove pa_ prefix
            .replace(/_/g, ' ') // Replace underscores with spaces
            .replace(/\b\w/g, (l: string) => l.toUpperCase()); // Capitalize first letter of each word
          
          attributesMap[attrSlug] = {
            name: cleanName,
            slug: attrSlug,
            terms: attrData.terms || []
          };
        });
        
        console.log('📦 Dynamic attributes from API:', attributesMap);
        setAttributes(attributesMap);
        
        // PRO: Save to cache for performance
        if (filtersHash) {
          setAttributesCache(prev => new Map(prev).set(filtersHash, attributesMap));
        }
      } else {
        console.log('📦 No attributes found for current filters');
        setAttributes({});
        
        // PRO: Save empty result to cache too
        if (filtersHash) {
          setAttributesCache(prev => new Map(prev).set(filtersHash, {}));
        }
      }
    } catch (error) {
      console.error('❌ Error loading dynamic attributes:', error);
      setAttributes({});
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
  };

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
    <div className="space-y-4 relative">
      {/* PRO: Subtle refreshing indicator */}
      {refreshing && (
        <div className="absolute top-0 right-0 z-10">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
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
