import { create } from 'zustand';
import { WooProduct } from '@/types/woocommerce';

interface QuickViewStore {
  isOpen: boolean;
  product: WooProduct | null;
  openQuickView: (product: WooProduct | null) => void;
  closeQuickView: () => void;
}

export const useQuickViewStore = create<QuickViewStore>((set) => ({
  isOpen: false,
  product: null,
  openQuickView: (product: WooProduct | null) => set({ isOpen: true, product }),
  closeQuickView: () => set({ isOpen: false, product: null }),
}));
