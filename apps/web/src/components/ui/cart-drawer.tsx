'use client';

import React, { useState, useEffect } from 'react';
import ModalCloseButton from './modal-close-button';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, Truck, CreditCard, ArrowRight } from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { analytics } from '@headless-woo/shared/utils/analytics';
import Link from 'next/link';
import Image from 'next/image';

export default function CartDrawer() {
  const { isOpen, closeCart, items, total, itemCount, removeItem, updateQuantity } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  
  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  
  // Loading states
  const [isUpdating, setIsUpdating] = useState(false);
  
  console.log('🛒 CartDrawer render - isOpen:', isOpen);
  console.log('🛒 CartDrawer render - items:', items);
  console.log('🛒 CartDrawer render - itemCount:', itemCount);

  // Analytics tracking
  useEffect(() => {
    if (isOpen) {
      analytics.track('cart_opened', { 
        itemCount, 
        totalValue: total,
        isAuthenticated 
      });
    }
  }, [isOpen, itemCount, total, isAuthenticated]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
        analytics.track('cart_closed', { method: 'keyboard_escape' });
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, closeCart]);

  // Free shipping config (netto)
  const FREE_SHIPPING_THRESHOLD = 200; // PLN netto
  // Convert total (with VAT) to netto for comparison
  const nettoTotal = total / 1.23;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - nettoTotal);
  const progress = Math.min(100, (nettoTotal / FREE_SHIPPING_THRESHOLD) * 100);

  const handleQuantityChange = async (item: CartItem, newQuantity: number) => {
    try {
      if (newQuantity < 0) return;
      setIsUpdating(true);
      await updateQuantity(item.id, newQuantity, item.variant?.id);
      
      // Analytics tracking
      analytics.track('cart_quantity_updated', {
        productId: item.id,
        productName: item.name,
        oldQuantity: item.quantity,
        newQuantity,
        variantId: item.variant?.id
      });
    } catch (error) {
      console.error('Quantity update failed:', error);
      // Could add toast notification here
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveItem = async (item: CartItem) => {
    try {
      setIsUpdating(true);
      await removeItem(item.id, item.variant?.id);
      
      // Analytics tracking
      analytics.track('cart_item_removed', {
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        variantId: item.variant?.id
      });
    } catch (error) {
      console.error('Remove item failed:', error);
      // Could add toast notification here
    } finally {
      setIsUpdating(false);
    }
  };

  // Swipe gesture functions
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
    setSwipeProgress(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    
    if (touchStart && isOpen) {
      const distance = e.targetTouches[0].clientX - touchStart;
      const progress = Math.min(Math.max(distance / 100, 0), 1); // Normalize to 0-1
      setSwipeProgress(progress);
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeProgress(0);
      setIsDragging(false);
      return;
    }
    
    const distance = touchEnd - touchStart;
    const isRightSwipe = distance > minSwipeDistance;

    if (isRightSwipe && isOpen) {
      // Swipe right to close
      closeCart();
    }
    
    setSwipeProgress(0);
    setIsDragging(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - COVER HEADER */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-[115] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 115
            }}
          />

          {/* Cart Drawer - HIGHER Z-INDEX */}
          <motion.div
            className="fixed right-0 top-0 h-full bg-white shadow-2xl z-[120] 
                     w-full max-w-[364px] lg:max-w-[428px] xl:max-w-[492px]
                     lg:border-l lg:border-gray-200 flex flex-col
                     rounded-l-2xl rounded-bl-2xl lg:rounded-l-2xl lg:rounded-bl-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-6 h-6 text-black" />
                <h2 className="text-xl font-bold text-black">
                  Koszyk ({itemCount})
                </h2>
              </div>
              <ModalCloseButton 
                onClick={closeCart}
                ariaLabel="Zamknij koszyk"
              />
            </div>

            {/* Free shipping notice - CONSISTENT MARGINS */}
            {items.length > 0 && (
              <div className="p-6 pt-3" onClick={(e) => e.stopPropagation()}>
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      <Truck className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div className="flex-1">
                      {remainingForFreeShipping > 0 ? (
                        <>
                          <p className="text-sm text-emerald-900 font-medium">
                            Darmowa dostawa od <span className="font-semibold">200,00 zł (netto)</span>
                          </p>
                          <p className="text-sm text-emerald-800 mt-0.5">
                            Brakuje jeszcze <span className="font-semibold text-emerald-900">{formatPrice(remainingForFreeShipping)}</span> do darmowej dostawy.
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-emerald-800">
                          Masz darmową dostawę! 🎉
                        </p>
                      )}
                      <div className="mt-3 h-2 w-full rounded-full bg-emerald-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {items.length === 0 ? (
                <div className="text-center py-12 px-6">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Twój koszyk jest pusty
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Dodaj produkty, aby rozpocząć zakupy
                  </p>
                  <Link
                    href="/sklep"
                    onClick={closeCart}
                    className="bg-gradient-to-r from-gray-800 to-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gradient-to-l hover:from-gray-700 hover:to-gray-900  transition-all duration-300 inline-block text-center"
                  >
                    Przejdź do sklepu
                  </Link>
                </div>
              ) : (
                <div className="space-y-2 px-6">
                  {items.map((item, index) => (
                    <div
                      key={`${item.id}-${item.variant?.id || 'default'}-${index}`}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Product Image */}
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300 rounded-lg flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4 text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-medium text-gray-900 leading-tight">
                          {item.name}
                        </h3>
                        {item.variant && item.variant.name !== 'Pojemność' && (
                          <p className="text-xs text-gray-500">
                            {item.variant.value}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-black mt-0.5">
                          {formatPrice(item.sale_price || item.price)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleQuantityChange(item, item.quantity - 1)}
                          disabled={isUpdating}
                          className="p-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Zmniejsz ilość"
                        >
                          <Minus className="w-3 h-3 text-gray-700" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-gray-800 bg-gray-50 px-1 py-1 rounded-md">
                          {isUpdating ? '...' : item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item, item.quantity + 1)}
                          disabled={isUpdating}
                          className="p-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Zwiększ ilość"
                        >
                          <Plus className="w-3 h-3 text-gray-700" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item)}
                        className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600"
                        aria-label="Usuń produkt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer - Fixed at bottom */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 p-6 space-y-4 bg-white rounded-bl-2xl" onClick={(e) => e.stopPropagation()}>

                {/* Total */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-gray-900">
                    Razem:
                  </span>
                  <span className="text-xl font-bold text-black">
                    {formatPrice(nettoTotal)} (netto)
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Top row - View Cart and Checkout */}
                  <div className="flex space-x-3">
                    <Link
                      href="/koszyk"
                      className="flex-1 border-2 border-black text-black py-3 px-4 rounded-lg font-medium hover:bg-gradient-to-r hover:from-gray-800 hover:to-black hover:text-white  transition-all duration-300 flex items-center justify-center"
                      onClick={closeCart}
                    >
                      <span>Zobacz koszyk</span>
                    </Link>

                    <Link
                      href="/checkout"
                      className="flex-1 border-2 border-black text-black py-3 px-4 rounded-lg font-medium hover:bg-gradient-to-r hover:from-gray-800 hover:to-black hover:text-white  transition-all duration-300 flex items-center justify-center space-x-2"
                      onClick={closeCart}
                    >
                      <span>Kasa</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Bottom row - Quick Payment Options (only for authenticated users) */}
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      {/* Google Pay */}
                      <Link
                        href="/checkout?payment=google_pay"
                        className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center space-x-2"
                        onClick={closeCart}
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Google Pay</span>
                      </Link>
                      
                      {/* Apple Pay */}
                      <Link
                        href="/checkout?payment=apple_pay"
                        className="w-full py-2 px-4 bg-gradient-to-r from-gray-800 to-black text-white rounded-lg font-medium hover:bg-gradient-to-l hover:from-gray-700 hover:to-gray-900 transition-all flex items-center justify-center space-x-2"
                        onClick={closeCart}
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                        <span>Apple Pay</span>
                      </Link>
                    </div>
                  ) : (
                    // Login Prompt for Quick Payments
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-blue-900 mb-1">
                            Zaloguj się dla szybszych płatności
                          </h4>
                          <p className="text-xs text-blue-700 mb-3">
                            Oszczędź czas z Google Pay i Apple Pay
                          </p>
                          <Link
                            href="/moje-konto"
                            className="inline-flex items-center space-x-2 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            onClick={closeCart}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            <span>Zaloguj się</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
