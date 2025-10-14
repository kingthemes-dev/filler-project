'use client';

import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const load = async () => {
      try {
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
        setCategories(normCats);
        setSelectedCat((normCats.find(c => (c.parent || 0) === 0)?.id) || null);
        setAttributes({
          capacities: shop.attributes?.capacities || [],
          brands: shop.attributes?.brands || []
        });
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
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            id="shop-explore-panel"
            role="dialog"
            aria-modal="true"
            className="fixed left-0 right-0 top-0 z-50"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Top bar inside overlay replicating header: search + client panel */}
            <TopOverlayBar onClose={onClose} />
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">Sklep · Przeglądaj</div>
                  <button onClick={onClose} aria-label="Zamknij" className="p-2 rounded hover:bg-gray-50">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-5 sm:p-6">
                  {/* Kategorie główne */}
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-3">Kategorie</h3>
                    <div className="max-h-[60vh] overflow-auto pr-2">
                      <ul className="rounded-xl border border-gray-100 divide-y divide-gray-100">
                        {mainCategories.map((c) => (
                          <li key={c.id}>
                            <button
                              onClick={() => setSelectedCat(c.id)}
                              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors ${selectedCat === c.id ? 'bg-gray-50' : ''}`}
                            >
                              <span className="text-gray-900">{c.name}</span>
                              {typeof c.count === 'number' && (
                                <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{c.count}</span>
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
                      <h3 className="text-xs uppercase tracking-wide text-gray-500">Podkategorie · Zastosowanie</h3>
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
                              className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:border-black hover:bg-gray-50"
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
                    <div className="max-h-[60vh] overflow-auto pr-1">
                      <div className="flex flex-wrap gap-2">
                        {((attributes.brands || []).slice(0, 40)).map((t) => (
                          <Link
                            key={String(t.id)}
                            href={`/sklep?brands=${encodeURIComponent(t.slug)}`}
                            className="px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:border-black hover:bg-gray-50"
                            onClick={onClose}
                          >
                            {t.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


function TopOverlayBar({ onClose }: { onClose: () => void }) {
  // Minimal wiring for icons
  let itemCount = 0, openCart = () => {}; 
  let openFavoritesModal = () => {};
  let isAuthenticated = false;
  try {
    const cart = useCartStore();
    itemCount = cart.itemCount;
    openCart = cart.openCart;
  } catch {}
  try {
    const fav = useFavoritesStore();
    openFavoritesModal = fav.openFavoritesModal;
  } catch {}
  try {
    const auth = useAuthStore();
    isAuthenticated = auth.isAuthenticated;
  } catch {}

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="h-16 sm:h-20 flex items-center gap-4">
          {/* Left spacer to align with site logo in real header */}
          <div className="hidden sm:block w-28" />
          {/* Search fills center */}
          <div className="flex-1">
            <SearchBar placeholder="Szukaj produktów..." className="w-full" />
          </div>
          {/* Client panel icons */}
          <div className="flex items-center gap-4 ml-2">
            <button
              className="text-gray-700 hover:text-black transition-colors"
              onClick={() => { openFavoritesModal(); onClose(); }}
              aria-label="Ulubione"
            >
              <Heart className="w-6 h-6" />
            </button>
            <button
              className="text-gray-700 hover:text-black transition-colors relative"
              onClick={() => { openCart(); onClose(); }}
              aria-label="Koszyk"
            >
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              className="text-gray-700 hover:text-black transition-colors"
              onClick={onClose}
              aria-label="Konto"
              title={isAuthenticated ? 'Moje konto' : 'Zaloguj się'}
            >
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


