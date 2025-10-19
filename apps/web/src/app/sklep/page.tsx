import ShopClient from './shop-client';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import wooCommerceService from '@/services/woocommerce-optimized';
import { Metadata } from 'next';

// PRO: Static generation with ISR for better performance
export const revalidate = 300; // 5 minutes
export const dynamic = 'force-static';

// Generate metadata for shop pages
export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string>> }): Promise<Metadata> {
  const params = await searchParams;
  const category = params?.category || '';
  
  try {
    const categories = await wooCommerceService.getCategories();
    const categoryData = categories.data?.find((cat: any) => cat.slug === category);
    
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
  
  // Simplified approach - no prefetching to avoid build timeouts
  const dehydratedState = dehydrate(qc);

  return (
    <HydrationBoundary state={dehydratedState}>
      <ShopClient />
    </HydrationBoundary>
  );
}