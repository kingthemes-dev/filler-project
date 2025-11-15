'use client';

import { memo, Suspense } from 'react';
import { WooProduct } from '@/types/woocommerce';
import KingProductCard from '@/components/king-product-card';

interface ShopProductsGridProps {
  products: WooProduct[];
  refreshing?: boolean;
}

// 🚀 LCP Optimization: Skeleton dla szybkiego first paint
function ProductsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid mobile-grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 min-h-[60vh]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 rounded-lg aspect-square mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/3 mt-2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 🚀 LCP Optimization: Memoized product card
const MemoizedProductCard = memo(KingProductCard);

/**
 * 🚀 LCP Optimization: Streaming rendering dla produktów
 * Używa Suspense dla progressive rendering - pierwsze produkty widoczne natychmiast
 */
function ProductsGridContent({ products, refreshing }: ShopProductsGridProps) {
  // Jeśli jest tylko jeden produkt, nie używaj items-stretch (rozciąga kartę na całą wysokość)
  // Gdy są 2+ produkty w rzędzie, items-stretch zapewnia równą wysokość kart w rzędzie
  const shouldStretch = products.length >= 2;
  const isSingleProduct = products.length === 1;

  return (
    <div
      className={`grid mobile-grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 relative ${shouldStretch ? 'items-stretch' : 'items-start'}`}
    >
      {/* PRO: Subtle refreshing indicator */}
      {refreshing && (
        <div className="absolute top-0 right-0 z-10 bg-white/80 backdrop-blur-sm rounded-lg p-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
        </div>
      )}
      {/* 🚀 LCP Optimization: Renderuj produkty progresywnie */}
      {products.map((product, index) => (
        <div
          key={product.id}
          className={
            isSingleProduct ? '[&_.group]:!h-auto [&_.group]:!self-start' : ''
          }
        >
          <MemoizedProductCard
            product={product}
            variant="default"
            priority={index < 4} // 🚀 PRIORITY 1: Priority dla pierwszych 4 produktów (above-the-fold)
          />
        </div>
      ))}
    </div>
  );
}

/**
 * 🚀 LCP Optimization: Shop Products Grid z Suspense boundary
 * Streaming SSR - pierwsze produkty renderują się natychmiast, reszta w tle
 */
export default function ShopProductsGrid({
  products,
  refreshing,
}: ShopProductsGridProps) {
  // Jeśli brak produktów, pokaż skeleton
  if (products.length === 0) {
    return <ProductsSkeleton count={16} />;
  }

  // 🚀 LCP Optimization: Suspense dla progressive rendering
  // Pierwsze produkty renderują się natychmiast, reszta w tle
  return (
    <Suspense
      fallback={<ProductsSkeleton count={Math.min(products.length, 16)} />}
    >
      <ProductsGridContent products={products} refreshing={refreshing} />
    </Suspense>
  );
}
