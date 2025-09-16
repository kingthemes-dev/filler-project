'use client';

import { useState } from 'react';
import { WooProduct } from '@/types/woocommerce';
import wooCommerceService from '@/services/woocommerce-optimized';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Eye, Star } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/stores/cart-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import QuickViewModal from '@/components/ui/quick-view-modal';

interface KingProductCardProps {
  product: WooProduct;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'featured' | 'list';
  tabType?: string;
}

export default function KingProductCard({ 
  product, 
  showActions = true, 
  variant = 'default',
  tabType
}: KingProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [variationsLoaded, setVariationsLoaded] = useState(false);
  const [variations, setVariations] = useState<any[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  
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

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      let cartItem;
      
      if (product.type === 'variable' && selectedVariant) {
        // For variable products with selected variant, get the specific variation
        const variations = await wooCommerceService.getProductVariations(product.id);
        const selectedVariation = variations.find((variation: any) => 
          variation.attributes.some((attr: any) => 
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

      console.log('🛒 Adding to cart from card:', cartItem);
      addItem(cartItem);
      openCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(product);
  };

  const handleQuickView = () => {
    setIsQuickViewOpen(true);
  };

  const handleVariantSelect = (variant: string) => {
    setSelectedVariant(variant);
    setShowVariants(false);
  };

  const handleShowVariants = async () => {
    if (!variationsLoaded) {
      try {
        const response = await wooCommerceService.getProductVariations(product.id);
        console.log('🔄 Variations response:', response);
        const variations = response.data || response || [];
        setVariations(variations);
        setVariationsLoaded(true);
      } catch (error) {
        console.error('Error loading variations:', error);
      }
    }
    setShowVariants(true);
  };

  const handleAddToCartWithVariant = async () => {
    if (product.type === 'variable' && !selectedVariant) {
      handleShowVariants();
      return;
    }
    await handleAddToCart();
  };

  const handleAddToCartWithVariation = async (variation: any) => {
    setIsLoading(true);
    try {
      const cartItem = {
        id: variation.id,
        name: `${product.name} - ${selectedVariant}`,
        price: parseFloat(variation.price),
        regular_price: parseFloat(variation.regular_price),
        sale_price: parseFloat(variation.sale_price),
        image: imageUrl,
        permalink: `/produkt/${product.slug}`,
      };

      console.log('🛒 Adding variation to cart:', cartItem);
      addItem(cartItem);
      openCart();
    } catch (error) {
      console.error('Error adding variation to cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get available variants from loaded variations
  const getAvailableVariants = () => {
    if (variations.length > 0) {
      return variations.map((variation: any) => {
        const capacityAttr = variation.attributes?.find((attr: any) => 
          attr.slug === 'pa_pojemnosc'
        );
        return capacityAttr?.option || variation.name;
      });
    }
    
    // Fallback to product attributes
    if (!product.attributes) return [];
    const capacityAttr = product.attributes.find((attr: any) => 
      attr.name === 'Pojemność' || attr.slug === 'pa_pojemnosc'
    );
    return capacityAttr ? capacityAttr.options : [];
  };

  const isOnSale = wooCommerceService.isProductOnSale(product);
  const discount = wooCommerceService.getProductDiscount(product);
  const imageUrl = wooCommerceService.getProductImageUrl(product, 'medium');
  const price = wooCommerceService.formatPrice(product.price);
  const regularPrice = wooCommerceService.formatPrice(product.regular_price);

  // Helper function to get brand from attributes
  const getBrand = (): string | null => {
    if (!product.attributes) return null;
    const brandAttr = product.attributes.find((attr: any) => 
      attr.name.toLowerCase().includes('marka')
    );
    return brandAttr ? brandAttr.options[0] : null;
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
      return <Badge variant="secondary" className="text-xs">Niedostępny</Badge>;
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
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                decoding="async"
              />
              {isOnSale && (
                <Badge variant="destructive" className="absolute top-2 left-2 text-xs">
                  -{discount}%
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-5 py-2">
            <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1">
              {product.name}
            </h3>
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
              <img
                src={imageUrl}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                decoding="async"
              />
              {isOnSale && (
                <Badge variant="destructive" className="absolute top-3 left-3 text-sm border-2 border-destructive/20 rounded-xl px-3 py-1">
                  -{discount}%
                </Badge>
              )}
              {product.featured && !isOnSale && (
                <Badge className="absolute top-3 right-3 text-sm bg-primary text-primary-foreground border-2 border-primary/20 rounded-xl px-3 py-1">
                  Polecany
                </Badge>
              )}
              {isOnSale && product.featured && (
                <Badge className="absolute top-3 right-3 text-sm bg-amber-600 text-white border-2 border-amber-500/20 rounded-xl px-3 py-1">
                  Promocja
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-6 py-3">
            <h3 className="font-semibold text-lg text-foreground line-clamp-2 mb-2">
              {product.name}
            </h3>
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
              {product.type === 'variable' && showVariants ? (
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">Wybierz pojemność:</div>
                  <div className="flex flex-wrap gap-2">
                    {getAvailableVariants().map((variant: string) => (
                      <button
                        key={variant}
                        onClick={() => handleVariantSelect(variant)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                          selectedVariant === variant
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                        }`}
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
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {isLoading ? 'Dodawanie...' : `Dodaj ${selectedVariant} do koszyka`}
                    </Button>
                  )}
                </div>
              ) : (
                <Button 
                  onClick={handleAddToCartWithVariant}
                  disabled={isLoading || product.stock_status === 'outofstock'}
                  className="flex-1 h-12 py-6 hover:bg-black hover:text-white transition-colors text-base"
                  size="sm"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {isLoading ? 'Dodawanie...' : (product.type === 'variable' ? 'Wybierz wariant' : 'Dodaj do koszyka')}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickView}
                className="px-3 h-10 hover:bg-black hover:text-white transition-colors"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFavorite}
                className={`px-3 h-10 hover:bg-black hover:text-white transition-colors ${isFavorite(product.id) ? 'text-destructive' : ''}`}
              >
                <Heart className={`w-4 h-4 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </CardFooter>
        )}
        
        {/* Quick View Modal */}
        <QuickViewModal
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          product={product}
        />
      </Card>
    );
  }

  // List variant - horizontal layout
  if (variant === 'list') {
    return (
      <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200 rounded-xl overflow-hidden">
        <Link href={`/produkt/${product.slug}`} className="flex">
          <div className="w-32 h-32 flex-shrink-0 relative">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            
            {/* Badge */}
            <div className="absolute top-2 left-2">
              {isOnSale ? (
                <Badge className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full border-0">
                  Promocja
                </Badge>
              ) : product.featured ? (
                <Badge className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full border-0">
                  Polecany
                </Badge>
              ) : null}
            </div>
          </div>
          
          <div className="flex-1 px-4 py-3 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-black transition-colors line-clamp-2">
                {product.name}
              </h3>
              
              {getBrand() && (
                <p className="text-sm text-gray-600 mt-1">{getBrand()}</p>
              )}
              
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
              <div className="flex items-center gap-3 mt-3">
                {product.type === 'variable' ? (
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleShowVariants();
                    }}
                    size="sm"
                    className="bg-black hover:bg-gray-800 text-white px-6 py-2 text-sm"
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
                    className="bg-black hover:bg-gray-800 text-white px-6 py-2 text-sm"
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
                  className="px-3 py-2 h-8 w-8"
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
                  className={`px-3 py-2 h-8 w-8 ${isFavorite(product.id) ? 'text-red-500 border-red-200' : ''}`}
                >
                  <Heart className={`w-4 h-4 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                </Button>
              </div>
            )}
          </div>
        </Link>
        
        {/* Quick View Modal */}
        <QuickViewModal
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          product={product}
        />
      </Card>
    );
  }

  // Default variant - matching the screenshot design
  return (
    <Card 
      className="group flex flex-col h-full hover:shadow-lg transition-all duration-300 border-gray-200 rounded-3xl overflow-hidden p-0"
      onMouseEnter={() => {
        setIsHovered(true);
        if (product.type === 'variable' && !variationsLoaded) {
          handleShowVariants();
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowVariants(false);
      }}
    >
      <Link href={`/produkt/${product.slug}`} className="flex flex-col flex-grow">
        <CardHeader className="p-0 relative">
          <div className="relative aspect-square overflow-hidden">
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            
            {/* Badge - top left */}
            <div className="absolute top-2 left-2">
              {tabType === 'promocje' || isOnSale ? (
                <Badge className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full border-0">
                  Promocja
                </Badge>
              ) : tabType === 'nowosci' ? (
                <Badge className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full border-0">
                  Nowość
                </Badge>
              ) : tabType === 'polecane' || product.featured ? (
                <Badge className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full border-0">
                  Polecany
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full border-0">
                  Nowość
                </Badge>
              )}
            </div>

            {/* Icons - top right */}
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleQuickView();
                }}
                className="w-8 h-8 bg-white/80 hover:bg-white hover:shadow-md rounded-full flex items-center justify-center transition-all duration-150"
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
              >
                <Heart className={`w-4 h-4 ${isFavorite(product.id) ? 'fill-current text-red-500' : 'text-gray-700'}`} />
              </button>
            </div>

            {/* Variants overlay - bottom of image */}
            {product.type === 'variable' && (showVariants || isHovered) && variations.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/80 to-transparent p-4 rounded-b-3xl">
                <div className="text-sm font-semibold text-white mb-3 text-center">Wybierz pojemność</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {getAvailableVariants().map((variant: string) => {
                    const variation = variations.find((v: any) => {
                      const capacityAttr = v.attributes?.find((attr: any) => 
                        attr.slug === 'pa_pojemnosc'
                      );
                      return capacityAttr?.option === variant;
                    });
                    
                    return (
                      <button
                        key={variant}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedVariant(variant);
                          if (variation) {
                            handleAddToCartWithVariation(variation);
                          }
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-full border-2 transition-all duration-200 transform hover:scale-105 ${
                          selectedVariant === variant
                            ? 'bg-white text-black border-white shadow-lg'
                            : 'bg-transparent text-white border-white/50 hover:border-white hover:bg-white/20'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-bold">{variant}</div>
                          {variation && (
                            <div className="text-xs opacity-90 mt-1">
                              {wooCommerceService.formatPrice(variation.price)}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="px-4 py-2 flex-grow">
          <div className="text-sm text-gray-500 mb-2 flex items-center">
            {product.categories && product.categories.length > 0 
              ? (() => {
                  // Znajdź pierwszą kategorię, która nie jest "Wszystkie kategorie"
                  const mainCategory = product.categories.find(cat => 
                    cat.name !== 'Wszystkie kategorie' && cat.name !== 'Wszystkie'
                  );
                  return mainCategory ? mainCategory.name : product.categories[0].name;
                })()
              : 'Bez kategorii'
            }
            {getBrand() && (
              <>
                <div className="w-1 h-1 bg-gray-300 rounded-full mx-2"></div>
                <span className="text-xs text-gray-400">{getBrand()}</span>
              </>
            )}
          </div>
          <h3 className="font-bold text-foreground text-lg mb-2 line-clamp-2">
            {product.name}
          </h3>
          <div className="text-xl font-bold text-foreground">
            {price}
          </div>
        </CardContent>
      </Link>
      
      {showActions && (
        <CardFooter className="px-4 pb-4 mt-auto">
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (product.type === 'variable') {
                handleShowVariants();
              } else {
                handleAddToCart();
              }
            }}
            disabled={isLoading || product.stock_status === 'outofstock'}
            className="w-full bg-white border border-black text-gray-900 hover:bg-gray-50 rounded-2xl py-6 font-medium text-base"
            size="lg"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isLoading ? 'Dodawanie...' : (product.type === 'variable' ? 'Wybierz wariant' : 'Dodaj do koszyka')}
          </Button>
        </CardFooter>
      )}
      
      {/* Quick View Modal */}
      <QuickViewModal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        product={product}
      />
    </Card>
  );
}
