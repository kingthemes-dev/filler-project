'use client';

import { useState } from 'react';
import { WooProduct } from '@/types/woocommerce';
import { wooCommerceService } from '@/services/woocommerce';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Eye, Star } from 'lucide-react';
import Link from 'next/link';
import { useCartStore } from '@/stores/cart-store';

interface KingProductCardProps {
  product: WooProduct;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'featured';
  tabType?: string;
}

export default function KingProductCard({ 
  product, 
  showActions = true, 
  variant = 'default',
  tabType
}: KingProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const { addItem, openCart } = useCartStore();

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        regular_price: product.regular_price,
        sale_price: product.sale_price,
        image: imageUrl,
        permalink: `/produkt/${product.slug}`,
      };

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
    setIsFavorite(!isFavorite);
    // TODO: Implement favorites functionality
  };

  const handleQuickView = () => {
    // TODO: Implement quick view modal
    console.log('Quick view:', product.id);
  };

  const isOnSale = wooCommerceService.isProductOnSale(product);
  const discount = wooCommerceService.getProductDiscount(product);
  const imageUrl = wooCommerceService.getProductImageUrl(product, 'medium');
  const price = wooCommerceService.formatPrice(product.price);
  const regularPrice = wooCommerceService.formatPrice(product.regular_price);

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
              />
              {isOnSale && (
                <Badge variant="destructive" className="absolute top-2 left-2 text-xs">
                  -{discount}%
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-2">
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
          <CardContent className="p-4 pt-3">
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
          <CardFooter className="p-4 pt-0">
            <div className="flex gap-2 w-full">
              <Button 
                onClick={handleAddToCart}
                disabled={isLoading || product.stock_status === 'outofstock'}
                className="flex-1"
                size="sm"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {isLoading ? 'Dodawanie...' : 'Dodaj do koszyka'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickView}
                className="px-3"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFavorite}
                className={`px-3 ${isFavorite ? 'text-destructive' : ''}`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    );
  }

  // Default variant - matching the screenshot design
  return (
    <Card className="group flex flex-col h-full hover:shadow-lg transition-all duration-300 border-gray-200 rounded-xl overflow-hidden p-0">
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
                <Badge className="bg-black text-white text-xs px-3 py-1 rounded-md border-0">
                  Promocja
                </Badge>
              ) : tabType === 'nowosci' ? (
                <Badge className="bg-black text-white text-xs px-3 py-1 rounded-md border-0">
                  Nowość
                </Badge>
              ) : tabType === 'polecane' || product.featured ? (
                <Badge className="bg-black text-white text-xs px-3 py-1 rounded-md border-0">
                  Polecany
                </Badge>
              ) : (
                <Badge className="bg-black text-white text-xs px-3 py-1 rounded-md border-0">
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
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-red-500' : 'text-gray-700'}`} />
              </button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-4 py-2 flex-grow">
          <div className="text-sm text-gray-500 mb-1">
            {product.categories && product.categories.length > 0 
              ? product.categories[0].name 
              : 'Bez kategorii'
            }
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
              handleAddToCart();
            }}
            disabled={isLoading || product.stock_status === 'outofstock'}
            className="w-full bg-white border border-black text-gray-900 hover:bg-gray-50 rounded-2xl py-3 font-medium"
            size="lg"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isLoading ? 'Dodawanie...' : 'Dodaj do koszyka'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
