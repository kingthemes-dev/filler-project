'use client';

import { useState } from 'react';
import { WooProduct } from '@/types/woocommerce';
import { wooCommerceService } from '@/services/woocommerce';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Eye, Star } from 'lucide-react';
import Link from 'next/link';

interface KingProductCardProps {
  product: WooProduct;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export default function KingProductCard({ 
  product, 
  showActions = true, 
  variant = 'default' 
}: KingProductCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement cart functionality
      console.log('Adding to cart:', product.id);
      // await addToCart(product.id, 1);
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
                <Badge variant="destructive" className="absolute top-3 left-3 text-sm">
                  -{discount}%
                </Badge>
              )}
              {product.featured && (
                <Badge className="absolute top-3 right-3 text-sm bg-primary text-primary-foreground">
                  Polecany
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

  // Default variant
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-border/50">
      <Link href={`/produkt/${product.slug}`}>
        <CardHeader className="p-4 pb-0">
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
            {product.featured && (
              <Badge className="absolute top-2 right-2 text-xs bg-primary text-primary-foreground">
                Polecany
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-3">
          <h3 className="font-medium text-foreground line-clamp-2 mb-2">
            {product.name}
          </h3>
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
              {isLoading ? 'Dodawanie...' : 'Dodaj'}
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
