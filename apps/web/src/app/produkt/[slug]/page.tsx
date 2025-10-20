'use client';

import { useEffect, useState } from 'react';
import { ShoppingCart, Heart, Star, Truck, Shield, Droplets } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { formatPrice } from '@/utils/format-price';
import { wooCommerceOptimized } from '@/services/woocommerce-optimized';
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

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        console.log('🔍 Fetching product by slug:', slug);
        
        // Use our working API endpoint
        const productData = await wooCommerceOptimized.getProductBySlug(slug);
        
        if (!productData) {
          console.error('❌ Product not found:', slug);
          setProduct(null);
          return;
        }
        
        console.log('✅ Product found:', productData);
        setProduct(productData);
        
        // Fetch variations if they exist
        if (productData.variations && productData.variations.length > 0) {
          console.log('🔄 Fetching variations:', productData.variations);
          const variationPromises = productData.variations.map((variationId: number) => 
            wooCommerceOptimized.getProductById(variationId)
          );
          const variationsData = await Promise.all(variationPromises);
          console.log('✅ Variations fetched:', variationsData);
          setVariations(variationsData);
        }
        
      } catch (error) {
        console.error('❌ Error fetching product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie produktu...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Produkt nie znaleziony</h1>
          <p className="text-gray-600 mb-4">Szukany produkt nie został znaleziony w naszej hurtowni.</p>
          <Link href="/sklep" className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors">
            Wróć do sklepu
          </Link>
        </div>
      </div>
    );
  }

  // Helper function to get variation price
  const getVariationPrice = (capacity: string): number => {
    const variation = variations.find(v => {
      const hasCapacityAttr = v.attributes && v.attributes.some((attr) => 
        attr.name.toLowerCase().includes('pojemność') && (attr as any).option === capacity
      );
      return hasCapacityAttr;
    });
    
    if (variation) {
      return parseFloat(variation.price || '0');
    }
    
    return parseFloat(product.price || '0');
  };

  const handleAddToCart = () => {
    const selectedVariation = selectedCapacity 
      ? variations.find(v => {
          const hasCapacityAttr = v.attributes && v.attributes.some((attr) => 
            attr.name.toLowerCase().includes('pojemność') && (attr as any).option === selectedCapacity
          );
          return hasCapacityAttr;
        })
      : null;

    const productToAdd = selectedVariation || product;
    
    addItem({
      id: productToAdd.id,
      name: productToAdd.name,
      price: parseFloat(productToAdd.price || '0'),
      quantity,
      image: productToAdd.images?.[0]?.src || '/images/placeholder-product.jpg',
      slug: productToAdd.slug,
      capacity: selectedCapacity || undefined,
    });
    
    openCart();
  };

  const toggleFavoriteHandler = () => {
    toggleFavorite({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price || '0'),
      image: product.images?.[0]?.src || '/images/placeholder-product.jpg',
      slug: product.slug,
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Product Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <Image
                  src={product.images[activeImageIndex]?.src || '/images/placeholder-product.jpg'}
                  alt={product.name}
                  width={600}
                  height={600}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span>Brak zdjęcia</span>
                </div>
              )}
            </div>
            
            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 ${
                      activeImageIndex === index ? 'border-black' : 'border-transparent'
                    }`}
                  >
                    <Image
                      src={image.src}
                      alt={`${product.name} ${index + 1}`}
                      width={150}
                      height={150}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <div className="flex items-center space-x-4">
                <span className="text-2xl font-bold text-gray-900">
                  {formatPrice(getVariationPrice(selectedCapacity))} zł
                </span>
                {product.on_sale && (
                  <span className="text-lg text-gray-500 line-through">
                    {formatPrice(parseFloat(product.regular_price || '0'))} zł
                  </span>
                )}
              </div>
            </div>

            {/* Capacity Selection */}
            {variations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Pojemność</h3>
                <div className="grid grid-cols-2 gap-2">
                  {variations.map((variation) => {
                    const capacity = variation.attributes?.find((attr) => 
                      attr.name.toLowerCase().includes('pojemność')
                    )?.option;
                    
                    if (!capacity) return null;
                    
                    return (
                      <button
                        key={variation.id}
                        onClick={() => setSelectedCapacity(capacity)}
                        className={`p-3 border rounded-lg text-center ${
                          selectedCapacity === capacity 
                            ? 'border-black bg-black text-white' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="font-medium">{capacity}</div>
                        <div className="text-sm">{formatPrice(parseFloat(variation.price || '0'))} zł</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium">Ilość:</label>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 border-x border-gray-300">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Dodaj do koszyka</span>
                </button>
                <button
                  onClick={toggleFavoriteHandler}
                  className={`p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                    isFavorite(product.id) ? 'text-red-500 border-red-500' : 'text-gray-600 border-gray-300'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Product Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="text-center">
                <Truck className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="text-sm text-gray-600">Darmowa dostawa od 200zł</p>
              </div>
              <div className="text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="text-sm text-gray-600">Gwarancja jakości</p>
              </div>
              <div className="text-center">
                <Droplets className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <p className="text-sm text-gray-600">Oryginalne produkty</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Tabs */}
        <div className="mt-12">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'description', label: 'Opis' },
                { id: 'reviews', label: 'Opinie' },
                { id: 'shipping', label: 'Dostawa' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="py-8">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                {product.description ? (
                  <div dangerouslySetInnerHTML={{ __html: product.description }} />
                ) : (
                  <p className="text-gray-600">Brak opisu produktu.</p>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <ReviewsList productId={product.id} />
                <ReviewForm productId={product.id} />
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informacje o dostawie</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Darmowa dostawa od 200zł</li>
                  <li>• Dostawa kurierem 24h</li>
                  <li>• Możliwość odbioru osobistego</li>
                  <li>• Ubezpieczenie przesyłki</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Similar Products */}
        <SimilarProducts productId={product.id} />
      </div>
    </div>
  );
}