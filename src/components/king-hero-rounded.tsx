import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price?: string;
  sale_price?: string;
  images?: Array<{ src: string; alt: string }>;
  image?: string;
  categories?: Array<{ name: string }>;
  attributes?: Array<{ name: string; options: string[] }>;
  average_rating?: string;
  rating_count?: number;
  stock_status: string;
  featured?: boolean;
  on_sale?: boolean;
}

interface KingHeroRoundedProps {
  data?: {
    promocje?: Product[];
    polecane?: Product[];
    nowosci?: Product[];
  };
}

export default function KingHeroRounded({ data }: KingHeroRoundedProps) {
  // ARCHITECTURE FIX: Convert to Server Component - no client-side state or effects
  // Data is already provided from parent Server Component
  
  // Server-side product selection logic
  const selectFeaturedProduct = (): Product | null => {
    try {
      // Priority 1: Products on sale
      if (data?.promocje && data.promocje.length > 0) {
        const randomIndex = Math.floor(Math.random() * data.promocje.length);
        console.log('🎯 Hero: Found products on sale:', data.promocje.length);
        console.log('🎯 Hero: Selected product:', data.promocje[randomIndex].name);
        return data.promocje[randomIndex];
      }
      
      // Priority 2: Featured products
      if (data?.polecane && data.polecane.length > 0) {
        console.log('🎯 Hero: Using featured product:', data.polecane[0].name);
        return data.polecane[0];
      }
      
      // Priority 3: New products
      if (data?.nowosci && data.nowosci.length > 0) {
        console.log('🎯 Hero: Using first new product:', data.nowosci[0].name);
        return data.nowosci[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error selecting featured product:', error);
      return null;
    }
  };

  const featuredProduct = selectFeaturedProduct();
  const isLoading = !featuredProduct;

  const formatPrice = (price: string) => {
    return `${parseFloat(price).toFixed(2)} PLN`;
  };


  return (
    <section className="relative h-[60vh] sm:h-[65vh] lg:h-[68vh] min-h-[400px] sm:min-h-[450px] lg:min-h-[510px] py-4 mt-4 sm:mt-6 mb-6 sm:mb-8">
      <div className="max-w-[95vw] mx-auto px-4 sm:px-6 h-full">
        <div className="relative h-full rounded-2xl sm:rounded-3xl overflow-hidden">
          {/* Background Image - optimized for LCP - native img for fastest load */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hero/home.webp"
              alt="Hero background"
              fill
              priority
              quality={75}
              sizes="100vw"
              className="object-cover object-center"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 z-10" />
          </div>
          
          {/* Content */}
          <div className="relative z-20 h-full pl-4 sm:pl-8 md:pl-16 pt-8 sm:pt-16 md:pt-24 pr-4 sm:pr-8 md:pr-12 pb-8 md:pb-12">
            {/* Top Section - Text Content */}
            <div className="text-white space-y-3 sm:space-y-4 md:space-y-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold leading-tight">
                Hurtownia produktów<br />
                medycyny estetycznej
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-white/90 max-w-2xl leading-relaxed">
                Profesjonalne produkty do medycyny estetycznej, mezoterapii i zabiegów kosmetycznych.
                Najwyższa jakość, certyfikowane preparaty, kompleksowa obsługa.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button size="lg" asChild className="bg-white border-2 border-white text-black hover:bg-gray-100 hover:text-black text-base sm:text-lg md:text-xl px-6 sm:px-8 md:px-12 py-3 sm:py-4 md:py-6 rounded-xl sm:rounded-2xl transition-all duration-300">
                  <Link href="/sklep">
                    Zobacz produkty
                  </Link>
                </Button>
              </div>
            </div>

            {/* Bottom Section - Product Card */}
            <div className="hidden md:flex justify-center lg:justify-end absolute bottom-8 right-8 lg:bottom-12 lg:right-12">
              {isLoading ? (
                <div className="w-45 md:w-51 h-58 md:h-64 bg-white/10 rounded-2xl animate-pulse" />
              ) : featuredProduct ? (
                <Link href={`/produkt/${featuredProduct.slug}`} className="group block">
                <Card className="w-45 md:w-51 bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl overflow-hidden cursor-pointer transition-transform duration-200 group-hover:-translate-y-0.5">
                  <CardContent className="px-4 md:px-6 pt-1 pb-1">
                    {/* Product Name */}
                    <h2 className="text-xs md:text-sm font-semibold text-gray-900 line-clamp-2 leading-tight mb-3 md:mb-4">
                      {featuredProduct?.name || 'Produkt'}
                    </h2>

                    {/* Product Image */}
                    <div className="relative mb-3 md:mb-4">
                      <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden">
                                 <Image
                                   src={(() => {
                                     const imageUrl = featuredProduct?.images?.[0]?.src || featuredProduct?.image || '/placeholder-product.jpg';
                                     // Convert to higher quality image by replacing size suffix
                                     if (imageUrl.includes('-300x300.')) {
                                       return imageUrl.replace('-300x300.', '-600x600.');
                                     } else if (imageUrl.includes('-150x150.')) {
                                       return imageUrl.replace('-150x150.', '-600x600.');
                                     } else if (imageUrl.includes('-100x100.')) {
                                       return imageUrl.replace('-100x100.', '-600x600.');
                                     }
                                     return imageUrl;
                                   })()}
                          alt={featuredProduct?.name || 'Produkt'}
                          width={300}
                          height={300}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Note: Favorites functionality moved to client components */}
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-0">
                      <span className="text-xs md:text-sm font-bold text-gray-900">
                        {featuredProduct && formatPrice(featuredProduct.sale_price || featuredProduct.price)}
                      </span>
                      {featuredProduct?.regular_price && featuredProduct?.sale_price && (
                        <span className="text-xs text-gray-500 line-through">
                          {formatPrice(featuredProduct.regular_price)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </Link>
              ) : (
                <div className="w-80 h-96 bg-white/10 rounded-2xl flex items-center justify-center">
                  <p className="text-white/70">Brak produktów</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}