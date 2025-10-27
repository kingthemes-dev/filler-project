'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, User, Heart, ShoppingCart, ChevronRight, Sparkles, Filter } from 'lucide-react';
import woo from '@/services/woocommerce-optimized';
import Link from 'next/link';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import AnimatedDropdown from './animated-dropdown';

interface ShopExplorePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ShopExplorePanel({ open, onClose }: ShopExplorePanelProps) {
  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug: string; count?: number; parent?: number }>>([]);
  const [attributes, setAttributes] = useState<Record<string, Array<{ id: number | string; name: string; slug: string }>>>({});
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const load = async () => {
      try {
        // Sprawdź cache w sessionStorage (5 minut)
        const cacheKey = 'shop-explore-data';
        const cached = sessionStorage.getItem(cacheKey);
        const now = Date.now();
        
        if (cached) {
          const data = JSON.parse(cached);
          if (data.timestamp && (now - data.timestamp) < 300000) { // 5 minut
            setCategories(data.categories || []);
            setAttributes(data.attributes || {});
            setSelectedCat(data.selectedCat || null);
            return;
          }
        }

        // 1) pełne kategorie (z parent) do kolumny 1 i 2
        const catsRes = await fetch('/api/woocommerce?endpoint=products/categories&per_page=100', { cache: 'no-store' });
        const cats = catsRes.ok ? await catsRes.json() : [];
        // 2) szybkie metadane z shop (liczniki/atrybuty)
        const shop = await woo.getShopData(1, 1);
        if (!mounted) return;
        const counters: Record<number, number> = {};
        (shop.categories || []).forEach((c: any) => { counters[c.id] = c.count ?? 0; });
        const normCats = Array.isArray(cats)
          ? cats.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug, parent: c.parent || 0, count: counters[c.id] ?? c.count }))
          : [];
        const selectedCatId = (normCats.find(c => (c.parent || 0) === 0)?.id) || null;
        
        // 3) Pobierz atrybuty z King Shop API (produkcja) lub fallback
        const wordpressUrl = 'https://qvwltjhdjw.cfolks.pl'; // Hardcoded for now
        console.log('🔍 Fetching attributes from:', `${wordpressUrl}/wp-json/king-shop/v1/attributes`);
        const attrsResponse = await fetch(`${wordpressUrl}/wp-json/king-shop/v1/attributes`, { cache: 'no-store' });
        console.log('🔍 Attributes response status:', attrsResponse.status);
        const attrsData = attrsResponse.ok ? await attrsResponse.json() : { attributes: {} };
        console.log('🔍 Attributes data:', attrsData);
        
        const attrs = {
          capacities: attrsData.attributes?.pojemnosc?.terms || [],
          brands: attrsData.attributes?.marka?.terms || []
        };
        
        setCategories(normCats);
        setSelectedCat(selectedCatId);
        setAttributes(attrs);
        
        // Zapisz w cache
        sessionStorage.setItem(cacheKey, JSON.stringify({
          categories: normCats,
          attributes: attrs,
          selectedCat: selectedCatId,
          timestamp: now
        }));
      } catch (e) {
        // optional: log silently in dev
      }
    };
    load();
    return () => { mounted = false; };
  }, [open]);

  const mainCategories = useMemo(() => categories.filter(c => (c.parent || 0) === 0), [categories]);
  const subCategories = useMemo(() => categories.filter(c => (c.parent || 0) === (selectedCat || 0)), [categories, selectedCat]);
  const currentMain = useMemo(() => mainCategories.find(c => c.id === selectedCat) || null, [mainCategories, selectedCat]);
  


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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

  // Convert brands to dropdown options
  const brandOptions = (attributes.brands || []).slice(0, 36).map((brand: any) => ({
    id: brand.id,
    label: brand.name,
    value: brand.slug
  }));

  console.log('🔍 Brands debug:', {
    attributes: attributes,
    brands: attributes.brands,
    brandOptions: brandOptions
  });

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
            className="fixed inset-0 bg-black/5 z-40"
            onClick={onClose}
          />
          {/* Dropdown content */}
          <motion.div
            id="shop-explore-panel"
            role="dialog"
            aria-modal="true"
            className="fixed top-[84px] left-[50%] -translate-x-[50%] w-[95vw] bg-white border-l border-r border-b border-t border-gray-300 z-50 rounded-b-3xl shadow-lg max-h-[calc(100vh-120px)] overflow-y-auto"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
          <div className="max-w-[95vw] mx-auto px-4 sm:px-8 pt-8 pb-8 relative" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
              aria-label="Zamknij"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div ref={panelRef} className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Kategorie główne - Nowoczesny Dropdown */}
              <div className="md:col-span-4 space-y-4">
                <div className="mb-4 pb-2 border-b border-gray-200">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Kategorie</h3>
                </div>
                
                {/* Pokaż główne kategorie bezpośrednio zamiast dropdown */}
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
                
                {brandOptions.length === 0 ? (
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
        </>
      )}
    </AnimatePresence>
  );
}


// usunięto duplikat headera w overlayu – główny header pozostaje widoczny na miejscu

