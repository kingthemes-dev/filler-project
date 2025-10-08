'use client';

import { useState, useEffect } from 'react';
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
    
    // PRO: Only reload if filters actually changed
    if (filtersHash === lastFiltersHash) {
      console.log('🔄 Filters unchanged, skipping reload');
      return;
    }
    
    // PRO: Immediate load for better UX (no debounce for attributes)
    loadAttributes();
    setLastFiltersHash(filtersHash);
  }, [currentFilters, selectedFilters]); // PRO: Also reload when selectedFilters change

  const loadAttributes = async () => {
    try {
      // PRO: Use refreshing for subsequent loads, loading only for initial load
      if (Object.keys(attributes).length > 0) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      console.log('🔄 Loading dynamic attributes with filters:', currentFilters);
      
      // PRO Architecture: Użyj istniejącego endpoint'u /data dla dynamicznych atrybutów
      const params = new URLSearchParams();
      params.append('endpoint', 'shop');
      params.append('per_page', '100'); // Pobierz więcej produktów aby mieć lepsze liczniki
      
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
      
      const response = await fetch(`/api/woocommerce?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 Dynamic attributes from API:', data);
      
      if (data.success && data.products) {
        // Extract attributes from products - PRO Architecture: Dynamic attributes from filtered products
        const attributesMap: { [key: string]: { name: string; slug: string; terms: any[] } } = {};
        
        // Process all products to extract unique attributes and their terms
        data.products.forEach((product: any) => {
          if (product.attributes && Array.isArray(product.attributes)) {
            product.attributes.forEach((attr: any) => {
              const attrSlug = attr.slug?.replace('pa_', '') || attr.name?.toLowerCase().replace(/\s+/g, '-');
              if (attrSlug && attr.options && Array.isArray(attr.options)) {
                if (!attributesMap[attrSlug]) {
                  attributesMap[attrSlug] = {
                    name: attr.name || attrSlug,
                    slug: attrSlug,
                    terms: []
                  };
                }
                
                // Add terms with counts
                attr.options.forEach((option: any) => {
                  const termSlug = option.slug || option.name?.toLowerCase().replace(/\s+/g, '-');
                  if (termSlug) {
                    const existingTerm = attributesMap[attrSlug].terms.find(t => t.slug === termSlug);
                    if (existingTerm) {
                      existingTerm.count++;
                    } else {
                      attributesMap[attrSlug].terms.push({
                        id: option.id || 0,
                        name: option.name || termSlug,
                        slug: termSlug,
                        count: 1
                      });
                    }
                  }
                });
              }
            });
          }
        });
        
        console.log('📦 Dynamic attributes extracted from products:', attributesMap);
        setAttributes(attributesMap);
      } else {
        console.log('📦 No products found for current filters');
        setAttributes({});
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
    const terms = Array.isArray(filterValue) ? filterValue : [];
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
                  {attribute.terms
                    .filter(term => term.count > 0) // Pokaż tylko terminy z produktami
                    .sort((a, b) => b.count - a.count) // Sortuj według liczby produktów
                    .map((term, index) => (
                      <motion.label
                        key={term.id}
                        className="flex items-center p-2 sm:p-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <input
                          type="checkbox"
                          name={attributeSlug}
                          value={term.slug}
                          checked={isTermSelected(attributeSlug, term.slug)}
                          onChange={() => handleAttributeTermClick(attributeSlug, term.slug)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                        />
                        <span className="ml-3 text-xs sm:text-sm font-medium text-gray-700">{term.name}</span>
                        <span className="ml-auto text-xs text-gray-500">({term.count})</span>
                      </motion.label>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
