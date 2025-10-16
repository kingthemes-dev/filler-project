import Image from 'next/image';
import PageContainer from '@/components/ui/page-container';
import dynamic from 'next/dynamic';
import KingHeroRounded from '@/components/king-hero-rounded';
import { Button } from '@/components/ui/button';
import { Award, Truck, Headphones, Shield } from 'lucide-react';
import { Metadata } from 'next';

// Dynamic imports for below-the-fold components
const KingProductTabsServer = dynamic(() => import('@/components/king-product-tabs-server'));
const NewsletterForm = dynamic(() => import('@/components/ui/newsletter-form'));

// ISR - Incremental Static Regeneration
export const revalidate = 300; // 5 minutes
export const dynamic = 'force-static';

// Generate metadata for homepage
export const metadata: Metadata = {
  title: "Hurtownia Medycyny Estetycznej - TOP Produkty - FILLER",
  description: "Filler to miejsce gdzie znajdziesz profesjonalne produkty medycyny estetycznej. Najlepsze ceny, szybka dostawa, gwarancja oryginalności. Sprawdź naszą ofertę!",
  keywords: [
    "hurtownia medycyny estetycznej",
    "produkty medycyny estetycznej", 
    "filler",
    "kosmetyki profesjonalne",
    "mezoterapia",
    "nici",
    "peelingi",
    "stymulatory",
    "wypełniacz",
    "urządzenia"
  ],
  openGraph: {
    title: "Hurtownia Medycyny Estetycznej - TOP Produkty - FILLER",
    description: "Filler to miejsce gdzie znajdziesz profesjonalne produkty medycyny estetycznej. Najlepsze ceny, szybka dostawa, gwarancja oryginalności.",
    type: "website",
    locale: "pl_PL",
    siteName: "FILLER",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hurtownia Medycyny Estetycznej - TOP Produkty - FILLER",
    description: "Filler to miejsce gdzie znajdziesz profesjonalne produkty medycyny estetycznej. Najlepsze ceny, szybka dostawa, gwarancja oryginalności.",
  },
  alternates: {
    canonical: "/",
  },
};

// Server-side data fetching with proper error handling
async function getHomeFeedData() {
  try {
    // Import the API function directly instead of using fetch
    const { GET } = await import('@/app/api/home-feed/route');
    const response = await GET();
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data structure received');
    }

    return {
      nowosci: Array.isArray(data.nowosci) ? data.nowosci : [],
      promocje: Array.isArray(data.promocje) ? data.promocje : [],
      polecane: Array.isArray(data.polecane) ? data.polecane : [],
      bestsellery: Array.isArray(data.bestsellery) ? data.bestsellery : []
    };
  } catch (error) {
    console.error('Failed to fetch home feed data:', error);
    // Return empty data on error with proper structure
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
        <PageContainer>
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
        </PageContainer>
      </section>

      {/* Features Section */}
      <section>
        <PageContainer>
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
        </PageContainer>
      </section>
    </div>
  );
}
