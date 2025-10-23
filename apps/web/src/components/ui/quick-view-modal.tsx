'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShoppingCart, Star, Plus, Minus, Droplets } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import wooCommerceService from '@/services/woocommerce-optimized';
import Image from 'next/image';
import { formatPrice } from '@/utils/format-price';
import { WooProduct } from '@/types/woocommerce';

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: WooProduct | null;
}

export default function QuickViewModal({ isOpen, onClose, product }: QuickViewModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [variations, setVariations] = useState<Array<{
    id: number;
    attributes?: Array<{ slug: string; option: string }>;
    price: string;
    regular_price: string;
    sale_price: string;
    name: string;
    menu_order: number;
  }>>([]);
  const [selectedCapacity, setSelectedCapacity] = useState<string>('');

  const { addItem, openCart } = useCartStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  // Helper function to get variation price
  const getVariationPrice = (capacity: string): number => {
    const variation = variations.find(v => {
      const hasCapacityAttr = v.attributes && v.attributes.some((attr) => 
        (attr as any).name?.toLowerCase().includes('pojemność') && attr.option === capacity
      );
      return hasCapacityAttr;
    });
    
    const price = variation ? parseFloat(variation.price) : parseFloat(product?.price || '0');
    console.log('🔍 Getting variation price for:', capacity, 'Price:', price);
    return price;
  };

  // Helper function to get sorted capacity options
  const getSortedCapacityOptions = (): string[] => {
    if (!product?.attributes) return [];
    
    const capacityAttr = product.attributes.find((attr: { name: string; options: string[] }) => 
      attr.name.toLowerCase().includes('pojemność')
    );
    
    if (!capacityAttr) return [];
    
    // Sort by menu_order if available, otherwise by natural order
    return capacityAttr.options.sort((a: string, b: string) => {
      const aNum = parseFloat(a.replace(/[^\d.]/g, ''));
      const bNum = parseFloat(b.replace(/[^\d.]/g, ''));
      return aNum - bNum;
    });
  };

  // Fetch variations when product changes
  useEffect(() => {
    if (isOpen && product) {
      const fetchVariations = async () => {
        try {
          // Dla produktów zmiennych zawsze próbujemy pobrać warianty
          if (product.type === 'variable') {
            console.log('🔄 Quick View - Fetching variations for product:', product.id);
            const variationsResponse = await wooCommerceService.getProductVariations(product.id);
            console.log('🔄 Quick View - Variations response:', variationsResponse);
            const fetchedVariations = Array.isArray(variationsResponse) ? variationsResponse : (variationsResponse.variations || []);
            console.log('✅ Quick View - Variations fetched:', fetchedVariations);
            setVariations(fetchedVariations);
          } else {
            setVariations([]);
          }
        } catch (error) {
          console.error('Błąd pobierania wariantów w Quick View:', error);
          setVariations([]);
        }
      };
      
      fetchVariations();
    }
  }, [isOpen, product]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && product) {
      setSelectedImageIndex(0);
      setQuantity(1);
      setSelectedAttributes({});
      setSelectedCapacity('');
    }
  }, [isOpen, product]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!product) return null;

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      // Calculate final price based on selected capacity
      let finalPrice = parseFloat(product.sale_price || product.price);
      let finalName = product.name;
      let finalId = product.id;
      
      if (variations.length > 0 && selectedCapacity) {
        // Find the selected variation
        const selectedVariation = variations.find(v => {
          const hasCapacityAttr = v.attributes && v.attributes.some((attr) => 
            (attr as any).name?.toLowerCase().includes('pojemność') && attr.option === selectedCapacity
          );
          return hasCapacityAttr;
        });
        
        if (selectedVariation) {
          finalId = selectedVariation.id; // Use variation ID for unique cart items
          finalName = selectedVariation.name; // Use variation name
          finalPrice = parseFloat(selectedVariation.price);
          console.log('✅ Using variation:', selectedVariation.id, selectedVariation.name, selectedVariation.price);
        }
      }
      
      await addItem({
        id: finalId,
        name: finalName,
        price: finalPrice,
        image: wooCommerceService.getProductImageUrl(product, 'medium'),
        quantity,
        attributes: selectedAttributes,
        variant: variations.length > 0 && selectedCapacity ? {
          id: finalId,
          name: 'Pojemność',
          value: selectedCapacity
        } : undefined
      });
      
      // Show success feedback and open cart
      setTimeout(() => {
        setIsLoading(false);
        onClose(); // Close Quick View
        openCart(); // Open CartDrawer
      }, 500);
    } catch (error) {
      setIsLoading(false);
      console.error('Błąd dodawania do koszyka:', error);
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(product);
  };

  const isOnSale = product.sale_price && product.sale_price !== product.regular_price;
  const discountPercentage = isOnSale && product.regular_price 
    ? Math.round(((parseFloat(product.regular_price) - parseFloat(product.sale_price)) / parseFloat(product.regular_price)) * 100)
    : 0;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  // Normalize any attribute option (string | {id,name,slug,...}) to string label
  const toOptionLabel = (option: any): string => {
    if (typeof option === 'string') return option;
    if (option && typeof option === 'object') {
      return option.name || option.slug || String(option.id ?? '');
    }
    return String(option ?? '');
  };

  // Safe image helper – uses original resolution, no resizing
  const getSafeImageSrc = (src?: string): string => {
    const placeholder = 'https://qvwltjhdjw.cfolks.pl/wp-content/uploads/woocommerce-placeholder.webp';
    if (!src || typeof src !== 'string') return placeholder;
    let trimmed = src.trim();
    if (!trimmed || trimmed === '/' || trimmed === '#') return placeholder;
    
    // If it's already a placeholder, return it
    if (trimmed.includes('woocommerce-placeholder')) return trimmed;
    
    // Use original URL without any modifications - no resizing
    console.log('🖼️ Quick View - Using original image URL:', trimmed);
    
    // Clean query params that may downscale
    try {
      const url = new URL(trimmed, 'https://dummy-base/');
      // Remove common resize query params
      url.searchParams.delete('resize');
      url.searchParams.delete('fit');
      url.searchParams.delete('quality');
      url.search = url.search.toString();
      trimmed = url.href.replace('https://dummy-base/', '');
    } catch (_) {}
    
    // Some APIs return relative paths – allow absolute http(s) only
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return placeholder;
  };

  const isWooPlaceholder = (src?: string): boolean => {
    if (!src) return true;
    return /woocommerce-placeholder/i.test(src);
  };

  const galleryImages = (() => {
    console.log('🖼️ Quick View - Product images:', product.images);
    console.log('🖼️ Quick View - Product images type:', typeof product.images, Array.isArray(product.images));
    console.log('🖼️ Quick View - Product name:', product.name);
    
    // Handle both string array and object array formats
    let imageArray: any[] = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      // If it's an array of strings
      if (typeof product.images[0] === 'string') {
        imageArray = (product.images as any).map((src: string) => ({ src, name: product.name, alt: product.name }));
      } else {
        // If it's an array of objects
        imageArray = product.images.filter((img) => img && img.src && !isWooPlaceholder(img.src));
      }
    }
    
    console.log('🖼️ Quick View - Processed images:', imageArray);
    if (imageArray.length > 0) return imageArray;
    
    // Try to get image from product.images[0] if available
    if (product.images && product.images.length > 0 && product.images[0].src && !isWooPlaceholder(product.images[0].src)) {
      console.log('🖼️ Quick View - Using product.images[0]:', product.images[0].src);
      return [{ src: product.images[0].src, name: product.name, alt: product.name }];
    }
    
    // fallback – keep one placeholder to avoid empty UI
    console.log('🖼️ Quick View - Using fallback placeholder');
    return [{ src: 'https://qvwltjhdjw.cfolks.pl/wp-content/uploads/woocommerce-placeholder.webp', name: product.name, alt: product.name } as any];
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900">Szybki podgląd</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex flex-col lg:flex-row max-h-[calc(90vh-80px)] overflow-hidden">
                {/* Images Section */}
                <div className="lg:w-1/2 p-6">
                  <div className={`grid gap-4 ${galleryImages.length > 1 ? 'grid-cols-5' : 'grid-cols-1'}`}>
                    {/* Thumbnails - only show if more than 1 image */}
                    {galleryImages.length > 1 && (
                      <div className="col-span-1 space-y-2">
                        {galleryImages.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-colors shadow-sm ${
                              selectedImageIndex === index
                                ? 'border-black'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Image
                              src={getSafeImageSrc(image.src)}
                              alt={image.alt || image.name || product.name || 'Zdjęcie produktu'}
                              width={100}
                              height={100}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Main Image */}
                    <div className={`relative aspect-square rounded-xl overflow-hidden bg-gray-50 shadow-lg ${galleryImages.length > 1 ? 'col-span-4' : 'col-span-1'}`}>
                      <motion.div
                        key={selectedImageIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={getSafeImageSrc(galleryImages[selectedImageIndex]?.src)}
                          alt={galleryImages[selectedImageIndex]?.alt || galleryImages[selectedImageIndex]?.name || product.name || 'Zdjęcie produktu'}
                          fill
                          sizes="(min-width: 1024px) 50vw, 100vw"
                          quality={90}
                          className="object-cover"
                          priority
                          onError={(e) => {
                            console.error('🖼️ Quick View - Image load error:', e);
                            console.error('🖼️ Quick View - Failed src:', getSafeImageSrc(galleryImages[selectedImageIndex]?.src));
                            // Force fallback to placeholder
                            const img = e.target as HTMLImageElement;
                            img.src = 'https://qvwltjhdjw.cfolks.pl/wp-content/uploads/woocommerce-placeholder.webp';
                          }}
                          onLoad={() => {
                            console.log('🖼️ Quick View - Image loaded successfully:', getSafeImageSrc(galleryImages[selectedImageIndex]?.src));
                          }}
                        />
                      </motion.div>
                      
                      {/* Sale Badge */}
                      {isOnSale && (
                        <Badge className="absolute top-4 left-4 bg-red-500 text-white">
                          -{discountPercentage}%
                        </Badge>
                      )}

                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="lg:w-1/2 p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                  <div className="space-y-6">
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
                      <div className="flex items-center space-x-2 flex-wrap">
                        {isOnSale && (
                          <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                            -{discountPercentage}%
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
                        <div className="flex flex-wrap gap-2">
                          {product.attributes.map((attr: any, attrIndex: number) => {
                            if (!attr.options || !Array.isArray(attr.options)) return null;
                            
                            return attr.options.map((option: any, optionIndex: number) => {
                              const value = typeof option === 'string' 
                                ? option 
                                : (option?.name || option?.slug || String(option?.id || ''));
                              if (!value) return null;
                              
                              return (
                                <span
                                  key={`${attrIndex}-${optionIndex}`}
                                  className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded-full"
                                >
                                  {value}
                                </span>
                              );
                            });
                          })}
                        </div>
                      )}
                    </div>

                    {/* Product Attributes & Variants */}
                    <div className="space-y-4">
                      {/* Show variants if product has them */}
                      {product?.type === 'variable' && variations.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            Wybierz wariant
                          </h3>
                          <div className="flex flex-wrap gap-3">
                            {variations.map((variation, index) => {
                              const capacityAttr = variation.attributes?.find((attr: any) => 
                                attr.slug === 'pa_pojemnosc' || attr.name?.toLowerCase().includes('pojemność')
                              );
                              const capacity = capacityAttr?.option || `Wariant ${variation.id}`;
                              const isSelected = selectedCapacity === capacity;
                              
                              return (
                                <button
                                  key={index}
                                  onClick={() => {
                                    setSelectedCapacity(capacity);
                                    console.log('🔍 Selected capacity:', capacity, 'Price:', variation.price);
                                  }}
                                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-black text-white border-2 border-black'
                                      : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="text-center">
                                    <div className="font-semibold">{capacity}</div>
                                    <div className={`text-xs mt-1 ${
                                      isSelected ? 'text-gray-200' : 'text-gray-500'
                                    }`}>
                                      {formatPrice(parseFloat(variation.price))}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Price - only show if no variations */}
                    {variations.length === 0 && (
                      <div className="flex items-center space-x-3">
                        {isOnSale ? (
                          <>
                            <span className="text-3xl font-bold text-red-600">
                              {formatPrice(parseFloat(product.sale_price))}
                            </span>
                            <span className="text-xl text-gray-500 line-through">
                              {formatPrice(parseFloat(product.regular_price))}
                            </span>
                          </>
                        ) : (
                          <span className="text-3xl font-bold text-gray-900">
                            {formatPrice(parseFloat(product.price))}
                          </span>
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

                    {/* Quantity & Actions */}
                    <div className="flex items-center space-x-3">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-gray-200 rounded-lg h-[56px] w-fit">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="rounded-l-lg rounded-r-none h-full px-3"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="px-3 py-2 min-w-[40px] text-center h-full flex items-center justify-center">
                          {quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQuantity(quantity + 1)}
                          className="rounded-r-lg rounded-l-none h-full px-3"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Action Buttons */}
                        <Button
                          onClick={handleAddToCart}
                          disabled={product.stock_status !== 'instock' || isLoading || (variations.length > 0 && !selectedCapacity)}
                          className="flex-1 bg-gradient-to-r from-gray-800 to-black text-white h-[56px] rounded-lg font-medium hover:bg-gradient-to-l hover:from-gray-700 hover:to-gray-900 transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <ShoppingCart className="w-5 h-5 mr-2" />
                              {variations.length > 0 && !selectedCapacity ? 'Wybierz wariant' : 'Dodaj do koszyka'}
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={handleToggleFavorite}
                          className={`h-[56px] px-4 rounded-lg border-2 ${
                            isFavorite(product.id) 
                              ? 'text-red-500 border-red-500 hover:bg-red-50' 
                              : 'text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <Heart 
                            className={`w-5 h-5 ${
                              isFavorite(product.id) ? 'fill-current' : ''
                            }`} 
                          />
                        </Button>
                      </div>
                    </div>
                  </div>
              </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

