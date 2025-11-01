import { Suspense } from 'react';
import ShopClient from './shop-client';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Metadata } from 'next';
import { getFirstProductImageUrl } from '@/components/product-image-server-preload';

// PRO: Static generation with ISR for better performance
export const revalidate = 300; // 5 minutes
export const dynamic = 'force-static';

// Generate metadata for shop pages
// 🚀 OPTIMIZATION: Uproszczone metadata bez fetchów podczas SSR - szybsze renderowanie
export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string>> }): Promise<Metadata> {
  const params = await searchParams;
  const category = params?.category || '';
  
  // Statyczne metadata dla szybkości - fetch opcjonalny tylko jeśli potrzebny
  // Fetch tylko dla kategorii (nie blokuje głównego renderowania)
  let categoryData = null;
  if (category) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 
        (process.env.NODE_ENV === 'production' ? 'https://www.filler.pl' : 'http://localhost:3000');
      const res = await fetch(`${baseUrl}/api/woocommerce?endpoint=products/categories`, {
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(3000) // Zredukowany z 5s do 3s
      });
      if (res.ok) {
        const categories = await res.json();
        categoryData = categories?.find((cat: any) => cat.slug === category);
      }
    } catch {
      // Ignore - użyj fallback metadata
    }
  }
  
  const title = categoryData 
    ? `${categoryData.name} - Hurtownia Medycyny Estetycznej | FILLER`
    : 'Sklep - Hurtownia Medycyny Estetycznej | FILLER';
  
  const description = categoryData
    ? `Odkryj najlepsze produkty z kategorii ${categoryData.name} w naszej hurtowni medycyny estetycznej. Profesjonalne produkty w najlepszych cenach.`
    : 'Odkryj pełną ofertę produktów medycyny estetycznej w naszej hurtowni. Najlepsze ceny, profesjonalne produkty, szybka dostawa.';

  try {
    return {
      title,
      description,
      keywords: [
        'hurtownia medycyny estetycznej',
        'sklep medycyny estetycznej',
        'produkty medycyny estetycznej',
        'filler',
        ...(categoryData ? [categoryData.name] : [])
      ],
      openGraph: {
        title,
        description,
        type: 'website',
        siteName: 'FILLER',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
      alternates: {
        canonical: category ? `/sklep?category=${category}` : '/sklep',
      },
    };
  } catch (error) {
    console.error('Error generating metadata for shop:', error);
    return {
      title: 'Sklep - FILLER',
      description: 'Hurtownia medycyny estetycznej FILLER',
    };
  }
}

