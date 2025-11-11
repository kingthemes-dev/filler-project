'use client';

import { useState, useEffect, useRef } from 'react';
import { WooProduct } from '@/types/woocommerce';
import wooCommerceService from '@/services/woocommerce-optimized';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Eye, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartActions } from '@/stores/cart-store';
import type { CartItem } from '@/stores/cart-store';
import { useFavoritesActions, useFavoritesItems } from '@/stores/favorites-store';
import { useQuickViewActions, useQuickViewIsOpen, useQuickViewProduct } from '@/stores/quickview-store';
// Wishlist tymczasowo wyłączony na kartach
// import { useWishlist } from '@/hooks/use-wishlist';
import dynamic from 'next/dynamic';
const QuickViewModal = dynamic(() => import('@/components/ui/quick-view-modal'), { ssr: false });
import { formatPrice } from '@/utils/format-price';

interface KingProductCardProps {
  product: WooProduct;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'featured' | 'list';
  tabType?: string;
  priority?: boolean;
}

interface VariationAttribute {
  slug?: string;
  option: string;
}

interface ProductVariation {
  id: number;
  attributes?: VariationAttribute[];
  price: string;
  regular_price: string;
  sale_price: string;
  name: string;
  menu_order: number;
}

const variationAttributesToRecord = (attributes?: VariationAttribute[]): Record<string, string> => {
  if (!attributes) return {};
  return attributes.reduce<Record<string, string>>((acc, attr) => {
    if (attr.slug && attr.option) {
      acc[attr.slug] = attr.option;
    }
    return acc;
  }, {});
};

