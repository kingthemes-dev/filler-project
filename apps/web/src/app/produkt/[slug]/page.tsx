import { QueryClient } from '@tanstack/react-query';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { wooCommerceOptimized } from '@/services/woocommerce-optimized';
import ProductClient from './product-client';
import { Metadata } from 'next';
import { generateEnhancedMetadata, generateEnhancedProductStructuredData, generateEnhancedBreadcrumbStructuredData } from '@/utils/seo-enhanced';

// PRO: Static generation with ISR for better performance
export const revalidate = 600; // 10 minutes
export const dynamic = 'force-static';

// Generate static params for popular products
export async function generateStaticParams() {
  // Skip static generation during build to avoid API issues
  // Pages will be generated on-demand
  return [];
}

// Generate enhanced metadata for product pages
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const product = await wooCommerceOptimized.getProductBySlug(slug);
    
    if (!product) {
      return generateEnhancedMetadata({
        title: 'Produkt nie znaleziony',
        description: 'Szukany produkt nie został znaleziony w naszej hurtowni medycyny estetycznej.',
        noindex: true
      });
    }

    const price = product.sale_price || product.price;
    const description = product.short_description || product.description?.replace(/<[^>]*>/g, '').substring(0, 160) || '';
    const category = product.categories?.[0] ? (typeof product.categories[0] === 'string' ? product.categories[0] : product.categories[0].name) : '';
    
    // Get brand from attributes
    const getBrand = (): string => {
      if (!product.attributes) return 'FILLER';
      const brandAttr = product.attributes.find((attr: { name: string; options: string[] }) => 
        attr.name.toLowerCase().includes('marka')
      );
      if (!brandAttr) return 'FILLER';
      const first = brandAttr.options?.[0];
      if (!first) return 'FILLER';
      return typeof first === 'string' ? first : (first as any)?.name || (first as any)?.slug || String(first);
    };
    const brand = getBrand();
    const availability = product.stock_status === 'instock' ? 'instock' : 'outofstock';

    return generateEnhancedMetadata({
      title: `${product.name} - ${price} zł`,
      description: description,
      keywords: [
        product.name,
        category,
        brand,
        'medycyna estetyczna',
        'hurtownia',
        'filler',
        ...(product.categories?.map(cat => typeof cat === 'string' ? cat : cat.name) || [])
      ],
      url: `/produkt/${slug}`,
      type: 'product',
      price: price,
      availability: availability,
      brand: brand,
      category: category,
      image: product.images?.[0]?.src
    });
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
      // Prefetch dependent data in parallel with error handling
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: ['product', slug, 'variations'],
          queryFn: () => wooCommerceOptimized.getProductVariations(productId),
          retry: 1,
          retryDelay: 500,
        }),
        queryClient.prefetchQuery({
          queryKey: ['product', slug, 'reviews'],
          queryFn: () => wooCommerceOptimized.getProductReviews(productId),
          retry: 1,
          retryDelay: 500,
        }),
      ]);
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
