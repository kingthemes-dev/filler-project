import { useMemo } from 'react';
import { create } from 'zustand';
import { WooProduct } from '@/types/woocommerce';

interface QuickViewStore {
  isOpen: boolean;
  product: WooProduct | null;
  openQuickView: (product: WooProduct | null) => void;
  closeQuickView: () => void;
}

export const useQuickViewStore = create<QuickViewStore>(set => ({
  isOpen: false,
  product: null,
  openQuickView: (product: WooProduct | null) => set({ isOpen: true, product }),
  closeQuickView: () => set({ isOpen: false, product: null }),
}));

// Selectors for optimized subscriptions
export const useQuickViewIsOpen = () =>
  useQuickViewStore(state => state.isOpen);
export const useQuickViewProduct = () =>
  useQuickViewStore(state => state.product);

// Memoized selectors for actions to prevent re-renders
export const useQuickViewActions = () => {
  const openQuickView = useQuickViewStore(state => state.openQuickView);
  const closeQuickView = useQuickViewStore(state => state.closeQuickView);

  return useMemo(
    () => ({
      openQuickView,
      closeQuickView,
    }),
    [openQuickView, closeQuickView]
  );
};
