'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import KingProductCard from '@/components/king-product-card';
import wooCommerceService from '@/services/woocommerce-optimized';
import { WooProduct } from '@/types/woocommerce';

interface StoreApiProduct {
  id: number;
  name: string;
  slug: string;
  prices?: {
    price?: string;
    regular_price?: string;
    sale_price?: string;
  };
  price?: string;
  regular_price?: string;
  sale_price?: string;
  images?: Array<{ src: string; alt?: string }>;
  stock_status?: string;
  attributes?: unknown[];
  categories?: Array<{ id: number; name: string }>;
  average_rating?: number;
  rating_count?: number;
  related_ids?: number[];
  cross_sell_ids?: number[];
  sku?: string | null;
  on_sale?: boolean;
  description?: string | null;
  short_description?: string | null;
  featured?: boolean;
}

const isValidProduct = (product: unknown): product is WooProduct => {
  if (!product || typeof product !== 'object') return false;
  const candidate = product as Record<string, unknown>;
  const idValid = typeof candidate.id === 'number';
  const name = candidate.name;
  const price = candidate.price;
  const nameValid =
    typeof name === 'string' && name.trim() !== '' && name !== 'Produkt';
  const priceValid = typeof price === 'string' && price.trim() !== '';
  return idValid && nameValid && priceValid;
};

const extractWooProducts = (data: unknown): WooProduct[] => {
  const arraysToCheck: unknown[][] = [];

  if (Array.isArray(data)) {
    arraysToCheck.push(data);
  } else if (typeof data === 'object' && data !== null) {
    const productsCollection = (data as { products?: unknown }).products;
    if (Array.isArray(productsCollection)) {
      arraysToCheck.push(productsCollection);
    }
    const dataCollection = (data as { data?: unknown }).data;
    if (Array.isArray(dataCollection)) {
      arraysToCheck.push(dataCollection);
    }
  }

  for (const array of arraysToCheck) {
    const valid = array.filter(isValidProduct);
    if (valid.length > 0) {
      return valid;
    }
  }

  return [];
};

const normalizeStoreImages = (
  images?: Array<{ src: string; alt?: string }>
): WooProduct['images'] => {
  if (!images || images.length === 0) {
    return [];
  }
  return images
    .filter(
      (img): img is { src: string; alt?: string } =>
        typeof img === 'object' && img !== null && typeof img.src === 'string'
    )
    .map((img, index) => ({
      id: index,
      date_created: '',
      date_created_gmt: '',
      date_modified: '',
      date_modified_gmt: '',
      src: img.src,
      name: img.alt ?? 'Produkt',
      alt: img.alt ?? 'Produkt',
    }));
};

const createDefaultWooProduct = (): WooProduct => ({
  id: 0,
  name: '',
  slug: '',
  permalink: '',
  date_created: '',
  date_created_gmt: '',
  date_modified: '',
  date_modified_gmt: '',
  type: 'simple',
  status: 'publish',
  featured: false,
  catalog_visibility: 'visible',
  description: '',
  short_description: '',
  sku: '',
  price: '0',
  regular_price: '0',
  sale_price: '',
  date_on_sale_from: null,
  date_on_sale_from_gmt: null,
  date_on_sale_to: null,
  date_on_sale_to_gmt: null,
  price_html: '',
  on_sale: false,
  purchasable: true,
  total_sales: 0,
  virtual: false,
  downloadable: false,
  downloads: [],
  download_limit: 0,
  download_expiry: 0,
  tax_status: 'taxable',
  tax_class: '',
  manage_stock: false,
  stock_quantity: null,
  stock_status: 'instock',
  backorders: 'no',
  backorders_allowed: false,
  backordered: false,
  sold_individually: false,
  weight: '',
  dimensions: { length: '', width: '', height: '' },
  shipping_required: true,
  shipping_taxable: true,
  shipping_class: '',
  shipping_class_id: 0,
  categories: [],
  tags: [],
  images: [],
  attributes: [],
  default_attributes: [],
  variations: [],
  grouped_products: [],
  menu_order: 0,
  meta_data: [],
  reviews_allowed: true,
  average_rating: '0',
  rating_count: 0,
  related_ids: [],
  upsell_ids: [],
  cross_sell_ids: [],
  parent_id: 0,
  purchase_note: '',
  _links: { self: [], collection: [] },
});