export default function KingProductCard({ 
  product, 
  showActions = true, 
  variant = 'default',
  tabType,
  priority = false
}: KingProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isQuickViewOpen = useQuickViewIsOpen();
  const quickViewProduct = useQuickViewProduct();
  const { openQuickView, closeQuickView } = useQuickViewActions();
  // removed unused showVariants state
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [variationsLoaded, setVariationsLoaded] = useState(false);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  // removed unused isButtonHovered state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Use selectors for optimized subscriptions
  const { addItem, openCart } = useCartActions();
  const { toggleFavorite } = useFavoritesActions();
  const favorites = useFavoritesItems();
  const isFavorite = (productId: number) => favorites.some(fav => fav.id === productId);
  
  // Handle hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Debug variations state changes (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // variations state changed debug removed
    }
  }, [variations]);

  // Wishlist via safe hook (SSR-guarded)
  // Wishlist UI wyłączony na kartach – zostaje tylko Ulubione

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      let cartItem: Omit<CartItem, 'quantity'> | null = null;
      
      if (product.type === 'variable' && selectedVariant) {
        const variationsResponse = await wooCommerceService.getProductVariations(product.id);
        const selectedVariation = variationsResponse.variations?.find((variation) => 
          variation.attributes?.some((attr) => 
            attr.slug === 'pa_pojemnosc' && attr.option === selectedVariant
          )
        );
        
        if (selectedVariation) {
          const variationAttributes = variationAttributesToRecord(selectedVariation.attributes);
          cartItem = {
            id: selectedVariation.id,
            name: `${product.name} - ${selectedVariant}`,
            price: parseFloat(selectedVariation.price),
            regular_price: parseFloat(selectedVariation.regular_price),
            sale_price: parseFloat(selectedVariation.sale_price),
            image: imageUrl,
            permalink: `/produkt/${product.slug}`,
            attributes: variationAttributes,
            variant: {
              id: selectedVariation.id,
              name: 'Pojemność',
              value: selectedVariant,
            },
          };
        } else {
          cartItem = {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            regular_price: parseFloat(product.regular_price),
            sale_price: parseFloat(product.sale_price),
            image: imageUrl,
            permalink: `/produkt/${product.slug}`,
            attributes: {},
          };
        }
      } else {
        cartItem = {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          regular_price: parseFloat(product.regular_price),
          sale_price: parseFloat(product.sale_price),
          image: imageUrl,
          permalink: `/produkt/${product.slug}`,
          attributes: {},
        };
      }

      if (cartItem) {
        addItem(cartItem);
        openCart();
      }
    } catch (error) {
      console.error('Błąd dodawania do koszyka:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(product);
  };

  const handleQuickView = () => {
    openQuickView(product);
  };

  const handleVariantSelect = (variant: string) => {
    setSelectedVariant(variant);
  };

  const handleShowVariants = async () => {
    if (process.env.NODE_ENV === 'development') {
      // handleShowVariants debug removed
    }
    
    if (!variationsLoaded) {
      try {
        const response = await wooCommerceService.getProductVariations(product.id);
        const variationsList = response.variations ?? [];
        
        setVariations([...variationsList]);
        setVariationsLoaded(true);
        
        if (process.env.NODE_ENV === 'development') {
          // Variations set debug removed
        }
      } catch (error) {
        console.error('Błąd ładowania wariantów:', error);
      }
    }
    setIsDropdownOpen(true);
  };

  const handleAddToCartWithVariant = async () => {
    if (product.type === 'variable' && !selectedVariant) {
      handleShowVariants();
      return;
    }
    await handleAddToCart();
  };

  const handleAddToCartWithVariation = async (variation: ProductVariation, variantName: string) => {
    // handleAddToCartWithVariation debug removed
    
    setIsLoading(true);
    try {
      const cartItem: Omit<CartItem, 'quantity'> = {
        id: variation.id,
        name: `${product.name} - ${variantName}`,
        price: parseFloat(variation.price),
        regular_price: parseFloat(variation.regular_price),
        sale_price: parseFloat(variation.sale_price),
        image: imageUrl,
        permalink: `/produkt/${product.slug}`,
        attributes: variationAttributesToRecord(variation.attributes),
        variant: {
          id: variation.id,
          name: 'Wariant',
          value: variantName,
        },
      };

      // Adding variation to cart debug removed
      addItem(cartItem);
      openCart();
    } catch (error) {
      console.error('Błąd dodawania wariantu do koszyka:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get available variants from loaded variations
  const getAvailableVariants = () => {
    // getAvailableVariants debug removed
    
    if (variations.length > 0) {
      const variants = variations.map((variation) => {
        // Processing variation debug removed
        // Znajdź pierwszy dostępny atrybut (pojemność, kolor, rozmiar, etc.)
        const firstAttr = variation.attributes?.find(
          (attribute) => attribute.slug && attribute.option
        );
        // First attr found debug removed
        const variantName = firstAttr?.option || variation.name || `Wariant ${variation.id}`;
        // Variant name debug removed
        return variantName;
      });
      // Mapped variants debug removed
      return variants;
    }
    
    // No variations debug removed
    // Fallback to product attributes - znajdź pierwszy atrybut z opcjami
    if (!product.attributes) {
      // No product attributes debug removed
      return [];
    }
    const firstAttrWithOptions = product.attributes.find((attr) => Array.isArray(attr.options) && attr.options.length > 0);
    if (!firstAttrWithOptions) {
      // No attributes with options debug removed
      return [];
    }
    const opts = firstAttrWithOptions.options ?? [];
    // Product attribute options debug removed
    return opts;
  };

  // Get attribute name for display
  // removed unused getAttributeName helper

  const isOnSale = wooCommerceService.isProductOnSale(product);
  const discount = wooCommerceService.getProductDiscount(product);
  // Handle both full WooProduct and simplified API data
  const imageUrl = (() => {
    // Check if product has images array (full WooProduct format)
    if (Array.isArray((product as WooProduct).images) && (product as WooProduct).images.length > 0) {
      return wooCommerceService.getProductImageUrl(product, 'medium');
    }
    
    // Check if product has single image property (simplified API format)
    const rawImage = (product as { image?: string }).image;
    if (typeof rawImage === 'string' && rawImage) {
      // Convert to higher quality image by replacing size suffix
      if (rawImage.includes('-300x300.')) {
        return rawImage.replace('-300x300.', '-600x600.');
      } else if (rawImage.includes('-150x150.')) {
        return rawImage.replace('-150x150.', '-600x600.');
      } else if (rawImage.includes('-100x100.')) {
        return rawImage.replace('-100x100.', '-600x600.');
      }
      return rawImage;
    }
    
    return '/images/placeholder-product.jpg';
  })();
  const primaryImage = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : undefined;
  const primaryImageAlt = primaryImage?.alt || primaryImage?.name || product.name;
  const price = wooCommerceService.formatPrice(product.price);
  const regularPrice = wooCommerceService.formatPrice(product.regular_price);

  // Helper function to get brand from attributes
  // removed unused getBrand helper

  // Helper function to get main category (parent: 0)
  const getMainCategory = (): string | null => {
    try {
      // WooProduct.categories is WooCategory[] where WooCategory = { id: number; name: string; slug: string; }
      const cats = product.categories;
      
      // Ensure cats is an array before using array methods
      if (!cats || !Array.isArray(cats) || cats.length === 0) {
        return null;
      }
      
      // Main categories (parent: 0) are: Mezoterapia, Peelingi, Stymulatory, Wypełniacze
      const mainCategories = ['Mezoterapia', 'Peelingi', 'Stymulatory', 'Wypełniacze'];
      
      // Find the first main category in the product's categories
      // categories is WooCategory[] = { id: number; name: string; slug: string; }[]
      const main = cats.find((c) => {
        if (!c || typeof c !== 'object') return false;
        const categoryName = c.name;
        return categoryName && mainCategories.includes(categoryName);
      });
      
      if (main && typeof main === 'object' && 'name' in main) {
        return main.name;
      }
      
      // Fallback: return first category name if no main category found
      if (cats.length > 0 && cats[0] && typeof cats[0] === 'object' && 'name' in cats[0]) {
        return cats[0].name;
      }
      
      return null;
    } catch (error) {
      // Safely handle any errors
      console.warn('Error getting main category:', error);
      return null;
    }
  };

  const renderPrice = () => {
    if (isOnSale) {
      return (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-lg sm:text-xl font-bold text-red-600">{price}</span>
            <span className="text-xs text-gray-400 line-through">{regularPrice}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge className="bg-red-500 text-white text-[8px] font-semibold px-1 py-0.5 rounded-md">
              -{discount}% TANIEJ
            </Badge>
          </div>
        </div>
      );
    }
    return <span className="text-lg sm:text-xl font-bold text-foreground">{price}</span>;
  };

  const renderRating = () => {
    const rating = parseFloat(product.average_rating);
    if (isNaN(rating) || rating === 0) return null;

    return (
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 fill-current text-foreground" />
        <span className="text-sm text-muted-foreground">{rating.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">({product.rating_count})</span>
      </div>
    );
  };

  const renderStockStatus = () => {
    if (product.stock_status === 'outofstock') {
      return <Badge variant="secondary" className="text-xs">Brak w magazynie</Badge>;
    }
    if (product.stock_status === 'onbackorder') {
      return <Badge variant="secondary" className="text-xs">Na zamówienie</Badge>;
    }
    return null;
  };

  if (variant === 'compact') {
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 border border-gray-200">
        <Link href={`/produkt/${product.slug}`}>
          <CardHeader className="p-3 pb-0">
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={imageUrl}
                alt={product.name}
                width={300}
                height={300}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                quality={85}
              />
              {isOnSale && (
                <Badge variant="destructive" className="absolute top-0.5 sm:top-1 left-1 sm:left-2 text-[7px] sm:text-[8px] lg:text-[7px] px-1 sm:px-1.5 lg:px-1 py-0.5 whitespace-nowrap">
                  PROMOCJA
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 py-2">
            <h2 className="font-medium text-sm text-foreground line-clamp-2 mb-1">
              {product.name}
            </h2>
            {renderPrice()}
            {renderRating()}
          </CardContent>
        </Link>
      </Card>
    );
  }

  if (variant === 'featured') {
    return (
      <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 bg-gradient-to-br from-background to-muted/20">
        <Link href={`/produkt/${product.slug}`}>
          <CardHeader className="p-4 pb-0">
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={imageUrl}
                alt={product.name}
                width={300}
                height={300}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                quality={85}
              />
              {isOnSale && (
                <Badge variant="destructive" className="absolute top-2 sm:top-3 left-2 sm:left-3 text-xs sm:text-sm border-2 border-destructive/20 rounded-xl px-2 sm:px-3 py-0.5 sm:py-1">
                  PROMOCJA
                </Badge>
              )}
              {product.featured && !isOnSale && (
                <Badge className="absolute top-2 sm:top-3 right-2 sm:right-3 text-xs sm:text-sm bg-primary text-primary-foreground border-2 border-primary/20 rounded-xl px-2 sm:px-3 py-0.5 sm:py-1">
                  Polecany
                </Badge>
              )}
              {isOnSale && product.featured && (
                <Badge className="absolute top-2 sm:top-3 right-2 sm:right-3 text-xs sm:text-sm bg-amber-600 text-white border-2 border-amber-500/20 rounded-xl px-2 sm:px-3 py-0.5 sm:py-1">
                  Promocja
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-6 py-3">
            <h2 className="font-semibold text-lg text-foreground line-clamp-2 mb-2">
              {product.name}
            </h2>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {product.short_description}
            </p>
            {renderPrice()}
            {renderRating()}
            {renderStockStatus()}
          </CardContent>
        </Link>
        {showActions && (
          <CardFooter className="px-6 pt-0 pb-4">
            <div className="flex gap-2 w-full">
              {product.type === 'variable' && isDropdownOpen ? (
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">Wybierz wariant:</div>
                  <div className="flex flex-wrap gap-2">
                    {getAvailableVariants().map((variant: string) => (
                      <button
                        key={variant}
                        onClick={() => handleVariantSelect(variant)}
                        className={`px-3 py-2 text-sm rounded-2xl border transition-colors ${
                          selectedVariant === variant
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                        }`}
                        aria-label={`Wybierz wariant ${variant}`}
                        aria-pressed={selectedVariant === variant}
                      >
                        {variant}
                      </button>
                    ))}
                  </div>
                  {selectedVariant && (
                    <Button 
                      variant="outline"
                      onClick={handleAddToCart}
                      disabled={isLoading || product.stock_status === 'outofstock'}
                      className="w-full h-12 py-6 text-base product-add-to-cart-button"
                      size="sm"
                    >
                      <ShoppingCart className="w-4 h-4 -mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-base">{isLoading ? 'Dodawanie...' : `Dodaj ${selectedVariant} do koszyka`}</span>
                    </Button>
                  )}
                </div>
              ) : (
                <Button 
                  variant="outline"
                  onClick={handleAddToCartWithVariant}
                  disabled={isLoading || product.stock_status === 'outofstock'}
                  className="flex-1 h-10 py-2 text-sm product-add-to-cart-button"
                  size="sm"
                  data-testid="add-to-cart"
                >
                  <ShoppingCart className="w-4 h-4 -mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm">{isLoading ? 'Dodawanie...' : (product.type === 'variable' ? 'Wybierz wariant' : 'Dodaj do koszyka')}</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickView}
                className="px-3 h-10 hover:bg-black hover:text-white transition-colors"
                aria-label="Szybki podgląd"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFavorite}
                className={`px-3 h-10 hover:bg-black hover:text-white transition-colors ${isClient && isFavorite(product.id) ? 'text-destructive' : ''}`}
                aria-label={isClient && isFavorite(product.id) ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                data-testid="favorite-button"
              >
                <Heart className={`w-4 h-4 ${isClient && isFavorite(product.id) ? 'fill-current' : ''}`} />
              </Button>
              {/* Wishlist button removed */}
            </div>
          </CardFooter>
        )}
        
        {/* Quick View Modal */}
        <QuickViewModal
          isOpen={isQuickViewOpen && quickViewProduct?.id === product.id}
          onClose={closeQuickView}
          product={quickViewProduct}
        />
      </Card>
    );
  }

  // List variant - horizontal layout
  if (variant === 'list') {
    return (
      <Card 
        className="group hover:shadow-lg transition-all duration-300 border border-gray-200 rounded-xl overflow-hidden relative"
        onMouseEnter={() => {
          setIsHovered(true);
          // Load variations on hover for variable products
          if (product.type === 'variable' && !variationsLoaded) {
            handleShowVariants();
          }
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
      >
        <Link href={`/produkt/${product.slug}`} className="flex h-40">
          <div className="w-40 h-40 flex-shrink-0 relative">
            <Image
              src={imageUrl}
              alt={primaryImageAlt}
              width={160}
              height={160}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 160px, 160px"
              loading={priority ? 'eager' : 'lazy'}
              priority={priority}
            />
            
            {/* Badge - Mobile optimized, smaller on 4-column layout */}
            <div className="absolute top-0.5 sm:top-1 left-1 sm:left-2">
              {isOnSale ? (
                <Badge className="bg-red-100 text-red-800 text-[7px] sm:text-[8px] lg:text-[7px] px-1 sm:px-1.5 lg:px-1 py-0.5 rounded-full border-0 whitespace-nowrap">
                  PROMOCJA
                </Badge>
              ) : product.featured ? (
                <Badge className="bg-green-100 text-green-800 text-[7px] sm:text-[8px] lg:text-[7px] px-1 sm:px-1.5 lg:px-1 py-0.5 rounded-full border-0 whitespace-nowrap">
                  Polecany
                </Badge>
              ) : null}
            </div>
          </div>
          
          <div className="flex-1 px-6 py-4 flex flex-col justify-between">
            <div>
              <h2 className="font-semibold text-lg text-gray-900 group-hover:text-black transition-colors line-clamp-2">
                {product.name}
              </h2>
              
              
              <div className="mt-1">
                {renderPrice()}
              </div>
              
              <div className="mt-1">
                {renderRating()}
              </div>
              
              <div className="mt-1">
                {renderStockStatus()}
              </div>
            </div>
            
            {showActions && (
              <div className="flex items-center gap-4 mt-4">
                {product.type === 'variable' ? (
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleShowVariants();
                    }}
                    size="sm"
                    className="bg-black hover:bg-gray-800 text-white px-8 py-3 text-sm font-medium rounded-2xl"
                  >
                    Wybierz wariant
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddToCart();
                    }}
                    disabled={product.stock_status === 'outofstock' || isLoading}
                    size="sm"
                    className="px-8 py-3 text-sm font-medium rounded-2xl product-add-to-cart-button"
                  >
                    {isLoading ? 'Dodawanie...' : 'Dodaj do koszyka'}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleQuickView();
                  }}
                  className="px-4 py-3 h-10 w-10 rounded-2xl border-gray-200 hover:border-gray-300"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleFavorite();
                  }}
                  className={`px-4 py-3 h-10 w-10 rounded-2xl ${
                    isClient && isFavorite(product.id) ? 'text-red-500 border-red-200 bg-red-50 hover:bg-red-100' : 'text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isClient && isFavorite(product.id) ? 'fill-current' : ''}`} />
                </Button>
                {/* Wishlist icon removed */}
              </div>
            )}
          </div>
        </Link>
        
        {/* Hover overlay with variants for variable products in list view */}
        {product.type === 'variable' && variations.length > 0 && (
          <div className={`absolute inset-0 bg-white/50 backdrop-blur-sm transition-all duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}>
            <div className="flex flex-col justify-center items-center h-full p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Wybierz wariant</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {getAvailableVariants().map((variant: string) => {
                  const variation = variations.find((v) => {
                    // Znajdź wariację która ma ten sam atrybut
                    const firstAttr = v.attributes?.find((attr) => attr.slug && attr.option);
                    return firstAttr?.option === variant;
                  });
                  
                  const variantPrice = variation?.price || variation?.sale_price || variation?.regular_price;
                  const isOnSale = variation?.sale_price && parseFloat(variation.sale_price) < parseFloat(variation.regular_price || '0');
                  const regularPrice = variation?.regular_price;
                  
                  return (
                    <button
                      key={variant}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (variation) {
                          handleAddToCartWithVariation(variation, variant);
                        }
                      }}
                      className="flex flex-col items-center p-3 border border-gray-200 rounded-xl hover:border-gray-900 hover:shadow-md transition-all duration-200 bg-white"
                    >
                      <span className="text-sm font-medium text-gray-900 mb-1">
                        {variant}
                      </span>
                      <div className="text-xs font-bold text-gray-900">
                        {variantPrice && (
                          <>
                            {isOnSale ? (
                              <>
                                <span className="text-red-600">{formatPrice(parseFloat(variantPrice))}</span>
                                {regularPrice && (
                                  <span className="text-gray-400 line-through ml-1">{formatPrice(parseFloat(regularPrice))}</span>
                                )}
                              </>
                            ) : (
                              <span>{formatPrice(parseFloat(variantPrice))}</span>
                            )}
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Quick View Modal */}
        <QuickViewModal
          isOpen={isQuickViewOpen && quickViewProduct?.id === product.id}
          onClose={closeQuickView}
          product={quickViewProduct}
        />
      </Card>
    );
  }

  // Default variant - matching the screenshot design
  return (
    <Card 
      className="group flex flex-col h-full hover:shadow-lg transition-all duration-300 border border-gray-200 rounded-2xl sm:rounded-3xl overflow-hidden p-0 relative"
      onMouseEnter={() => {
        setIsHovered(true);
        // Load variations on hover for variable products
        if (product.type === 'variable' && !variationsLoaded) {
          handleShowVariants();
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      <Link 
        href={`/produkt/${product.slug}`} 
        className="flex flex-col flex-grow"
        onClick={(e) => {
          // Prevent navigation if clicking on action buttons
          if ((e.target as HTMLElement).closest('button')) {
            e.preventDefault();
          }
        }}
      >
        <CardHeader className="p-0 relative">
          <div className="relative aspect-square overflow-hidden">
            <Image
              src={imageUrl}
              alt={product.name}
              width={300}
              height={300}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              loading={priority ? 'eager' : 'lazy'}
              priority={priority}
            />
            
            {/* Badge - top left - Mobile optimized, smaller on 4-column layout */}
            <div className="absolute top-1 left-2">
              {tabType === 'promocje' || isOnSale ? (
                <Badge className="bg-red-100 text-red-800 text-[7px] sm:text-[8px] lg:text-[7px] px-1 sm:px-1.5 lg:px-1 py-0.5 rounded-full border-0 whitespace-nowrap">
                  PROMOCJA
                </Badge>
              ) : tabType === 'nowosci' ? (
                <Badge className="bg-blue-100 text-blue-800 text-[7px] sm:text-[8px] lg:text-[7px] px-1 sm:px-1.5 lg:px-1 py-0.5 rounded-full border-0 whitespace-nowrap">
                  Nowość
                </Badge>
              ) : tabType === 'polecane' || product.featured ? (
                <Badge className="bg-green-100 text-green-800 text-[7px] sm:text-[8px] lg:text-[7px] px-1 sm:px-1.5 lg:px-1 py-0.5 rounded-full border-0 whitespace-nowrap">
                  Polecany
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-800 text-[7px] sm:text-[8px] lg:text-[7px] px-1 sm:px-1.5 lg:px-1 py-0.5 rounded-full border-0 whitespace-nowrap">
                  Nowość
                </Badge>
              )}
            </div>

            {/* Icons - top right */}
            <div className="absolute top-2 right-2 flex flex-col gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleQuickView();
                }}
                className="w-8 h-8 bg-white/80 hover:bg-white hover:shadow-md rounded-full flex items-center justify-center transition-all duration-150"
                aria-label="Szybki podgląd"
              >
                <Eye className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleFavorite();
                }}
                className="w-8 h-8 bg-white/80 hover:bg-white hover:shadow-md rounded-full flex items-center justify-center transition-all duration-150"
                aria-label={isClient && isFavorite(product.id) ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
                data-testid="favorite-button"
              >
                <Heart className={`w-4 h-4 ${isClient && isFavorite(product.id) ? 'fill-current text-red-500' : 'text-gray-700'}`} />
              </button>
              {/* Wishlist icon removed */}
            </div>

          </div>
        </CardHeader>
        
        <CardContent className="px-2.5 sm:px-3.5 py-0.5 flex-grow">
          <div className="text-[6px] sm:text-[8px] text-gray-500 mb-0.5 flex items-center">
            {getMainCategory() || 'Bez kategorii'}
          </div>
          <p className="font-bold text-foreground text-sm sm:text-base mb-0 line-clamp-2">
            {product.name}
          </p>
          {renderPrice()}
        {renderStockStatus()}
          
          {/* AUTO: Product Attributes - All attributes in gray badges */}
          {product.attributes && product.attributes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {product.attributes.map((attr, attrIndex: number) => {
                if (!attr.options || !Array.isArray(attr.options)) return null;
                
                return attr.options.slice(0, 2).map((option, optionIndex) => {
                  if (!option) return null;
                  
                  const optionValue = String(option);
                  if (!optionValue) return null;
                  
                  return (
                    <span
                      key={`${attrIndex}-${optionIndex}`}
                      className="bg-gray-100 text-gray-600 text-[8px] font-medium px-1 py-0.5 rounded-full"
                    >
                      {optionValue}
                    </span>
                  );
                });
              })}
            </div>
          )}
        </CardContent>
      </Link>
      
      {/* Hover overlay with variants for variable products */}
      {product.type === 'variable' && variations.length > 0 && (
        <div className={`absolute inset-0 bg-white/50 backdrop-blur-sm transition-all duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <div className="flex flex-col justify-center items-center h-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Wybierz wariant</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {getAvailableVariants().map((variant: string) => {
                const variation = variations.find((v) => {
                  const firstAttr = v.attributes?.find((attr) => attr.slug && attr.option);
                  return firstAttr?.option === variant;
                });
                
                const variantPrice = variation?.price || variation?.sale_price || variation?.regular_price;
                const isOnSale = variation?.sale_price && parseFloat(variation.sale_price) < parseFloat(variation.regular_price || '0');
                const regularPrice = variation?.regular_price;
                
                return (
                  <button
                    key={variant}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (variation) {
                        handleAddToCartWithVariation(variation, variant);
                      }
                    }}
                    className="flex flex-col items-center p-3 border border-gray-200 rounded-xl hover:border-gray-900 hover:shadow-md transition-all duration-200 bg-white"
                    aria-label={`Wybierz wariant ${variant}`}
                  >
                    <span className="text-sm font-medium text-gray-900 mb-1">
                      {variant}
                    </span>
                    <div className="text-xs font-bold text-gray-900">
                      {variantPrice && (
                        <>
                          {isOnSale ? (
                            <>
                              <span className="text-red-600">{formatPrice(parseFloat(variantPrice))}</span>
                              {regularPrice && (
                                <span className="text-gray-400 line-through ml-1">{formatPrice(parseFloat(regularPrice))}</span>
                              )}
                            </>
                          ) : (
                            <span>{formatPrice(parseFloat(variantPrice))}</span>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {showActions && (
        <CardFooter className="px-2.5 sm:px-3.5 pb-3.5 pt-0.5 mt-0">
          <div className="w-full relative" ref={dropdownRef}>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (product.type === 'variable') {
                  // For variable products, just show hover overlay (no dropdown)
                  handleShowVariants();
                } else {
                  handleAddToCart();
                }
              }}
              onMouseEnter={() => {
                if (product.type === 'variable' && !variationsLoaded) {
                  handleShowVariants();
                }
              }}
              variant="outline"
              disabled={isLoading || product.stock_status === 'outofstock'}
              className="w-full rounded-2xl py-2.5 font-medium text-xs product-add-to-cart-button"
              size="lg"
              data-testid="add-to-cart"
            >
              <ShoppingCart className="w-3.5 h-3.5 -mr-1 sm:mr-2" />
              <span className="text-[10px] sm:text-xs">{isLoading ? 'Dodawanie...' : (product.type === 'variable' ? 'Wybierz wariant' : 'Dodaj do koszyka')}</span>
            </Button>
            
            {/* Old dropdown removed - using hover overlay instead */}
            {false && product.type === 'variable' && isDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 z-10">
                <div className="text-sm font-semibold text-gray-900 mb-3 text-center">Wybierz wariant</div>
                {!variationsLoaded ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                    <div className="text-sm text-gray-500 mt-2">Ładowanie wariantów...</div>
                  </div>
                ) : getAvailableVariants().length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    Brak dostępnych wariantów
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {getAvailableVariants().map((variant: string) => {
                    const variation = variations.find((v) => {
                      const firstAttr = v.attributes?.find((attr) => attr.slug && attr.option);
                      return firstAttr?.option === variant;
                    });
                    
                    return (
                      <button
                        key={variant}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Variant clicked debug removed
                          setSelectedVariant(variant);
                          setIsDropdownOpen(false);
                          if (variation) {
                            // Calling handleAddToCartWithVariation debug removed
                            handleAddToCartWithVariation(variation, variant);
                          } else {
                            // No variation found debug removed
                          }
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all duration-200 transform hover:scale-105 ${
                          selectedVariant === variant
                            ? 'bg-black text-white border-black shadow-lg'
                            : 'bg-transparent text-gray-700 border-gray-300 hover:border-black hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-bold">{variant}</div>
                          {variation && (
                            <div className="text-xs opacity-70 mt-1">
                              {wooCommerceService.formatPrice(variation.price)}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardFooter>
      )}
      
      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={isQuickViewOpen && quickViewProduct?.id === product.id}
        onClose={closeQuickView}
        product={quickViewProduct}
      />
    </Card>
  );
}
