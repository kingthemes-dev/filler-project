'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShoppingCart, Star, Plus, Minus, Droplets } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import wooCommerceService from '@/services/woocommerce-optimized';
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
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedCapacity, setSelectedCapacity] = useState<string>('');

  const { addItem } = useCartStore();
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  // Helper function to get variation price
  const getVariationPrice = (capacity: string): number => {
    const variation = variations.find(v => {
      const hasCapacityAttr = v.attributes && v.attributes.some((attr: any) => 
        attr.name.toLowerCase().includes('pojemność') && attr.option === capacity
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
    
    const capacityAttr = product.attributes.find((attr: any) => 
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
          // Check if product has variations
          if (product.variations && product.variations.length > 0) {
            console.log('🔄 Fetching variations:', product.variations);
            // Fetch individual variation details using variation IDs
            const variationPromises = product.variations.map((variationId: number) => 
              wooCommerceService.getProductById(variationId)
            );
            const variationResults = await Promise.all(variationPromises);
            setVariations(variationResults.filter(Boolean));
            console.log('✅ Variations fetched:', variationResults);
          } else {
            setVariations([]);
          }
        } catch (error) {
          console.error('Error fetching variations:', error);
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
          const hasCapacityAttr = v.attributes && v.attributes.some((attr: any) => 
            attr.name.toLowerCase().includes('pojemność') && attr.option === selectedCapacity
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
        image: product.images[0]?.src || '',
        quantity,
        attributes: selectedAttributes,
        variant: variations.length > 0 && selectedCapacity ? {
          id: finalId,
          name: 'Pojemność',
          value: selectedCapacity
        } : undefined
      });
      
      // Show success feedback
      setTimeout(() => {
        setIsLoading(false);
        onClose();
      }, 500);
    } catch (error) {
      setIsLoading(false);
      console.error('Error adding to cart:', error);
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                  <div className="grid grid-cols-5 gap-4">
                    {/* Thumbnails */}
                    <div className="col-span-1 space-y-2">
                      {product.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-colors shadow-sm ${
                            selectedImageIndex === index
                              ? 'border-black'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={image.src}
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                    
                    {/* Main Image */}
                    <div className="col-span-4 relative aspect-square rounded-xl overflow-hidden bg-gray-50 shadow-lg">
                      <motion.img
                        key={selectedImageIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        src={product.images[selectedImageIndex]?.src || '/placeholder-product.jpg'}
                        alt={product.images[selectedImageIndex]?.name || product.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Sale Badge */}
                      {isOnSale && (
                        <Badge className="absolute top-4 left-4 bg-red-500 text-white">
                          -{discountPercentage}%
                        </Badge>
                      )}

                      {/* Brand Overlay */}
                      {product.attributes && product.attributes.some((attr: any) => attr.name.toLowerCase().includes('marka')) && (
                        <div className="absolute top-4 right-4">
                          {product.attributes
                            .filter((attr: any) => attr.name.toLowerCase().includes('marka'))
                            .map((attr: any) => 
                              attr.options.map((option: string, index: number) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-800 text-sm font-medium rounded-full border border-gray-200 shadow-sm"
                                >
                                  {option}
                                </span>
                              ))
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="lg:w-1/2 p-6 overflow-y-auto">
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
                      <div className="flex items-center space-x-3">
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
                    </div>

                    {/* Product Attributes */}
                    {product.attributes && product.attributes.length > 0 && (
                      <div className="space-y-4">
                        {product.attributes.map((attr: any, index: number) => {
                          const isCapacity = attr.name.toLowerCase().includes('pojemność');
                          const isBrand = attr.name.toLowerCase().includes('marka');
                          
                          return (
                            <div key={index}>
                              {!isBrand && (
                                <>
                                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                                    {isCapacity && variations.length === 0 && (
                                      <Droplets className="w-6 h-6 text-gray-500" />
                                    )}
                                    <span>{isCapacity && variations.length === 0 ? attr.options[0] : `${attr.name}: ${attr.options[0]}`}</span>
                                  </h3>
                                  {/* Capacity as selectable buttons or other attributes as badges */}
                                  {isCapacity && variations.length > 0 ? (
                                    <div className="flex flex-wrap gap-3">
                                      {getSortedCapacityOptions().map((option: string, optionIndex: number) => {
                                        const variantPrice = getVariationPrice(option);
                                        const isSelected = selectedCapacity === option;
                                        
                                        return (
                                          <button
                                            key={optionIndex}
                                            onClick={() => {
                                              setSelectedCapacity(option);
                                            }}
                                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                              isSelected
                                                ? 'bg-black text-white border-2 border-black'
                                                : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                          >
                                            <div className="text-center">
                                              <div className="font-semibold">{option}</div>
                                              <div className={`text-xs mt-1 ${
                                                isSelected ? 'text-gray-200' : 'text-gray-500'
                                              }`}>
                                                {formatPrice(variantPrice)}
                                              </div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : !isCapacity && (
                                    <div className="flex flex-wrap gap-3">
                                      {attr.options.map((option: string, optionIndex: number) => (
                                        <span
                                          key={optionIndex}
                                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full"
                                        >
                                          {option}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Price - only show if no variations */}
                    {variations.length === 0 && (
                      <div className="flex items-center space-x-3">
                        {isOnSale ? (
                          <>
                            <span className="text-3xl font-bold text-red-600">
                              {product.sale_price} zł
                            </span>
                            <span className="text-xl text-gray-500 line-through">
                              {product.regular_price} zł
                            </span>
                          </>
                        ) : (
                          <span className="text-3xl font-bold text-gray-900">
                            {product.price} zł
                          </span>
                        )}
                      </div>
                    )}



                    {/* Quantity & Actions */}
                    <div className="space-y-4">
                      {/* Quantity Selector */}
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center border border-gray-200 rounded-lg h-[56px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="rounded-l-lg rounded-r-none h-full px-4"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="px-4 py-2 min-w-[60px] text-center h-full flex items-center justify-center">
                            {quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQuantity(quantity + 1)}
                            className="rounded-r-lg rounded-l-none h-full px-4"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-3">
                        <Button
                          onClick={handleAddToCart}
                          disabled={product.stock_status !== 'instock' || isLoading || (variations.length > 0 && !selectedCapacity)}
                          className="flex-1 bg-black hover:bg-gray-800 text-white h-[56px] rounded-lg font-medium"
                        >
                          {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <ShoppingCart className="w-5 h-5 mr-2" />
                              {variations.length > 0 && !selectedCapacity ? 'Wybierz pojemność' : 'Dodaj do koszyka'}
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
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

