'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import KingProductCard from './king-product-card';
import { WooProduct } from '@/types/woocommerce';
// removed unused Link
import { Sparkles, Tag, Star, TrendingUp } from 'lucide-react';
// Removed shadcn/ui tabs import - using custom implementation

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
  const [isTransitioning, setIsTransitioning] = useState(false);

  // keyboard handling will be defined after tabs memo

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

  // Icon mapping for tabs
  const getTabIcon = (tabId: string) => {
    switch (tabId) {
      case 'nowosci':
        return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'promocje':
        return <Tag className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'polecane':
        return <Star className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'bestsellery':
        return <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />;
      default:
        return null;
    }
  };

  const tabs: TabData[] = useMemo(() => ([
    { id: 'nowosci', label: 'Nowości', products: nowosci },
    { id: 'promocje', label: 'Promocje', products: promocje },
    { id: 'polecane', label: 'Polecane', products: polecane },
    { id: 'bestsellery', label: 'Bestsellery', products: bestsellery }
  ]), [nowosci, promocje, polecane, bestsellery]);

  // Keyboard navigation for tabs (after tabs are defined)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      const nextIndex = event.key === 'ArrowLeft'
        ? (currentIndex - 1 + tabs.length) % tabs.length
        : (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex].id);
    }
  }, [activeTab, tabs]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0];

  // Enhanced tab change with transition state
  const handleTabChange = useCallback((tabId: string) => {
    if (tabId === activeTab) return;
    
    setIsTransitioning(true);
    setActiveTab(tabId);
    
    // Reset transition state after animation
    setTimeout(() => setIsTransitioning(false), 300);
  }, [activeTab]);

  return (
    <section className="mt-6 py-12 sm:py-16 bg-white rounded-2xl sm:rounded-3xl overflow-hidden" aria-labelledby="products-heading">
      <div className="px-0 sm:px-6 md:px-8 lg:px-12">
        <h2 id="products-heading" className="sr-only">Produkty</h2>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          {/* Custom Tabs Implementation - No shadcn/ui */}
          <div className="w-full">
            {/* Custom Tabs Container */}
            <div className="grid grid-cols-4 bg-transparent border border-gray-200 p-0 rounded-2xl sm:rounded-3xl h-auto relative overflow-hidden">
              {/* Animated background indicator */}
              <div 
                className="absolute top-0 bottom-0 bg-gradient-to-r from-black to-gray-800 rounded-2xl sm:rounded-3xl transition-all duration-500 ease-out"
                style={{
                  left: `calc(${(tabs.findIndex(tab => tab.id === activeTab) * 100) / tabs.length}% - 2px)`,
                  width: `calc(${100 / tabs.length}% + 5px)`,
                  transform: 'translateX(0)',
                }}
              />
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative z-10 flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs sm:text-base font-bold transition-all duration-300 ease-out border-0 border-transparent rounded-xl group ${
                    activeTab === tab.id ? '' : ''
                  }`}
                  disabled={isTransitioning}
                  aria-label={`Pokaż ${tab.label}`}
                  aria-pressed={activeTab === tab.id}
                  style={{
                    color: activeTab === tab.id ? 'white' : '#374151',
                    backgroundColor: 'transparent'
                  }}
                >
                  <div className={`transition-transform duration-300 ${
                    activeTab === tab.id ? '' : 'group-hover:scale-110'
                  }`}>
                    {getTabIcon(tab.id)}
                  </div>
                  <span className={`text-center leading-tight transition-all duration-300 ${
                    activeTab === tab.id ? '' : 'group-hover:text-black'
                  }`}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

          </div>
        </div>
        
        {/* Custom Tab Content - No shadcn/ui */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            <div
              key={activeTab}
              role="tabpanel"
              aria-live="polite"
            >
              {isTransitioning ? (
                // Loading state during transition
                <div className="grid grid-cols-2 lg:grid-cols-4 mobile-grid">
                  {[...Array(4)].map((_, index) => (
                    <div key={`loading-${index}`} className="animate-pulse">
                      <div className="bg-gray-200 aspect-square rounded-2xl mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeTabData.products.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 mobile-grid">
                  {activeTabData.products.slice(0, 4).map((product, index) => (
                    <KingProductCard
                      key={product.id}
                      product={product}
                      variant="default"
                      priority={index < 4} // 🚀 PRIORITY 1: Priority dla pierwszych 4 produktów (above-the-fold)
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
            </div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// removed unused ProductTabsSkeleton
