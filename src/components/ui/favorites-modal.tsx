'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ShoppingCart, Eye, Trash2 } from 'lucide-react';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import wooCommerceService from '@/services/woocommerce-optimized';
import { WooProduct } from '@/types/woocommerce';
import Image from 'next/image';
import Link from 'next/link';

export default function FavoritesModal() {
  const { 
    favorites, 
    isModalOpen, 
    closeFavoritesModal, 
    removeFromFavorites,
    clearFavorites,
    isLoading,
    lastSyncTime
  } = useFavoritesStore();
  
  const { addItem, openCart } = useCartStore();

  const handleAddToCart = (product: WooProduct) => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      regular_price: parseFloat(product.regular_price),
      sale_price: parseFloat(product.sale_price),
      image: wooCommerceService.getProductImageUrl(product, 'medium'),
      permalink: `/produkt/${product.slug}`,
    };

    console.log('🛒 Adding to cart from favorites:', cartItem);
    addItem(cartItem);
    openCart();
  };

  const handleRemoveFromFavorites = (productId: number) => {
    removeFromFavorites(productId);
  };

  const handleClearAll = () => {
    if (confirm('Czy na pewno chcesz usunąć wszystkie ulubione produkty?')) {
      clearFavorites();
    }
  };

  return (
    <AnimatePresence>
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeFavoritesModal}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Heart className="w-6 h-6 text-red-500 fill-current" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    Moje ulubione
                  </h2>
                  <Badge variant="secondary" className="ml-2">
                    {favorites.length}
                  </Badge>
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {favorites.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAll}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Wyczyść wszystkie
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeFavoritesModal}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Brak ulubionych produktów
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Dodaj produkty do ulubionych, klikając ikonę serca
                    </p>
                    <Button onClick={closeFavoritesModal}>
                      Kontynuuj zakupy
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((product) => {
                      const isOnSale = wooCommerceService.isProductOnSale(product);
                      const discount = wooCommerceService.getProductDiscount(product);
                      const imageUrl = wooCommerceService.getProductImageUrl(product, 'medium');
                      const price = wooCommerceService.formatPrice(product.price);
                      const regularPrice = wooCommerceService.formatPrice(product.regular_price);

                      return (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                        >
                          {/* Product Image */}
                          <div className="relative aspect-square bg-gray-100">
                            <Image
                              src={imageUrl}
                              alt={product.name}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                            />
                            {isOnSale && (
                              <Badge 
                                variant="destructive" 
                                className="absolute top-2 left-2"
                              >
                                -{discount}%
                              </Badge>
                            )}
                            <button
                              onClick={() => handleRemoveFromFavorites(product.id)}
                              className="absolute top-2 right-2 w-8 h-8 bg-white/80 hover:bg-white hover:shadow-md rounded-full flex items-center justify-center transition-all duration-150"
                            >
                              <Heart className="w-4 h-4 fill-current text-red-500" />
                            </button>
                          </div>

                          {/* Product Info */}
                          <div className="p-4">
                            <div className="text-sm text-gray-500 mb-1">
                              {product.categories && product.categories.length > 0 
                                ? product.categories[0].name 
                                : 'Bez kategorii'
                              }
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                              {product.name}
                            </h3>
                            
                            {/* Price */}
                            <div className="mb-4">
                              {isOnSale ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-foreground">{price}</span>
                                  <span className="text-sm text-muted-foreground line-through">{regularPrice}</span>
                                </div>
                              ) : (
                                <span className="text-lg font-bold text-foreground">{price}</span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                asChild
                              >
                                <Link href={`/produkt/${product.slug}`}>
                                  <Eye className="w-4 h-4 mr-1" />
                                  Zobacz
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => handleAddToCart(product)}
                              >
                                <ShoppingCart className="w-4 h-4 mr-1" />
                                Do koszyka
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {favorites.length > 0 && (
                <div className="border-t border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {favorites.length} {favorites.length === 1 ? 'produkt' : 'produktów'} w ulubionych
                    </div>
                    <Button onClick={closeFavoritesModal}>
                      Zamknij
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
