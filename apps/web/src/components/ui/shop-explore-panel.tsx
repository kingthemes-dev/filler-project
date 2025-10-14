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
  const [headerTop, setHeaderTop] = useState<number>(0);
  const [containerPx, setContainerPx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    // Measure header height and container width to align overlay exactly
    const measure = () => {
      try {
        const headerEl = document.querySelector('header');
        if (headerEl) {
          // Overlay zakrywa header – headerTop = 0, bo rysujemy własny pasek w overlayu
          if (mounted) setHeaderTop(0);
          // Try to match inner container width
          const inner = headerEl.querySelector('div.max-w-\[95vw\]');
          const innerRect = (inner as HTMLElement | null)?.getBoundingClientRect();
          if (innerRect && mounted) setContainerPx(Math.round(innerRect.width));
        }
      } catch {}
    };
    measure();
    window.addEventListener('resize', measure);
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
            className="absolute left-0 right-0 z-50"
            style={{ top: 0 }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mx-auto px-4 sm:px-6" style={containerPx ? { width: containerPx } : { maxWidth: '95vw' }}>
              <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                {/* Pasek headera w tym samym kontenerze (jedne zaokrąglenia) */}
                <div className="px-4 sm:px-6">
                  <OverlayHeader onClose={onClose} />
                </div>
                <div className="border-t border-gray-100" />

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


function OverlayHeader({ onClose }: { onClose: () => void }) {
  let itemCount = 0, openCart = () => {};
  let openFavoritesModal = () => {};
  let isAuthenticated = false;
  try { const cart = useCartStore(); itemCount = cart.itemCount; openCart = cart.openCart; } catch {}
  try { const fav = useFavoritesStore(); openFavoritesModal = fav.openFavoritesModal; } catch {}
  try { const auth = useAuthStore(); isAuthenticated = auth.isAuthenticated; } catch {}

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="h-16 sm:h-20 flex items-center gap-4 px-4 sm:px-6">
        {/* Logo (placeholder F) */}
        <div className="flex items-center flex-none">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-lg flex items-center justify-center mr-2 sm:mr-3">
            <span className="text-white text-lg sm:text-xl font-bold">F</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-black">FILLER</span>
        </div>

        {/* Menu */}
        <nav className="hidden lg:flex items-center gap-6 flex-none">
          <Link href="/" className="text-gray-700 hover:text-black transition-colors font-medium" onClick={onClose}>Strona główna</Link>
          <span className="text-gray-900 font-medium">Sklep</span>
          <a href="/o-nas" className="text-gray-700 hover:text-black transition-colors font-medium" onClick={onClose}>O nas</a>
          <a href="/kontakt" className="text-gray-700 hover:text-black transition-colors font-medium" onClick={onClose}>Kontakt</a>
        </nav>

        {/* Search */}
        <div className="hidden md:flex flex-1 min-w-[160px]">
          <SearchBar placeholder="Szukaj produktów..." className="w-full" />
        </div>

        {/* Icons */}
        <div className="flex items-center gap-4 flex-none ml-2">
          <button className="text-gray-700 hover:text-black" onClick={() => { openFavoritesModal(); onClose(); }} aria-label="Ulubione"><Heart className="w-6 h-6" /></button>
          <button className="text-gray-700 hover:text-black relative" onClick={() => { openCart(); onClose(); }} aria-label="Koszyk">
            <ShoppingCart className="w-6 h-6" />
            {itemCount > 0 && (<span className="absolute -top-2 -right-2 bg-black text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{itemCount}</span>)}
          </button>
          <button className="text-gray-700 hover:text-black" aria-label="Konto" title={isAuthenticated ? 'Moje konto' : 'Zaloguj się'} onClick={onClose}><User className="w-6 h-6" /></button>
          <button onClick={onClose} aria-label="Zamknij" className="p-2 rounded hover:bg-gray-50"><X className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}

