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

  const formatPriceInline = (price: string) => {
    return `${parseFloat(price).toFixed(2)} PLN`;
  };


  return (
    <section className="relative h-auto min-h-[600px] sm:min-h-[650px] lg:min-h-[700px] mt-[24px] rounded-2xl sm:rounded-3xl overflow-hidden">
      <div className="absolute inset-0 h-full">
        <div className="relative h-full overflow-hidden">
          {/* Background Image - optimized for LCP - native img for fastest load */}
          <div className="absolute inset-0 z-0">
            <img
              src="/images/hero/hero-bg.webp"
              alt="Hero background"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width="1920"
              height="1080"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 z-10" />
          </div>
          
          {/* Content */}
          <div className="relative z-20 h-full flex flex-col justify-center md:justify-start items-center md:items-start text-center md:text-left px-4 sm:px-6 md:px-8 lg:px-12 pt-[50px] md:pt-[50px]">
            {/* Text Content - Centered on mobile, Left aligned on desktop */}
            <div className="text-white space-y-6 sm:space-y-8 md:space-y-6 max-w-4xl md:max-w-2xl">
              <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-5xl font-normal leading-tight">
                Hurtownia produktów<br />
                medycyny estetycznej
              </h1>

              <p className="text-sm sm:text-sm md:text-sm text-white/90 max-w-3xl md:max-w-2xl mx-auto md:mx-0 leading-relaxed">
                Profesjonalne produkty do medycyny estetycznej, mezoterapii i zabiegów kosmetycznych.
                Najwyższa jakość, certyfikowane preparaty, kompleksowa obsługa.
              </p>

              <div className="flex justify-center md:justify-start">
                <Button size="lg" asChild className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black text-lg sm:text-xl md:text-xl px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl transition-all duration-300">
                  <Link href="/sklep">
                    Zobacz produkty
                  </Link>
                </Button>
              </div>
            </div>

            {/* Bottom Section - Product Card */}
            <div className="hidden md:flex justify-center lg:justify-end absolute bottom-4 right-4 lg:bottom-6 lg:right-6">
              {featuredProduct ? (
                <div className="group block">
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

                      {/* Discount Badge */}
                      {featuredProduct?.regular_price && featuredProduct?.sale_price && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            -{Math.round(((parseFloat(featuredProduct.regular_price) - parseFloat(featuredProduct.sale_price)) / parseFloat(featuredProduct.regular_price)) * 100)}%
                          </span>
                        </div>
                      )}

                      {/* Note: Favorites functionality moved to client components */}
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-0">
                      <span className="text-xs md:text-sm font-bold text-gray-900">
                        {featuredProduct && formatPriceInline(featuredProduct.sale_price || featuredProduct.price)}
                      </span>
                      {featuredProduct?.regular_price && featuredProduct?.sale_price && (
                        <span className="text-xs text-gray-500 line-through">
                          {formatPriceInline(featuredProduct.regular_price)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </Link>
                </div>
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