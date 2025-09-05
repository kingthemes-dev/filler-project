'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart } from 'lucide-react';
import { useFavoritesStore } from '@/stores/favorites-store';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price?: string;
  sale_price?: string;
  images: Array<{ src: string; alt: string }>;
  categories: Array<{ name: string }>;
  attributes: Array<{ name: string; options: string[] }>;
  average_rating?: string;
  rating_count?: number;
  stock_status: string;
  featured?: boolean;
  on_sale?: boolean;
}

export default function KingHeroRounded() {
  const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Safely access store with error handling
  let addToFavorites: (product: any) => void, favorites: any[];
  try {
    const store = useFavoritesStore();
    addToFavorites = store.addToFavorites;
    favorites = store.favorites;
  } catch (error) {
    console.warn('Favorites store not available:', error);
    addToFavorites = () => {};
    favorites = [];
  }

  useEffect(() => {
    const fetchFeaturedProduct = async () => {
      try {
        // Najpierw spróbuj produkty z promocji
        let response = await fetch('/api/woocommerce?endpoint=products&on_sale=true&per_page=5');
        let data = await response.json();
        
        // API zwraca bezpośrednio tablicę produktów, nie obiekt z success
        if (Array.isArray(data) && data.length > 0) {
          // Wybierz losowy produkt z promocji
          const randomIndex = Math.floor(Math.random() * data.length);
          console.log('🎯 Hero: Found products on sale:', data.length);
          console.log('🎯 Hero: Selected product:', data[randomIndex].name);
          setFeaturedProduct(data[randomIndex]);
        } else {
          // Jeśli brak promocji, spróbuj featured
          response = await fetch('/api/woocommerce?endpoint=products&featured=true&per_page=1');
          data = await response.json();
          
          if (Array.isArray(data) && data.length > 0) {
            console.log('🎯 Hero: Using featured product:', data[0].name);
            setFeaturedProduct(data[0]);
          } else {
            // Jeśli brak featured, weź pierwszy dostępny
            response = await fetch('/api/woocommerce?endpoint=products&per_page=1');
            data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
              console.log('🎯 Hero: Using fallback product:', data[0].name);
              setFeaturedProduct(data[0]);
            } else {
              console.log('🎯 Hero: No products found at all');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching featured product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProduct();
  }, []);

  const handleAddToFavorites = (product: Product) => {
    addToFavorites(product);
  };


  const isFavorite = (productId: number) => {
    return favorites.some(fav => fav.id === productId);
  };

  const formatPrice = (price: string) => {
    return `${parseFloat(price).toFixed(2)} PLN`;
  };


  return (
    <section className="relative h-[68vh] min-h-[510px] py-8 mx-6 rounded-t-3xl">
      <div className="max-w-[95vw] mx-auto px-6 h-full">
        <div className="relative h-full rounded-3xl overflow-hidden">
          {/* Background Video */}
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover object-center"
            >
              <source src="/cosmetic-cream-bg.webm" type="video/webm" />
            </video>
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 z-10" />
          </div>
          
          {/* Content */}
          <div className="relative z-20 h-full flex flex-col pl-8 md:pl-16 pt-16 md:pt-24 pr-8 md:pr-12 pb-8 md:pb-12">
            {/* Top Section - Text Content */}
            <div className="text-white space-y-4 md:space-y-6 flex-1">
              <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold leading-tight">
                Hurtownia produktów<br />
                medycyny estetycznej
              </h1>

              <p className="text-base md:text-lg text-white/90 max-w-2xl leading-relaxed">
                Profesjonalne produkty do medycyny estetycznej, mezoterapii i zabiegów kosmetycznych.
                Najwyższa jakość, certyfikowane preparaty, kompleksowa obsługa.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="bg-white border-2 border-white text-black hover:bg-gray-100 hover:text-black text-lg md:text-xl px-8 md:px-12 py-4 md:py-6 rounded-2xl transition-all duration-300">
                  <Link href="/sklep">
                    Zobacz produkty
                  </Link>
                </Button>
              </div>
            </div>

            {/* Product Card - Fixed positioning */}
            <div className="hidden md:block absolute bottom-8 right-8 lg:bottom-12 lg:right-12">
              {isLoading ? (
                <div className="w-56 md:w-64 h-72 md:h-80 bg-white/10 rounded-2xl animate-pulse" />
              ) : featuredProduct ? (
                <Link href={`/produkt/${featuredProduct.slug}`}>
                  <Card className="w-56 md:w-64 bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 cursor-pointer">
                    <CardContent className="px-4 md:px-6 pt-1 pb-1">
                      {/* Product Name */}
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 line-clamp-2 leading-tight mb-3 md:mb-4 hover:text-black transition-colors">
                        {featuredProduct?.name || 'Produkt'}
                      </h3>

                      {/* Product Image */}
                      <div className="relative mb-3 md:mb-4">
                        <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden">
                          <Image
                            src={featuredProduct?.images?.[0]?.src || '/placeholder-product.jpg'}
                            alt={featuredProduct?.name || 'Produkt'}
                            width={300}
                            height={300}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          featuredProduct && handleAddToFavorites(featuredProduct);
                        }}
                        className="absolute top-2 md:top-3 right-2 md:right-3 p-1.5 md:p-2 bg-white/90 rounded-full shadow-md hover:bg-white transition-colors z-10"
                      >
                        <Heart
                          className={`w-3.5 md:w-4 h-3.5 md:h-4 ${
                            featuredProduct && isFavorite(featuredProduct.id)
                              ? 'fill-red-500 text-red-500'
                              : 'text-gray-600'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-0">
                      <span className="text-lg md:text-xl font-bold text-gray-900">
                        {featuredProduct && formatPrice(featuredProduct.sale_price || featuredProduct.price)}
                      </span>
                      {featuredProduct?.regular_price && featuredProduct?.sale_price && (
                        <span className="text-base md:text-lg text-gray-500 line-through">
                          {formatPrice(featuredProduct.regular_price)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </Link>
              ) : (
                <div className="w-56 md:w-64 h-72 md:h-80 bg-white/10 rounded-2xl flex items-center justify-center">
                  <p className="text-white/70 text-sm">Brak produktów</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}