const normalizeStoreProduct = (p: StoreApiProduct): WooProduct => {
  const base = createDefaultWooProduct();
  return {
    ...base,
    id: p.id,
    name: p.name,
    slug: p.slug,
    permalink: `/produkt/${p.slug}`,
    price: p.prices?.price || p.price || '0',
    regular_price: p.prices?.regular_price || p.regular_price || '0',
    sale_price: p.prices?.sale_price || p.sale_price || '',
    images: normalizeStoreImages(p.images),
    stock_status: p.stock_status || 'instock',
    attributes: (p.attributes as WooProduct['attributes']) || [],
    categories: (p.categories as WooProduct['categories']) || [],
    average_rating:
      typeof p.average_rating === 'number'
        ? p.average_rating.toString()
        : p.average_rating || '0',
    rating_count: p.rating_count || 0,
    related_ids: p.related_ids || [],
    cross_sell_ids: p.cross_sell_ids || [],
    sku: p.sku ?? '',
    on_sale: Boolean(p.on_sale),
    description: p.description ?? '',
    short_description: p.short_description ?? '',
    featured: p.featured || false,
  };
};

interface SimilarProductsProps {
  productId: number;
  crossSellIds?: number[];
  relatedIds?: number[];
  categoryId: number;
  limit?: number;
}

