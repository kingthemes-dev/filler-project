'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Eye, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useWishlist } from '@/hooks/use-wishlist';
import { useCartStore } from '@/stores/cart-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/utils/format-price';
import QuickViewModal from '@/components/ui/quick-view-modal';
import PageContainer from '@/components/ui/page-container';

export default function WishlistPage() {
  const { 
    items, 
    isLoading, 
    error, 
    removeItem, 
    clearWishlist, 
    loadFromServer 
  } = useWishlist();
  
  const { addItem, openCart } = useCartStore();
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  useEffect(() => {
    // Load wishlist from server on mount
    loadFromServer();
  }, [loadFromServer]);

  const handleAddToCart = async (item: any) => {
    try {
      await       addItem({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        sale_price: item.sale_price ? parseFloat(item.sale_price) : undefined,
        regular_price: parseFloat(item.regular_price),
        image: item.images[0]?.src || '/images/placeholder-product.jpg',
        permalink: item.permalink
      });
      openCart();
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const handleQuickView = (item: any) => {
    setSelectedProduct({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: item.price,
      regular_price: item.regular_price,
      sale_price: item.sale_price,
      images: item.images,
      stock_status: item.stock_status
    });
    setIsQuickViewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white py-8 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Ładowanie listy życzeń...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white py-8 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <div className="text-red-500 mb-4">
              <Heart className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Błąd ładowania</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={loadFromServer} variant="outline">
              Spróbuj ponownie
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white py-8 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Heart className="w-16 h-16 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Lista życzeń jest pusta</h2>
            <p className="text-gray-600 mb-6">
              Dodaj produkty do listy życzeń, klikając ikonę serca na kartach produktów
            </p>
            <Link href="/sklep">
              <Button>
                Przejdź do sklepu
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/sklep">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Powrót do sklepu
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lista życzeń</h1>
            <p className="text-gray-600">{items.length} {items.length === 1 ? 'produkt' : 'produktów'}</p>
          </div>
        </div>
        
        {items.length > 0 && (
          <Button 
            variant="outline" 
            onClick={clearWishlist}
            className="text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Wyczyść listę
          </Button>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200 rounded-xl overflow-hidden">
              <CardHeader className="p-0">
                <div className="relative">
                  <Link href={`/produkt/${item.slug}`}>
                    <div className="aspect-square relative overflow-hidden">
                      <Image
                        src={item.images[0]?.src || '/images/placeholder-product.jpg'}
                        alt={item.name}
                        width={300}
                        height={300}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Link>
                  
                  {/* Remove from wishlist button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 w-8 h-8 bg-white/80 hover:bg-white hover:shadow-md rounded-full flex items-center justify-center transition-all duration-150"
                  >
                    <Heart className="w-4 h-4 fill-current text-pink-500" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                <Link href={`/produkt/${item.slug}`}>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-gray-700 transition-colors">
                    {item.name}
                  </h3>
                </Link>
                
                <div className="flex items-center space-x-2 mb-3">
                  {item.sale_price && parseFloat(item.sale_price) < parseFloat(item.regular_price) ? (
                    <>
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(parseFloat(item.sale_price))}
                      </span>
                      <span className="text-sm text-gray-500 line-through">
                        {formatPrice(parseFloat(item.regular_price))}
                      </span>
                      <Badge variant="destructive" className="text-xs">
                        Promocja
                      </Badge>
                    </>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(parseFloat(item.price))}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    item.stock_status === 'instock' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.stock_status === 'instock' ? 'Dostępny' : 'Niedostępny'}
                  </span>
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0">
                <div className="flex space-x-2 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickView(item)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Podgląd
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(item)}
                    disabled={item.stock_status !== 'instock'}
                    className="flex-1"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Do koszyka
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick View Modal */}
      {selectedProduct && (
        <QuickViewModal
          isOpen={isQuickViewOpen}
          onClose={() => {
            setIsQuickViewOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
        />
      )}
    </PageContainer>
  );
}
