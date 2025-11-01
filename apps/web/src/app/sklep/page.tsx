import { Suspense } from 'react';
import ShopClient from './shop-client';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { Metadata } from 'next';

// PRO: Static generation with ISR for better performance
export const revalidate = 300; // 5 minutes
export const dynamic = 'force-static';

// Generate metadata for shop pages
export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string>> }): Promise<Metadata> {
  const params = await searchParams;
  const category = params?.category || '';
  
  // Use static metadata to avoid fetch issues in generateMetadata
  const baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 
    (process.env.NODE_ENV === 'production' ? 'https://www.filler.pl' : 'http://localhost:3000');
  
  try {
    // Try to fetch categories from API with full URL
    let categoryData = null;
    try {
      const res = await fetch(`${baseUrl}/api/woocommerce?endpoint=products/categories`, {
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const categories = await res.json();
        categoryData = categories?.find((cat: any) => cat.slug === category);
      }
    } catch (apiError) {
      console.warn('Could not fetch categories for metadata:', apiError);
    }
    
    const title = categoryData 
      ? `${categoryData.name} - Hurtownia Medycyny Estetycznej | FILLER`
      : 'Sklep - Hurtownia Medycyny Estetycznej | FILLER';
    
    const description = categoryData
      ? `Odkryj najlepsze produkty z kategorii ${categoryData.name} w naszej hurtowni medycyny estetycznej. Profesjonalne produkty w najlepszych cenach.`
      : 'Odkryj pełną ofertę produktów medycyny estetycznej w naszej hurtowni. Najlepsze ceny, profesjonalne produkty, szybka dostawa.';

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
  
  try {
    // Prefetch shop data with error handling
    try {
      await qc.prefetchQuery({
      queryKey: ['shop','products',{ page: 1, perPage: 12, filters: JSON.stringify(initialFilters) }],
      queryFn: async () => {
        const params = new URLSearchParams();
        params.append('endpoint', 'shop');
        params.append('page', '1');
        params.append('per_page', '12');
        if (defaultCategory) params.append('category', defaultCategory);
          params.append('orderby', initialFilters.sortBy);
          params.append('order', initialFilters.sortOrder);
        const res = await fetch(`/api/woocommerce?${params.toString()}`, { 
          next: { revalidate: 30 },
          signal: AbortSignal.timeout(10000) // 10s timeout
        });
          if (!res.ok) return { products: [], total: 0, categories: [] };
        return res.json();
      },
      retry: 2,
      retryDelay: 1000,
      });
    } catch { /* ignore prefetch errors */ }
    
    // Prefetch categories with error handling
    const baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://www.filler.pl' : 'http://localhost:3000');
    try {
      await qc.prefetchQuery({
      queryKey: ['shop','categories'],
      queryFn: async () => {
        const res = await fetch(`${baseUrl}/api/woocommerce?endpoint=products/categories`, {
          next: { revalidate: 600 },
          signal: AbortSignal.timeout(5000)
        });
          if (!res.ok) return [];
        return res.json();
      },
      retry: 1,
      retryDelay: 500,
      });
    } catch { /* ignore prefetch errors */ }

    // Prefetch attributes with error handling - wszystkie atrybuty bez filtrów
    try {
      await qc.prefetchQuery({
      queryKey: ['shop','attributes',{ categories: [], search: '', min: 0, max: 10000, selected: [] }],
      queryFn: async () => {
        const params = new URLSearchParams();
        params.append('endpoint', 'attributes');
        const res = await fetch(`/api/woocommerce?${params.toString()}`, { 
          next: { revalidate: 600 },
          signal: AbortSignal.timeout(10000) // 10s timeout
        });
          if (!res.ok) return {};
        return res.json();
      },
      staleTime: 10 * 60_000,
      retry: 1,
      retryDelay: 500,
      });
    } catch { /* ignore prefetch errors */ }

    // Prefetch dynamic filters (kategorie + atrybuty) - bezpieczny try/catch
    try {
      await qc.prefetchQuery({
      queryKey: ['shop','dynamic-filters'],
      queryFn: async () => {
        const [categoriesRes, attributesRes] = await Promise.all([
          fetch(`${baseUrl}/api/woocommerce?endpoint=products/categories&per_page=100`, {
            next: { revalidate: 600 },
            signal: AbortSignal.timeout(5000)
          }),
          fetch(`${baseUrl}/api/woocommerce?endpoint=attributes`, {
            next: { revalidate: 300 },
            signal: AbortSignal.timeout(5000)
          })
        ]);
        
        if (!categoriesRes.ok || !attributesRes.ok) {
          throw new Error('Failed to fetch dynamic filters');
        }
        
        const categories = await categoriesRes.json();
        const attributes = await attributesRes.json();
        
        return { categories, attributes };
      },
      staleTime: 10 * 60_000,
      retry: 1,
      retryDelay: 500,
      });
    } catch { /* ignore prefetch errors */ }

    // Server-side initial payload for instant render in client
    const ssrParams = new URLSearchParams();
    ssrParams.append('endpoint', 'shop');
    ssrParams.append('page', '1');
    ssrParams.append('per_page', '12');
    if (defaultCategory) ssrParams.append('category', defaultCategory);
    ssrParams.append('orderby', initialFilters.sortBy);
    ssrParams.append('order', initialFilters.sortOrder);
    let initialShopData: any = { products: [], total: 0, categories: [] };
    try {
      const ssrRes = await fetch(`/api/woocommerce?${ssrParams.toString()}`, {
        next: { revalidate: 30 },
        signal: AbortSignal.timeout(10000)
      });
      initialShopData = ssrRes.ok ? await ssrRes.json() : initialShopData;
    } catch { /* keep default empty data */ }

    const dehydratedState = dehydrate(qc);

    return (
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={
          <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
          </div>
        }>
          <ShopClient initialShopData={initialShopData} />
        </Suspense>
      </HydrationBoundary>
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