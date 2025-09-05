'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import KingProductCard from '@/components/king-product-card';
import wooCommerceService from '@/services/woocommerce-optimized';
import { Skeleton } from '@/components/ui/skeleton';

interface SimilarProductsProps {
  productId: number;
  crossSellIds?: number[];
  relatedIds?: number[];
  categoryId: number;
  limit?: number;
}

export default function SimilarProducts({ productId, crossSellIds = [], relatedIds = [], categoryId, limit = 4 }: SimilarProductsProps) {
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      try {
        setLoading(true);
        let products: any[] = [];

        // Priority 1: Cross-sell products (często kupowane razem)
        if (crossSellIds && crossSellIds.length > 0) {
          console.log('🛒 Fetching cross-sell products:', crossSellIds);
          const crossSellProducts = await Promise.all(
            crossSellIds.slice(0, limit).map(async (id) => {
              try {
                const product = await wooCommerceService.getProduct(id);
                return product;
              } catch (error) {
                console.error(`Error fetching cross-sell product ${id}:`, error);
                return null;
              }
            })
          );
          products = crossSellProducts.filter(Boolean);
        }

        // Priority 2: Related products (produkty powiązane)
        if (products.length < limit && relatedIds && relatedIds.length > 0) {
          console.log('🔗 Fetching related products:', relatedIds);
          const relatedProducts = await Promise.all(
            relatedIds.slice(0, limit - products.length).map(async (id) => {
              try {
                const product = await wooCommerceService.getProduct(id);
                return product;
              } catch (error) {
                console.error(`Error fetching related product ${id}:`, error);
                return null;
              }
            })
          );
          products = [...products, ...relatedProducts.filter(Boolean)];
        }

        // Priority 3: Fallback to category products
        if (products.length < limit && categoryId) {
          console.log('📂 Fetching category products as fallback');
          const categoryProducts = await wooCommerceService.getProducts({
            category: categoryId.toString(),
            per_page: limit - products.length + 1,
            orderby: 'date',
            order: 'desc'
          });

          if (categoryProducts && categoryProducts.data) {
            const filtered = categoryProducts.data
              .filter((product: any) => product.id !== productId)
              .slice(0, limit - products.length);
            products = [...products, ...filtered];
          }
        }

        setSimilarProducts(products.slice(0, limit));
      } catch (error) {
        console.error('Error fetching similar products:', error);
        setSimilarProducts([]);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchSimilarProducts();
    }
  }, [productId, crossSellIds, relatedIds, categoryId, limit]);

  const nextSlide = () => {
    setCurrentIndex((prev) => 
      prev + 1 <= similarProducts.length - 1 ? prev + 1 : 0
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => 
      prev - 1 >= 0 ? prev - 1 : similarProducts.length - 1
    );
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (similarProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Produkty często kupowane razem
          </h2>
        </motion.div>

        {/* Products Grid */}
        <div className="relative">
          {/* Desktop Grid */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-6">
            {similarProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <KingProductCard product={product} />
              </motion.div>
            ))}
          </div>

          {/* Mobile/Tablet Carousel */}
          <div className="lg:hidden">
            <div className="relative overflow-hidden">
              <motion.div
                className="flex transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                }}
              >
                {similarProducts.map((product, index) => (
                  <div key={product.id} className="w-full flex-shrink-0 px-2">
                    <KingProductCard product={product} />
                  </div>
                ))}
              </motion.div>

              {/* Navigation Arrows */}
              {similarProducts.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 z-10"
                    aria-label="Poprzedni produkt"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={nextSlide}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 z-10"
                    aria-label="Następny produkt"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Dots Indicator */}
              {similarProducts.length > 1 && (
                <div className="flex justify-center mt-6 space-x-2">
                  {similarProducts.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentIndex
                          ? 'bg-gray-900 w-8'
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Przejdź do slajdu ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
