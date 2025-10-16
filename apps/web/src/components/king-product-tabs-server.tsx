'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KingProductCard from './king-product-card';
import { WooProduct } from '@/types/woocommerce';
import Link from 'next/link';

interface TabData {
  id: string;
  label: string;
  products: WooProduct[];
}

interface KingProductTabsServerProps {
  data: {
    nowosci: WooProduct[];
    promocje: WooProduct[];
    polecane: WooProduct[];
    bestsellery: WooProduct[];
  };
}

export default function KingProductTabsServer({ data }: KingProductTabsServerProps) {
  const [activeTab, setActiveTab] = useState('nowosci');

  // Helpers: merge and deduplicate by id
  const mergeUnique = (arrays: WooProduct[][]): WooProduct[] => {
    const map = new Map<number, WooProduct>();
    arrays.flat().forEach((p) => {
      if (p && typeof p.id === 'number' && !map.has(p.id)) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values());
  };

  // Build robust tab datasets with fallbacks and client-side filtering
  const allSources = [data.nowosci || [], data.promocje || [], data.polecane || [], data.bestsellery || []];
  const allProducts = mergeUnique(allSources);

  // Memoize filtered data to prevent unnecessary recalculations
  const nowosci = useMemo(() => 
    data.nowosci && data.nowosci.length > 0 ? data.nowosci : allProducts.slice(0, 8),
    [data.nowosci, allProducts]
  );
  
  const promocje = useMemo(() => {
    const promocjeRaw = data.promocje && data.promocje.length > 0 ? data.promocje : allProducts;
    return mergeUnique([promocjeRaw]).filter(p => Boolean(p.on_sale)).slice(0, 8);
  }, [data.promocje, allProducts]);
  
  const polecane = useMemo(() => {
    const polecaneRaw = data.polecane && data.polecane.length > 0 ? data.polecane : allProducts;
    return mergeUnique([polecaneRaw]).filter(p => Boolean(p.featured)).slice(0, 8);
  }, [data.polecane, allProducts]);
  
  const bestsellery = useMemo(() => {
    const bestselleryRaw = Array.isArray(data.bestsellery) ? data.bestsellery : [];
    // For now, show first 8 products as bestsellers until we have real sales data
    return bestselleryRaw.slice(0, 8);
  }, [data.bestsellery]);

  const tabs: TabData[] = [
    { id: 'nowosci', label: 'Nowości', products: nowosci },
    { id: 'promocje', label: 'Promocje', products: promocje },
    { id: 'polecane', label: 'Polecane', products: polecane },
    { id: 'bestsellery', label: 'Bestsellery', products: bestsellery }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0];

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-[95vw] mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          {/* Mobile: Horizontal scrollable tabs */}
          <div className="flex space-x-4 sm:space-x-6 lg:space-x-8 mb-4 lg:mb-0 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative group flex-shrink-0"
              >
                <span className="text-lg sm:text-xl lg:text-2xl font-bold transition-colors text-black whitespace-nowrap">
                  {tab.label}
                </span>
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-black origin-left transition-transform duration-300 ${
                  activeTab === tab.id ? 'scale-x-100' : 'scale-x-0'
                }`} />
              </button>
            ))}
          </div>

          {/* View All Products - Desktop: link on the right */}
          <div className="hidden md:block">
            <Link 
              href="/sklep" 
              className="relative text-base sm:text-lg text-black hover:text-black transition-colors group whitespace-nowrap"
            >
              Wszystkie produkty
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
            </Link>
          </div>
        </div>
        
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTabData.products.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {activeTabData.products.slice(0, 4).map((product) => (
                    <KingProductCard
                      key={product.id}
                      product={product}
                      variant="default"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {activeTab === 'bestsellery' ? 'Brak danych bestsellerów' : 
                     activeTab === 'promocje' ? 'Brak produktów w promocji' :
                     activeTab === 'polecane' ? 'Brak polecanych produktów' :
                     'Brak nowych produktów'}
                  </h3>
                  <p className="text-gray-500">
                    {activeTab === 'bestsellery' ? 'Sprawdź ponownie później' : 
                     'Wkrótce pojawią się nowe produkty'}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          
          {/* View All Products - Mobile: full width outline button */}
          <div className="mt-6 md:hidden">
            <Link
              href="/sklep"
              className="block w-full bg-transparent border-2 border-gray-300 text-gray-700 hover:border-black hover:text-black transition-all duration-300 text-center py-3 px-4 rounded-xl font-medium"
            >
              Wszystkie produkty
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductTabsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm animate-pulse">
            <div className="px-6 pb-0">
              <div className="aspect-square bg-muted rounded-lg" />
            </div>
            <div className="px-6 pt-3">
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
