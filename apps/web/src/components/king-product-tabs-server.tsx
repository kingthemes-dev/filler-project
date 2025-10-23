'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import KingProductCard from './king-product-card';
import { WooProduct } from '@/types/woocommerce';
import Link from 'next/link';
import { Sparkles, Tag, Star, TrendingUp } from 'lucide-react';

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

  // Keyboard navigation for tabs
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      const nextIndex = event.key === 'ArrowLeft' 
        ? (currentIndex - 1 + tabs.length) % tabs.length
        : (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex].id);
    }
  }, [activeTab]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
        return <Sparkles className="w-5 h-5" />;
      case 'promocje':
        return <Tag className="w-5 h-5" />;
      case 'polecane':
        return <Star className="w-5 h-5" />;
      case 'bestsellery':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const tabs: TabData[] = [
    { id: 'nowosci', label: 'Nowości', products: nowosci },
    { id: 'promocje', label: 'Promocje', products: promocje },
    { id: 'polecane', label: 'Polecane', products: polecane },
    { id: 'bestsellery', label: 'Bestsellery', products: bestsellery }
  ];

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
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-[95vw] mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          {/* Senior Level Tabs - Enhanced UI/UX with Accessibility */}
          <div 
            className="flex flex-wrap gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-0 sm:flex-nowrap sm:overflow-x-auto sm:pb-3 scrollbar-hide"
            role="tablist"
            aria-label="Kategorie produktów"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="relative group flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-black/20 focus:ring-offset-2 rounded-lg px-2 py-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isTransitioning}
                aria-pressed={activeTab === tab.id}
                aria-selected={activeTab === tab.id}
                role="tab"
                tabIndex={activeTab === tab.id ? 0 : -1}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                aria-label={`${tab.label} - ${tab.products.length} produktów`}
              >
                <span className={`flex items-center gap-2 text-xl sm:text-2xl lg:text-3xl font-bold transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'text-black' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}>
                  {getTabIcon(tab.id)}
                  {tab.label}
                </span>
                
                {/* Simple clean underline */}
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-black origin-left transition-transform duration-300 ${
                  activeTab === tab.id ? 'scale-x-100' : 'scale-x-0'
                }`} />
              </button>
            ))}
          </div>

          {/* View All Products - Clean Desktop Link */}
          <div className="hidden md:block">
            <Link 
              href="/sklep" 
              className="relative text-base sm:text-lg font-semibold text-gray-700 hover:text-black transition-colors whitespace-nowrap"
            >
              Wszystkie produkty
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black origin-left scale-x-0 hover:scale-x-100 transition-transform duration-300" />
            </Link>
          </div>
        </div>
        
        <div>
          <AnimatePresence mode="wait">
            <div
              key={activeTab}
              role="tabpanel"
              id={`tabpanel-${activeTab}`}
              aria-labelledby={`tab-${activeTab}`}
              aria-live="polite"
            >
              {isTransitioning ? (
                // Loading state during transition
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
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
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
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
            </div>
          </AnimatePresence>
          
          {/* View All Products - Interactive Black Gradient Button */}
          <div className="mt-8 md:hidden">
            <Link
              href="/sklep"
              className="group relative block w-full bg-gradient-to-r from-black to-gray-800 hover:from-gray-800 hover:to-black text-white hover:text-white transition-all duration-300 text-center py-4 px-6 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10">Wszystkie produkty</span>
              {/* Subtle shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
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
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
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
