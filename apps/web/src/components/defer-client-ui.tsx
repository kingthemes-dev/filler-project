'use client';

import dynamic from 'next/dynamic';

// Load non-critical UI only on the client to reduce initial JS for SSR/Edge
const ConditionalFooter = dynamic(() => import('@/components/conditional-footer').then(m => m.ConditionalFooter), { ssr: false });
const CartDrawer = dynamic(() => import('@/components/ui/cart-drawer'), { ssr: false });
const AuthModalManager = dynamic(() => import('@/components/ui/auth/auth-modal-manager'), { ssr: false });
const FavoritesModal = dynamic(() => import('@/components/ui/favorites-modal'), { ssr: false });
const ErrorBoundary = dynamic(() => import('@/components/error-boundary'), { ssr: false });
const ReactQueryProvider = dynamic(() => import('@/app/providers/react-query-provider'), { ssr: false });
const PerformanceTracker = dynamic(() => import('@/components/PerformanceTracker'), { ssr: false });
const CookieConsent = dynamic(() => import('@/components/cookie-consent'), { ssr: false });

export default function DeferClientUI({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <PerformanceTracker />
      <ReactQueryProvider>
        <main>
          {children}
        </main>
      </ReactQueryProvider>
      <AuthModalManager />
      <FavoritesModal />
      <CookieConsent />
      <ConditionalFooter />
      <CartDrawer />
    </ErrorBoundary>
  );
}


