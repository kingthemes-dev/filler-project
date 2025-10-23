'use client';

import React, { useMemo, useState, useEffect } from 'react';
import PageContainer from '@/components/ui/page-container';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Truck, Shield } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { formatPrice } from '@/utils/format-price';
import wooCommerceService, { wooCommerceOptimized } from '@/services/woocommerce-optimized';
import ReviewsList from '@/components/ui/reviews-list';
import Image from 'next/image';
import ReviewForm from '@/components/ui/review-form';
import Link from 'next/link';
import SimilarProducts from '@/components/ui/similar-products';
import { WooProduct } from '@/types/woocommerce';
import { useQuery } from '@tanstack/react-query';
import Script from 'next/script';

type ProductClientProps = { slug: string };

export default function ProductClient({ slug }: ProductClientProps) {
  const { addItem, openCart } = useCartStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'shipping'>('description');
  const [selectedCapacity, setSelectedCapacity] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Queries
  const productQuery = useQuery<WooProduct | null>({
    queryKey: ['product', slug],
    queryFn: () => wooCommerceOptimized.getProductBySlug(slug),
    staleTime: 60_000,
  });

  const productId = productQuery.data?.id || 0;

  const variationsQuery = useQuery<{ success: boolean; variations?: Array<{ id: number; attributes?: Array<{ slug: string; option: string }>; price: string; regular_price: string; sale_price: string; name: string; menu_order: number }> }>({
    queryKey: ['product', slug, 'variations'],
    queryFn: () => wooCommerceOptimized.getProductVariations(productId),
    enabled: !!productId,
    staleTime: 60_000,
  });

  const reviewsQuery = useQuery<{ success: boolean; reviews?: Array<{ id: number; review: string; rating: number; reviewer: string; date_created: string }> }>({
    queryKey: ['product', slug, 'reviews'],
    queryFn: () => wooCommerceOptimized.getProductReviews(productId),
    enabled: !!productId,
    staleTime: 300_000,
  });

  // JSON-LD structured data
  const jsonLd = useMemo(() => {
    if (!productQuery.data) return null;

    const product = productQuery.data;
    const reviews = reviewsQuery.data?.reviews || [];
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      "description": product.short_description || product.description?.replace(/<[^>]*>/g, ''),
      "image": product.images?.map(img => img.src) || [],
      "brand": {
        "@type": "Brand",
        "name": product.attributes?.find(attr => attr.name === 'pa_marka')?.options?.[0] || "Unknown"
      },
      "offers": {
        "@type": "Offer",
        "price": product.price,
        "priceCurrency": "PLN",
        "availability": product.stock_status === 'instock' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "url": `${process.env.NEXT_PUBLIC_BASE_URL}/produkt/${product.slug}`
      },
      "aggregateRating": reviews.length > 0 ? {
        "@type": "AggregateRating",
        "ratingValue": averageRating.toFixed(1),
        "reviewCount": reviews.length
      } : undefined,
      "review": reviews.map(review => ({
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": review.reviewer
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": review.rating
        },
        "reviewBody": review.review,
        "datePublished": review.date_created
      }))
    };
  }, [productQuery.data, reviewsQuery.data, slug]);

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = useMemo(() => {
    if (!productQuery.data) return null;

    const product = productQuery.data;
    const categories = product.categories || [];
    
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Strona główna",
          "item": process.env.NEXT_PUBLIC_BASE_URL
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Sklep",
          "item": `${process.env.NEXT_PUBLIC_BASE_URL}/sklep`
        },
        ...categories.map((category, index) => ({
          "@type": "ListItem",
          "position": 3 + index,
          "name": typeof category === 'string' ? category : category.name || String(category),
          "item": `${process.env.NEXT_PUBLIC_BASE_URL}/sklep?category=${(typeof category === 'string' ? category : category.name || String(category)).toLowerCase().replace(/\s+/g, '-')}`
        })),
        {
          "@type": "ListItem",
          "position": 3 + categories.length,
          "name": product.name,
          "item": `${process.env.NEXT_PUBLIC_BASE_URL}/produkt/${product.slug}`
        }
      ]
    };
  }, [productQuery.data]);

  // JSON-LD is handled by Next.js Script components in the JSX

  const product = productQuery.data;
  const variations = variationsQuery.data?.variations || [];

  const isLoading = productQuery.isLoading;

  const isOnSale = useMemo(() => {
    if (!product) return false;
    const sale = product.on_sale && parseFloat(product.sale_price) < parseFloat(product.regular_price);
    return Boolean(sale);
  }, [product]);

  const discount = useMemo(() => {
    if (!product) return 0;
    if (!isOnSale) return 0;
    return Math.round(((parseFloat(product.regular_price) - parseFloat(product.sale_price)) / parseFloat(product.regular_price)) * 100);
  }, [product, isOnSale]);

  const getVariationPrice = (capacity: string): number => {
    const variation = variations.find(v => (v.attributes || []).some(a => (a.slug?.includes('pojemnosc') || a.slug?.includes('pojemność')) && a.option === capacity));
    return variation ? parseFloat(variation.price) : parseFloat(product?.price || '0');
  };

  const handleAddToCart = () => {
    if (!product) return;
    let finalPrice = product.price;
    let variationId = product.id;
    let variationName = product.name;

    if (selectedCapacity && variations.length > 0) {
      const variation = variations.find(v => (v.attributes || []).some(a => (a.slug?.includes('pojemnosc') || a.slug?.includes('pojemność')) && a.option === selectedCapacity));
      if (variation) {
        finalPrice = variation.price;
        variationId = variation.id;
        variationName = variation.name;
      }
    }

    const cartItem = {
      id: variationId,
      name: variationName,
      price: parseFloat(finalPrice),
      regular_price: parseFloat(product.regular_price),
      sale_price: product.sale_price ? parseFloat(product.sale_price) : undefined,
      image: product.images?.[0]?.src,
      permalink: `/produkt/${slug}`,
      variant: selectedCapacity ? { id: 0, name: 'Pojemność', value: selectedCapacity } : undefined,
    };

    addItem(cartItem);
    openCart();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white py-8 pb-16" data-testid="product-page">
        <PageContainer>
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Ładowanie produktu...</p>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white py-8 pb-16" data-testid="product-page">
        <PageContainer>
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Produkt nie znaleziony</h1>
              <p className="text-gray-600 mb-4">Szukany produkt nie został znaleziony w naszej hurtowni.</p>
              <Link href="/sklep" className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                Wróć do sklepu
              </Link>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 pb-16" data-testid="product-page">
      <PageContainer>
        <Script id="jsonld-product" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(jsonLd)}
        </Script>
        <Script id="jsonld-breadcrumbs" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify(breadcrumbJsonLd)}
        </Script>

        {/* Breadcrumb */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">Strona główna</Link>
            <span>/</span>
            <Link href="/sklep" className="hover:text-gray-900 transition-colors">Sklep</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{product.name}</span>
          </nav>
        </div>

        <div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Images */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-sm relative">
                {product.images?.[activeImageIndex]?.src ? (
                  <Image src={product.images[activeImageIndex].src} alt={product.name} width={500} height={500} priority sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center"><span className="text-gray-500">Brak obrazka</span></div>
                )}
              </div>

              {/* Thumbnails - only show if more than 1 image, positioned under main image */}
              {(product.images || []).length > 1 && (
                <div className="flex gap-2 justify-center">
                  {(product.images || []).map((image: { src: string }, index: number) => (
                    <button key={index} onClick={() => setActiveImageIndex(index)} className={`w-16 h-16 bg-white rounded-lg overflow-hidden shadow-sm transition-all duration-200 ${activeImageIndex === index ? 'ring-2 ring-black ring-offset-1' : 'hover:shadow-md'}`}>
                      {image?.src ? (
                        <Image src={image.src} alt={`${product.name} ${index + 1}`} width={64} height={64} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center"><span className="text-xs text-gray-500">?</span></div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Info */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-6">
              <div className="space-y-4">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{product.name}</h1>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`w-5 h-5 ${product.average_rating && parseFloat(product.average_rating) > 0 && i < Math.floor(parseFloat(product.average_rating)) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    {product.average_rating && parseFloat(product.average_rating) > 0 ? (
                      <>
                        <span className="text-lg font-semibold text-gray-900">{parseFloat(product.average_rating).toFixed(1)}</span>
                        <span className="text-sm text-gray-600">({product.rating_count} {product.rating_count === 1 ? 'opinia' : 'opinii'})</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Brak opinii</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {isOnSale && (<span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">-{discount}%</span>)}
                  {product.featured && (<span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">Polecany</span>)}
                  {product.stock_status === 'instock' ? (
                    <>
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">W magazynie</span>
                      <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">Wysyłka w 24h</span>
                    </>
                  ) : product.stock_status === 'onbackorder' ? (
                    <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">Na zamówienie</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">Brak w magazynie</span>
                  )}
                </div>

                {product.attributes && product.attributes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {product.attributes.map((attr: { name: string; options: string[] }, attrIndex: number) => (
                      Array.isArray(attr.options) ? attr.options.map((option: string, optionIndex: number) => (
                        <span key={`${attrIndex}-${optionIndex}`} className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full">{option}</span>
                      )) : null
                    ))}
                  </div>
                )}
              </div>

              {variations.length === 0 && (
                <div className="space-y-2">
                  {isOnSale ? (
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl font-bold text-red-600">{formatPrice(parseFloat(product.sale_price))}</span>
                      <span className="text-xl text-gray-500 line-through">{formatPrice(parseFloat(product.regular_price))}</span>
                    </div>
                  ) : (
                    <span className="text-3xl font-bold text-gray-900">{formatPrice(parseFloat(product.price))}</span>
                  )}
                </div>
              )}

              {/* Short Description */}
              {product.short_description && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {product.short_description.replace(/<[^>]*>/g, '')}
                  </p>
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-gray-300 rounded-lg bg-white h-[48px] w-fit">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:bg-gray-100 transition-colors text-gray-700 font-medium h-full flex items-center justify-center">-</button>
                  <span className="px-3 py-2 min-w-[40px] text-center font-medium text-gray-900 border-x border-gray-300 h-full flex items-center justify-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-2 hover:bg-gray-100 transition-colors text-gray-700 font-medium h-full flex items-center justify-center">+</button>
                </div>

                <div className="flex space-x-3 flex-1">
                  <button onClick={handleAddToCart} disabled={product.stock_status === 'outofstock' || product.stock_status === 'onbackorder' || (variations.length > 0 && !selectedCapacity)} className="flex-1 bg-gradient-to-r from-gray-800 to-black text-white h-[48px] px-4 rounded-lg text-sm font-medium hover:bg-gradient-to-l hover:from-gray-700 hover:to-gray-900 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="whitespace-nowrap">
                      {product.stock_status === 'outofstock' ? 'Brak w magazynie' : product.stock_status === 'onbackorder' ? 'Na zamówienie' : (variations.length > 0 && !selectedCapacity) ? 'Wybierz pojemność' : 'Dodaj do koszyka'}
                    </span>
                  </button>

                  <button onClick={() => toggleFavorite(product)} className={`h-[48px] w-[48px] border border-gray-300 transition-colors rounded-lg flex items-center justify-center ${isFavorite(product.id) ? 'text-red-500 border-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <Heart className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-3"><Truck className="w-5 h-5 text-gray-600" /><span className="text-sm text-gray-600">Darmowa dostawa od 200 zł</span></div>
                <div className="flex items-center space-x-3"><Shield className="w-5 h-5 text-gray-600" /><span className="text-sm text-gray-600">Bezpieczne płatności</span></div>
                <div className="flex items-center space-x-3"><Star className="w-5 h-5 text-gray-600" /><span className="text-sm text-gray-600">Najwyższa jakość</span></div>
              </div>
            </motion.div>
          </div>

          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="mt-16">
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4">
                <nav className="flex space-x-2" role="tablist" aria-label="Zakładki produktu">
                  <button onClick={() => setActiveTab('description')} role="tab" aria-selected={activeTab === 'description'} aria-controls="tab-description" id="tab-description-trigger" className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${activeTab === 'description' ? 'bg-gradient-to-r from-gray-800 to-black text-white shadow-sm hover:bg-gradient-to-l hover:from-gray-700 hover:to-gray-900 ' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>Opis produktu</button>
                  <button onClick={() => setActiveTab('reviews')} role="tab" aria-selected={activeTab === 'reviews'} aria-controls="tab-reviews" id="tab-reviews-trigger" className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${activeTab === 'reviews' ? 'bg-gradient-to-r from-gray-800 to-black text-white shadow-sm hover:bg-gradient-to-l hover:from-gray-700 hover:to-gray-900 ' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>Opinie ({product.rating_count || 0})</button>
                  <button onClick={() => setActiveTab('shipping')} role="tab" aria-selected={activeTab === 'shipping'} aria-controls="tab-shipping" id="tab-shipping-trigger" className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${activeTab === 'shipping' ? 'bg-gradient-to-r from-gray-800 to-black text-white shadow-sm hover:bg-gradient-to-l hover:from-gray-700 hover:to-gray-900 ' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>Dostawa i zwroty</button>
                </nav>
              </div>

              <div className="p-8">
                {activeTab === 'description' && (
                  <div role="tabpanel" id="tab-description" aria-labelledby="tab-description-trigger">
                    <div className="text-gray-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: product.description }} />
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-6" role="tabpanel" id="tab-reviews" aria-labelledby="tab-reviews-trigger">
                    {product.average_rating && parseFloat(product.average_rating) > 0 ? (
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-gray-900">{parseFloat(product.average_rating).toFixed(1)}</div>
                          <div className="flex items-center justify-center space-x-1 mt-1">
                            {Array.from({ length: 5 }, (_, i) => (<Star key={i} className={`w-5 h-5 ${i < Math.floor(parseFloat(product.average_rating)) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />))}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{product.rating_count} {product.rating_count === 1 ? 'opinia' : 'opinii'}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Brak opinii</h3>
                        <p className="text-gray-600">Ten produkt nie ma jeszcze żadnych opinii.</p>
                      </div>
                    )}

                    {product.rating_count > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-900">Opinie klientów</h4>
                        <ReviewsList productId={product.id} />
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-6">
                      <ReviewForm productId={product.id} onReviewSubmitted={() => window.location.reload()} />
                    </div>
                  </div>
                )}

                {activeTab === 'shipping' && (
                  <div className="space-y-6" role="tabpanel" id="tab-shipping" aria-labelledby="tab-shipping-trigger">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Dostawa</h3>
                      <div className="space-y-3 text-gray-700">
                        <div className="flex items-start space-x-3"><div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div><p><strong>Darmowa dostawa</strong> od 200 zł na terenie Polski</p></div>
                        <div className="flex items-start space-x-3"><div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div><p><strong>Kurier DPD</strong> - dostawa w 1-2 dni robocze (15 zł)</p></div>
                        <div className="flex items-start space-x-3"><div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div><p><strong>Paczkomat InPost</strong> - dostawa w 1-2 dni robocze (12 zł)</p></div>
                        <div className="flex items-start space-x-3"><div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div><p><strong>Odbiór osobisty</strong> - Gdańsk, ul. Partyzantów 8/101 (bezpłatnie)</p></div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Zwroty</h3>
                      <div className="space-y-3 text-gray-700">
                        <div className="flex items-start space-x-3"><div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div><p>Możliwość zwrotu produktów w ciągu <strong>14 dni</strong> od zakupu</p></div>
                        <div className="flex items-start space-x-3"><div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div><p>Produkty muszą być w <strong>oryginalnym opakowaniu</strong> i nienaruszone</p></div>
                        <div className="flex items-start space-x-3"><div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div><p>Zwrot kosztów wysyłki pokrywa <strong>klient</strong></p></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {product && (
            <SimilarProducts productId={product.id} crossSellIds={product.cross_sell_ids || []} relatedIds={product.related_ids || []} categoryId={product.categories?.[0]?.id || 0} limit={4} />
          )}
        </div>
      </PageContainer>
    </div>
  );
}


