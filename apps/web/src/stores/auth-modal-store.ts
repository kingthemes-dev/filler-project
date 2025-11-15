import { useMemo } from 'react';
import { create } from 'zustand';

interface AuthModalStore {
  isOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const useAuthModalStore = create<AuthModalStore>(set => ({
  isOpen: false,
  openAuthModal: () => set({ isOpen: true }),
  closeAuthModal: () => set({ isOpen: false }),
}));

// Selectors for optimized subscriptions
export const useAuthModalIsOpen = () =>
  useAuthModalStore(state => state.isOpen);

// Memoized selectors for actions to prevent re-renders
export const useAuthModalActions = () => {
  const openAuthModal = useAuthModalStore(state => state.openAuthModal);
  const closeAuthModal = useAuthModalStore(state => state.closeAuthModal);

  return useMemo(
    () => ({
      openAuthModal,
      closeAuthModal,
    }),
    [openAuthModal, closeAuthModal]
  );
};
