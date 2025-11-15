import dynamicImport from 'next/dynamic';
import KingHeroRounded from '@/components/king-hero-rounded';
import { Award, Truck, Headphones, Shield } from 'lucide-react';
import { Metadata } from 'next';

// Dynamic imports for below-the-fold components
const KingProductTabsServer = dynamicImport(
  () => import('@/components/king-product-tabs-server')
);
const NewsletterForm = dynamicImport(
  () => import('@/components/ui/newsletter-form')
);

// ISR - Incremental Static Regeneration
export const revalidate = 300; // 5 minutes
export const dynamic = 'force-static';

// Generate metadata for homepage
export const metadata: Metadata = {
  title: 'FILLER: Hurtownia Medycyny Estetycznej Gdańsk, Gdynia, Pomorskie',
  description:
    'Filler to miejsce gdzie znajdziesz profesjonalne produkty medycyny estetycznej. Najlepsze ceny, szybka dostawa, gwarancja oryginalności. Sprawdź naszą ofertę!',
  keywords: [
    'hurtownia medycyny estetycznej',
    'produkty medycyny estetycznej',
    'filler',
    'kosmetyki profesjonalne',
    'mezoterapia',
    'nici',
    'peelingi',
    'stymulatory',
    'wypełniacz',
    'urządzenia',
  ],
  openGraph: {
    title: 'FILLER: Hurtownia Medycyny Estetycznej Gdańsk, Gdynia, Pomorskie',
    description:
      'Filler to miejsce gdzie znajdziesz profesjonalne produkty medycyny estetycznej. Najlepsze ceny, szybka dostawa, gwarancja oryginalności.',
    type: 'website',
    locale: 'pl_PL',
    siteName: 'FILLER',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FILLER: Hurtownia Medycyny Estetycznej Gdańsk, Gdynia, Pomorskie',
    description:
      'Filler to miejsce gdzie znajdziesz profesjonalne produkty medycyny estetycznej. Najlepsze ceny, szybka dostawa, gwarancja oryginalności.',
  },
  alternates: {
    canonical: '/',
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
      bestsellery: Array.isArray(data.bestsellery) ? data.bestsellery : [],
    };
  } catch (error) {
    console.error('Failed to fetch home feed data:', error);
    // Return empty data on error with proper structure
    return {
      nowosci: [],
      promocje: [],
      polecane: [],
      bestsellery: [],
    };
  }
}

export default async function HomePage() {
  // Fetch data on server-side
  const homeFeedData = await getHomeFeedData();
  return (
    <div className="min-h-screen bg-white pt-14 sm:pt-16">
      {/* Global wrapper for consistent margins and border-radius */}
      <div className="mx-4 sm:mx-4 md:mx-6 lg:mx-8">
        {/* Hero Section */}
        <KingHeroRounded data={homeFeedData} />

        {/* Product Tabs - Server Component with data */}
        <KingProductTabsServer data={homeFeedData} />

        {/* Newsletter Section with Dark Gradient Background */}
        <section className="mt-2 py-8 sm:py-12" id="newsletter-section">
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl min-h-[500px]">
            {/* Dark Gradient Background - Senior Level Design */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-black via-purple-900/80 to-pink-900/80">
              {/* Additional gradient layers for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-pink-500/10" />
            </div>

            {/* Subtle pattern overlay for texture */}
            <div className="absolute inset-0 z-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }} />

            {/* Overlay for better text readability */}
            <div className="absolute inset-0 z-10 bg-black/30 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 flex items-center justify-center h-[500px] px-6 sm:px-8">
              <div className="max-w-4xl mx-auto text-center w-full">
                <h2 className="text-xl sm:text-2xl lg:text-2xl font-bold text-white mb-6 sm:mb-8 drop-shadow-lg whitespace-nowrap">
                  Zapisz się i zyskaj 10% rabatu na następne zamówienie
                </h2>
                <div className="max-w-2xl mx-auto w-full">
                  <NewsletterForm />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Quality */}
            <div className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                <Award
                  className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="content-subheading font-semibold text-gray-900 mb-2">
                Konkurencyjne ceny
              </h3>
              <p className="content-text text-gray-600 leading-relaxed">
                Atrakcyjne ceny dzięki bezpośredniej współpracy z producentami.
                Częste promocje i specjalne oferty dla stałych klientów.
              </p>
            </div>

            {/* Delivery */}
            <div className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                <Truck
                  className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="content-subheading font-semibold text-gray-900 mb-2">
                Szybka realizacja
              </h3>
              <p className="content-text text-gray-600 leading-relaxed">
                Realizacja zamówień w ciągu 24h. Specjalistyczny transport dla
                produktów wymagających kontroli temperatury.
              </p>
            </div>

            {/* Support */}
            <div className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                <Headphones
                  className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="content-subheading font-semibold text-gray-900 mb-2">
                Eksperckie doradztwo
              </h3>
              <p className="content-text text-gray-600 leading-relaxed">
                Zespół specjalistów gotowy do udzielenia fachowej pomocy w
                wyborze produktów dostosowanych do potrzeb Twojego gabinetu.
              </p>
            </div>

            {/* Originality */}
            <div className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                <Shield
                  className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="content-subheading font-semibold text-gray-900 mb-2">
                Certyfikowane produkty
              </h3>
              <p className="content-text text-gray-600 leading-relaxed">
                Wszystkie preparaty posiadają odpowiednie certyfikaty i pochodzą
                wyłącznie od autoryzowanych dystrybutorów.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
