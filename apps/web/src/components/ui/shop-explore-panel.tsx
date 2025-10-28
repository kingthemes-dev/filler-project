'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, User, Heart, ShoppingCart, ChevronRight, Sparkles, Filter } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useShopDataStore, useShopCategories, useShopAttributes } from '@/stores/shop-data-store';
import AnimatedDropdown from './animated-dropdown';

interface ShopExplorePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ShopExplorePanel({ open, onClose }: ShopExplorePanelProps) {
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  
  // Użyj prefetched data z store
  const { categories, mainCategories, getSubCategories, isLoading: categoriesLoading } = useShopCategories();
  const { brandsForModal, isLoading: attributesLoading } = useShopAttributes();
  const { initialize, isLoading: storeLoading } = useShopDataStore();

  // Inicjalizuj store przy otwarciu modala
  useEffect(() => {
    if (open) {
      initialize();
    }
  }, [open, initialize]);

  // Ustaw pierwszą kategorię główną jako domyślną
  useEffect(() => {
    if (mainCategories.length > 0 && !selectedCat) {
      const firstMainCategory = mainCategories.find(cat => cat.id !== 15); // Wyklucz kategorię o ID 15
      if (firstMainCategory) {
        setSelectedCat(firstMainCategory.id);
      }
    }
  }, [mainCategories, selectedCat]);

  // Użyj danych z store zamiast lokalnych useMemo
  const subCategories = useMemo(() => {
    if (!selectedCat) return [];
    return getSubCategories(selectedCat);
  }, [selectedCat, getSubCategories]);
  
  const currentMain = useMemo(() => {
    return mainCategories.find(c => c.id === selectedCat) || null;
  }, [mainCategories, selectedCat]);
  


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



  // Convert subcategories to dropdown options
  const subcategoryOptions = subCategories.map(sub => ({
    id: sub.id,
    label: sub.name,
    value: sub.slug,
    count: sub.count,
    icon: <ChevronRight className="w-4 h-4" />
  }));

  // Convert brands to dropdown options - użyj danych z store
  const brandOptions = brandsForModal.map((brand) => ({
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
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: false } }));
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
                  /* Pokaż główne kategorie bezpośrednio zamiast dropdown */
                  <div className="space-y-2">
                    {mainCategories.map((category) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedCat(category.id);
                        }}
                        className={`${category.id === 15 ? 'hidden' : ''} flex items-center justify-between w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200 group cursor-pointer ${
                          selectedCat === category.id
                            ? 'border-blue-300 bg-blue-50/20 text-blue-900'
                            : 'border-gray-200 bg-transparent hover:border-blue-300 hover:bg-blue-50/20 text-gray-900'
                        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 group-hover:text-blue-900 text-left">
                              {category.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {category.count !== undefined && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 group-hover:bg-blue-200">
                              {category.count}
                            </span>
                          )}
                          {selectedCat === category.id && (
                            <ChevronRight className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      </button>
                    </motion.div>
                  ))}
                  </div>
                )}
              </div>

              {/* Podkategorie / Zastosowanie - Pokazuje podkategorie wybranej kategorii głównej */}
              <div className="md:col-span-4 space-y-4">
                <div className="mb-4 pb-2 border-b border-gray-200">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Zastosowanie</h3>
                </div>
                
                {!selectedCat ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <ChevronRight className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm">Wybierz kategorię główną</p>
                    <p className="text-xs text-gray-400 mt-1">aby zobaczyć podkategorie</p>
                  </div>
                ) : subCategories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <Filter className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm">Brak podkategorii</p>
                    <p className="text-xs text-gray-400 mt-1">dla kategorii "{currentMain?.name}"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {subCategories.map((sc) => (
                      <motion.div
                        key={sc.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Link
                          href={`/sklep?category=${encodeURIComponent(sc.slug)}`}
                          className="block px-4 py-3 rounded-xl border border-gray-200 text-sm bg-transparent hover:border-blue-300 hover:bg-blue-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 transition-all duration-200 group"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: false } }));
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 group-hover:text-blue-900">
                              {sc.name}
                            </span>
                            {sc.count && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-800">
                                {sc.count}
                              </span>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    ))}
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
                          href={`/sklep?brands=${encodeURIComponent(brand.value)}`}
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

