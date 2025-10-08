'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Truck, Shield, Droplets } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { formatPrice } from '@/utils/format-price';
import wooCommerceService from '@/services/woocommerce-optimized';
import ReviewsList from '@/components/ui/reviews-list';
import Image from 'next/image';
import ReviewForm from '@/components/ui/review-form';
import Link from 'next/link';
import SimilarProducts from '@/components/ui/similar-products';
import { WooProduct } from '@/types/woocommerce';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function ProductPage({ params }: ProductPageProps) {
  const [product, setProduct] = useState<WooProduct | null>(null);
  const [variations, setVariations] = useState<WooProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCapacity, setSelectedCapacity] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews' | 'shipping'>('description');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [slug, setSlug] = useState<string>('');
  
  const { addItem, openCart } = useCartStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  // Resolve params Promise
  useEffect(() => {
    params.then((resolvedParams) => {
      setSlug(resolvedParams.slug);
    });
  }, [params]);

  // Helper function to get variation price
  const getVariationPrice = (capacity: string): number => {
    console.log('🔍 Getting variation price for:', capacity);
    console.log('🔍 Available variations:', variations);
    
    const variation = variations.find(v => {
      const hasCapacityAttr = v.attributes && v.attributes.some((attr) => 
        attr.name.toLowerCase().includes('pojemność') && (attr as any).option === capacity
      );
      console.log('🔍 Checking variation:', v.id, 'has capacity attr:', hasCapacityAttr);
      return hasCapacityAttr;
    });
    
    console.log('🔍 Found variation:', variation);
    const price = variation ? parseFloat(variation.price) : parseFloat(product?.price || '0');
    console.log('🔍 Final price:', price);
    return price;
  };

  // Helper function to get sorted capacity options
  const getSortedCapacityOptions = (): string[] => {
    if (!variations.length) return [];
    
    return variations
      .map(v => {
        const capacityAttr = v.attributes?.find((attr) => 
          attr.name.toLowerCase().includes('pojemność')
        );
        return capacityAttr ? { option: (capacityAttr as any).option, menuOrder: v.menu_order } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.menuOrder - b!.menuOrder)
      .map(item => item!.option);
  };

  useEffect(() => {
    if (!slug) return;
    
    const fetchProduct = async () => {
      try {
        setLoading(true);
        console.log('🔍 Fetching product by slug:', slug);
        
        // Fetch product data from standard WooCommerce API
        const productData = await wooCommerceService.getProductBySlug(slug);
        
        if (!productData) {
          console.error('❌ Product not found:', slug);
          setProduct(null);
          return;
        }
        
        console.log('✅ Product found:', productData);
        
        // Fetch variations if they exist
        let variationsData: WooProduct[] = [];
        if (productData.variations && productData.variations.length > 0) {
          console.log('🔄 Fetching variations:', productData.variations);
          const variationPromises = productData.variations.map((variationId: number) => 
            wooCommerceService.getProductById(variationId)
          );
          variationsData = await Promise.all(variationPromises);
          console.log('✅ Variations fetched:', variationsData);
        }
        
        // Transform WooCommerce product data to match our component structure
        const transformedProduct = {
          id: productData.id,
          name: productData.name,
          price: productData.price || '0',
          regular_price: productData.regular_price || '0',
          sale_price: productData.sale_price || '0',
          description: productData.description || 'Brak opisu produktu.',
          short_description: productData.short_description || '',
          images: productData.images?.map((img: { src: string }) => ({ src: img.src })).filter((img: { src: string }) => img.src && img.src.trim() !== '') || [
            { src: '/images/placeholder-product.jpg' }
          ],

          attributes: productData.attributes || [],
          on_sale: productData.on_sale || false,
          featured: productData.featured || false,
          stock_quantity: productData.stock_quantity || 0,
          stock_status: productData.stock_status || 'instock',
          permalink: `/produkt/${slug}`,
          categories: productData.categories || [],
          cross_sell_ids: productData.cross_sell_ids || [],
          related_ids: productData.related_ids || []
        };
        
        setProduct(transformedProduct as unknown as WooProduct);
        setVariations(variationsData);
      } catch (error) {
        console.error('❌ Error fetching product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;

    console.log('🛒 handleAddToCart called with:', {
      selectedCapacity,
      variations: variations.length,
      productPrice: product.price
    });

    // Use real price from variations and get variation ID
    let finalPrice = product.price;
    let variationId = product.id;
    let variationName = product.name;
    
    if (selectedCapacity && variations.length > 0) {
      const variation = variations.find(v => 
        v.attributes && v.attributes.some((attr) => 
          attr.name.toLowerCase().includes('pojemność') && (attr as any).option === selectedCapacity
        )
      );
      
      if (variation) {
        finalPrice = variation.price;
        variationId = variation.id; // Use variation ID instead of main product ID
        variationName = variation.name; // Use variation name
        console.log('✅ Using variation:', variation.id, variation.name, variation.price);
      }
    } else if (selectedCapacity && variations.length === 0) {
      console.log('⚠️ Capacity selected but no variations loaded yet, using base price:', product.price);
    } else {
      console.log('⚠️ No capacity selected, using base price:', product.price);
    }

    const cartItem = {
      id: variationId, // Use variation ID for unique cart items
      name: variationName, // Use variation name
      price: parseFloat(finalPrice),
      regular_price: parseFloat(product.regular_price),
      sale_price: product.sale_price ? parseFloat(product.sale_price) : undefined,
      image: product.images[0]?.src,
      permalink: product.permalink,
      variant: selectedCapacity ? {
        id: 0, // Default ID for capacity variant
        name: 'Pojemność',
        value: selectedCapacity
      } : undefined
    };

    console.log('🛒 Adding to cart:', {
      selectedCapacity,
      basePrice: product.price,
      finalPrice,
      variationId,
      variationName,
      cartItem
    });
    addItem(cartItem);
    
    // Open cart to show added item
    openCart();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie produktu...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Produkt nie został znaleziony</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  const isOnSale = product.on_sale && parseFloat(product.sale_price) < parseFloat(product.regular_price);
  const discount = isOnSale 
    ? Math.round(((parseFloat(product.regular_price) - parseFloat(product.sale_price)) / parseFloat(product.regular_price)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white py-8 pb-16">
      <div className="max-w-[95vw] mx-auto px-6">
        {/* Breadcrumb */}
        <div className="mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link 
              href="/"
              className="hover:text-gray-900 transition-colors"
            >
              Strona główna
            </Link>
            <span>/</span>
            <Link 
              href="/sklep"
              className="hover:text-gray-900 transition-colors"
            >
              Sklep
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{product?.name}</span>
          </nav>
        </div>

        <div className="max-w-[95vw] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex gap-4"
            >
              {/* Thumbnail Images - Left Side */}
              <div className="flex flex-col gap-3">
                {product.images.map((image: { src: string }, index: number) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`w-20 h-20 bg-white rounded-lg overflow-hidden shadow-sm transition-all duration-200 ${
                      activeImageIndex === index
                        ? 'ring-2 ring-black ring-offset-1'
                        : 'hover:shadow-md hover:scale-105'
                    }`}
                  >
                    {image.src ? (
                      <Image
                        src={image.src}
                        alt={`${product.name} ${index + 1}`}
                        width={100}
                        height={100}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-500">?</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Main Image */}
              <div className="flex-1 aspect-square bg-white rounded-lg overflow-hidden shadow-sm relative">
                {product.images[activeImageIndex]?.src ? (
                  <Image
                    src={product.images[activeImageIndex].src}
                    alt={product.name}
                    width={500}
                    height={500}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">Brak obrazka</span>
                  </div>
                )}
                
              </div>
            </motion.div>

            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Product Title & Badges */}
              <div className="space-y-4">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {product.name}
                </h1>
                
                {/* Rating */}
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          product.average_rating && parseFloat(product.average_rating) > 0 && i < Math.floor(parseFloat(product.average_rating))
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    {product.average_rating && parseFloat(product.average_rating) > 0 ? (
                      <>
                        <span className="text-lg font-semibold text-gray-900">
                          {parseFloat(product.average_rating).toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-600">
                          ({product.rating_count} {product.rating_count === 1 ? 'opinia' : 'opinii'})
                        </span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Brak opinii
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Badges */}
                <div className="flex items-center space-x-3">
                  {isOnSale && (
                    <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                      -{discount}%
                    </span>
                  )}
                  {product.featured && (
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                      Polecany
                    </span>
                  )}
                  {product.stock_status === 'instock' ? (
                    <>
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                        W magazynie
                      </span>
                      <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                        Wysyłka w 24h
                      </span>
                    </>
                  ) : product.stock_status === 'onbackorder' ? (
                    <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">
                      Na zamówienie
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
                      Brak w magazynie
                    </span>
                  )}
                </div>
                
                {/* AUTO: Product Attributes - All attributes in gray badges */}
                {product.attributes && product.attributes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {product.attributes.map((attr: { name: string; options: string[] }, attrIndex: number) => {
                      if (!attr.options || !Array.isArray(attr.options)) return null;
                      
                      return attr.options.map((option: string, optionIndex: number) => {
                        if (!option) return null;
                        
                        return (
                          <span
                            key={`${attrIndex}-${optionIndex}`}
                            className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full"
                          >
                            {option}
                          </span>
                        );
                      });
                    })}
                  </div>
                )}
              </div>




              {/* Price - only show if no capacity variants */}
              {variations.length === 0 && (
                <div className="space-y-2">
                  {isOnSale ? (
                    <div className="flex items-center space-x-3">
                      <span className="text-3xl font-bold text-red-600">
                        {formatPrice(parseFloat(product.sale_price))}
                      </span>
                      <span className="text-xl text-gray-500 line-through">
                        {formatPrice(parseFloat(product.regular_price))}
                      </span>
                    </div>
                  ) : (
                    <span className="text-3xl font-bold text-gray-900">
                      {formatPrice(parseFloat(product.price))}
                    </span>
                  )}
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="flex items-center space-x-4">
                {/* Quantity Selector */}
                <div className="flex items-center border border-gray-300 rounded-lg bg-white h-[56px]">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-gray-100 transition-colors text-gray-700 font-medium h-full flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="px-4 py-3 min-w-[60px] text-center font-medium text-gray-900 border-x border-gray-300 h-full flex items-center justify-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-gray-100 transition-colors text-gray-700 font-medium h-full flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 flex-1">
                  <button
                    onClick={handleAddToCart}
                    disabled={
                      product.stock_status === 'outofstock' || 
                      product.stock_status === 'onbackorder' ||
                      (variations.length > 0 && !selectedCapacity)
                    }
                    className="flex-1 bg-black text-white py-4 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>
                      {product.stock_status === 'outofstock' 
                        ? 'Brak w magazynie' 
                        : product.stock_status === 'onbackorder'
                        ? 'Na zamówienie'
                        : (variations.length > 0 && !selectedCapacity)
                        ? 'Wybierz pojemność'
                        : 'Dodaj do koszyka'
                      }
                    </span>
                  </button>
                  
                  <button 
                    onClick={() => toggleFavorite(product)}
                    className={`p-4 border border-gray-300 transition-colors rounded-lg ${
                      isFavorite(product.id) 
                        ? 'text-red-500 border-red-500 hover:bg-red-50' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>



              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <Truck className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600">Darmowa dostawa od 200 zł</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600">Bezpieczne płatności</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Star className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-600">Najwyższa jakość</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Product Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16"
          >
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Tab Navigation */}
              <div className="p-4">
                <nav className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('description')}
                    className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
                      activeTab === 'description'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Opis produktu
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
                      activeTab === 'reviews'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Opinie ({product.rating_count || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('shipping')}
                    className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-lg ${
                      activeTab === 'shipping'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Dostawa i zwroty
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-8">
                {activeTab === 'description' && (
                  <div className="prose prose-gray max-w-none">
                    <div 
                      className="text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: product.description }}
                    />
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-6">
                    {/* Overall Rating */}
                    {product.average_rating && parseFloat(product.average_rating) > 0 ? (
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-gray-900">
                            {parseFloat(product.average_rating).toFixed(1)}
                          </div>
                          <div className="flex items-center justify-center space-x-1 mt-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`w-5 h-5 ${
                                  i < Math.floor(parseFloat(product.average_rating))
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {product.rating_count} {product.rating_count === 1 ? 'opinia' : 'opinii'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Brak opinii</h3>
                        <p className="text-gray-600">Ten produkt nie ma jeszcze żadnych opinii.</p>
                      </div>
                    )}

                    {/* Individual Reviews */}
                    {product.rating_count > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-gray-900">Opinie klientów</h4>
                        <ReviewsList productId={product.id} />
                      </div>
                    )}

                    {/* Review Form */}
                    <div className="border-t border-gray-200 pt-6">
                      <ReviewForm 
                        productId={product.id} 
                        onReviewSubmitted={() => {
                          // Refresh reviews after submission
                          window.location.reload();
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {activeTab === 'shipping' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Dostawa</h3>
                      <div className="space-y-3 text-gray-700">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <p><strong>Darmowa dostawa</strong> od 200 zł na terenie Polski</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <p><strong>Kurier DPD</strong> - dostawa w 1-2 dni robocze (15 zł)</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <p><strong>Paczkomat InPost</strong> - dostawa w 1-2 dni robocze (12 zł)</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <p><strong>Odbiór osobisty</strong> - Gdańsk, ul. Partyzantów 8/101 (bezpłatnie)</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Zwroty</h3>
                      <div className="space-y-3 text-gray-700">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <p>Możliwość zwrotu produktów w ciągu <strong>14 dni</strong> od zakupu</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <p>Produkty muszą być w <strong>oryginalnym opakowaniu</strong> i nienaruszone</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <p>Zwrot kosztów wysyłki pokrywa <strong>klient</strong></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Similar Products Section */}
          {product && (
            <SimilarProducts
              productId={product.id}
              crossSellIds={product.cross_sell_ids || []}
              relatedIds={product.related_ids || []}
              categoryId={product.categories?.[0]?.id || 0}
              limit={4}
            />
          )}
        </div>
      </div>
    </div>
  );
}
