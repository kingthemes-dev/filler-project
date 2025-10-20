'use client';

import React from 'react';
import { HydrationBoundary, dehydrate, QueryClient } from '@tanstack/react-query';
import { wooCommerceOptimized } from '@/services/woocommerce-optimized';
import ProductClient from './product-client';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const queryClient = new QueryClient();

  try {
    // Prefetch product data
    await queryClient.prefetchQuery({
      queryKey: ['product', slug],
      queryFn: () => wooCommerceOptimized.getProductBySlug(slug),
      staleTime: 60_000,
    });

    const product = queryClient.getQueryData(['product', slug]);
    
    if (product && (product as any).id) {
      // Prefetch variations
      await queryClient.prefetchQuery({
        queryKey: ['product', slug, 'variations'],
        queryFn: () => wooCommerceOptimized.getProductVariations((product as any).id),
        staleTime: 60_000,
      });
    }

    const dehydratedState = dehydrate(queryClient);

    return (
      <HydrationBoundary state={dehydratedState}>
        <ProductClient slug={slug} />
      </HydrationBoundary>
    );
  } catch (error) {
    console.error('Error in ProductPage:', error);
    
    // Fallback to client-side only
    return <ProductClient slug={slug} />;
  }
}