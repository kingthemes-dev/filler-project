'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Star, Truck, Shield, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { formatPrice } from '@/utils/format-price';
import wooCommerceService from '@/services/woocommerce-optimized';
import Link from 'next/link';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function ProductPage({ params }: ProductPageProps) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'shipping'>('description');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  const { addItem, openCart } = useCartStore();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const resolvedParams = await params;
        console.log('🔍 Fetching product by slug:', resolvedParams.slug);
        
        // Fetch real product data from WooCommerce
        const productData = await wooCommerceService.getProductBySlug(resolvedParams.slug);
        
        if (!productData) {
          console.error('❌ Product not found:', resolvedParams.slug);
          setProduct(null);
          return;
        }
        
        console.log('✅ Product found:', productData);
        
        // Transform WooCommerce product data to match our component structure
        const transformedProduct = {
          id: productData.id,
          name: productData.name,
          price: productData.price,
          regular_price: productData.regular_price,
          sale_price: productData.sale_price,
          description: productData.description || 'Brak opisu produktu.',
          short_description: productData.short_description || '',
          images: productData.images?.map((img: any) => ({ src: img.src })) || [
            { src: 'https://via.placeholder.com/600x600/1f2937/ffffff?text=No+Image' }
          ],
          variations: productData.variations || [],
          on_sale: productData.on_sale || false,
          featured: productData.featured || false,
          stock_quantity: productData.stock_quantity || 0,
          stock_status: productData.stock_status || 'instock',
          permalink: `/produkt/${resolvedParams.slug}`,
          categories: productData.categories || []
        };
        
        setProduct(transformedProduct);
        
        // Set default variant if variations exist
        if (transformedProduct.variations && transformedProduct.variations.length > 0) {
          setSelectedVariant(transformedProduct.variations[0]);
        }
      } catch (error) {
        console.error('❌ Error fetching product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params]);

  const handleAddToCart = () => {
    if (!product) return;

    const cartItem = {
      id: product.id,
      name: product.name,
      price: selectedVariant?.price || product.price,
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      image: product.images[0]?.src,
      permalink: product.permalink,
      variant: selectedVariant ? {
        id: selectedVariant.id,
        name: selectedVariant.name,
        value: selectedVariant.value
      } : undefined
    };

    console.log('🛒 Adding to cart:', cartItem);
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

  const isOnSale = product.on_sale && product.sale_price < product.regular_price;
  const discount = isOnSale 
    ? Math.round(((product.regular_price - product.sale_price) / product.regular_price) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Strona główna
          </Link>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              {/* Main Image */}
              <div className="aspect-square bg-white rounded-lg overflow-hidden shadow-sm">
                <img
                  src={product.images[activeImageIndex]?.src}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Thumbnail Images */}
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((image: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`aspect-square bg-white rounded-lg overflow-hidden shadow-sm transition-all duration-200 ${
                      activeImageIndex === index
                        ? 'ring-2 ring-black ring-offset-1'
                        : 'hover:shadow-md hover:scale-105'
                    }`}
                  >
                    <img
                      src={image.src}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
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
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
                  {product.name}
                </h1>
                
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
                  {product.stock_quantity > 0 ? (
                    <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                      W magazynie
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
                      Brak w magazynie
                    </span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                {isOnSale ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl font-bold text-red-600">
                      {formatPrice(product.sale_price)}
                    </span>
                    <span className="text-xl text-gray-500 line-through">
                      {formatPrice(product.regular_price)}
                    </span>
                  </div>
                ) : (
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              {/* Variant Selection */}
              {product.variations && product.variations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedVariant?.name || 'Wariant'}: {selectedVariant?.value || 'Standardowy'}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {product.variations.map((variant: any) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`p-3 border-2 rounded-lg text-center transition-colors ${
                          selectedVariant?.id === variant.id
                            ? 'border-black bg-black text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="font-medium">{variant.value || variant.name || 'Standardowy'}</div>
                        <div className="text-sm opacity-75">
                          {formatPrice(variant.price || product.price)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="text-sm font-medium text-gray-700">Ilość:</label>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-2 hover:bg-gray-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 min-w-[60px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-2 hover:bg-gray-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleAddToCart}
                    disabled={product.stock_quantity === 0 || product.stock_status === 'outofstock'}
                    className="flex-1 bg-black text-white py-4 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>Dodaj do koszyka</span>
                  </button>
                  
                  <button className="p-4 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors rounded-lg">
                    <Heart className="w-5 h-5" />
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
              <div className="border-b border-gray-200">
                <nav className="flex">
                  <button
                    onClick={() => setActiveTab('description')}
                    className={`px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === 'description'
                        ? 'text-black border-b-2 border-black bg-gray-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Opis produktu
                  </button>
                  <button
                    onClick={() => setActiveTab('shipping')}
                    className={`px-6 py-4 text-sm font-medium transition-colors ${
                      activeTab === 'shipping'
                        ? 'text-black border-b-2 border-black bg-gray-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
        </div>
      </div>
    </div>
  );
}
