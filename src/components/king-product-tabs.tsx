'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import KingProductCard from './king-product-card';
import wooCommerceService from '@/services/woocommerce-optimized';
import Link from 'next/link';

interface TabData {
  id: string;
  label: string;
  products: any[];
  loading: boolean;
}

export default function KingProductTabs() {
  const [activeTab, setActiveTab] = useState('nowosci');
  const [tabs, setTabs] = useState<TabData[]>([
    { id: 'nowosci', label: 'Nowości', products: [], loading: false },
    { id: 'promocje', label: 'Promocje', products: [], loading: false },
    { id: 'polecane', label: 'Polecane', products: [], loading: false }
  ]);

  // Fetch products for each tab
  const fetchTabProducts = useCallback(async (tabId: string) => {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;

    // Set loading state
    setTabs(prev => prev.map((tab, index) => 
      index === tabIndex ? { ...tab, loading: true } : tab
    ));

    // Retry logic for frontend
    let lastError: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 Frontend attempt ${attempt} for ${tabId}`);
        
        let products: any[] = [];

        switch (tabId) {
          case 'nowosci':
            // New arrivals - ordered by date, limit 4
            const newProducts = await wooCommerceService.getProducts({
              orderby: 'date',
              order: 'desc',
              per_page: 4
            });
            products = newProducts.data || [];
            break;

          case 'promocje':
            // On sale products - limit 4
            const saleProducts = await wooCommerceService.getProducts({
              on_sale: true,
              per_page: 4
            });
            products = saleProducts.data || [];
            break;

          case 'polecane':
            // Featured products - limit 4
            const featuredProducts = await wooCommerceService.getProducts({
              featured: true,
              per_page: 4
            });
            products = featuredProducts.data || [];
            break;

          default:
            break;
        }

        // Update tab with products
        setTabs(prev => prev.map((tab, index) => 
          index === tabIndex ? { ...tab, products, loading: false } : tab
        ));
        
        console.log(`✅ Frontend success on attempt ${attempt} for ${tabId}`);
        return; // Success, exit retry loop

      } catch (error) {
        lastError = error;
        console.log(`❌ Frontend attempt ${attempt} failed for ${tabId}:`, error);
        
        if (attempt < 3) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    
    // All attempts failed
    console.error(`🚨 All frontend attempts failed for ${tabId}:`, lastError);
    
    // Set loading to false on error
    setTabs(prev => prev.map((tab, index) => 
      index === tabIndex ? { ...tab, loading: false } : tab
    ));
  }, []);

  // Fetch all products on mount for better performance
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        console.log('🔄 Fetching all products in parallel');
        
        // Fetch all product types in parallel
        const [newProducts, saleProducts, featuredProducts] = await Promise.all([
          wooCommerceService.getProducts({
            orderby: 'date',
            order: 'desc',
            per_page: 4
          }),
          wooCommerceService.getProducts({
            on_sale: true,
            per_page: 5
          }),
          wooCommerceService.getProducts({
            featured: true,
            per_page: 4
          })
        ]);

        // Update all tabs with their respective products
        setTabs(prev => prev.map(tab => {
          let products: any[] = [];
          switch (tab.id) {
            case 'nowosci':
              products = newProducts.data || [];
              break;
            case 'promocje':
              products = saleProducts.data || [];
              break;
            case 'polecane':
              products = featuredProducts.data || [];
              break;
          }
          return { ...tab, products, loading: false };
        }));

        console.log('✅ All products fetched successfully');
      } catch (error) {
        console.error('❌ Error fetching products:', error);
        setTabs(prev => prev.map(tab => ({ ...tab, loading: false })));
      }
    };

    fetchAllProducts();
  }, []);

  // Fetch products when tab changes (only if not already loaded)
  useEffect(() => {
    const activeTabData = tabs.find(tab => tab.id === activeTab);
    if (activeTabData && activeTabData.products.length === 0 && !activeTabData.loading) {
      fetchTabProducts(activeTab);
    }
  }, [activeTab, fetchTabProducts, tabs]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <section className="py-16 bg-white mx-6 rounded-3xl">
      <div className="max-w-[95vw] mx-auto px-6">
        {/* Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          {/* Left side - Tabs */}
          <div className="flex space-x-8 mb-4 lg:mb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="relative group"
              >
                <span className={`text-2xl font-bold transition-colors ${
                  activeTab === tab.id ? 'text-black' : 'text-gray-500 hover:text-gray-700'
                }`}>
                  {tab.label}
                </span>
                
                {/* Animated underline */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-black origin-left"
                  initial={false}
                  animate={{
                    scaleX: activeTab === tab.id ? 1 : 0,
                    transition: { duration: 0.3, ease: "easeInOut" }
                  }}
                />
                
                {/* Hover underline */}
                {activeTab !== tab.id && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-300 origin-left"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Right side - View All Products */}
          <Link
            href="/sklep"
            className="relative text-lg text-black hover:text-black transition-colors group self-start lg:self-auto"
          >
            Wszystkie produkty
            {/* Animated underline */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
          </Link>
        </div>

        {/* Products Grid */}
        <div className="min-h-[400px]">
          {activeTabData?.loading ? (
            // Loading state
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-gray-200 aspect-square rounded-3xl mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : activeTabData?.products && activeTabData.products.length > 0 ? (
            // Products grid
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {activeTabData.products.map((product) => (
                <KingProductCard 
                  key={product.id} 
                  product={product} 
                  tabType={activeTab}
                />
              ))}
            </div>
          ) : (
            // Empty state
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                Brak produktów w tej kategorii
              </p>
            </div>
          )}
        </div>


      </div>
    </section>
  );
}
