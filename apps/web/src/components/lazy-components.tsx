/**
 * Lazy-loaded components for better performance
 */

import { lazy, Suspense } from 'react';

// Lazy load heavy components
export const LazyProductModal = lazy(() => import('@/components/ui/quick-view-modal'));
export const LazyFavoritesModal = lazy(() => import('@/components/ui/favorites-modal'));
export const LazyCartDrawer = lazy(() => import('@/components/ui/cart-drawer'));
export const LazyAuthModals = lazy(() => import('@/components/ui/auth/auth-modal-manager'));
export const LazyInvoicePDF = lazy(() => import('@/components/ui/invoice-pdf-generator'));
export const LazyNewsletterForm = lazy(() => import('@/components/ui/newsletter-form'));

// Lazy load page components
export const LazyShopPage = lazy(() => import('@/app/sklep/page'));
export const LazyProductPage = lazy(() => import('@/app/produkt/[slug]/page'));
export const LazyCheckoutPage = lazy(() => import('@/app/checkout/page'));
export const LazyAccountPage = lazy(() => import('@/app/moje-konto/page'));
export const LazyOrdersPage = lazy(() => import('@/app/moje-zamowienia/page'));
export const LazyInvoicesPage = lazy(() => import('@/app/moje-faktury/page'));

// Lazy load complex UI components
export const LazyProductGrid = lazy(() => import('@/components/king-product-grid'));
export const LazyProductTabs = lazy(() => import('@/components/king-product-tabs'));
export const LazyShopFilters = lazy(() => import('@/components/ui/shop-filters'));
export const LazySearchBar = lazy(() => import('@/components/ui/search/search-bar'));

// Lazy wrapper with loading fallback
export function LazyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div />}>
      {children}
    </Suspense>
  );
}

// Specific lazy wrappers for different use cases
export function ProductModalWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div />}>
      {children}
    </Suspense>
  );
}

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div />}>
      {children}
    </Suspense>
  );
}

export function ComponentWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div />}>
      {children}
    </Suspense>
  );
}
