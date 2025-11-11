'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModalCloseButton from './modal-close-button';
import { Heart, Trash2 } from 'lucide-react';
import { useFavoritesItems, useFavoritesIsModalOpen, useFavoritesIsLoading, useFavoritesActions } from '@/stores/favorites-store';
import { Button } from '@/components/ui/button';
import KingProductCard from '@/components/king-product-card';
import { lockBodyScroll, unlockBodyScroll } from '@/utils/lock-body-scroll';
import { useViewportHeightVar } from '@/hooks/use-viewport-height-var';

export default function FavoritesModal() {
  const favorites = useFavoritesItems();
  const isModalOpen = useFavoritesIsModalOpen();
  const isLoading = useFavoritesIsLoading();
  const { closeFavoritesModal, removeFromFavorites, clearFavorites } = useFavoritesActions();
  
  useViewportHeightVar();
  
  useEffect(() => {
    if (isModalOpen) {
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
  }, [isModalOpen]);
  
  const handleRemoveFromFavorites = (productId: number) => {
    removeFromFavorites(productId);
  };

  const handleClearAll = () => {
    if (confirm('Czy na pewno chcesz usunąć wszystkie ulubione produkty?')) {
      clearFavorites();
    }
  };

  return (
    <AnimatePresence>
      {isModalOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70]"
            onClick={closeFavoritesModal}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeFavoritesModal();
            }}
          >
            <div 
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                    Ulubione
                  </h2>
                  {isLoading && (
                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {favorites.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAll}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Wyczyść</span>
                    </Button>
                  )}
                  <ModalCloseButton 
                    onClick={closeFavoritesModal}
                    ariaLabel="Zamknij ulubione"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Brak ulubionych produktów
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Dodaj produkty do ulubionych, klikając ikonę serca
                    </p>
                    <Button 
                      onClick={closeFavoritesModal}
                      className="bg-black hover:bg-gray-800 text-white px-8 py-3 text-sm font-medium rounded-2xl"
                    >
                      Kontynuuj zakupy
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {favorites.map((product) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                      >
                        {/* Remove from favorites button overlay */}
                        <button
                          onClick={() => handleRemoveFromFavorites(product.id)}
                          className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/90 hover:bg-white hover:shadow-md rounded-full flex items-center justify-center transition-all duration-150 opacity-0 group-hover:opacity-100"
                        >
                          <Heart className="w-4 h-4 fill-current text-red-500" />
                        </button>
                        
                        {/* Use KingProductCard for consistent styling */}
                        <KingProductCard
                          product={product}
                          showActions={true}
                          variant="default"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
