'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import woo from '@/services/woocommerce-optimized';
import Link from 'next/link';

interface ShopExplorePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ShopExplorePanel({ open, onClose }: ShopExplorePanelProps) {
  const [categories, setCategories] = useState<Array<{ id: number | string; name: string; slug: string; count?: number }>>([]);
  const [attributes, setAttributes] = useState<Record<string, Array<{ id: number | string; name: string; slug: string }>>>({});

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    const load = async () => {
      try {
        const shop = await woo.getShopData(1, 1);
        if (!mounted) return;
        setCategories(shop.categories || []);
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
            className="fixed left-0 right-0 top-[64px] sm:top-[80px] z-50"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mx-auto max-w-[95vw] px-4 sm:px-6">
              <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-700">Sklep · Przeglądaj</div>
                  <button onClick={onClose} aria-label="Zamknij" className="p-2 rounded hover:bg-gray-50">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 sm:p-6">
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-3">Kategorie</h3>
                    <ul className="space-y-2">
                      {(categories || []).map((c) => (
                        <li key={String(c.id)}>
                          <Link
                            href={`/sklep?category=${encodeURIComponent(c.slug)}`}
                            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-900"
                            onClick={onClose}
                          >
                            <span>{c.name}</span>
                            {typeof c.count === 'number' && (
                              <span className="text-xs text-gray-500">{c.count}</span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-3">Pojemność</h3>
                    <div className="flex flex-wrap gap-2">
                      {(attributes.capacities || []).map((t) => (
                        <Link
                          key={String(t.id)}
                          href={`/sklep?capacities=${encodeURIComponent(t.slug)}`}
                          className="px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:border-black hover:bg-gray-50"
                          onClick={onClose}
                        >
                          {t.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-3">Marka</h3>
                    <div className="flex flex-wrap gap-2">
                      {(attributes.brands || []).map((t) => (
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


