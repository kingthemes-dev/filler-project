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
import { useCartStore } from '@/stores/cart-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useQuickViewStore } from '@/stores/quickview-store';
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

export default function KingProductCard({ 
  product, 
  showActions = true, 
  variant = 'default',
  tabType,
  priority = false
}: KingProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { openQuickView, isOpen: isQuickViewOpen, product: quickViewProduct, closeQuickView } = useQuickViewStore();
  // removed unused showVariants state
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [variationsLoaded, setVariationsLoaded] = useState(false);
  const [variations, setVariations] = useState<Array<{
    id: number;
    attributes?: Array<{ slug: string; option: string }>;
    price: string;
    regular_price: string;
    sale_price: string;
    name: string;
    menu_order: number;
  }>>([]);
  const [isHovered, setIsHovered] = useState(false);
  // removed unused isButtonHovered state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
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
  
  // Safely access stores with error handling
  let addItem, openCart, toggleFavorite, isFavorite;
  try {
    const cartStore = useCartStore();
    addItem = cartStore.addItem;
    openCart = cartStore.openCart;
  } catch (error) {
    console.warn('Cart store not available:', error);
    addItem = () => {};
    openCart = () => {};
  }
  
  try {
    const favoritesStore = useFavoritesStore();
    toggleFavorite = favoritesStore.toggleFavorite;
    isFavorite = favoritesStore.isFavorite;
  } catch (error) {
    console.warn('Favorites store not available:', error);
    toggleFavorite = () => {};
    isFavorite = () => false;
  }

  // Wishlist via safe hook (SSR-guarded)
  // Wishlist UI wyłączony na kartach – zostaje tylko Ulubione

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      let cartItem;
      
      if (product.type === 'variable' && selectedVariant) {
        // For variable products with selected variant, get the specific variation
        const variations = await wooCommerceService.getProductVariations(product.id);
        const selectedVariation = variations.variations?.find((variation) => 
          variation.attributes?.some((attr) => 
            attr.slug === 'pa_pojemnosc' && attr.option === selectedVariant
          )
        );
        
        if (selectedVariation) {
          cartItem = {
            id: selectedVariation.id,
            name: `${product.name} - ${selectedVariant}`,
            price: parseFloat(selectedVariation.price),
            regular_price: parseFloat(selectedVariation.regular_price),
            sale_price: parseFloat(selectedVariation.sale_price),
            image: imageUrl,
            permalink: `/produkt/${product.slug}`,
          };
        } else {
          // Fallback to main product if variation not found
          cartItem = {
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            regular_price: parseFloat(product.regular_price),
            sale_price: parseFloat(product.sale_price),
            image: imageUrl,
            permalink: `/produkt/${product.slug}`,
          };
        }
      } else {
        // For simple products or variable products without selected variant
        cartItem = {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          regular_price: parseFloat(product.regular_price),
          sale_price: parseFloat(product.sale_price),
          image: imageUrl,
          permalink: `/produkt/${product.slug}`,
        };
      }

      // Adding to cart from card debug removed
      addItem(cartItem);
      openCart();
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
        
        if (process.env.NODE_ENV === 'development') {
          // Variations response debug removed
        }
        
        // API zwraca warianty jako tablicę bezpośrednio, nie w obiekcie z właściwością variations
        const variations = Array.isArray(response) ? response : (response.variations || []);
        
        if (process.env.NODE_ENV === 'development') {
          // Setting variations debug removed
        }
        
        setVariations([...variations]); // Force new array reference
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

  const handleAddToCartWithVariation = async (variation: { 
    id: number; 
    price: string; 
    regular_price: string; 
    sale_price: string; 
    attributes?: Array<{ slug: string; option: string }>; 
  }, variantName: string) => {
    // handleAddToCartWithVariation debug removed
    
    setIsLoading(true);
    try {
      const cartItem = {
        id: variation.id,
        name: `${product.name} - ${variantName}`,
        price: parseFloat(variation.price),
        regular_price: parseFloat(variation.regular_price),
        sale_price: parseFloat(variation.sale_price),
        image: imageUrl,
        permalink: `/produkt/${product.slug}`,
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
      const variants = variations.map((variation: any) => {
        // Processing variation debug removed
        // Znajdź pierwszy dostępny atrybut (pojemność, kolor, rozmiar, etc.)
        const firstAttr = variation.attributes?.find((attr: any) => 
          attr.slug && attr.option
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
    const firstAttrWithOptions = product.attributes.find((attr) => 
      (attr as any).options && (attr as any).options.length > 0
    );
    if (!firstAttrWithOptions) {
      // No attributes with options debug removed
      return [];
    }
    const opts = (firstAttrWithOptions as any).options || [];
    // Product attribute options debug removed
    return opts.map((o: any) => {
      if (typeof o === 'string') return o;
      if (typeof o === 'object' && o.name) return o.name;
      if (typeof o === 'object' && o.slug) return o.slug;
      return String(o);
    }).filter(Boolean);
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
    if (typeof (product as { image?: string }).image === 'string' && (product as { image?: string }).image) {
      const imageUrl = (product as any).image;
      // Convert to higher quality image by replacing size suffix
      if (imageUrl.includes('-300x300.')) {
        return imageUrl.replace('-300x300.', '-600x600.');
      } else if (imageUrl.includes('-150x150.')) {
        return imageUrl.replace('-150x150.', '-600x600.');
      } else if (imageUrl.includes('-100x100.')) {
        return imageUrl.replace('-100x100.', '-600x600.');
      }
      return imageUrl;
    }
    
    return '/images/placeholder-product.jpg';
  })();
  const price = wooCommerceService.formatPrice(product.price);
  const regularPrice = wooCommerceService.formatPrice(product.regular_price);

  // Helper function to get brand from attributes
  // removed unused getBrand helper

  // Helper function to get main category (parent: 0)
  const getMainCategory = (): string | null => {
    const cats = (product as { categories?: Array<{ name: string }> }).categories;
    if (!cats || cats.length === 0) return null;
    
    // Main categories (parent: 0) are: Mezoterapia, Peelingi, Stymulatory, Wypełniacze
    const mainCategories = ['Mezoterapia', 'Peelingi', 'Stymulatory', 'Wypełniacze'];
    
    // Find the first main category in the product's categories
    const main = cats.find((c) => {
      const categoryName = typeof c === 'string' ? c : c?.name;
      return categoryName && mainCategories.includes(categoryName);
    });
    
    if (main) {
      return typeof main === 'string' ? main : main?.name;
    }
    
    return null;
  };

  const renderPrice = () => {
    if (isOnSale) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">{price}</span>
          <span className="text-sm text-muted-foreground line-through">{regularPrice}</span>
          <Badge variant="destructive" className="text-xs">
            -{discount}%
          </Badge>
        </div>
      );
    }
    return <span className="text-lg font-bold text-foreground">{price}</span>;
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
      <Card className="group hover:shadow-lg transition-all duration-300 border-border/50">
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
                <Badge variant="destructive" className="absolute top-1 sm:top-2 left-1 sm:left-2 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
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
      <Card className="group hover:shadow-xl transition-all duration-300 border-border/50 bg-gradient-to-br from-background to-muted/20">
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
                      onClick={handleAddToCart}
                      disabled={isLoading || product.stock_status === 'outofstock'}
                      className="w-full h-12 py-6 hover:bg-black hover:text-white transition-colors text-base"
                      size="sm"
                    >
                      <ShoppingCart className="w-4 h-4 -mr-1 sm:mr-2" />
                      <span className="text-xs sm:text-base">{isLoading ? 'Dodawanie...' : `Dodaj ${selectedVariant} do koszyka`}</span>
                    </Button>
                  )}
                </div>
              ) : (
                <Button 
                  onClick={handleAddToCartWithVariant}
                  disabled={isLoading || product.stock_status === 'outofstock'}
                  className="flex-1 h-10 py-2 hover:bg-black hover:text-white transition-colors text-sm"
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
        className="group hover:shadow-lg transition-all duration-300 border-gray-200 rounded-xl overflow-hidden relative"
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
              alt={Array.isArray((product as any).images) && (product as any).images[0] && (product as any).images[0].alt ? (product as any).images[0].alt : product.name}
              width={160}
              height={160}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 160px, 160px"
              loading={priority ? 'eager' : 'lazy'}
              priority={priority}
            />
            
            {/* Badge - Mobile optimized */}
            <div className="absolute top-1 sm:top-2 left-1 sm:left-2">
              {isOnSale ? (
                <Badge className="bg-red-100 text-red-800 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border-0">
                  PROMOCJA
                </Badge>
              ) : product.featured ? (
                <Badge className="bg-green-100 text-green-800 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border-0">
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddToCart();
                    }}
                    disabled={product.stock_status === 'outofstock' || isLoading}
                    size="sm"
                    className="bg-black hover:bg-gray-800 text-white px-8 py-3 text-sm font-medium rounded-2xl"
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
                  const variation = variations.find((v: { 
                    id: number; 
                    attributes?: Array<{ slug: string; option: string }>; 
                  }) => {
                    // Znajdź wariację która ma ten sam atrybut
                    const firstAttr = v.attributes?.find((attr: { slug: string; option: string }) => 
                      attr.slug && attr.option
                    );
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
      className="group flex flex-col h-full hover:shadow-lg transition-all duration-300 border-gray-200 rounded-2xl sm:rounded-3xl overflow-hidden p-0 relative"
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
            
            {/* Badge - top left - Mobile optimized */}
            <div className="absolute top-2 left-2">
              {tabType === 'promocje' || isOnSale ? (
                <Badge className="bg-red-100 text-red-800 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border-0">
                  PROMOCJA
                </Badge>
              ) : tabType === 'nowosci' ? (
                <Badge className="bg-blue-100 text-blue-800 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border-0">
                  Nowość
                </Badge>
              ) : tabType === 'polecane' || product.featured ? (
                <Badge className="bg-green-100 text-green-800 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border-0">
                  Polecany
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-800 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border-0">
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
        
        <CardContent className="px-3 sm:px-4 py-1 flex-grow">
          <div className="text-[10px] sm:text-sm text-gray-500 mb-1 flex items-center">
            {getMainCategory() || 'Bez kategorii'}
          </div>
          <p className="font-bold text-foreground text-base sm:text-lg mb-1 line-clamp-2">
            {product.name}
          </p>
          {renderPrice()}
        {renderStockStatus()}
          
          {/* AUTO: Product Attributes - All attributes in gray badges */}
          {product.attributes && product.attributes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.attributes.map((attr: { name: string; options: string[] }, attrIndex: number) => {
                if (!attr.options || !Array.isArray(attr.options)) return null;
                
                return attr.options.slice(0, 2).map((option: any, optionIndex: number) => {
                  if (!option) return null;
                  
                  // Handle both string and object options
                  const optionValue = typeof option === 'string' 
                    ? option 
                    : (option?.name || option?.slug || String(option?.id || ''));
                  
                  if (!optionValue) return null;
                  
                  return (
                    <span
                      key={`${attrIndex}-${optionIndex}`}
                      className="bg-gray-100 text-gray-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
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
                const variation = variations.find((v: { 
                  id: number; 
                  attributes?: Array<{ slug: string; option: string }>; 
                }) => {
                  // Znajdź wariację która ma ten sam atrybut
                  const firstAttr = v.attributes?.find((attr: { slug: string; option: string }) => 
                    attr.slug && attr.option
                  );
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
        <CardFooter className="px-3 sm:px-4 pb-4 mt-auto">
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
              disabled={isLoading || product.stock_status === 'outofstock'}
              className="w-full bg-white border border-black text-gray-900 hover:bg-gray-50 rounded-2xl py-3 font-medium text-sm"
              size="lg"
            data-testid="add-to-cart"
            >
              <ShoppingCart className="w-4 h-4 -mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">{isLoading ? 'Dodawanie...' : (product.type === 'variable' ? 'Wybierz wariant' : 'Dodaj do koszyka')}</span>
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
                    const variation = variations.find((v: { 
                      id: number; 
                      attributes?: Array<{ slug: string; option: string }>; 
                    }) => {
                      // Znajdź wariację która ma ten sam atrybut
                      const firstAttr = v.attributes?.find((attr: { slug: string; option: string }) => 
                        attr.slug && attr.option
                      );
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
