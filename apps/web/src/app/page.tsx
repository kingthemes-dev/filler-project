import Image from 'next/image';
import PageContainer from '@/components/ui/page-container';
import dynamicImport from 'next/dynamic';
import KingHeroRounded from '@/components/king-hero-rounded';
import { Button } from '@/components/ui/button';
import { Award, Truck, Headphones, Shield } from 'lucide-react';
import { Metadata } from 'next';

// Dynamic imports for below-the-fold components
const KingProductTabsServer = dynamicImport(() => import('@/components/king-product-tabs-server'));
const NewsletterForm = dynamicImport(() => import('@/components/ui/newsletter-form'));
const Threads = dynamicImport(() => import('@/components/ui/threads'));

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



      {/* Newsletter Section with Threads Animation */}
      <section className="py-16 sm:py-24" id="newsletter-section">
        <PageContainer>
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-gray-900 via-black to-gray-800 min-h-[500px]">
            {/* Background Image - Desktop Only */}
            <div className="absolute inset-0 z-0 hidden md:block">
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: 'url(/images/hero/newslettter.webp?v=' + Date.now() + ')',
                  filter: 'brightness(0.3) contrast(1.2)'
                }}
              />
            </div>
            
            {/* Threads Animation Background - Desktop Only */}
            <div className="absolute inset-0 z-10 hidden md:block">
              <Threads
                color={[1, 1, 1]} // White color like on screen
                amplitude={2.6}
                distance={0.3}
                enableMouseInteraction={true}
              />
              {/* Overlay for better text readability - but allow mouse interaction */}
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            </div>
            
            {/* Mobile Fallback - Simple CSS Animation */}
            <div className="absolute inset-0 z-0 md:hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-800">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)] animate-pulse"></div>
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_50%,transparent_75%)] bg-[length:20px_20px] animate-pulse"></div>
              </div>
              {/* Overlay for better text readability */}
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
            </div>
            
            {/* Content */}
            <div className="relative z-10 flex items-center justify-center h-[500px] px-6 sm:px-8">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 sm:mb-4">
                  Zapisz się i odbierz 10% zniżki na pierwsze zakupy
                </h2>
                <p className="text-sm sm:text-base text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto">
                  Zapisz się do naszego newslettera i otrzymuj informacje o nowych produktach i promocjach
                </p>
                <div className="max-w-lg mx-auto">
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
                Konkurencyjne ceny
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Atrakcyjne ceny dzięki bezpośredniej współpracy z producentami. Częste promocje i specjalne oferty dla stałych klientów.
              </p>
            </div>
            
            {/* Delivery */}
            <div className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                <Truck className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Szybka realizacja
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Realizacja zamówień w ciągu 24h. Specjalistyczny transport dla produktów wymagających kontroli temperatury.
              </p>
            </div>
            
            {/* Support */}
            <div className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                <Headphones className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Eksperckie doradztwo
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Zespół specjalistów gotowy do udzielenia fachowej pomocy w wyborze produktów dostosowanych do potrzeb Twojego gabinetu.
              </p>
            </div>

            {/* Originality */}
            <div className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                <Shield className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Certyfikowane produkty
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Wszystkie preparaty posiadają odpowiednie certyfikaty i pochodzą wyłącznie od autoryzowanych dystrybutorów.
              </p>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
