'use client';

import { useWishlistItems, useWishlistIsLoading, useWishlistError, useWishlistActions } from '@/stores/wishlist-store';

// Always call the same hooks order: delegate directly to the store with selectors.
export function useWishlist() {
  const items = useWishlistItems();
  const isLoading = useWishlistIsLoading();
  const error = useWishlistError();
  const actions = useWishlistActions();
  
  return {
    items,
    isLoading,
    error,
    ...actions,
  };
}
