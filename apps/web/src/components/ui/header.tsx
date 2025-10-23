'use client';

import { useState, useEffect } from 'react';
import { UI_SPACING } from '@/config/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Heart, ShoppingCart, Menu, X, LogOut, Mail, Settings, Package, ChevronDown, ChevronRight, FileText, Phone, Facebook, Instagram, Youtube } from 'lucide-react';
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
  const [shopHoverTimeout, setShopHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  
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

  // Close mobile search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileSearchOpen) {
        const target = event.target as HTMLElement;
        // Check if click is outside mobile search container
        if (!target.closest('.mobile-search-container')) {
          setIsMobileSearchOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileSearchOpen]);

  // Close shop dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isShopOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.shop-dropdown-container')) {
          setIsShopOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isShopOpen]);

  // Close shop dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isShopOpen) {
        setIsShopOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isShopOpen]);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (shopHoverTimeout) {
        clearTimeout(shopHoverTimeout);
      }
    };
  }, [shopHoverTimeout]);


  // Block body scroll when mobile menu is open - FIXED FOR IPHONE 14 PRO
  useEffect(() => {
    if (isMobileMenuOpen) {
      // Prevent horizontal scroll on iPhone 14 Pro
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.bottom = '0';
      
      // Prevent viewport zoom and scroll
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.position = 'fixed';
      document.documentElement.style.width = '100%';
      document.documentElement.style.height = '100%';
      
      return () => {
        document.body.style.overflow = 'unset';
        document.body.style.position = 'unset';
        document.body.style.width = 'unset';
        document.body.style.height = 'unset';
        document.body.style.top = 'unset';
        document.body.style.left = 'unset';
        document.body.style.right = 'unset';
        document.body.style.bottom = 'unset';
        
        document.documentElement.style.overflow = 'unset';
        document.documentElement.style.position = 'unset';
        document.documentElement.style.width = 'unset';
        document.documentElement.style.height = 'unset';
      };
    }
  }, [isMobileMenuOpen]);

  // Keyboard navigation for mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className={`bg-white ${isShopOpen ? '' : 'border-b border-gray-200'} sticky top-0 z-50 will-change-transform overflow-visible relative`}>
        <div className={`max-w-[95vw] mx-auto px-4 sm:px-8`}>
          <div className="grid grid-cols-[auto,1fr,auto] lg:flex lg:items-center h-16 sm:h-20 gap-2 overflow-hidden min-h-0">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-none flex-shrink-0 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
              <span className="text-white text-sm sm:text-lg font-bold">F</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-black">FILLER</span>
          </Link>

          {/* Desktop spacer between logo and nav (exact 75px) */}
          <div
            className="hidden lg:block"
            style={{ width: `${UI_SPACING.HEADER_NAV_GAP_DESKTOP}px` }}
          />

          {/* Spacer / Middle column for mobile to allow shrink without overflow */}
          <div className="min-w-0 lg:hidden col-start-2" />

          {/* Navigation - desktop only */}
          <nav
            className="hidden lg:flex items-center gap-6 flex-none"
          >
            <Link 
              href="/" 
              className="text-gray-700 hover:text-black transition-colors font-medium"
              onMouseEnter={() => setIsShopOpen(false)}
            >
              Strona główna
            </Link>
            <div 
              className="relative overflow-visible shop-dropdown-container"
              onMouseEnter={() => {
                // Clear any existing timeout
                if (shopHoverTimeout) {
                  clearTimeout(shopHoverTimeout);
                  setShopHoverTimeout(null);
                }
                // Open dropdown immediately on hover
                setIsShopOpen(true);
              }}
            >
              <Link 
                href="/sklep"
                className="text-gray-700 hover:text-black transition-colors font-medium inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-black/20 rounded-md px-2 py-1"
                aria-expanded={isShopOpen}
                aria-haspopup="true"
              >
                Sklep
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isShopOpen ? 'rotate-180' : ''}`} />
              </Link>
              
            </div>
            <a 
              href="/o-nas" 
              className="text-gray-700 hover:text-black transition-colors font-medium"
              onMouseEnter={() => setIsShopOpen(false)}
            >
              O nas
            </a>
            <a 
              href="/kontakt" 
              className="text-gray-700 hover:text-black transition-colors font-medium"
              onMouseEnter={() => setIsShopOpen(false)}
            >
              Kontakt
            </a>
          </nav>

          {/* Search Bar - desktop only (flex-1 on desktop) */}
          <div
            className="hidden lg:flex mx-4 lg:mx-0 min-w-0 lg:flex-1 w-full max-w-none lg:px-[var(--search-pad)]"
            style={{ ['--search-pad' as any]: `${UI_SPACING.SEARCH_SIDE_PADDING_DESKTOP}px` }}
            onMouseEnter={() => setIsShopOpen(false)}
          >
            <SearchBar 
              placeholder="Szukaj produktów..."
              className="w-full text-sm"
            />
          </div>

          {/* Mobile Icons with Labels */}
          <div className="lg:hidden col-start-3 flex items-center gap-3 justify-end min-w-0 flex-shrink-0">
            {/* Mobile Search Icon */}
            <button 
              className="shrink-0 flex items-center justify-center text-gray-700 hover:text-black transition-colors mobile-search-container"
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              aria-label="Szukaj produktów"
            >
              <Search className="w-6 h-6" />
            </button>

            {/* Mobile User Icon */}
            {isAuthenticated ? (
              <Link
                href="/moje-konto"
                className="shrink-0 flex items-center justify-center text-gray-700 hover:text-black transition-colors"
                aria-label="Moje konto"
              >
                <User className="w-6 h-6" />
              </Link>
            ) : (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('openLogin'))}
                className="shrink-0 flex items-center justify-center text-gray-700 hover:text-black transition-colors"
                aria-label="Zaloguj się"
              >
                <User className="w-6 h-6" />
              </button>
            )}

            {/* Mobile Favorites Icon */}
            <button
              onClick={() => openFavoritesModal()}
              className="shrink-0 flex items-center justify-center text-gray-700 hover:text-black transition-colors relative"
              aria-label="Ulubione"
            >
              <Heart className="w-6 h-6" />
              {favoritesCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-red-500 text-white text-[9px] rounded-full w-3 h-3 flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Mobile Cart Icon */}
            <button
              onClick={openCart}
              className="shrink-0 flex items-center justify-center text-gray-700 hover:text-black transition-colors relative"
              aria-label="Koszyk"
            >
              <ShoppingCart className="w-6 h-6" />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-blue-500 text-white text-[9px] rounded-full w-3 h-3 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Icon */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="shrink-0 flex items-center justify-center text-gray-700 hover:text-black transition-colors"
              aria-label={isMobileMenuOpen ? "Zamknij menu" : "Otwórz menu"}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Desktop icons - hidden on mobile */}
          <div 
            className="hidden lg:flex items-center space-x-6 justify-end pr-2 overflow-visible"
            onMouseEnter={() => setIsShopOpen(false)}
          >
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

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative user-menu-container overflow-visible">
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
                    <>
                      
                      {/* Dropdown */}
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="fixed bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-[70]"
                      style={{
                        top: '80px', // Below header
                        right: '20px', // Right side of screen
                        width: '280px'
                      }}
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
                                  </>
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
                <span className="pointer-events-none absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-red-500 text-white text-[9px] rounded-full w-3 h-3 flex items-center justify-center ring-1 ring-white">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Cart */}
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
              <ShoppingCart className="w-6 h-6 group-hover:text-blue-600 transition-colors" />
              {itemCount > 0 && (
                <span className="pointer-events-none absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-blue-500 text-white text-[9px] rounded-full w-3 h-3 flex items-center justify-center ring-1 ring-white animate-bounce">
                  {itemCount}
                </span>
              )}
            </button>

          </div>
          </div>
        </div>
        
        {/* Mobile Search Bar */}
        <AnimatePresence>
          {isMobileSearchOpen && (
            <motion.div
              className="lg:hidden bg-white border-t border-gray-200 shadow-lg mobile-search-container"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="px-4 py-4">
                <SearchBar 
                  placeholder="Szukaj produktów..."
                  className="w-full text-sm"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Mobile Menu - COMPLETELY NEW */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop - HIGHEST Z-INDEX */}
              <motion.div
                className="fixed inset-0 bg-black/50 z-[110] lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Menu Drawer - HIGHEST Z-INDEX */}
              <motion.div
                className="fixed right-0 top-0 bg-white shadow-2xl z-[120] 
                         w-full max-w-[364px] lg:max-w-[428px] xl:max-w-[492px]
                         lg:border-l lg:border-gray-200 flex flex-col
                         rounded-l-2xl lg:rounded-l-2xl"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                data-mobile-menu
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-menu-title"
                style={{ 
                  top: 0,
                  right: 0,
                  height: '100vh',
                  width: '100%',
                  maxWidth: '364px',
                  maxHeight: '100vh',
                  overflow: 'hidden',
                  zIndex: 120
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Menu className="w-6 h-6 text-black" />
                    <h2 id="mobile-menu-title" className="text-xl font-bold text-black">
                      Menu
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Zamknij menu"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Main Navigation - SAME FONT AS CATEGORIES */}
                  <div className="space-y-3 mb-6">
                    <Link 
                      href="/" 
                      className="block text-gray-700 hover:text-black transition-colors py-2 pl-4 border-l-2 border-transparent hover:border-gray-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Strona główna
                    </Link>
                    
                    <Link 
                      href="/sklep" 
                      className="block text-gray-700 hover:text-black transition-colors py-2 pl-4 border-l-2 border-transparent hover:border-gray-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sklep
                    </Link>
                    
                    <a 
                      href="/o-nas" 
                      className="block text-gray-700 hover:text-black transition-colors py-2 pl-4 border-l-2 border-transparent hover:border-gray-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      O nas
                    </a>
                    
                    <a 
                      href="/kontakt" 
                      className="block text-gray-700 hover:text-black transition-colors py-2 pl-4 border-l-2 border-transparent hover:border-gray-300"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Kontakt
                    </a>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 space-y-3 bg-gray-50">
                  {/* Account Section */}
                  {isAuthenticated ? (
                    <div className="space-y-3">
                      <Link 
                        href="/moje-konto" 
                        className="flex items-center space-x-3 text-gray-700 hover:text-black transition-colors py-3"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <User className="w-5 h-5" />
                        <span className="text-sm font-medium">Moje konto</span>
                      </Link>
                      
                      <Link 
                        href="/moje-zamowienia" 
                        className="flex items-center space-x-3 text-gray-700 hover:text-black transition-colors py-3"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Package className="w-5 h-5" />
                        <span className="text-sm font-medium">Moje zamówienia</span>
                      </Link>
                      
                      <Link 
                        href="/moje-faktury" 
                        className="flex items-center space-x-3 text-gray-700 hover:text-black transition-colors py-3"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <FileText className="w-5 h-5" />
                        <span className="text-sm font-medium">Faktury</span>
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href="/moje-konto"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full bg-gradient-to-r from-gray-800 to-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gradient-to-l hover:from-gray-700 hover:to-gray-900 transition-all duration-300 inline-block text-center"
                    >
                      Zarejestruj się
                    </Link>
                  )}

                  {/* Favorites */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsFavoritesOpen(true);
                    }}
                    className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      <Heart className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-medium text-gray-700">Lista życzeń</span>
                    </div>
                    {favoritesCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {favoritesCount}
                      </span>
                    )}
                  </button>

                  {/* Social Media */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex space-x-4">
                      <a 
                        href="tel:+48123456789" 
                        className="text-gray-600 hover:text-black transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Phone className="w-5 h-5" />
                      </a>
                      <a 
                        href="https://facebook.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-black transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Facebook className="w-5 h-5" />
                      </a>
                      <a 
                        href="https://instagram.com" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-black transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        {/* Shop Dropdown - rendered outside container for full width */}
        <ShopExplorePanel open={isShopOpen} onClose={() => setIsShopOpen(false)} />
      </header>
      
      {/* Email Notification Center */}
      <EmailNotificationCenter 
        isOpen={isEmailCenterOpen}
        onClose={() => setIsEmailCenterOpen(false)}
      />
      
      
      {/* Favorites Modal */}
    </>
  );
}

