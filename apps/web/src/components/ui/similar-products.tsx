'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import KingProductCard from '@/components/king-product-card';
import wooCommerceService from '@/services/woocommerce-optimized';
import { WooProduct } from '@/types/woocommerce';

interface SimilarProductsProps {
  productId: number;
  crossSellIds?: number[];
  relatedIds?: number[];
  categoryId: number;
  limit?: number;
}

export default function SimilarProducts({ productId, crossSellIds = [], relatedIds = [], categoryId, limit = 4 }: SimilarProductsProps) {
  const [similarProducts, setSimilarProducts] = useState<WooProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      try {
        setLoading(true);
        let products: WooProduct[] = [];
        // PRO: Don't require images - products can have placeholder images
        const isValid = (p: any) => (
          p && p.id && p.price && String(p.price).trim() !== '' &&
          p.name && p.name !== 'Produkt' && p.name.trim() !== ''
        );

        // PERFORMANCE FIX: Batch fetch multiple products in single API call
        // Remove duplicates by using Set and convert back to array
        const allIds = Array.from(new Set([
          ...(crossSellIds || []).slice(0, limit),
          ...(relatedIds || []).slice(0, limit)
        ])).slice(0, limit);

        console.log('🔍 [SimilarProducts] Starting fetch:', {
          productId,
          crossSellIds: crossSellIds?.length || 0,
          relatedIds: relatedIds?.length || 0,
          categoryId,
          allIds: allIds.length
        });

        if (allIds.length > 0) {
          console.log('🚀 [SimilarProducts] Batch fetching similar products:', allIds);
          try {
            // Try batch endpoint with include parameter
            const batchResponse = await fetch(`/api/woocommerce?endpoint=products&include=${allIds.join(',')}&per_page=${allIds.length}&_fields=id,name,slug,price,regular_price,sale_price,on_sale,featured,images,stock_status,average_rating,rating_count,categories,attributes`, {
              headers: { Accept: 'application/json' },
              cache: 'no-store'
            });
            
            if (batchResponse.ok) {
              const batchData = await batchResponse.json();
              if (Array.isArray(batchData) && batchData.length > 0) {
                products = batchData.filter(isValid);
                console.log('✅ [SimilarProducts] Batch fetch successful:', products.length, 'products');
              } else {
                console.log('⚠️ [SimilarProducts] Batch fetch returned empty array, trying individual calls');
                throw new Error('Batch fetch returned empty array');
              }
            } else {
              console.log('⚠️ [SimilarProducts] Batch fetch failed with status:', batchResponse.status);
              throw new Error(`Batch fetch failed: ${batchResponse.status}`);
            }
          } catch (error) {
            console.log('⚠️ [SimilarProducts] Batch fetch failed, trying Store API fallback:', error);
            // Try Store API batch fetch
            try {
              const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
              if (wpUrl) {
                const storeBatchUrl = `${wpUrl}/wp-json/wc/store/v1/products?include=${allIds.join(',')}`;
                const storeBatchResponse = await fetch(storeBatchUrl, {
                  headers: { Accept: 'application/json', 'User-Agent': 'Filler-Store/1.0' },
                  cache: 'no-store',
                  signal: AbortSignal.timeout(5000)
                });
                
                if (storeBatchResponse.ok) {
                  const storeData = await storeBatchResponse.json();
                  if (Array.isArray(storeData) && storeData.length > 0) {
                    // Normalize Store API response to WooProduct format
                    const normalized = storeData.map((p: any) => ({
                      id: p.id,
                      name: p.name,
                      slug: p.slug,
                      price: p.prices?.price || p.price || '0',
                      regular_price: p.prices?.regular_price || p.regular_price || '0',
                      sale_price: p.prices?.sale_price || p.sale_price || '',
                      images: p.images || [],
                      stock_status: p.stock_status || 'instock',
                      attributes: p.attributes || [],
                      categories: p.categories || [],
                      average_rating: p.average_rating || 0,
                      rating_count: p.rating_count || 0,
                      related_ids: p.related_ids || [],
                      cross_sell_ids: p.cross_sell_ids || [],
                      sku: p.sku || null,
                      on_sale: Boolean(p.on_sale),
                      description: p.description || null,
                      short_description: p.short_description || null,
                      featured: p.featured || false,
                    }));
                    products = normalized.filter(isValid) as WooProduct[];
                    console.log('✅ [SimilarProducts] Store API batch fetch successful:', products.length, 'products');
                  }
                }
              }
            } catch (storeError) {
              console.log('⚠️ [SimilarProducts] Store API batch failed, using individual calls:', storeError);
            }
            
            // Final fallback to individual calls
            if (products.length === 0) {
              console.log('🔄 [SimilarProducts] Using individual calls as final fallback');
              const individualProducts = await Promise.allSettled(
                allIds.map(async (id) => {
                  try {
                    const product = await wooCommerceService.getProduct(id);
                    return product && isValid(product) ? product : null;
                  } catch (error) {
                    console.error(`❌ [SimilarProducts] Error fetching product ${id}:`, error);
                    return null;
                  }
                })
              );
              products = individualProducts
                .filter((result): result is PromiseFulfilledResult<WooProduct> => 
                  result.status === 'fulfilled' && result.value !== null
                )
                .map(result => result.value);
              console.log('✅ [SimilarProducts] Individual calls completed:', products.length, 'products');
            }
          }
        }

        // Priority 3: Fallback to category products - PRO Architecture
        if (products.length < limit && categoryId) {
          console.log('📂 [SimilarProducts] Fetching category products as fallback, categoryId:', categoryId);
          try {
            // Try direct WooCommerce API for category products
            const categoryResponse = await fetch(
              `/api/woocommerce?endpoint=products&category=${categoryId}&per_page=${limit - products.length + 1}&orderby=date&order=desc&_fields=id,name,slug,price,regular_price,sale_price,on_sale,featured,images,stock_status,average_rating,rating_count,categories,attributes`,
              { headers: { Accept: 'application/json' }, cache: 'no-store' }
            );
            
            if (categoryResponse.ok) {
              const categoryData = await categoryResponse.json();
              // WooCommerce API returns array directly or wrapped in success object
              const productsArray = Array.isArray(categoryData) 
                ? categoryData 
                : (categoryData.products || categoryData.data || []);
              
              if (Array.isArray(productsArray) && productsArray.length > 0) {
                const filtered = productsArray
                  .filter((product: WooProduct) => product.id !== productId && isValid(product))
                  .slice(0, limit - products.length);
                products = [...products, ...filtered];
                console.log('✅ [SimilarProducts] Category fallback successful:', filtered.length, 'products');
              }
            }
            
            // If WooCommerce API failed (502/503/504), try Store API directly
            if (!categoryResponse.ok && (categoryResponse.status === 502 || categoryResponse.status === 503 || categoryResponse.status === 504)) {
              console.log('🔄 [SimilarProducts] WooCommerce API failed, trying Store API for category:', categoryId);
              try {
                const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
                if (wpUrl) {
                  // Store API doesn't support category filter directly, so we fetch all and filter client-side
                  const storeUrl = `${wpUrl}/wp-json/wc/store/v1/products?per_page=${(limit - products.length + 1) * 2}`;
                  const storeResp = await fetch(storeUrl, {
                    headers: { Accept: 'application/json', 'User-Agent': 'Filler-Store/1.0' },
                    cache: 'no-store',
                    signal: AbortSignal.timeout(5000)
                  });
                  
                  if (storeResp.ok) {
                    const storeData = await storeResp.json();
                    if (Array.isArray(storeData) && storeData.length > 0) {
                      // Filter by category and normalize
                      const categoryProducts = storeData
                        .filter((p: any) => 
                          p.categories && 
                          Array.isArray(p.categories) && 
                          p.categories.some((cat: any) => cat.id === categoryId) &&
                          p.id !== productId
                        )
                        .slice(0, limit - products.length)
                        .map((p: any) => ({
                          id: p.id,
                          name: p.name,
                          slug: p.slug,
                          price: p.prices?.price || p.price || '0',
                          regular_price: p.prices?.regular_price || p.regular_price || '0',
                          sale_price: p.prices?.sale_price || p.sale_price || '',
                          images: p.images || [],
                          stock_status: p.stock_status || 'instock',
                          attributes: p.attributes || [],
                          categories: p.categories || [],
                          average_rating: p.average_rating || 0,
                          rating_count: p.rating_count || 0,
                          related_ids: p.related_ids || [],
                          cross_sell_ids: p.cross_sell_ids || [],
                          sku: p.sku || null,
                          on_sale: Boolean(p.on_sale),
                          description: p.description || null,
                          short_description: p.short_description || null,
                          featured: p.featured || false,
                        }));
                      
                      const validProducts = categoryProducts.filter(isValid) as WooProduct[];
                      products = [...products, ...validProducts];
                      console.log('✅ [SimilarProducts] Store API category fallback successful:', validProducts.length, 'products');
                    }
                  }
                }
              } catch (storeError) {
                console.log('⚠️ [SimilarProducts] Store API category fallback failed:', storeError);
              }
            }
          } catch (error) {
            console.error('❌ [SimilarProducts] Category fallback error:', error);
          }
        }

        // Priority 4: Final fallback to latest store products - PRO Architecture
        if (products.length < limit) {
          console.log('🧯 [SimilarProducts] Fetching latest products as final fallback');
          try {
            // Try direct WooCommerce API for latest products
            const latestResponse = await fetch(
              `/api/woocommerce?endpoint=products&per_page=${limit - products.length + 2}&orderby=date&order=desc&_fields=id,name,slug,price,regular_price,sale_price,on_sale,featured,images,stock_status,average_rating,rating_count,categories,attributes`,
              { headers: { Accept: 'application/json' }, cache: 'no-store' }
            );
            
            if (latestResponse.ok) {
              const latestData = await latestResponse.json();
              // WooCommerce API returns array directly or wrapped in success object
              const productsArray = Array.isArray(latestData) 
                ? latestData 
                : (latestData.products || latestData.data || []);
              
              if (Array.isArray(productsArray) && productsArray.length > 0) {
                const filtered = productsArray
                  .filter((p: WooProduct) => p.id !== productId && isValid(p))
                  .slice(0, limit - products.length);
                products = [...products, ...filtered];
                console.log('✅ [SimilarProducts] Latest fallback successful:', filtered.length, 'products');
              }
            }
            
            // If WooCommerce API failed (502/503/504), try Store API directly
            if (!latestResponse.ok && (latestResponse.status === 502 || latestResponse.status === 503 || latestResponse.status === 504)) {
              console.log('🔄 [SimilarProducts] WooCommerce API failed, trying Store API for latest products');
              try {
                const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
                if (wpUrl) {
                  const storeUrl = `${wpUrl}/wp-json/wc/store/v1/products?per_page=${limit - products.length + 2}`;
                  const storeResp = await fetch(storeUrl, {
                    headers: { Accept: 'application/json', 'User-Agent': 'Filler-Store/1.0' },
                    cache: 'no-store',
                    signal: AbortSignal.timeout(5000)
                  });
                  
                  if (storeResp.ok) {
                    const storeData = await storeResp.json();
                    if (Array.isArray(storeData) && storeData.length > 0) {
                      // Normalize Store API response to WooProduct format
                      const normalized = storeData
                        .filter((p: any) => p.id !== productId)
                        .slice(0, limit - products.length)
                        .map((p: any) => ({
                          id: p.id,
                          name: p.name,
                          slug: p.slug,
                          price: p.prices?.price || p.price || '0',
                          regular_price: p.prices?.regular_price || p.regular_price || '0',
                          sale_price: p.prices?.sale_price || p.sale_price || '',
                          images: p.images || [],
                          stock_status: p.stock_status || 'instock',
                          attributes: p.attributes || [],
                          categories: p.categories || [],
                          average_rating: p.average_rating || 0,
                          rating_count: p.rating_count || 0,
                          related_ids: p.related_ids || [],
                          cross_sell_ids: p.cross_sell_ids || [],
                          sku: p.sku || null,
                          on_sale: Boolean(p.on_sale),
                          description: p.description || null,
                          short_description: p.short_description || null,
                          featured: p.featured || false,
                        }));
                      
                      const validProducts = normalized.filter(isValid) as WooProduct[];
                      products = [...products, ...validProducts];
                      console.log('✅ [SimilarProducts] Store API latest fallback successful:', validProducts.length, 'products');
                    }
                  }
                }
              } catch (storeError) {
                console.log('⚠️ [SimilarProducts] Store API latest fallback failed:', storeError);
              }
            }
          } catch (error) {
            console.error('❌ [SimilarProducts] Latest fallback error:', error);
          }
        }

        // Remove duplicates by id and slice to limit
        const uniqueProducts = products.filter((product, index, self) => 
          index === self.findIndex(p => p.id === product.id)
        );
        const finalProducts = uniqueProducts.slice(0, limit);
        console.log('🎯 [SimilarProducts] Final products count:', finalProducts.length, 'out of', limit, 'requested');
        setSimilarProducts(finalProducts);
      } catch (error) {
        console.error('❌ [SimilarProducts] Error fetching similar products:', error);
        setSimilarProducts([]);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchSimilarProducts();
    } else {
      console.log('⚠️ [SimilarProducts] No productId provided, skipping fetch');
      setLoading(false);
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

  // Show loading state instead of returning null
  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
            <p className="text-gray-600">Ładowanie podobnych produktów...</p>
          </div>
        </div>
      </section>
    );
  }

  // Only hide if we've finished loading and have no products
  if (similarProducts.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ [SimilarProducts] No products to display after loading');
    }
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
            Produkty podobne
          </h2>
          <p className="text-gray-600 text-lg">
            Klienci, którzy oglądali ten produkt, oglądali również
          </p>
        </motion.div>

        {/* Products Grid */}
        <div className="relative">
          {/* Desktop Grid */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-4 lg:gap-6">
            {similarProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <KingProductCard 
                  key={`similar-${product.id}`}
                  product={product} 
                  showActions={true}
                  variant="default"
                />
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
                {similarProducts.map((product) => (
                  <div key={product.id} className="w-full flex-shrink-0 px-2">
                    <KingProductCard 
                      key={`similar-mobile-${product.id}`}
                      product={product} 
                      showActions={true}
                      variant="default"
                    />
                  </div>
                ))}
              </motion.div>

              {/* Navigation Arrows */}
              {similarProducts.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 z-10"
                    aria-label="Poprzedni produkt"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={nextSlide}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center bg-white/90 hover:bg-white text-gray-900 rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 z-10"
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
