import React from 'react';
import ProductClient from './product-client';

export const revalidate = 300;

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // OPTIMIZATION: Skip server-side prefetch to avoid blocking render
  // Client-side fetch is already optimized with Store API fallback (2s timeout)
  // This allows page to render immediately while product loads in background
  return <ProductClient slug={slug} />;
}