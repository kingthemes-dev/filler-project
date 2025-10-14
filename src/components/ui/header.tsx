'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Heart, ShoppingCart, Menu, X, LogOut, Mail, Settings, Package, ChevronDown, FileText } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useWishlist } from '@/hooks/use-wishlist';
import Link from 'next/link';
import EmailNotificationCenter from './email/email-notification-center';
import SearchBar from './search/search-bar';
import ShopExplorePanel from './shop-explore-panel';



export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isEmailCenterOpen, setIsEmailCenterOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  
  // Safely access stores with error handling
  let itemCount = 0, openCart = () => {}, user = null, isAuthenticated = false, logout = () => {};
  let openFavoritesModal = () => {}, getFavoritesCount = () => 0, favorites = [];
  let wishlistCount = 0;
  
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

  const { getItemCount } = useWishlist();
  wishlistCount = getItemCount();

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

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.user-menu-container')) {
          setShowUserMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[95vw] mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center flex-none">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-lg flex items-center justify-center mr-2 sm:mr-3">
              <span className="text-white text-lg sm:text-xl font-bold">F</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-black">FILLER</span>
          </div>

          {/* Navigation - moved next to logo (left) */}
          <nav className="hidden lg:flex items-center gap-6 flex-none">
            <Link href="/" className="text-gray-700 hover:text-black transition-colors font-medium">
              Strona główna
            </Link>
            <button
              type="button"
              onClick={() => setIsShopOpen(true)}
              className="text-gray-900 hover:text-black transition-colors font-medium inline-flex items-center gap-1"
              aria-haspopup="dialog"
              aria-expanded={isShopOpen}
              aria-controls="shop-explore-panel"
            >
              Sklep
              <ChevronDown className="w-4 h-4" />
            </button>
            <a href="/o-nas" className="text-gray-700 hover:text-black transition-colors font-medium">
              O nas
            </a>
            <a href="/kontakt" className="text-gray-700 hover:text-black transition-colors font-medium">
              Kontakt
            </a>
          </nav>

          {/* Adaptive Search - fills available space */}
          <div className="hidden md:flex flex-1 min-w-[160px]">
            <SearchBar 
              placeholder="Szukaj produktów..."
              className="w-full"
            />
          </div>

                                {/* Right side icons */}
                      <div className="flex items-center space-x-4 lg:space-x-6 flex-none">
                        {/* Mobile search icon */}
                        <button 
                          className="md:hidden text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded"
                          onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
                          aria-label="Szukaj produktów"
                        >
                          <Search className="w-6 h-6" />
                        </button>
                        
                        {/* Email Notification Center - Admin Only */}
                        {isAuthenticated && user?.role === 'admin' && (
                          <button 
                            onClick={() => setIsEmailCenterOpen(true)}
                            className="text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded"
                            title="Email Notification Center"
                            aria-label="Centrum powiadomień email"
                          >
                            <Mail className="w-6 h-6" />
                          </button>
                        )}
                        

                        
                        {/* Desktop icons - hidden on mobile */}
                        <div className="hidden md:flex items-center space-x-4">
                          {/* User Menu */}
                          {isAuthenticated ? (
                            <div className="relative user-menu-container">
                              <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded flex items-center space-x-2"
                              >
                                <User className="w-6 h-6" />
                                <span className="text-sm font-medium">
                                  {user?.firstName || 'Moje konto'}
                                </span>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                              </button>

                              {/* User Dropdown Menu */}
                              <AnimatePresence>
                                {showUserMenu && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50"
                                  >
                                    {/* User Info */}
                                    <div className="px-4 py-3 border-b border-gray-100">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                          <User className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-900 text-sm">
                                            {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email}
                                          </p>
                                          <p className="text-xs text-gray-500">{user?.email}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="py-1">
                                      <Link
                                        href="/moje-konto"
                                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                        onClick={() => setShowUserMenu(false)}
                                      >
                                        <Settings className="w-4 h-4" />
                                        <span>Moje konto</span>
                                      </Link>
                                      
                                      <Link
                                        href="/moje-zamowienia"
                                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                        onClick={() => setShowUserMenu(false)}
                                      >
                                        <Package className="w-4 h-4" />
                                        <span>Moje zamówienia</span>
                                      </Link>

                                      <button
                                        onClick={() => {
                                          openFavoritesModal();
                                          setShowUserMenu(false);
                                        }}
                                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full text-left"
                                      >
                                        <Heart className="w-4 h-4" />
                                        <span>Ulubione</span>
                                        {favoritesCount > 0 && (
                                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                            {favoritesCount}
                                          </span>
                                        )}
                                      </button>
                                      
                                      {/* Invoices */}
                                      <Link
                                        href="/moje-faktury"
                                        className="flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                        onClick={() => setShowUserMenu(false)}
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span>Faktury</span>
                                      </Link>
                                    </div>

                                    {/* Logout */}
                                    <div className="border-t border-gray-100 pt-1">
                                      <button
                                        onClick={() => {
                                          logout();
                                          setShowUserMenu(false);
                                        }}
                                        className="flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors w-full text-left"
                                      >
                                        <LogOut className="w-4 h-4" />
                                        <span>Wyloguj się</span>
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
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
                              aria-label="Zaloguj się"
                            >
                              <User className="w-6 h-6" />
                            </button>
                          )}
                          
                          <button 
                            className="text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded relative group"
                            onClick={openFavoritesModal}
                            title="Ulubione"
                            aria-label="Ulubione produkty"
                          >
                            <Heart className="w-6 h-6 group-hover:text-red-500 transition-colors" />
                            {isMounted && favoritesCount > 0 && (
                              <span className="pointer-events-none absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white animate-pulse">
                                {favoritesCount}
                              </span>
                            )}
                          </button>
                        </div>
                        
                        {/* Cart - visible on all screens */}
                        <button 
                          className="text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded relative group"
                          onClick={() => {
                            console.log('🛒 Cart button clicked!');
                            console.log('🛒 Current cart state:', useCartStore.getState());
                            openCart();
                            console.log('🛒 After openCart call');
                          }}
                          title="Koszyk"
                          aria-label="Koszyk zakupowy"
                        >
                          <ShoppingCart className="w-6 h-6 group-hover:text-green-600 transition-colors" />
                          {itemCount > 0 && (
                            <span className="pointer-events-none absolute -top-2 -right-2 bg-green-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white animate-bounce">
                              {itemCount}
                            </span>
                          )}
                        </button>
                        
                        {/* Mobile menu button */}
                        <button
                          className="lg:hidden text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded"
                          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                          aria-label={isMobileMenuOpen ? "Zamknij menu" : "Otwórz menu"}
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
                  <Link 
                    href="/" 
                    className="block text-lg font-medium text-gray-700 hover:text-black transition-colors py-3 border-b border-gray-100"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsMobileSearchOpen(false);
                    }}
                  >
                    Strona główna
                  </Link>
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
                                  <Package className="w-6 h-6" />
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
                            
                            <button 
                              onClick={() => {
                                openFavoritesModal();
                                setIsMobileMenuOpen(false);
                              }}
                              className="flex items-center space-x-2 text-gray-700 hover:text-black transition-colors py-3 w-full text-left"
                            >
                              <Heart className="w-6 h-6" />
                              <span className="text-sm font-medium">Ulubione</span>
                              {favoritesCount > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                  {favoritesCount}
                                </span>
                              )}
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
      
      {/* Shop Explore Panel */}
      <ShopExplorePanel open={isShopOpen} onClose={() => setIsShopOpen(false)} />
      
      {/* Favorites Modal */}
    </>
  );
}