export default async function ShopPage({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const qc = new QueryClient();
  const defaultCategory = params?.category || '';
  
  // Prefetch first page of products (respect default category if present)
  const initialFilters = {
    search: '',
    categories: defaultCategory ? [defaultCategory] : [],
    brands: [],
    minPrice: -1,
    maxPrice: -1,
    inStock: false,
    onSale: false,
    sortBy: 'date' as const,
    sortOrder: 'desc' as const
  };
  
  const baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 
    (process.env.NODE_ENV === 'production' ? 'https://www.filler.pl' : 'http://localhost:3000');
  
  try {
    // 🚀 OPTIMIZATION: Równoległe prefetche zamiast sekwencyjnych - redukcja czasu oczekiwania
    // Równolegle: shop data (products) + categories + attributes (tylko jeśli nie ma defaultCategory)
    const shopParams = new URLSearchParams();
    shopParams.append('endpoint', 'shop');
    shopParams.append('page', '1');
    shopParams.append('per_page', '8'); // 🚀 PRIORITY 2: Smaller initial payload (~30% mniej danych)
    if (defaultCategory) shopParams.append('category', defaultCategory);
    shopParams.append('orderby', initialFilters.sortBy);
    shopParams.append('order', initialFilters.sortOrder);
    
    // Server-side initial payload for instant render (critical path)
    let initialShopData: any = { products: [], total: 0, categories: [] };
    
    // Równoległe prefetche - wszystkie naraz zamiast sekwencyjnie
    const [shopDataRes] = await Promise.allSettled([
      // 1. Critical: Shop products data (główne produkty - najważniejsze)
      fetch(`/api/woocommerce?${shopParams.toString()}`, {
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(5000) // Zredukowany z 10s do 5s
      }),
    ]);
    
    // Przetwórz wynik shop data
    if (shopDataRes.status === 'fulfilled' && shopDataRes.value.ok) {
      initialShopData = await shopDataRes.value.json();
    }
    
    // Prefetch dla React Query cache (non-blocking, równoległe)
    const prefetchPromises = [
      // Shop products query cache
      qc.prefetchQuery({
        queryKey: ['shop','products',{ page: 1, perPage: 8, filters: JSON.stringify(initialFilters) }], // 🚀 PRIORITY 2: Smaller payload
        queryFn: async () => {
          const res = await fetch(`/api/woocommerce?${shopParams.toString()}`, { 
            next: { revalidate: 30 },
            signal: AbortSignal.timeout(5000)
          });
          if (!res.ok) return { products: [], total: 0, categories: [] };
          return res.json();
        },
        staleTime: 2 * 60_000, // 2 minuty cache
        retry: 1,
        retryDelay: 500,
      }),
      // Categories cache (mniej krytyczne - można lazy load)
      qc.prefetchQuery({
        queryKey: ['shop','categories'],
        queryFn: async () => {
          const res = await fetch(`${baseUrl}/api/woocommerce?endpoint=products/categories`, {
            next: { revalidate: 600 },
            signal: AbortSignal.timeout(3000) // Zredukowany z 5s do 3s
          });
          if (!res.ok) return [];
          return res.json();
        },
        staleTime: 30 * 60_000, // 🚀 PRIORITY 1: 30 minut cache (kategorie rzadko się zmieniają)
        gcTime: 60 * 60_000, // 1 godzina garbage collection
        retry: 1,
        retryDelay: 500,
      }),
    ];
    
    // Attributes tylko jeśli nie ma kategorii (bo mogą być duże)
    if (!defaultCategory) {
      prefetchPromises.push(
        qc.prefetchQuery({
          queryKey: ['shop','attributes',{ categories: [], search: '', min: 0, max: 10000, selected: [] }],
          queryFn: async () => {
            const params = new URLSearchParams();
            params.append('endpoint', 'attributes');
            const res = await fetch(`/api/woocommerce?${params.toString()}`, { 
              next: { revalidate: 600 },
              signal: AbortSignal.timeout(5000)
            });
            if (!res.ok) return {};
            return res.json();
          },
          staleTime: 30 * 60_000, // 🚀 PRIORITY 1: 30 minut cache (atrybuty rzadko się zmieniają)
          gcTime: 60 * 60_000, // 1 godzina garbage collection
          retry: 1,
          retryDelay: 500,
        })
      );
    }
    
    // Wykonaj wszystkie prefetche równolegle (non-blocking)
    Promise.allSettled(prefetchPromises).catch(() => {
      // Ignore prefetch errors - dane będą fetched lazy
    });

    const dehydratedState = dehydrate(qc);

    // 🚀 LCP Optimization: Server-side preload dla pierwszego obrazu produktu
    const firstProductImage = initialShopData?.products?.length > 0 
      ? getFirstProductImageUrl(initialShopData.products)
      : null;

    return (
      <>
        {/* 🚀 LCP Optimization: Preload pierwszego obrazu produktu (server-side, nie blokuje FCP) */}
        {firstProductImage && (
          <link
            rel="preload"
            as="image"
            href={firstProductImage}
            fetchPriority="high"
          />
        )}
        <HydrationBoundary state={dehydratedState}>
          <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
            </div>
          }>
            <ShopClient initialShopData={initialShopData} />
          </Suspense>
        </HydrationBoundary>
      </>
    );
  } catch (error) {
    console.error('Error in ShopPage SSR:', error);
    
    // Return error state with proper hydration
    const dehydratedState = dehydrate(qc);
    
    return (
      <HydrationBoundary state={dehydratedState}>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto mobile-container">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Błąd ładowania sklepu
            </h1>
            <p className="text-gray-600 mb-6">
              Wystąpił problem z połączeniem do sklepu. Spróbuj ponownie za chwilę.
            </p>
            <a 
              href="/sklep" 
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Odśwież stronę
            </a>
          </div>
        </div>
      </HydrationBoundary>
    );
  }
}