export default function SimilarProducts({
  productId,
  crossSellIds = [],
  relatedIds = [],
  categoryId,
  limit = 4,
}: SimilarProductsProps) {
  const [similarProducts, setSimilarProducts] = useState<WooProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      try {
        setLoading(true);
        let products: WooProduct[] = [];

        // PERFORMANCE FIX: Batch fetch multiple products in single API call
        // Remove duplicates by using Set and convert back to array
        const allIds = Array.from(
          new Set([
            ...(crossSellIds || []).slice(0, limit),
            ...(relatedIds || []).slice(0, limit),
          ])
        ).slice(0, limit);

        console.log('🔍 [SimilarProducts] Starting fetch:', {
          productId,
          crossSellIds: crossSellIds?.length || 0,
          relatedIds: relatedIds?.length || 0,
          categoryId,
          allIds: allIds.length,
        });

        if (allIds.length > 0) {
          console.log(
            '🚀 [SimilarProducts] Batch fetching similar products:',
            allIds
          );
          try {
            // Try batch endpoint with include parameter
            const batchResponse = await fetch(
              `/api/woocommerce?endpoint=products&include=${allIds.join(',')}&per_page=${allIds.length}&_fields=id,name,slug,price,regular_price,sale_price,on_sale,featured,images,stock_status,average_rating,rating_count,categories,attributes`,
              {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
              }
            );

            if (batchResponse.ok) {
              const batchData = await batchResponse.json();
              const batchProducts = extractWooProducts(batchData);
              if (batchProducts.length > 0) {
                products = batchProducts;
                console.log(
                  '✅ [SimilarProducts] Batch fetch successful:',
                  products.length,
                  'products'
                );
              } else {
                console.log(
                  '⚠️ [SimilarProducts] Batch fetch returned empty array, trying individual calls'
                );
                throw new Error('Batch fetch returned empty array');
              }
            } else {
              console.log(
                '⚠️ [SimilarProducts] Batch fetch failed with status:',
                batchResponse.status
              );
              throw new Error(`Batch fetch failed: ${batchResponse.status}`);
            }
          } catch (error) {
            console.log(
              '⚠️ [SimilarProducts] Batch fetch failed, trying Store API fallback:',
              error
            );
            // Try Store API batch fetch
            try {
              const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
              if (wpUrl) {
                const storeBatchUrl = `${wpUrl}/wp-json/wc/store/v1/products?include=${allIds.join(',')}`;
                const storeBatchResponse = await fetch(storeBatchUrl, {
                  headers: {
                    Accept: 'application/json',
                    'User-Agent': 'Filler-Store/1.0',
                  },
                  cache: 'no-store',
                  signal: AbortSignal.timeout(5000),
                });

                if (storeBatchResponse.ok) {
                  const storeData: StoreApiProduct[] =
                    await storeBatchResponse.json();
                  if (Array.isArray(storeData) && storeData.length > 0) {
                    // Normalize Store API response to WooProduct format
                    const normalized = storeData.map(normalizeStoreProduct);
                    products = normalized.filter(isValidProduct);
                    console.log(
                      '✅ [SimilarProducts] Store API batch fetch successful:',
                      products.length,
                      'products'
                    );
                  }
                }
              }
            } catch (storeError) {
              console.log(
                '⚠️ [SimilarProducts] Store API batch failed, using individual calls:',
                storeError
              );
            }

            // Final fallback to individual calls
            if (products.length === 0) {
              console.log(
                '🔄 [SimilarProducts] Using individual calls as final fallback'
              );
              const individualProducts = await Promise.allSettled(
                allIds.map(async id => {
                  try {
                    const product = await wooCommerceService.getProduct(id);
                    return product && isValidProduct(product) ? product : null;
                  } catch (error) {
                    console.error(
                      `❌ [SimilarProducts] Error fetching product ${id}:`,
                      error
                    );
                    return null;
                  }
                })
              );
              products = individualProducts
                .filter(
                  (result): result is PromiseFulfilledResult<WooProduct> =>
                    result.status === 'fulfilled' && result.value !== null
                )
                .map(result => result.value);
              console.log(
                '✅ [SimilarProducts] Individual calls completed:',
                products.length,
                'products'
              );
            }
          }
        }

        // Priority 3: Fallback to category products - PRO Architecture
        if (products.length < limit && categoryId) {
          console.log(
            '📂 [SimilarProducts] Fetching category products as fallback, categoryId:',
            categoryId
          );
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
                : categoryData.products || categoryData.data || [];

              if (Array.isArray(productsArray) && productsArray.length > 0) {
                const filtered = productsArray
                  .filter(
                    (product: WooProduct) =>
                      product.id !== productId && isValidProduct(product)
                  )
                  .slice(0, limit - products.length);
                products = [...products, ...filtered];
                console.log(
                  '✅ [SimilarProducts] Category fallback successful:',
                  filtered.length,
                  'products'
                );
              }
            }

            // If WooCommerce API failed (502/503/504), try Store API directly
            if (
              !categoryResponse.ok &&
              (categoryResponse.status === 502 ||
                categoryResponse.status === 503 ||
                categoryResponse.status === 504)
            ) {
              console.log(
                '🔄 [SimilarProducts] WooCommerce API failed, trying Store API for category:',
                categoryId
              );
              try {
                const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
                if (wpUrl) {
                  // Store API doesn't support category filter directly, so we fetch all and filter client-side
                  const storeUrl = `${wpUrl}/wp-json/wc/store/v1/products?per_page=${(limit - products.length + 1) * 2}`;
                  const storeResp = await fetch(storeUrl, {
                    headers: {
                      Accept: 'application/json',
                      'User-Agent': 'Filler-Store/1.0',
                    },
                    cache: 'no-store',
                    signal: AbortSignal.timeout(5000),
                  });

                  if (storeResp.ok) {
                    const storeData: StoreApiProduct[] = await storeResp.json();
                    if (Array.isArray(storeData) && storeData.length > 0) {
                      // Filter by category and normalize
                      const categoryProducts = storeData
                        .filter(
                          p =>
                            p.categories &&
                            Array.isArray(p.categories) &&
                            p.categories.some(cat => cat.id === categoryId) &&
                            p.id !== productId
                        )
                        .slice(0, limit - products.length)
                        .map(normalizeStoreProduct);

                      const validProducts =
                        categoryProducts.filter(isValidProduct);
                      products = [...products, ...validProducts];
                      console.log(
                        '✅ [SimilarProducts] Store API category fallback successful:',
                        validProducts.length,
                        'products'
                      );
                    }
                  }
                }
              } catch (storeError) {
                console.log(
                  '⚠️ [SimilarProducts] Store API category fallback failed:',
                  storeError
                );
              }
            }
          } catch (error) {
            console.error(
              '❌ [SimilarProducts] Category fallback error:',
              error
            );
          }
        }

        // Priority 4: Final fallback to latest store products - PRO Architecture
        if (products.length < limit) {
          console.log(
            '🧯 [SimilarProducts] Fetching latest products as final fallback'
          );
          try {
            // Try direct WooCommerce API for latest products
            const latestResponse = await fetch(
              `/api/woocommerce?endpoint=products&per_page=${limit - products.length + 2}&orderby=date&order=desc&_fields=id,name,slug,price,regular_price,sale_price,on_sale,featured,images,stock_status,average_rating,rating_count,categories,attributes`,
              { headers: { Accept: 'application/json' }, cache: 'no-store' }
            );

            if (latestResponse.ok) {
              const latestData = await latestResponse.json();
              const latestProducts = extractWooProducts(latestData)
                .filter(product => product.id !== productId)
                .slice(0, limit - products.length);

              if (latestProducts.length > 0) {
                products = [...products, ...latestProducts];
                console.log(
                  '✅ [SimilarProducts] Latest fallback successful:',
                  latestProducts.length,
                  'products'
                );
              }
            }

            // If WooCommerce API failed (502/503/504), try Store API directly
            if (
              !latestResponse.ok &&
              (latestResponse.status === 502 ||
                latestResponse.status === 503 ||
                latestResponse.status === 504)
            ) {
              console.log(
                '🔄 [SimilarProducts] WooCommerce API failed, trying Store API for latest products'
              );
              try {
                const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL;
                if (wpUrl) {
                  const storeUrl = `${wpUrl}/wp-json/wc/store/v1/products?per_page=${limit - products.length + 2}`;
                  const storeResp = await fetch(storeUrl, {
                    headers: {
                      Accept: 'application/json',
                      'User-Agent': 'Filler-Store/1.0',
                    },
                    cache: 'no-store',
                    signal: AbortSignal.timeout(5000),
                  });

                  if (storeResp.ok) {
                    const storeData: StoreApiProduct[] = await storeResp.json();
                    if (Array.isArray(storeData) && storeData.length > 0) {
                      // Normalize Store API response to WooProduct format
                      const normalized = storeData
                        .filter(p => p.id !== productId)
                        .slice(0, limit - products.length)
                        .map(normalizeStoreProduct);

                      const validProducts = normalized.filter(isValidProduct);
                      products = [...products, ...validProducts];
                      console.log(
                        '✅ [SimilarProducts] Store API latest fallback successful:',
                        validProducts.length,
                        'products'
                      );
                    }
                  }
                }
              } catch (storeError) {
                console.log(
                  '⚠️ [SimilarProducts] Store API latest fallback failed:',
                  storeError
                );
              }
            }
          } catch (error) {
            console.error('❌ [SimilarProducts] Latest fallback error:', error);
          }
        }

        // Remove duplicates by id and slice to limit
        const uniqueProducts = products.filter(
          (product, index, self) =>
            index === self.findIndex(p => p.id === product.id)
        );
        const finalProducts = uniqueProducts.slice(0, limit);
        console.log(
          '🎯 [SimilarProducts] Final products count:',
          finalProducts.length,
          'out of',
          limit,
          'requested'
        );
        setSimilarProducts(finalProducts);
      } catch (error) {
        console.error(
          '❌ [SimilarProducts] Error fetching similar products:',
          error
        );
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
    setCurrentIndex(prev =>
      prev + 1 <= similarProducts.length - 1 ? prev + 1 : 0
    );
  };

  const prevSlide = () => {
    setCurrentIndex(prev =>
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
                {similarProducts.map(product => (
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
