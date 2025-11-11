'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Heart, ShoppingCart, LogOut, Mail, Settings, Package, ChevronDown, ChevronRight, FileText, Phone, Facebook, Instagram, Plus, Tag, Menu } from 'lucide-react';
import { useCartItemCount, useCartActions } from '@/stores/cart-store';
import { useAuthUser, useAuthIsAuthenticated, useAuthActions } from '@/stores/auth-store';
import { useFavoritesCount, useFavoritesActions } from '@/stores/favorites-store';
// import { useWishlist } from '@/hooks/use-wishlist';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// 🚀 Bundle Optimization: Dynamic imports dla modali (below-the-fold, tylko gdy używane)
const SearchModal = dynamic(() => import('./search-modal'), { ssr: false });
const ShopExplorePanel = dynamic(() => import('./shop-explore-panel'), { ssr: false });
const EmailNotificationCenter = dynamic(() => import('./email/email-notification-center'), { ssr: false });
import { useShopDataStore, useShopCategories, useShopAttributes } from '@/stores/shop-data-store';



export default function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isEmailCenterOpen, setIsEmailCenterOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isShopExpanded] = useState(false);
  const [isBrandsExpanded] = useState(false);
  const [shopHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  
  // 🚀 SENIOR LEVEL - Slide Navigation State
  const [mobileMenuView, setMobileMenuView] = useState<'main' | 'sklep' | 'marki'>('main');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  // Użyj prefetched data z store
  const { categories, mainCategories: _mainCategories, getSubCategories: _getSubCategories, isLoading: categoriesLoading } = useShopCategories();
  const { brands, isLoading: brandsLoading } = useShopAttributes();
  const { totalProducts: _totalProducts, initialize } = useShopDataStore();
  
  // Reset view when closing mobile menu
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setMobileMenuView('main');
    setExpandedCategories(new Set());
  };


  // Toggle category expansion
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };
  
  // Use selectors for optimized subscriptions
  // Always call hooks, but use values conditionally after mount to prevent SSR issues
  const itemCountRaw = useCartItemCount();
  const cartActions = useCartActions();
  const userRaw = useAuthUser();
  const isAuthenticatedRaw = useAuthIsAuthenticated();
  const authActions = useAuthActions();
  const favoritesCountRaw = useFavoritesCount();
  const favoritesActions = useFavoritesActions();
  
  // Use values only after mount to prevent hydration mismatches
  const itemCount = isMounted ? itemCountRaw : 0;
  const user = isMounted ? userRaw : null;
  const isAuthenticated = isMounted ? isAuthenticatedRaw : false;
  const favoritesCount = isMounted ? favoritesCountRaw : 0;
  const openCart = cartActions.openCart;
  const logout = authActions.logout;
  const openFavoritesModal = favoritesActions.openFavoritesModal;
  
  // Mount flag for client-only UI updates
  useEffect(() => {
    setIsMounted(true);
  }, []);



  // Inicjalizuj store gdy potrzebne
  useEffect(() => {
    if ((isBrandsExpanded || mobileMenuView === 'marki' || isShopExpanded || isMobileMenuOpen)) {
      initialize();
    }
  }, [isBrandsExpanded, mobileMenuView, isShopExpanded, isMobileMenuOpen, initialize]);

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



  // Keyboard navigation for mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };

    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMobileMenuOpen]);

  // Handle scroll for sticky header - show effects after scrolling down
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Show sticky effects only after scrolling down 80px (3-4 scrolls)
      const scrollThreshold = 80;
      setIsHeaderSticky(scrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    // Check initial scroll position
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);


  return (
    <>
      <header 
          suppressHydrationWarning
          className="fixed top-0 left-0 right-0 w-full z-[101] overflow-visible rounded-b-2xl bg-white"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            boxShadow: isHeaderSticky ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
            backgroundColor: isHeaderSticky ? 'rgba(255, 255, 255, 0.7)' : 'rgb(255, 255, 255)',
            backdropFilter: isHeaderSticky ? 'blur(16px)' : 'none',
            borderBottom: isHeaderSticky ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
            transition: 'none'
          }}
      >
        <div className="px-4 lg:px-6 max-w-[90vw] mx-auto w-full">
          <div className="grid grid-cols-[auto,1fr,auto] lg:flex lg:items-center lg:justify-between h-14 sm:h-16 gap-2 min-h-0">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-none flex-shrink-0 hover:opacity-80 transition-opacity -mt-[5px]" aria-label="FILLER - Strona główna">
            <div
              className="select-none"
              style={{
                fontFamily: 'Raleway, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, \"Apple Color Emoji\", \"Segoe UI Emoji\"',
                fontWeight: 800,
                letterSpacing: '0.12em',
                fontSize: '28px',
                lineHeight: '38px',
                color: '#000000'
              }}
            >
              FILLER
            </div>
          </Link>

          {/* Spacer / Middle column for mobile to allow shrink without overflow */}
          <div className="min-w-0 lg:hidden col-start-2" />

          {/* Navigation - desktop only */}
          <nav
            className="hidden lg:flex items-center gap-1 flex-none"
            style={{
              fontFamily: 'Raleway, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"'
            }}
          >
            <Link 
              href="/" 
              className={`group relative px-4 py-2 font-semibold tracking-wide uppercase text-sm ${
                pathname === '/' 
                  ? 'text-black' 
                  : 'text-gray-900'
              }`}
              onMouseEnter={() => setIsShopOpen(false)}
            >
              <span className="relative z-10">Strona główna</span>
              {/* Animated underline - slides in from left to right */}
              <span className={`absolute bottom-0.5 left-4 right-4 h-px bg-gray-900 transition-all duration-500 ease-out origin-left ${
                pathname === '/' ? 'scale-x-0' : 'scale-x-0 group-hover:scale-x-100'
              }`}></span>
            </Link>
            <div 
              className="relative overflow-visible shop-dropdown-container flex items-center gap-1"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const newValue = !isShopOpen;
                  setIsShopOpen(newValue);
                  // Dispatch event for banner to listen
                  window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: newValue } }));
                }}
                suppressHydrationWarning
                className={`group relative px-4 py-2 text-gray-900 font-semibold inline-flex items-center gap-1 outline-none uppercase tracking-wide text-sm ${
                  isShopOpen ? 'text-black' : ''
                }`}
                aria-expanded={isShopOpen}
                aria-haspopup="true"
              >
                <span className="relative z-10">Sklep</span>
                <ChevronDown suppressHydrationWarning className={`w-4 h-4 relative z-10 ${isShopOpen ? 'rotate-180 text-gray-900' : 'text-gray-600'}`} />
                {/* Animated underline - slides in from left to right */}
                <span className={`absolute bottom-0.5 left-4 right-4 h-px bg-gray-900 transition-all duration-500 ease-out origin-left ${
                  isShopOpen ? 'scale-x-0' : 'scale-x-0 group-hover:scale-x-100'
                }`}></span>
              </button>
              
              {/* Shop Modal is now rendered inside ShopExplorePanel component */}
            </div>
            <a 
              href="/o-nas" 
              className={`group relative px-4 py-2 font-semibold tracking-wide uppercase text-sm ${
                pathname === '/o-nas' 
                  ? 'text-black' 
                  : 'text-gray-900'
              }`}
              onMouseEnter={() => setIsShopOpen(false)}
            >
              <span className="relative z-10">O nas</span>
              {/* Animated underline - slides in from left to right */}
              <span className={`absolute bottom-0.5 left-4 right-4 h-px bg-gray-900 transition-all duration-500 ease-out origin-left ${
                pathname === '/o-nas' ? 'scale-x-0' : 'scale-x-0 group-hover:scale-x-100'
              }`}></span>
            </a>
            <a 
              href="/kontakt" 
              className={`group relative px-4 py-2 font-semibold tracking-wide uppercase text-sm ${
                pathname === '/kontakt' 
                  ? 'text-black' 
                  : 'text-gray-900'
              }`}
              onMouseEnter={() => setIsShopOpen(false)}
            >
              <span className="relative z-10">Kontakt</span>
              {/* Animated underline - slides in from left to right */}
              <span className={`absolute bottom-0.5 left-4 right-4 h-px bg-gray-900 transition-all duration-500 ease-out origin-left ${
                pathname === '/kontakt' ? 'scale-x-0' : 'scale-x-0 group-hover:scale-x-100'
              }`}></span>
            </a>
          </nav>

          {/* Mobile Icons with Labels */}
          <div className="lg:hidden col-start-3 flex items-center gap-3 justify-end min-w-0 flex-shrink-0">
            {/* Mobile Search Icon */}
            <button
              onClick={() => {
                if (isMobileMenuOpen) closeMobileMenu();
                setIsSearchModalOpen(true);
              }}
              className="shrink-0 flex items-center justify-center text-black hover:text-gray-800 transition-colors"
              aria-label="Szukaj"
            >
              <Search className="w-6 h-6" strokeWidth={1.5} />
            </button>
            {isAuthenticated ? (
              <div className="relative user-menu-container">
                <button
                  onClick={() => {
                    if (isMobileMenuOpen) closeMobileMenu();
                    if (isSearchModalOpen) setIsSearchModalOpen(false);
                    setShowUserMenu(!showUserMenu);
                  }}
                className="shrink-0 flex items-center justify-center text-black hover:text-gray-800 transition-colors"
                  aria-label="Menu użytkownika"
                  aria-expanded={showUserMenu}
              >
                <User className="w-6 h-6" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (isMobileMenuOpen) closeMobileMenu();
                  if (isSearchModalOpen) setIsSearchModalOpen(false);
                  window.dispatchEvent(new CustomEvent('openLogin'));
                }}
                className="shrink-0 flex items-center justify-center text-black hover:text-gray-800 transition-colors"
                aria-label="Zaloguj się"
              >
                <User className="w-6 h-6" strokeWidth={1.5} />
              </button>
            )}

            {/* Mobile Favorites Icon */}
            <button
              onClick={() => {
                if (isMobileMenuOpen) closeMobileMenu();
                if (isSearchModalOpen) setIsSearchModalOpen(false);
                openFavoritesModal();
              }}
              className="shrink-0 flex items-center justify-center text-black hover:text-gray-800 transition-colors relative"
              aria-label="Ulubione"
            >
              <Heart className="w-6 h-6" strokeWidth={1.5} />
              {favoritesCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-red-500 text-white text-[9px] rounded-full w-3 h-3 flex items-center justify-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Mobile Cart Icon */}
            <button
              onClick={openCart}
              className="shrink-0 flex items-center justify-center text-black hover:text-gray-800 transition-colors relative"
              aria-label="Koszyk"
            >
              <ShoppingCart className="w-6 h-6" strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-blue-500 text-white text-[9px] rounded-full w-3 h-3 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Icon - ANIMATED HAMBURGER */}
            <motion.button
              onClick={() => {
                if (isMobileMenuOpen) {
                  closeMobileMenu();
                } else {
                  if (isSearchModalOpen) setIsSearchModalOpen(false);
                  setIsMobileMenuOpen(true);
                  setMobileMenuView('main');
                }
              }}
              className="shrink-0 flex items-center justify-center text-black hover:text-gray-800 transition-colors relative w-8 h-8"
              aria-label={isMobileMenuOpen ? "Zamknij menu" : "Otwórz menu"}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {/* Hamburger Lines */}
              <div className="relative w-6 h-6 flex flex-col justify-center items-center">
                {/* Top Line */}
                <motion.div
                  className="absolute w-5 h-0.5 bg-current rounded-full"
                  animate={{
                    rotate: isMobileMenuOpen ? 45 : 0,
                    y: isMobileMenuOpen ? 0 : -6,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                />
                
                {/* Middle Line */}
                <motion.div
                  className="absolute w-5 h-0.5 bg-current rounded-full"
                  animate={{
                    opacity: isMobileMenuOpen ? 0 : 1,
                    scale: isMobileMenuOpen ? 0 : 1,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                />
                
                {/* Bottom Line */}
                <motion.div
                  className="absolute w-5 h-0.5 bg-current rounded-full"
                  animate={{
                    rotate: isMobileMenuOpen ? -45 : 0,
                    y: isMobileMenuOpen ? 0 : 6,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                />
              </div>
            </motion.button>
          </div>

          {/* Desktop icons - hidden on mobile */}
          <div 
            className="hidden lg:flex items-center space-x-4 justify-end pr-2 overflow-visible"
            onMouseEnter={() => setIsShopOpen(false)}
          >
            {/* Search Icon */}
            <button 
              onClick={() => {
                if (isMobileMenuOpen) closeMobileMenu();
                setIsSearchModalOpen(true);
              }}
              className="flex items-center justify-center text-black hover:text-gray-800 transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded"
              title="Szukaj"
              aria-label="Szukaj"
            >
              <Search className="w-6 h-6" strokeWidth={1.5} />
            </button>

            {/* Email Notification Center - Admin Only */}
            {isAuthenticated && user?.role === 'admin' && (
              <button 
                onClick={() => {
                  if (isMobileMenuOpen) closeMobileMenu();
                  if (isSearchModalOpen) setIsSearchModalOpen(false);
                  setIsEmailCenterOpen(true);
                }}
                className="text-black hover:text-gray-800 transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded"
                title="Email Notification Center"
                aria-label="Centrum powiadomień email"
              >
                <Mail className="w-6 h-6" strokeWidth={1.5} />
              </button>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative user-menu-container overflow-visible">
                <button
                  onClick={() => {
                    if (isMobileMenuOpen) closeMobileMenu();
                    if (isSearchModalOpen) setIsSearchModalOpen(false);
                    setShowUserMenu(!showUserMenu);
                  }}
                  className="text-black hover:text-gray-800 transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded flex items-center justify-center w-8 h-8 leading-none"
                  aria-label="Menu użytkownika"
                  aria-expanded={showUserMenu}
                >
                  <User className="w-6 h-6 block" strokeWidth={1.5} />
                </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                  if (isMobileMenuOpen) closeMobileMenu();
                  if (isSearchModalOpen) setIsSearchModalOpen(false);
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
                              className="text-black hover:text-gray-800 transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded flex items-center justify-center w-8 h-8 leading-none"
                              data-test="open-login-btn"
                              aria-label="Zaloguj się"
                            >
                              <User className="w-6 h-6 block" strokeWidth={1.5} />
                            </button>
                          )}
                          
            <button 
              className="text-black hover:text-gray-800 transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded relative group"
              onClick={() => {
                if (isMobileMenuOpen) closeMobileMenu();
                if (isSearchModalOpen) setIsSearchModalOpen(false);
                openFavoritesModal();
              }}
              title="Ulubione"
              aria-label="Ulubione produkty"
            >
              <Heart className="w-6 h-6 group-hover:text-red-500 transition-colors" strokeWidth={1.5} />
              {isMounted && favoritesCount > 0 && (
                <span className="pointer-events-none absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-red-500 text-white text-[9px] rounded-full w-3 h-3 flex items-center justify-center ring-1 ring-white">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Cart */}
            <button 
              className="text-black hover:text-gray-800 transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded relative group"
              onClick={() => {
                openCart();
              }}
              title="Koszyk"
              aria-label="Koszyk zakupowy"
            >
              <ShoppingCart className="w-6 h-6 group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="pointer-events-none absolute top-0 right-0 transform translate-x-2 -translate-y-2 bg-blue-500 text-white text-[9px] rounded-full w-3 h-3 flex items-center justify-center ring-1 ring-white animate-bounce">
                  {itemCount}
                </span>
              )}
            </button>

          </div>
          </div>
        </div>
        
        {/* Mobile Menu - Header Expansion */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className={`${isHeaderSticky ? 'fixed top-14 sm:top-16' : 'absolute top-full'} left-0 right-0 h-[calc(100vh-3.5rem)] bg-white overflow-hidden z-[101] flex flex-col lg:absolute lg:top-full lg:left-0 lg:right-0 lg:w-full lg:h-auto lg:max-h-[80vh] lg:hidden`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'calc(100vh - 3.5rem)', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              data-mobile-menu
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
            >
              <div className="w-full max-w-[90vw] mx-auto h-full flex flex-col">
                {/* 🚀 SENIOR LEVEL - Slide Navigation Content */}
                <AnimatePresence mode="wait">
                  {/* MAIN VIEW */}
                  {mobileMenuView === 'main' && (
                    <motion.div
                      key="main"
                      initial={{ x: 0, opacity: 1 }}
                      exit={{ x: '-100%', opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="flex flex-col h-full"
                    >
                      {/* Top border line */}
                      <div className="px-4 border-t border-gray-100"></div>

                      {/* Main Navigation - All in One */}
                      <div className="flex-1 overflow-y-auto p-4">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4 px-4">
                          <Menu className="w-4 h-4" />
                          Menu
                        </h3>
                        <div className="space-y-2 w-full">
                          <a 
                            href="/" 
                            className="flex items-center justify-start w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-black font-medium rounded-lg transition-colors"
                            onClick={closeMobileMenu}
                          >
                            Strona główna
                          </a>
                          
                          {/* Sklep - Slide to Sklep View */}
                          <button
                            onClick={() => setMobileMenuView('sklep')}
                            className="flex items-center justify-start w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-black font-medium rounded-lg transition-colors"
                          >
                            <span>Sklep</span>
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </button>
                          
                          <a 
                            href="/o-nas" 
                            className="flex items-center justify-start w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-black font-medium rounded-lg transition-colors"
                            onClick={closeMobileMenu}
                          >
                            O nas
                          </a>
                          
                          <a 
                            href="/kontakt" 
                            className="flex items-center justify-start w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-black font-medium rounded-lg transition-colors"
                            onClick={closeMobileMenu}
                          >
                            Kontakt
                          </a>

                          {!isAuthenticated && (
                            <Link 
                              href="/moje-konto" 
                              className="flex items-center justify-start w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-black font-medium rounded-lg transition-colors"
                              onClick={closeMobileMenu}
                            >
                              <User className="w-5 h-5 mr-2" />
                              Zaloguj się
                            </Link>
                          )}

                        {isAuthenticated && (
                            <button
                            onClick={() => { logout(); closeMobileMenu(); }}
                              className="flex items-center justify-start w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-black font-medium rounded-lg transition-colors"
                          >
                              <LogOut className="w-5 h-5 mr-2" />
                              Wyloguj się
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Social Media Icons - Positioned at 80% from top */}
                      <div className="px-4 pb-4 pt-4 border-t border-gray-100" style={{ marginTop: 'auto', marginBottom: '20%' }}>
                        <div className="flex space-x-4">
                            <a 
                              href="tel:+48123456789" 
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                              onClick={closeMobileMenu}
                            >
                              <Phone className="w-6 h-6" />
                            </a>
                            <a 
                              href="https://facebook.com" 
                              target="_blank" 
                              rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                              onClick={closeMobileMenu}
                            >
                              <Facebook className="w-6 h-6" />
                            </a>
                            <a 
                              href="https://instagram.com" 
                              target="_blank" 
                              rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                              onClick={closeMobileMenu}
                            >
                              <Instagram className="w-6 h-6" />
                            </a>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* SKLEP VIEW */}
                  {mobileMenuView === 'sklep' && (
                    <motion.div
                      key="sklep"
                      initial={{ x: '100%', opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: '-100%', opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="flex flex-col h-full"
                    >
                      {/* Header with Back Button */}
                      <div className="flex items-center justify-between p-4">
                        <button
                          onClick={() => setMobileMenuView('main')}
                          className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 rotate-180" />
                          <span className="text-lg font-semibold">Sklep</span>
                        </button>
                      </div>

                      {/* Filter-Style UI - Clean Design */}
                      <div className="flex-1 overflow-y-auto p-4 pt-0">
                        <div className="space-y-2">
                          {categoriesLoading ? (
                            <div className="text-sm text-gray-500 text-center py-8">Ładowanie kategorii...</div>
                          ) : categories.length === 0 ? (
                            <div className="text-sm text-gray-500 text-center py-8">Brak kategorii</div>
                          ) : (
                            <>
                              {/* Wszystkie kategorie - Na górze */}
                              <div className="border border-gray-100 rounded-lg overflow-hidden">
                                <Link
                                  href="/sklep"
                                  className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                  onClick={closeMobileMenu}
                                >
                                  <div className="w-6 h-6 mr-2"></div>
                                  <span className="text-sm font-medium text-gray-900 flex-1">
                                    Wszystkie kategorie
                                  </span>
                                </Link>
                              </div>

                              {/* Categories - Filter Style */}
                              {categories
                                .filter(cat => cat.parent === 0 && cat.name !== 'Wszystkie kategorie')
                                .map((category) => {
                                  const subcategories = categories.filter(sub => sub.parent === category.id);
                                  const isExpanded = expandedCategories.has(category.id);
                                  
                                  return (
                                    <div key={category.id} className="border border-gray-100 rounded-lg overflow-hidden">
                                      {/* Main Category */}
                                      <div className="bg-gray-50">
                                        <div className="flex items-center p-3">
                                          {subcategories.length > 0 && (
                                            <button
                                              onClick={() => toggleCategory(category.id)}
                                              className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 transition-all duration-200 mr-3"
                                            >
                                              <motion.div
                                                animate={{ rotate: isExpanded ? 45 : 0 }}
                                                transition={{ duration: 0.2 }}
                                              >
                                                <Plus className="w-4 h-4 text-blue-600" />
                                              </motion.div>
                                            </button>
                                          )}
                                          
                                          <Link
                                            href={`/sklep?category=${category.slug}`}
                                            className="flex items-center flex-1 cursor-pointer"
                                            onClick={closeMobileMenu}
                                          >
                                            <span className="text-sm font-medium text-gray-900 flex-1">
                                              {category.name}
                                            </span>
                                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full border">
                                              {category.count}
                                            </span>
                                          </Link>
                                        </div>
                                      </div>
                                      
                                      {/* Subcategories - SENIOR LEVEL UI */}
                                      {subcategories.length > 0 && (
                                        <motion.div
                                          initial={false}
                                          animate={{ 
                                            height: isExpanded ? 'auto' : 0,
                                            opacity: isExpanded ? 1 : 0,
                                            y: isExpanded ? 0 : -10
                                          }}
                                          transition={{ 
                                            duration: 0.3, 
                                            ease: [0.4, 0, 0.2, 1],
                                            opacity: { duration: 0.2 },
                                            y: { duration: 0.3 }
                                          }}
                                          className="overflow-hidden"
                                        >
                                          <div className="bg-gradient-to-r from-gray-50 to-white border-t border-gray-200 shadow-sm">
                                            {subcategories.map((subcategory, index) => (
                                              <motion.div
                                                key={subcategory.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ 
                                                  opacity: isExpanded ? 1 : 0,
                                                  x: isExpanded ? 0 : -20
                                                }}
                                                transition={{ 
                                                  delay: isExpanded ? index * 0.05 : 0,
                                                  duration: 0.2,
                                                  ease: 'easeOut'
                                                }}
                                              >
                                                <div className="flex items-center p-3 pl-8 hover:bg-white/80 hover:shadow-sm transition-all duration-200 border-b border-gray-100 last:border-b-0 group">
                                                  {/* Subcategory indicator */}
                                                  <div className="w-2 h-2 rounded-full bg-blue-400 mr-3 group-hover:bg-blue-500 transition-colors"></div>
                                                  
                                                  <Link
                                                    href={`/sklep?category=${subcategory.slug}`}
                                                    className="flex items-center flex-1 cursor-pointer"
                                                    onClick={closeMobileMenu}
                                                  >
                                                    <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium flex-1 transition-colors">
                                                      {subcategory.name}
                                                    </span>
                                                    <span className="text-xs text-gray-500 bg-white group-hover:bg-blue-50 px-2 py-1 rounded-full border border-gray-200 group-hover:border-blue-200 transition-all duration-200">
                                                      {subcategory.count}
                                                    </span>
                                                  </Link>
                                                </div>
                                              </motion.div>
                                            ))}
                                          </div>
                                        </motion.div>
                                      )}
                                    </div>
                                  );
                                })}
                              
                              {/* Marki - Special Styled Button */}
                              <div className="border border-gray-100 rounded-lg">
                                <button
                                  onClick={() => setMobileMenuView('marki')}
                                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 transition-all duration-200 group rounded-lg"
                                >
                                  <div className="flex items-center">
                                    <div className="w-6 h-6 mr-3 flex items-center justify-center">
                                      <Tag className="w-4 h-4 text-blue-600 group-hover:text-blue-700 transition-colors" />
                                    </div>
                                    <span className="text-sm font-semibold text-blue-800 group-hover:text-blue-900">Marki</span>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-blue-600 group-hover:text-blue-700 transition-colors" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* MARKI VIEW */}
                  {mobileMenuView === 'marki' && (
                    <motion.div
                      key="marki"
                      initial={{ x: '100%', opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: '-100%', opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="flex flex-col h-full"
                    >
                      {/* Header with Back Button */}
                      <div className="flex items-center justify-between p-4">
                        <button
                          onClick={() => setMobileMenuView('sklep')}
                          className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 rotate-180" />
                          <span className="text-lg font-semibold">Marki</span>
                        </button>
                      </div>

                      {/* Brands Grid */}
                      <div className="flex-1 overflow-y-auto p-4 pt-0">
                        <div className="flex flex-wrap gap-2">
                          {brandsLoading ? (
                            <div className="text-sm text-gray-500">Ładowanie marek...</div>
                          ) : (
                            brands.map((brand) => (
                              <button
                                key={brand.id}
                                onClick={() => {
                                  closeMobileMenu();
                                  window.location.href = `/sklep?brand=${encodeURIComponent(brand.slug)}`;
                                }}
                                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-black hover:text-gray-800 rounded-full transition-colors whitespace-nowrap"
                              >
                                {brand.name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
      </header>
      
      {/* Shop Dropdown - rendered outside header */}
      <ShopExplorePanel open={isShopOpen} onClose={() => setIsShopOpen(false)} />
      
      {/* Email Notification Center */}
      <EmailNotificationCenter 
        isOpen={isEmailCenterOpen}
        onClose={() => setIsEmailCenterOpen(false)}
      />
      
      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
      
      {/* User Dropdown Menu - Global (works for both desktop and mobile) */}
      <AnimatePresence>
        {showUserMenu && isAuthenticated && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setShowUserMenu(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-14 sm:top-16 right-2 md:right-2 w-[280px] sm:w-[300px] md:w-auto md:max-w-[280px] bg-white border border-gray-200 rounded-xl py-2 z-[70] shadow-sm"
            >
              {/* User Info */}
              <div className="px-4 py-3">
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
              <div className="pt-1">
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
      
      {/* Favorites Modal */}
    </>
  );
}

