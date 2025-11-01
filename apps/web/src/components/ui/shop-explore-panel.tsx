'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronRight, Sparkles, Filter } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
// removed unused stores
import { useShopDataStore, useShopCategories, useShopAttributes } from '@/stores/shop-data-store';
// removed unused AnimatedDropdown

interface ShopExplorePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ShopExplorePanel({ open, onClose }: ShopExplorePanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  
  // Użyj prefetched data z store
  const { categories: _categories, mainCategories, getSubCategories, isLoading: categoriesLoading } = useShopCategories();
  const { brands, zastosowanie, isLoading: attributesLoading } = useShopAttributes(); // Użyj wszystkich marek zamiast brandsForModal
  const { initialize, isLoading: storeLoading } = useShopDataStore();

  // Helper function to build URL with existing params + new filter
  // Uses window.location.search to always get current URL params (not stale from hook)
  const buildFilterUrl = (newParams: Record<string, string>) => {
    const params = new URLSearchParams();
    
    // Get current URL params from window (always fresh) or fallback to searchParams hook
    const currentUrlParams = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search) 
      : searchParams;
    
    // Collect all existing values for array-like params
    const existingArrayParams: Record<string, string[]> = {};
    currentUrlParams.forEach((value, key) => {
      if (key === 'category' || key === 'brands' || key.startsWith('pa_')) {
        if (!existingArrayParams[key]) {
          existingArrayParams[key] = [];
        }
        // Handle comma-separated values from existing params
        const values = value.split(',').map(v => v.trim()).filter(Boolean);
        existingArrayParams[key].push(...values);
      } else {
        // Non-array params - preserve only if not being updated
        if (!newParams.hasOwnProperty(key)) {
          params.append(key, value);
        }
      }
    });
    
    // Add/update new params with proper merging
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        // For array-like params (category, brands, pa_*), merge with existing
        if (key === 'category' || key === 'brands' || key.startsWith('pa_')) {
          const existingValues = existingArrayParams[key] || [];
          // Check if value is not already in existing values
          if (!existingValues.includes(value)) {
            const allValues = [...existingValues, value];
            // Set all values as comma-separated string (consistent with shop-client.tsx)
            params.set(key, allValues.join(','));
          } else {
            // Value already exists, keep existing
            params.set(key, existingArrayParams[key].join(','));
          }
        } else {
          params.set(key, value);
        }
      }
    });
    
    // Add remaining array params that weren't updated
    Object.entries(existingArrayParams).forEach(([key, values]) => {
      if (!newParams.hasOwnProperty(key) && values.length > 0) {
        params.set(key, [...new Set(values)].join(',')); // Remove duplicates
      }
    });
    
    return `/sklep?${params.toString()}`;
  };

  // Inicjalizuj store przy otwarciu modala
  useEffect(() => {
    if (open) {
      initialize();
    }
  }, [open, initialize]);

  // Funkcje do zarządzania hover kategoriami z delay
  const handleCategoryHover = (categoryId: string) => {
    // Wyczyść poprzedni timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Natychmiast ustaw nową kategorię jako hovered
    setHoveredCategory(categoryId);
  };

  // removed unused handleCategoryLeave

  const handleCategoryContainerLeave = () => {
    // Dodaj większy delay dla całego kontenera kategorii
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredCategory(null);
    }, 300); // Jeszcze większy delay dla kontenera
  };

  const isCategoryHovered = (categoryId: string) => hoveredCategory === categoryId;

  // Cleanup timeout przy unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: false } }));
      }
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);




  // Convert brands to dropdown options - użyj wszystkich marek zamiast ograniczonej listy
  const brandOptions = brands.map((brand) => ({
    id: brand.id,
    label: brand.name,
    value: brand.slug
  }));

  // Sprawdź czy dane są ładowane
  const isLoading = storeLoading || categoriesLoading || attributesLoading;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay - close on click outside */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onClose();
                window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: false } }));
              }
            }}
          />
          {/* Modal content */}
          <motion.div
            id="shop-explore-panel"
            role="dialog"
            aria-modal="true"
            className="fixed top-[114px] left-0 right-0 flex justify-center p-4 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
                         <motion.div
               className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
               initial={{ scale: 0.95, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               exit={{ scale: 0.95, y: 20 }}
               transition={{ duration: 0.2, ease: 'easeOut' }}
             >
               <div className="flex-shrink-0 px-4 lg:px-6 pt-6 pb-4 border-b border-gray-200">
                 <div className="flex items-center justify-between">
                   <h2 className="text-2xl font-bold text-gray-900">Sklep</h2>
                   <button
                     onClick={() => {
                       onClose();
                       window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: false } }));
                     }}
                     className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                     aria-label="Zamknij"
                   >
                     <X className="w-6 h-6" />
                   </button>
                 </div>
               </div>
                       <div className="flex-1 overflow-y-auto px-4 lg:px-6 pt-6 pb-8 relative" onClick={(e) => e.stopPropagation()}>
              <div ref={panelRef} className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Kategorie główne - Nowoczesny Dropdown */}
              <div className="md:col-span-4 space-y-4">
                <div className="mb-4 pb-2 border-b border-gray-200">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kategorie</h3>
                </div>
                
                {/* Loading state */}
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                    <p className="text-sm">Ładowanie kategorii...</p>
                  </div>
                ) : (
                  /* Kategorie z systemem hover */
                  <div className="space-y-2">
                    {mainCategories.map((category) => {
                      if (category.id === 15) return null; // Wyklucz kategorię o ID 15
                      
                      const subCategories = getSubCategories(category.id);
                      const hasSubcategories = subCategories.length > 0;
                      const isHovered = isCategoryHovered(category.id.toString());
                      
                      return (
                        <motion.div
                          key={category.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border border-gray-100 rounded-lg overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                          onMouseEnter={() => handleCategoryHover(category.id.toString())}
                          onMouseLeave={handleCategoryContainerLeave}
                        >
                          {/* Główna kategoria */}
                          <div 
                            className="bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              
                              if (!hasSubcategories) {
                                // Jeśli nie ma podkategorii, przekieruj z zachowaniem istniejących filtrów
                                const url = buildFilterUrl({ category: category.slug });
                                router.push(url);
                                onClose();
                                window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: false } }));
                              }
                            }}
                          >
                            <div className="flex items-center justify-between w-full p-3">
                              <div className="flex items-center">
                                <span className="text-sm font-semibold text-gray-800">{category.name}</span>
                                {category.count !== undefined && (
                                  <span className="ml-2 text-xs text-gray-500">({category.count})</span>
                                )}
                              </div>
                              {hasSubcategories && (
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                              )}
                            </div>
                          </div>

                          {/* Podkategorie - pokazuj po prawej stronie */}
                          <AnimatePresence>
                            {isHovered && hasSubcategories && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden bg-white"
                              >
                                <div className="border-t border-gray-100">
                                  {subCategories.map((subcategory, index) => (
                                    <motion.div
                                      key={subcategory.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                    >
                                      <Link
                                        href={buildFilterUrl({ category: subcategory.slug })}
                                        className="flex items-center p-3 pl-8 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onClose();
                                          window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: false } }));
                                        }}
                                      >
                                        <span className="text-sm font-medium text-gray-700">{subcategory.name}</span>
                                        {subcategory.count && (
                                          <span className="ml-auto text-xs text-gray-500">({subcategory.count})</span>
                                        )}
                                      </Link>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Zastosowanie - Pokazuje atrybuty pa_zastosowanie dla wybranej kategorii */}
              <div className="md:col-span-4 space-y-4">
                <div className="mb-4 pb-2 border-b border-gray-200">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Zastosowanie</h3>
                </div>
                
                {attributesLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                    <p className="text-sm">Ładowanie zastosowań...</p>
                  </div>
                ) : zastosowanie.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <Filter className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm">Brak zastosowań</p>
                    <p className="text-xs text-gray-400 mt-1">dla wybranej kategorii</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                    <div className="grid grid-cols-1 gap-2">
                      {zastosowanie.map((term, index) => (
                      <motion.div
                        key={term.id || term.slug || index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={buildFilterUrl({ pa_zastosowanie: term.slug || term.name })}
                          className="block px-4 py-3 rounded-xl border border-gray-200 text-sm bg-transparent hover:border-blue-300 hover:bg-blue-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all duration-200 group"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: false } }));
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 group-hover:text-blue-900">
                              {term.name}
                            </span>
                            {term.count && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-800">
                                {term.count}
                              </span>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Marki - Nowoczesny Dropdown */}
              <div className="md:col-span-4 space-y-4">
                <div className="mb-4 pb-2 border-b border-gray-200">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Marka</h3>
                </div>
                
                {isLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                    <p className="text-sm">Ładowanie marek...</p>
                  </div>
                ) : brandOptions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm">Brak marek</p>
                    <p className="text-xs text-gray-400 mt-1">Marki będą dostępne wkrótce</p>
                  </div>
                ) : (
                  <div className="pr-1 pb-2 flex flex-wrap gap-1">
                    {brandOptions.map((brand, index) => (
                      <motion.div
                        key={brand.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.02, duration: 0.2 }}
                      >
                        <Link
                          href={buildFilterUrl({ brands: brand.value })}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-gray-200 bg-transparent px-3 py-1.5 text-[10px] text-gray-900 hover:bg-blue-50/20 hover:border-blue-300 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all duration-200 group min-h-[24px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: false } }));
                          }}
                          title={brand.label}
                        >
                          {brand.label}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


// usunięto duplikat headera w overlayu – główny header pozostaje widoczny na miejscu

