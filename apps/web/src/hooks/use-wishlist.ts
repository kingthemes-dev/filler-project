'use client';

import { useWishlistStore } from '@/stores/wishlist-store';

// Always call the same hooks order: delegate directly to the store.
export function useWishlist() {
  return useWishlistStore();
}
