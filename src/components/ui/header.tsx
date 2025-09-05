'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Heart, ShoppingCart, Menu, X, LogOut, Mail } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import Link from 'next/link';
import EmailNotificationCenter from './email/email-notification-center';
import SearchBar from './search/search-bar';
import FavoritesModal from './favorites-modal';



export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isEmailCenterOpen, setIsEmailCenterOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  
  // Safely access stores with error handling
  let itemCount = 0, openCart = () => {}, user = null, isAuthenticated = false, logout = () => {};
  let openFavoritesModal = () => {}, getFavoritesCount = () => 0, favorites = [];
  
  try {
    const cartStore = useCartStore();
    itemCount = cartStore.itemCount;
    openCart = cartStore.openCart;
  } catch (error) {
    console.warn('Cart store not available:', error);
  }
  
  try {
    const authStore = useAuthStore();
    user = authStore.user;
    isAuthenticated = authStore.isAuthenticated;
    logout = authStore.logout;
  } catch (error) {
    console.warn('Auth store not available:', error);
  }
  
  try {
    const favoritesStore = useFavoritesStore();
    openFavoritesModal = favoritesStore.openFavoritesModal;
    getFavoritesCount = favoritesStore.getFavoritesCount;
    favorites = favoritesStore.favorites;
  } catch (error) {
    console.warn('Favorites store not available:', error);
  }

  // Fix hydration issue by syncing favorites count after mount
  useEffect(() => {
    setIsMounted(true);
    setFavoritesCount(getFavoritesCount());
  }, [getFavoritesCount]);

  // Update favorites count when favorites array changes
  useEffect(() => {
    if (isMounted) {
      setFavoritesCount(favorites.length);
    }
  }, [favorites.length, isMounted]);

  return (
    <>
      <header className="bg-white sticky top-0 z-50">
      <div className="max-w-[95vw] mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center ml-1">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-xl font-bold">F</span>
            </div>
            <span className="text-2xl font-bold text-black">FILLER</span>
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <a href="/" className="text-gray-700 hover:text-black transition-colors font-medium">
              Strona główna
            </a>
            
                                    {/* Shop Link */}
                        <a href="/sklep" className="text-gray-700 hover:text-black transition-colors font-medium">
                          Sklep
                        </a>
            
            <a href="/o-nas" className="text-gray-700 hover:text-black transition-colors font-medium">
              O nas
            </a>
            <a href="/kontakt" className="text-gray-700 hover:text-black transition-colors font-medium">
              Kontakt
            </a>
          </nav>

                                {/* Right side icons */}
                      <div className="flex items-center space-x-4 lg:space-x-6">
                        {/* Search - desktop full bar, mobile icon */}
                        <div className="hidden md:block">
                          <SearchBar 
                            placeholder="Szukaj produktów..."
                            className="w-64"
                          />
                        </div>
                        
                        {/* Mobile search icon */}
                        <button 
                          className="md:hidden text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded"
                          onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                        >
                          <Search className="w-6 h-6" />
                        </button>
                        
                        {/* Email Notification Center - Admin Only */}
                        {isAuthenticated && user?.role === 'admin' && (
                          <button 
                            onClick={() => setIsEmailCenterOpen(true)}
                            className="text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded"
                            title="Email Notification Center"
                          >
                            <Mail className="w-6 h-6" />
                          </button>
                        )}
                        

                        
                        {/* Desktop icons - hidden on mobile */}
                        <div className="hidden md:flex items-center space-x-4">
                          {/* User Menu */}
                          {isAuthenticated ? (
                            <div className="relative">
                              <Link
                                href="/moje-konto"
                                className="text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded flex items-center space-x-2"
                              >
                                <User className="w-6 h-6" />
                                <span className="text-sm font-medium">
                                  {user?.firstName || 'Moje konto'}
                                </span>
                              </Link>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  console.log('[Auth] openLogin click');
                                  const evt = new CustomEvent('openLogin');
                                  window.dispatchEvent(evt);
                                  if (typeof document !== 'undefined') {
                                    document.dispatchEvent(evt);
                                  }
                                } catch (e) {
                                  console.error('[Auth] openLogin event error', e);
                                }
                              }}
                              className="text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded"
                              data-test="open-login-btn"
                            >
                              <User className="w-6 h-6" />
                            </button>
                          )}
                          
                          <button 
                            className="text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded relative"
                            onClick={openFavoritesModal}
                          >
                            <Heart className="w-6 h-6" />
                            {isMounted && favoritesCount > 0 && (
                              <span className="pointer-events-none absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white">
                                {favoritesCount}
                              </span>
                            )}
                          </button>
                        </div>
                        
                        {/* Cart - visible on all screens */}
                        <button 
                          className="text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded relative"
                          onClick={() => {
                            console.log('🛒 Cart button clicked!');
                            console.log('🛒 Current cart state:', useCartStore.getState());
                            openCart();
                            console.log('🛒 After openCart call');
                          }}
                        >
                          <ShoppingCart className="w-6 h-6" />
                          <span className="pointer-events-none absolute -top-2 -right-2 bg-black text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white">
                            {itemCount}
                          </span>
                        </button>
                        
                        {/* Mobile menu button */}
                        <button
                          className="lg:hidden text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded"
                          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                          {isMobileMenuOpen ? (
                            <X className="w-6 h-6" />
                          ) : (
                            <Menu className="w-6 h-6" />
                          )}
                        </button>
                      </div>
                  </div>
        </div>
        
        {/* Mobile Search Bar */}
        <AnimatePresence>
          {isMobileSearchOpen && (
            <motion.div
              className="md:hidden bg-white border-t border-gray-200 shadow-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="px-4 py-4">
                <SearchBar 
                  placeholder="Szukaj produktów..."
                  className="w-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="lg:hidden bg-white border-t border-gray-200 shadow-lg"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="px-6 py-6 space-y-6">
                {/* Mobile Navigation Links */}
                <nav className="space-y-4">
                  <a 
                    href="/" 
                    className="block text-lg font-medium text-gray-700 hover:text-black transition-colors py-3 border-b border-gray-100"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsMobileSearchOpen(false);
                    }}
                  >
                    Strona główna
                  </a>
                  <a 
                    href="/sklep" 
                    className="block text-lg font-medium text-gray-700 hover:text-black transition-colors py-3 border-b border-gray-100"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsMobileSearchOpen(false);
                    }}
                  >
                    Sklep
                  </a>
                  <a 
                    href="/o-nas" 
                    className="block text-lg font-medium text-gray-700 hover:text-black transition-colors py-3 border-b border-gray-100"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsMobileSearchOpen(false);
                    }}
                  >
                    O nas
                  </a>
                  <a 
                    href="/kontakt" 
                    className="block text-lg font-medium text-gray-700 hover:text-black transition-colors py-3 border-b border-gray-100"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsMobileSearchOpen(false);
                    }}
                  >
                    Kontakt
                  </a>
                </nav>
                
                                          {/* Mobile Action Buttons */}
                          <div className="flex items-center space-x-4 pt-4">
                            {isAuthenticated ? (
                              <>
                                <Link
                                  href="/moje-konto"
                                  className="flex items-center space-x-2 text-gray-700 hover:text-black transition-colors py-3"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <User className="w-6 h-6" />
                                  <span className="text-sm font-medium">Moje konto</span>
                                </Link>
                                <Link
                                  href="/moje-zamowienia"
                                  className="flex items-center space-x-2 text-gray-700 hover:text-black transition-colors py-3"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <User className="w-6 h-6" />
                                  <span className="text-sm font-medium">Moje zamówienia</span>
                                </Link>
                                <button
                                  onClick={() => {
                                    logout();
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className="flex items-center space-x-2 text-red-600 hover:text-red-700 transition-colors py-3"
                                >
                                  <LogOut className="w-6 h-6" />
                                  <span className="text-sm font-medium">Wyloguj się</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setIsMobileMenuOpen(false);
                                  window.dispatchEvent(new CustomEvent('openLogin'));
                                }}
                                className="flex items-center space-x-2 text-gray-700 hover:text-black transition-colors py-3"
                              >
                                <User className="w-6 h-6" />
                                <span className="text-sm font-medium">Zaloguj się</span>
                              </button>
                            )}
                            
                            <button className="flex items-center space-x-2 text-gray-700 hover:text-black transition-colors py-3">
                              <Heart className="w-6 h-6" />
                              <span className="text-sm font-medium">Ulubione</span>
                            </button>
                          </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      
      {/* Email Notification Center */}
      <EmailNotificationCenter 
        isOpen={isEmailCenterOpen}
        onClose={() => setIsEmailCenterOpen(false)}
      />
      
      {/* Favorites Modal */}
      <FavoritesModal />
    </>
  );
}
