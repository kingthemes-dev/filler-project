import { QueryClient } from '@tanstack/react-query';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { wooCommerceOptimized } from '@/services/woocommerce-optimized';
import ProductClient from './product-client';
import { Metadata } from 'next';

// PRO: Static generation with ISR for better performance
export const revalidate = 600; // 10 minutes
export const dynamic = 'auto'; // Allow dynamic rendering when needed

// Generate static params for popular products
export async function generateStaticParams() {
  // Skip static generation during build to avoid timeout issues
  // Pages will be generated on-demand (ISR)
  return [];
}

// Generate metadata for product pages
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const product = await wooCommerceOptimized.getProductBySlug(slug);
    
    if (!product) {
      return {
        title: 'Produkt nie znaleziony - FILLER',
        description: 'Szukany produkt nie został znaleziony w naszej hurtowni medycyny estetycznej.',
      };
    }

    const price = product.sale_price || product.price;
    const description = product.short_description || product.description?.replace(/<[^>]*>/g, '').substring(0, 160) || '';

    return {
      title: `${product.name} - ${price} zł | FILLER`,
      description: description,
      keywords: [
        product.name,
        'medycyna estetyczna',
        'hurtownia',
        'filler',
        ...(product.categories?.map(cat => typeof cat === 'string' ? cat : cat.name) || [])
      ],
      openGraph: {
        title: `${product.name} - ${price} zł`,
        description: description,
        type: 'website',
        images: product.images?.map(img => ({
          url: img.src,
          width: 800,
          height: 600,
          alt: product.name,
        })) || [],
        siteName: 'FILLER',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.name} - ${price} zł`,
        description: description,
        images: product.images?.[0]?.src || [],
      },
      alternates: {
        canonical: `/produkt/${slug}`,
      },
    };
  } catch (error) {
    console.error('Error generating metadata for product:', error);
    return {
      title: 'Produkt - FILLER',
      description: 'Hurtownia medycyny estetycznej FILLER',
    };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const queryClient = new QueryClient();

  try {
    // Prefetch product by slug with error handling
    await queryClient.prefetchQuery({
      queryKey: ['product', slug],
      queryFn: () => wooCommerceOptimized.getProductBySlug(slug),
      retry: 2,
      retryDelay: 1000,
    });

    // Read product to obtain id for dependent queries
    const product: any = queryClient.getQueryData(['product', slug]);
    
    if (!product) {
      throw new Error('Product not found');
    }

    const productId: number = product.id || 0;

    if (productId) {
      // Prefetch variations only (reviews endpoint returns 404)
      await queryClient.prefetchQuery({
        queryKey: ['product', slug, 'variations'],
        queryFn: () => wooCommerceOptimized.getProductVariations(productId),
        retry: 1,
        retryDelay: 500,
      });
    }

    const dehydratedState = dehydrate(queryClient);

    return (
      <HydrationBoundary state={dehydratedState}>
        <ProductClient slug={slug} />
      </HydrationBoundary>
    );
  } catch (error) {
    console.error('Error in ProductPage SSR:', error);
    
    // Return error state with proper hydration
    const dehydratedState = dehydrate(queryClient);
    
    return (
      <HydrationBoundary state={dehydratedState}>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Produkt nie znaleziony
            </h1>
            <p className="text-gray-600 mb-6">
              Szukany produkt nie został znaleziony lub wystąpił błąd podczas ładowania.
            </p>
            <a 
              href="/sklep" 
              className="inline-block bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Przejdź do sklepu
            </a>
          </div>
        </div>
      </HydrationBoundary>
    );
  }
}
