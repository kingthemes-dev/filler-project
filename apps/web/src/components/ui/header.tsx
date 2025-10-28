'use client';

import { useState, useEffect } from 'react';
import { UI_SPACING } from '@/config/constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Heart, ShoppingCart, Menu, X, LogOut, Mail, Settings, Package, ChevronDown, ChevronRight, FileText, Phone, Facebook, Instagram, Youtube, Plus, Tag } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/favorites-store';
import { useWishlist } from '@/hooks/use-wishlist';
import Link from 'next/link';
import Image from 'next/image';
import EmailNotificationCenter from './email/email-notification-center';
import ShopExplorePanel from './shop-explore-panel';
import SearchModal from './search-modal';
import { useShopDataStore, useShopCategories, useShopAttributes, useShopStats } from '@/stores/shop-data-store';



export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isEmailCenterOpen, setIsEmailCenterOpen] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isShopExpanded, setIsShopExpanded] = useState(false);
  const [isBrandsExpanded, setIsBrandsExpanded] = useState(false);
  const [shopHoverTimeout, setShopHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // 🚀 SENIOR LEVEL - Slide Navigation State
  const [mobileMenuView, setMobileMenuView] = useState<'main' | 'sklep' | 'marki'>('main');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  
  // Użyj prefetched data z store
  const { categories, mainCategories, getSubCategories, isLoading: categoriesLoading } = useShopCategories();
  const { brands, isLoading: brandsLoading } = useShopAttributes();
  const { totalProducts, initialize } = useShopDataStore();
  
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

  // Handle scroll for glassmorphism effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  return (
    <>
      <header 
          className={`sticky top-4 z-50 will-change-transform transition-all duration-300 mx-auto max-w-[95vw] rounded-3xl overflow-visible ${
          isScrolled 
            ? `${isShopOpen ? 'bg-white shadow-md border border-gray-300' : 'bg-white shadow-md border border-gray-300'}` 
            : `${isShopOpen ? 'bg-white' : 'bg-white'}`
        }`}
      >
        <div className="px-4 lg:px-6">
          <div className="grid grid-cols-[auto,1fr,auto] lg:flex lg:items-center lg:justify-between h-16 sm:h-20 gap-2 min-h-0">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-none flex-shrink-0 hover:opacity-80 transition-opacity -mt-[5px]">
            <Image 
              src="/images/logo.webp" 
              alt="FILLER" 
              width={144} 
              height={48} 
              className="h-[38px] sm:h-12 w-auto"
              priority
            />
          </Link>

          {/* Spacer / Middle column for mobile to allow shrink without overflow */}
          <div className="min-w-0 lg:hidden col-start-2" />

          {/* Navigation - desktop only */}
          <nav
            className="hidden lg:flex items-center gap-6 flex-none"
          >
            <Link 
              href="/" 
              className="text-black hover:text-gray-700 transition-colors font-normal tracking-normal text-center"
              onMouseEnter={() => setIsShopOpen(false)}
            >
              Strona główna
            </Link>
            <div 
              className="relative overflow-visible shop-dropdown-container flex items-center gap-2"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const newValue = !isShopOpen;
                  setIsShopOpen(newValue);
                  // Dispatch event for banner to listen
                  window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: newValue } }));
                }}
                className="text-black hover:text-gray-700 transition-colors font-normal inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-black/20 rounded-md px-2 py-1"
                aria-expanded={isShopOpen}
                aria-haspopup="true"
              >
                Sklep
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isShopOpen ? 'rotate-180' : ''}`} />
              </button>
              <Link
                href="/sklep"
                className="text-black hover:text-gray-700 transition-colors font-normal tracking-normal"
                onClick={() => {
                  setIsShopOpen(false);
                  window.dispatchEvent(new CustomEvent('shopModalToggle', { detail: { open: false } }));
                }}
              >
                Wszystkie produkty
              </Link>
              
              {/* Shop Modal is now rendered inside ShopExplorePanel component */}
            </div>
            <a 
              href="/o-nas" 
              className="text-black hover:text-gray-700 transition-colors font-normal tracking-normal text-center"
              onMouseEnter={() => setIsShopOpen(false)}
            >
              O nas
            </a>
            <a 
              href="/kontakt" 
              className="text-black hover:text-gray-700 transition-colors font-normal tracking-normal text-center"
              onMouseEnter={() => setIsShopOpen(false)}
            >
              Kontakt
            </a>
          </nav>

          {/* Mobile Icons with Labels */}
          <div className="lg:hidden col-start-3 flex items-center gap-3 justify-end min-w-0 flex-shrink-0">
            {/* Mobile Search Icon */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="shrink-0 flex items-center justify-center text-black hover:text-gray-800 transition-colors"
              aria-label="Szukaj"
            >
              <Search className="w-6 h-6" strokeWidth={1.5} />
            </button>
            {isAuthenticated ? (
              <Link
                href="/moje-konto"
                className="shrink-0 flex items-center justify-center text-black hover:text-gray-800 transition-colors"
                aria-label="Moje konto"
              >
                <User className="w-6 h-6" strokeWidth={1.5} />
              </Link>
            ) : (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('openLogin'))}
                className="shrink-0 flex items-center justify-center text-black hover:text-gray-800 transition-colors"
                aria-label="Zaloguj się"
              >
                <User className="w-6 h-6" strokeWidth={1.5} />
              </button>
            )}

            {/* Mobile Favorites Icon */}
            <button
              onClick={() => openFavoritesModal()}
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
            className="hidden lg:flex items-center space-x-6 justify-end pr-2 overflow-visible"
            onMouseEnter={() => setIsShopOpen(false)}
          >
            {/* Search Icon */}
            <button 
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center justify-center text-black hover:text-gray-800 transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded"
              title="Szukaj"
              aria-label="Szukaj"
            >
              <Search className="w-6 h-6" strokeWidth={1.5} />
            </button>

            {/* Email Notification Center - Admin Only */}
            {isAuthenticated && user?.role === 'admin' && (
              <button 
                onClick={() => setIsEmailCenterOpen(true)}
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
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="text-black hover:text-gray-800 transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded "
                >
                  <User className="w-6 h-6" strokeWidth={1.5} />
                </button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setShowUserMenu(false)} />                      
                      {/* Dropdown */}
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="fixed bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-[70]"
                      style={{
                        top: '80px',
                        right: '60px',
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
                              className="text-black hover:text-gray-800 transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded"
                              data-test="open-login-btn"
                              aria-label="Zaloguj się"
                            >
                              <User className="w-6 h-6" strokeWidth={1.5} />
                            </button>
                          )}
                          
            <button 
              className="text-black hover:text-gray-800 transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded relative group"
              onClick={openFavoritesModal}
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
                console.log('🛒 Cart button clicked!');
                console.log('🛒 Current cart state:', useCartStore.getState());
                openCart();
                console.log('🛒 After openCart call');
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
              className="bg-gradient-to-r from-gray-50 via-white to-gray-50 overflow-hidden rounded-b-2xl border border-gray-300 shadow-xl"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              data-mobile-menu
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
            >
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

                      {/* Main Navigation */}
                      <div className="flex-1 overflow-y-auto p-4 pb-0">
                        <div className="space-y-1">
                          <a 
                            href="/" 
                            className="block text-black hover:text-gray-800 hover:bg-gray-100 transition-colors py-3 px-4 border-l-2 border-transparent hover:border-gray-300 rounded-lg"
                            onClick={closeMobileMenu}
                          >
                            Strona główna
                          </a>
                          
                          {/* Sklep - Slide to Sklep View */}
                          <button
                            onClick={() => setMobileMenuView('sklep')}
                            className="w-full flex items-center justify-between text-black hover:text-gray-800 hover:bg-gray-100 transition-colors py-3 px-4 border-l-2 border-transparent hover:border-gray-300 rounded-lg"
                          >
                            <span>Sklep</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          
                          <a 
                            href="/o-nas" 
                            className="block text-black hover:text-gray-800 hover:bg-gray-100 transition-colors py-3 px-4 border-l-2 border-transparent hover:border-gray-300 rounded-lg"
                            onClick={closeMobileMenu}
                          >
                            O nas
                          </a>
                          
                          <a 
                            href="/kontakt" 
                            className="block text-black hover:text-gray-800 hover:bg-gray-100 transition-colors py-3 px-4 border-l-2 border-transparent hover:border-gray-300 rounded-lg"
                            onClick={closeMobileMenu}
                          >
                            Kontakt
                          </a>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        {isAuthenticated ? (
                          <div className="space-y-1 mb-2">
                            <Link 
                              href="/moje-konto" 
                              className="flex items-center space-x-3 text-black hover:text-gray-800 hover:bg-gray-100 transition-colors py-3 px-4 border-l-2 border-b-0 border-transparent hover:border-gray-300 rounded-lg"
                              onClick={closeMobileMenu}
                            >
                              <User className="w-5 h-5" />
                              <span className="text-sm font-medium">Moje konto</span>
                            </Link>

                            <Link 
                              href="/moje-zamowienia" 
                              className="flex items-center space-x-3 text-black hover:text-gray-800 hover:bg-gray-100 transition-colors py-3 px-4 border-l-2 border-b-0 border-transparent hover:border-gray-300 rounded-lg"
                              onClick={closeMobileMenu}
                            >
                              <Package className="w-5 h-5" />
                              <span className="text-sm font-medium">Moje zamówienia</span>
                            </Link>

                            <Link 
                              href="/moje-faktury" 
                              className="flex items-center space-x-3 text-black hover:text-gray-800 hover:bg-gray-100 transition-colors py-3 px-4 border-l-2 border-b-0 border-transparent hover:border-gray-300 rounded-lg"
                              onClick={closeMobileMenu}
                            >
                              <FileText className="w-5 h-5" />
                              <span className="text-sm font-medium">Faktury</span>
                            </Link>

                            <button
                              onClick={() => { openFavoritesModal(); closeMobileMenu(); }}
                              className="w-full flex items-center space-x-3 text-black hover:text-gray-800 hover:bg-gray-100 transition-colors py-3 px-4 border-l-2 border-b-0 border-transparent hover:border-gray-300 rounded-lg"
                            >
                              <Heart className="w-5 h-5" />
                              <span className="text-sm font-medium">Lista życzeń</span>
                            </button>
                          </div>
                        ) : (
                          <div className="mb-2">
                            <Link 
                              href="/moje-konto" 
                              className="w-full flex items-center justify-center space-x-2 p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 text-black hover:text-gray-800"
                              onClick={closeMobileMenu}
                            >
                              <User className="w-5 h-5" />
                              <span className="text-sm font-medium">Zaloguj się</span>
                            </Link>
                          </div>
                        )}

                        {/* Logout Button */}
                        {isAuthenticated && (
                          <button
                            onClick={() => { logout(); closeMobileMenu(); }}
                            className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 text-gray-700 hover:text-red-600 mt-2"
                          >
                            <div className="flex items-center space-x-3">
                              <LogOut className="w-5 h-5" />
                              <span className="text-sm font-medium">Wyloguj się</span>
                            </div>
                          </button>
                        )}

                        {/* Social Media */}
                        <div className="pb-4">
                          <div className="flex justify-center space-x-4">
                            <a 
                              href="tel:+48123456789" 
                              className="flex items-center justify-center p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                              onClick={closeMobileMenu}
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                            <a 
                              href="https://facebook.com" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center justify-center p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                              onClick={closeMobileMenu}
                            >
                              <Facebook className="w-4 h-4" />
                            </a>
                            <a 
                              href="https://instagram.com" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center justify-center p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                              onClick={closeMobileMenu}
                            >
                              <Instagram className="w-4 h-4" />
                            </a>
                          </div>
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
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <button
                          onClick={() => setMobileMenuView('main')}
                          className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 rotate-180" />
                          <span className="text-lg font-semibold">Sklep</span>
                        </button>
                      </div>

                      {/* Filter-Style UI - Clean Design */}
                      <div className="flex-1 overflow-y-auto p-4">
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
                      <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <button
                          onClick={() => setMobileMenuView('sklep')}
                          className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 rotate-180" />
                          <span className="text-lg font-semibold">Marki</span>
                        </button>
                      </div>

                      {/* Brands Grid */}
                      <div className="flex-1 overflow-y-auto p-4">
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
      
      {/* Favorites Modal */}
    </>
  );
}

