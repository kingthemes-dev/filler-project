'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, User, Heart, ShoppingCart } from 'lucide-react';
import woo from '@/services/woocommerce-optimized';
import Link from 'next/link';
import SearchBar from './search/search-bar';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';

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
        const attrs = {
          capacities: shop.attributes?.capacities || [],
          brands: shop.attributes?.brands || []
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="shop-explore-panel"
          role="dialog"
          aria-modal="false"
          className="absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50 rounded-b-2xl"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          onMouseEnter={() => {}} // Keep dropdown open when hovering over it
          onMouseLeave={() => {
            // Close dropdown when leaving the dropdown area
            onClose();
          }}
        >
            <div className="max-w-[95vw] mx-auto px-4 sm:px-8 py-6">
              <div ref={panelRef} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Kategorie główne */}
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-3">Kategorie</h3>
                    <div className="max-h-[60vh] overflow-auto pr-2">
                      <ul className="rounded-xl divide-y divide-gray-100 border border-gray-100 bg-white/60">
                        {mainCategories.map((c) => (
                          <li key={c.id}>
                            <button
                              onClick={() => setSelectedCat(c.id)}
                              className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 ${selectedCat === c.id ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                            >
                              <span className="text-gray-900 font-medium">{c.name}</span>
                              {typeof c.count === 'number' && (
                                <span className="inline-flex h-6 items-center rounded-full bg-gray-100 px-2 text-xs text-gray-600">{c.count}</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Podkategorie / Zastosowanie */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs uppercase tracking-wide text-gray-500">Zastosowanie</h3>
                      {currentMain && (
                        <Link
                          href={`/sklep?category=${encodeURIComponent(currentMain.slug)}`}
                          onClick={onClose}
                          className="text-xs font-medium text-gray-700 hover:text-black px-2 py-1 rounded-lg hover:bg-gray-100"
                          title={`Zobacz wszystko: ${currentMain.name}`}
                        >
                          Zobacz wszystko
                        </Link>
                      )}
                    </div>
                    <div className="max-h-[60vh] overflow-auto pr-2">
                      {subCategories.length === 0 ? (
                        <div className="text-sm text-gray-500 px-2">Brak podkategorii</div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {subCategories.map((sc) => (
                            <Link
                              key={sc.id}
                              href={`/sklep?category=${encodeURIComponent(sc.slug)}`}
                              className="px-3 py-2 min-h-[42px] rounded-lg border border-gray-200 text-sm bg-white/70 hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 flex items-center justify-between"
                              onClick={onClose}
                            >
                              {sc.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Marki */}
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-3">Marka</h3>
                    <div className="max-h-[60vh] overflow-auto pr-1 pb-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                        {((attributes.brands || []).slice(0, 36)).map((t: any) => (
                          <Link
                            key={String(t.id)}
                            href={`/sklep?brands=${encodeURIComponent(t.slug)}`}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-gray-200 bg-white/80 px-2.5 py-1 text-xs text-gray-900 shadow-sm hover:bg-gray-50 hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 transition-colors"
                            onClick={onClose}
                            title={t.name}
                          >
                            {t.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
              </div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


// usunięto duplikat headera w overlayu – główny header pozostaje widoczny na miejscu

