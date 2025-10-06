import Image from 'next/image';
import dynamic from 'next/dynamic';
import KingHeroRounded from '@/components/king-hero-rounded';
import { Button } from '@/components/ui/button';
import { Star, TrendingUp, Zap } from 'lucide-react';

// Dynamic imports for below-the-fold components
const KingProductTabsServer = dynamic(() => import('@/components/king-product-tabs-server'));
const NewsletterForm = dynamic(() => import('@/components/ui/newsletter-form'));

// ISR - Incremental Static Regeneration
export const revalidate = 300; // 5 minutes

// Server-side data fetching
async function getHomeFeedData() {
  try {
    // Import the API function directly instead of using fetch
    const { GET } = await import('@/app/api/home-feed/route');
    const response = await GET();
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch home feed data:', error);
    // Return empty data on error
    return {
      nowosci: [],
      promocje: [],
      polecane: [],
      bestsellery: []
    };
  }
}

export default async function HomePage() {
  // Fetch data on server-side
  const homeFeedData = await getHomeFeedData();
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <KingHeroRounded data={homeFeedData} />



      {/* Product Tabs - Server Component with data */}
      <KingProductTabsServer data={homeFeedData} />



      {/* Newsletter Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
              <Image
                src="/images/hero/newslettter.webp"
                alt="Newsletter - bądź na bieżąco"
                fill
                className="object-cover object-center"
                sizes="100vw"
                priority
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/50" />
            </div>
            
            {/* Content */}
            <div className="relative z-10 py-12 sm:py-16 px-6 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            Zapisz się i odbierz 10% zniżki na pierwsze zakupy
          </h2>
          <p className="text-sm sm:text-base text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Zapisz się do naszego newslettera i otrzymuj informacje o nowych produktach i promocjach
          </p>
          <NewsletterForm />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {/* Quality */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center group-hover:border-black transition-colors duration-300">
                  <Star className="w-8 h-8 text-gray-600 group-hover:text-black transition-colors duration-300" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Najwyższa jakość
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Wszystkie nasze produkty przechodzą rygorystyczną kontrolę jakości
              </p>
            </div>
            
            {/* Delivery */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center group-hover:border-black transition-colors duration-300">
                  <TrendingUp className="w-8 h-8 text-gray-600 group-hover:text-black transition-colors duration-300" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Szybka dostawa
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Gwarantujemy szybką i bezpieczną dostawę do Twojego domu
              </p>
            </div>
            
            {/* Support */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center group-hover:border-black transition-colors duration-300">
                  <Zap className="w-8 h-8 text-gray-600 group-hover:text-black transition-colors duration-300" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Obsługa 24/7
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Nasz zespół jest dostępny 24/7, aby Ci pomóc
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
