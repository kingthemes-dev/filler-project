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
  const [mobileMenuTab, setMobileMenuTab] = useState<'main' | 'filters'>('main');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Prawdziwe dane z WooCommerce
  const [categories, setCategories] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Hierarchia kategorii
  const [mainCategories, setMainCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<{[key: number]: any[]}>({});
  
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

  // Pobierz prawdziwe dane z WooCommerce - kategorie i atrybuty
  useEffect(() => {
    const fetchWooCommerceData = async () => {
      if (mobileMenuTab !== 'filters') return;
      
      setIsLoadingData(true);
      try {
        // Pobierz kategorie i zbuduj hierarchię
        const categoriesResponse = await fetch(`${window.location.origin}/api/woocommerce?endpoint=products/categories&per_page=100`);
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          console.log('📂 All categories loaded:', categoriesData);
          
          const allCategories = Array.isArray(categoriesData) ? categoriesData : [];
          
          // Buduj hierarchię: główne kategorie (parent = 0) i podkategorie
          const mainCats = allCategories.filter(cat => cat.parent === 0 && cat.name !== 'Wszystkie kategorie');
          const subCats: {[key: number]: any[]} = {};
          
          // Grupuj podkategorie według parent_id
          allCategories.forEach(cat => {
            if (cat.parent !== 0) {
              if (!subCats[cat.parent]) {
                subCats[cat.parent] = [];
              }
              subCats[cat.parent].push(cat);
            }
          });
          
          console.log('📂 Main categories:', mainCats);
          console.log('📂 Subcategories:', subCats);
          
          setMainCategories(mainCats);
          setSubCategories(subCats);
          setCategories(allCategories);
        }

        // Pobierz atrybuty (bez pojemności)
        const attributesResponse = await fetch(`${window.location.origin}/api/woocommerce?endpoint=products/attributes&per_page=100`);
        if (attributesResponse.ok) {
          const attributesData = await attributesResponse.json();
          console.log('🏷️ Attributes loaded:', attributesData);
          
          // Filtruj atrybuty - usuń pojemność
          const filteredAttributes = Array.isArray(attributesData) 
            ? attributesData.filter(attr => 
                attr.slug !== 'pojemnosc' && 
                attr.slug !== 'capacity' && 
                !attr.name.toLowerCase().includes('pojemność')
              ) 
            : [];
          
          setAttributes(filteredAttributes);
        }
      } catch (error) {
        console.error('❌ Error loading WooCommerce data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchWooCommerceData();
  }, [mobileMenuTab]);

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

  // Reset mobile menu tab when menu closes
  useEffect(() => {
    if (!isMobileMenuOpen) {
      setMobileMenuTab('main');
    }
  }, [isMobileMenuOpen]);

  // Block body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isMobileMenuOpen]);

  // Keyboard navigation and focus trap for mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
      
      // Focus trap - focus first focusable element
      const firstFocusable = document.querySelector('[data-mobile-menu] button, [data-mobile-menu] a, [data-mobile-menu] input');
      if (firstFocusable) {
        (firstFocusable as HTMLElement).focus();
      }
      
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
        
        {/* Mobile Menu - Identical to Cart Modal */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop - identical to cart */}
              <motion.div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Menu Drawer - identical structure to cart */}
              <motion.div
                className="fixed right-0 top-0 h-full bg-white shadow-2xl z-50 
                         w-full max-w-[364px] lg:max-w-[428px] xl:max-w-[492px]
                         lg:border-l lg:border-gray-200 flex flex-col
                         rounded-l-2xl rounded-bl-2xl lg:rounded-l-2xl lg:rounded-bl-2xl"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                data-mobile-menu
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-menu-title"
                style={{ zIndex: 9999 }}
              >
                {/* Header - identical to cart */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200" onClick={(e) => e.stopPropagation()}>
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
                    autoFocus
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                
                {/* Debug: Show menu state */}
                <div className="p-4 bg-yellow-100 text-xs">
                  Menu is open: {isMobileMenuOpen ? 'true' : 'false'}
                </div>

                {/* Content - identical to cart structure */}
                <div className="flex-1 overflow-y-auto">
                  {/* Debug: Show current tab */}
                  <div className="p-4 bg-blue-100 text-xs">
                    Current tab: {mobileMenuTab}
                  </div>
                  
                  {/* Main Menu */}
                  {mobileMenuTab === 'main' && (
                    <div className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                      {/* Main Navigation Links */}
                      <nav className="space-y-4">
                        <Link 
                          href="/" 
                          className="block text-base font-medium text-gray-700 hover:text-black transition-colors py-3"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsMobileSearchOpen(false);
                          }}
                        >
                          Strona główna
                        </Link>
                        
                        {/* Sklep z filtrami */}
                        <div className="space-y-2">
                          <Link 
                            href="/sklep" 
                            className="block text-base font-medium text-gray-700 hover:text-black transition-colors py-3"
                            onClick={() => {
                              setIsMobileMenuOpen(false);
                              setIsMobileSearchOpen(false);
                            }}
                          >
                            Sklep
                          </Link>
                          
                          {/* Filtry pod Sklep */}
                          <div className="ml-4 space-y-2">
                            <button
                              onClick={() => setMobileMenuTab('filters')}
                              className="block text-sm text-gray-600 hover:text-black transition-colors py-2 flex items-center"
                            >
                              <ChevronRight className="w-4 h-4 mr-2" />
                              Filtry i kategorie
                            </button>
                          </div>
                        </div>
                        
                        <a 
                          href="/o-nas" 
                          className="block text-base font-medium text-gray-700 hover:text-black transition-colors py-3"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsMobileSearchOpen(false);
                          }}
                        >
                          O nas
                        </a>
                        <a 
                          href="/kontakt" 
                          className="block text-base font-medium text-gray-700 hover:text-black transition-colors py-3"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setIsMobileSearchOpen(false);
                          }}
                        >
                          Kontakt
                        </a>
                      </nav>
                    </div>
                  )}

                  {/* Filters Section */}
                  {mobileMenuTab === 'filters' && (
                    <div className="px-6 py-6" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-4">
                        {/* Back button */}
                        <button
                          onClick={() => setMobileMenuTab('main')}
                          className="flex items-center text-sm text-gray-600 hover:text-black transition-colors mb-4"
                        >
                          <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                          Powrót do menu
                        </button>
                        
                        {/* 1. HIERARCHICZNE KATEGORIE - PRAWDZIWE DANE Z WOOCOMMERCE */}
                        <div className="space-y-1">
                          <h3 className="text-base font-medium text-gray-900 mb-3 uppercase tracking-wide">Kategorie</h3>
                          
                          {isLoadingData ? (
                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <div className="animate-pulse flex items-center space-x-3">
                                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Wszystkie kategorie na górze */}
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <Link
                                  href="/sklep"
                                  className="w-full flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <span className="text-sm font-medium text-gray-900">
                                    Wszystkie kategorie <span className="text-sm text-gray-500">(65)</span>
                                  </span>
                                </Link>
                              </div>
                              
                              {mainCategories.map((category) => (
                                <div key={category.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                {/* Główna kategoria - TYLKO rozwijanie */}
                                <div className="flex items-center">
                                  <button
                                    className="flex-1 flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
                                    onClick={() => setExpandedCategory(expandedCategory === `cat-${category.id}` ? null : `cat-${category.id}`)}
                                  >
                                    <span className="text-sm font-medium text-gray-900">
                                      {category.name} <span className="text-sm text-gray-500">({category.count || 0})</span>
                                    </span>
                                  </button>
                                  
                                  {/* Przycisk rozwijania podkategorii */}
                                  {subCategories[category.id] && subCategories[category.id].length > 0 && (
                                    <button
                                      className="p-3 hover:bg-gray-50 transition-colors"
                                      onClick={() => setExpandedCategory(expandedCategory === `cat-${category.id}` ? null : `cat-${category.id}`)}
                                    >
                                      {expandedCategory === `cat-${category.id}` ? (
                                        <ChevronDown className="w-4 h-4 text-gray-600" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                      )}
                                    </button>
                                  )}
                                </div>
                                
                                {/* Podkategorie */}
                                {expandedCategory === `cat-${category.id}` && subCategories[category.id] && (
                                  <div className="border-t border-gray-100 bg-gray-50">
                                    <div className="py-2 space-y-1">
                                      {subCategories[category.id].map((subCategory) => (
                                        <Link
                                          key={subCategory.id}
                                          href={`/sklep?category=${subCategory.slug}`}
                                          className="block w-full text-left py-2 px-6 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                                          onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                          {subCategory.name} {subCategory.count && <span className="text-gray-500">({subCategory.count})</span>}
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                </div>
                              ))}
                            </>
                          )}
                        </div>

                        {/* 2. ATRYBUTY - PRAWDZIWE DANE Z WOOCOMMERCE */}
                        {attributes.map((attribute) => (
                          <div key={attribute.id} className="space-y-1">
                            <h3 className="text-base font-medium text-gray-900 mb-3 uppercase tracking-wide">{attribute.name}</h3>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <button
                                className="w-full flex items-center justify-between py-3 px-4 hover:bg-gray-50 transition-colors"
                                onClick={() => setExpandedSection(expandedSection === `attr-${attribute.id}` ? null : `attr-${attribute.id}`)}
                              >
                                <span className="text-sm font-medium text-gray-900">{attribute.name}</span>
                                {expandedSection === `attr-${attribute.id}` ? (
                                  <ChevronDown className="w-4 h-4 text-gray-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-600" />
                                )}
                              </button>
                              
                              {expandedSection === `attr-${attribute.id}` && (
                                <AttributeTerms attributeId={attribute.id} onClose={() => setIsMobileMenuOpen(false)} />
                              )}
                            </div>
                          </div>
                        ))}

                      </div>
                    </div>
                  )}

                  
                  {/* Bottom Section - Account & Favorites */}
                  <div className="border-t border-gray-200 mt-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="p-6 space-y-4">
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
                        <div className="space-y-3">
                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('openLogin'));
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center space-x-3 text-gray-700 hover:text-black transition-colors py-3 w-full text-left"
                          >
                            <User className="w-5 h-5" />
                            <span className="text-sm font-medium">Zarejestruj się</span>
                          </button>
                        </div>
                      )}
                      
                      {/* Favorites */}
                      <button
                        onClick={() => {
                          openFavoritesModal();
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex items-center space-x-3 text-gray-700 hover:text-black transition-colors py-3 w-full text-left"
                      >
                        <Heart className="w-5 h-5" />
                        <span className="text-sm font-medium">Ulubione</span>
                        {favoritesCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {favoritesCount}
                          </span>
                        )}
                      </button>
                      
                      {/* Social Media */}
                      <div className="flex items-center space-x-4 pt-4 border-t border-gray-100">
                        <a 
                          href="tel:+48535956932" 
                          className="text-gray-600 hover:text-black transition-colors"
                        >
                          <Phone className="w-5 h-5" />
                        </a>
                        <a 
                          href="https://facebook.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-blue-600 transition-colors"
                        >
                          <Facebook className="w-5 h-5" />
                        </a>
                        <a 
                          href="https://instagram.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-pink-600 transition-colors"
                        >
                          <Instagram className="w-5 h-5" />
                        </a>
                      </div>
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

// Komponent do ładowania terminów atrybutów
function AttributeTerms({ attributeId, onClose }: { attributeId: number; onClose: () => void }) {
  const [terms, setTerms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTerms = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${window.location.origin}/api/woocommerce?endpoint=products/attributes/${attributeId}/terms&per_page=100`);
        if (response.ok) {
          const termsData = await response.json();
          console.log(`🏷️ Terms for attribute ${attributeId}:`, termsData);
          setTerms(Array.isArray(termsData) ? termsData : []);
        }
      } catch (error) {
        console.error(`❌ Error loading terms for attribute ${attributeId}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTerms();
  }, [attributeId]);

  if (isLoading) {
    return null;
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50">
      <div className="py-2 space-y-1">
        {terms.map((term) => (
          <Link
            key={term.id}
            href={`/sklep?attribute=${term.slug}`}
            className="block w-full text-left py-2 px-6 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
            onClick={onClose}
          >
            {term.name} {term.count && <span className="text-gray-500">({term.count})</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
