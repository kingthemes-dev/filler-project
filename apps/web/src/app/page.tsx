import Image from 'next/image';
import dynamic from 'next/dynamic';
import KingHeroRounded from '@/components/king-hero-rounded';
import { Button } from '@/components/ui/button';
import { Award, Truck, Headphones, Shield } from 'lucide-react';

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
            <div className="relative z-10 py-12 sm:py-16 px-6 sm:px-8 text-left">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
                  Zapisz się i odbierz 10% zniżki na pierwsze zakupy
                </h2>
                <p className="text-sm sm:text-base text-white/90 mb-6 sm:mb-8 max-w-2xl">
                  Zapisz się do naszego newslettera i otrzymuj informacje o nowych produktach i promocjach
                </p>
                <div className="max-w-2xl">
                  <NewsletterForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section>
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {/* Quality */}
            <div className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                <Award className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Najlepsze ceny
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Najkorzystniejsza oferta na rynku. Regularne promocje i kody rabatowe.
              </p>
            </div>
            
            {/* Delivery */}
            <div className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                <Truck className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Niezawodna dostawa
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Wysyłka w 1 dzień roboczy. Możliwość zamówienia transportu medycznego.
              </p>
            </div>
            
            {/* Support */}
            <div className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                <Headphones className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Profesjonalne wsparcie
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Masz pytanie? Skontaktuj się z nami i porozmawiaj z ekspertem.
              </p>
            </div>

            {/* Originality */}
            <div className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                <Shield className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Gwarancja oryginalności
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Szeroka oferta oryginalnych preparatów prosto od producentów i oficjalnych dystrybutorów.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
