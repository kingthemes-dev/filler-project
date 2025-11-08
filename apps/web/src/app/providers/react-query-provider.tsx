'use client';

import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import React from 'react';
// import { analytics } from '@headless-woo/shared';

// 🚀 Bundle Optimization: Dynamic import dla devtools (tylko w development)
const ReactQueryDevtools = 
  process.env.NODE_ENV === 'development'
    ? React.lazy(() => 
        import('@tanstack/react-query-devtools').then((mod) => ({
          default: mod.ReactQueryDevtools as React.ComponentType<any>,
        }))
      )
    : () => null;

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        try {
          console.error('Query error:', error, query.queryKey);
          // analytics.track('api_error', {
          //   message: error instanceof Error ? error.message : String(error),
          //   queryKey: JSON.stringify(query.queryKey),
          // });
        } catch {}
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 600_000,
        retry: 3,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        networkMode: 'online',
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 5000),
        placeholderData: (previousData: any) => previousData,
      },
    },
  }));

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </React.Suspense>
      )}
    </QueryClientProvider>
  );
}


