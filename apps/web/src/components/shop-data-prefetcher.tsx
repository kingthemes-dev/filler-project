/**
 * Shop Data Prefetcher Component
 *
 * Komponent odpowiedzialny za prefetchowanie danych sklepu
 * przy inicjalizacji aplikacji. Uruchamia się w tle i nie
 * wyświetla żadnego UI.
 */

'use client';

import { useEffect } from 'react';
import { useShopDataStore } from '@/stores/shop-data-store';

interface ShopDataPrefetcherProps {
  /**
   * Czy prefetchować dane natychmiast po mount
   * @default true
   */
  immediate?: boolean;

  /**
   * Opóźnienie przed prefetchowaniem (w ms)
   * @default 0
   */
  delay?: number;

  /**
   * Czy prefetchować tylko jeśli nie ma danych w cache
   * @default true
   */
  onlyIfEmpty?: boolean;
}

export default function ShopDataPrefetcher({
  immediate = true,
  delay = 0,
  onlyIfEmpty = true,
}: ShopDataPrefetcherProps) {
  const { initialize, hasData, isDataFresh } = useShopDataStore();

  useEffect(() => {
    // Sprawdź czy prefetchowanie jest potrzebne
    if (onlyIfEmpty && hasData && isDataFresh()) {
      console.log(
        '🚀 Shop data already available and fresh, skipping prefetch'
      );
      return;
    }

    const prefetch = async () => {
      try {
        console.log('🚀 Starting shop data prefetch...');
        await initialize();
        console.log('✅ Shop data prefetch completed');
      } catch (error) {
        console.error('❌ Shop data prefetch failed:', error);
      }
    };

    if (immediate) {
      if (delay > 0) {
        const timeoutId = setTimeout(prefetch, delay);
        return () => clearTimeout(timeoutId);
      } else {
        prefetch();
      }
    }
  }, [immediate, delay, onlyIfEmpty, initialize, hasData, isDataFresh]);

  // Komponent nie renderuje niczego
  return null;
}

/**
 * Hook do prefetchowania danych sklepu
 */
export function useShopDataPrefetch(options: ShopDataPrefetcherProps = {}) {
  const { initialize, hasData, isDataFresh } = useShopDataStore();

  const prefetch = async () => {
    if (options.onlyIfEmpty && hasData && isDataFresh()) {
      console.log(
        '🚀 Shop data already available and fresh, skipping prefetch'
      );
      return;
    }

    try {
      console.log('🚀 Manual shop data prefetch...');
      await initialize();
      console.log('✅ Manual shop data prefetch completed');
    } catch (error) {
      console.error('❌ Manual shop data prefetch failed:', error);
    }
  };

  return {
    prefetch,
    hasData,
    isDataFresh: isDataFresh(),
  };
}
