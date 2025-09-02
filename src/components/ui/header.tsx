'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Heart, ShoppingCart, Menu, X, LogOut, Mail } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import Link from 'next/link';
import EmailNotificationCenter from './email/email-notification-center';
import SearchBar from './search/search-bar';



export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isEmailCenterOpen, setIsEmailCenterOpen] = useState(false);
  const { itemCount, openCart } = useCartStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center">
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
                        {/* Search - visible on all screens */}
                        <SearchBar 
                          placeholder="Szukaj produktów..."
                          className="w-64"
                        />
                        
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
                          
                          <button className="text-gray-700 hover:text-black transition duration-150 ease-out will-change-transform hover:scale-[1.04] active:scale-[0.98] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 rounded">
                            <Heart className="w-6 h-6" />
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
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Strona główna
                  </a>
                  <a 
                    href="/sklep" 
                    className="block text-lg font-medium text-gray-700 hover:text-black transition-colors py-3 border-b border-gray-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sklep
                  </a>
                  <a 
                    href="/o-nas" 
                    className="block text-lg font-medium text-gray-700 hover:text-black transition-colors py-3 border-b border-gray-100"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    O nas
                  </a>
                  <a 
                    href="/kontakt" 
                    className="block text-lg font-medium text-gray-700 hover:text-black transition-colors py-3 border-b border-gray-100"
                    onClick={() => setIsMobileMenuOpen(false)}
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
    </>
  );
}
