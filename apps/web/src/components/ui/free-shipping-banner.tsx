'use client';

import { useState, useEffect } from 'react';
import { Truck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/stores/cart-store';

export default function FreeShippingBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const { total, itemCount } = useCartStore();
  
  const FREE_SHIPPING_THRESHOLD = 200; // PLN netto
  const nettoTotal = total / 1.23;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - nettoTotal);
  const hasCart = itemCount > 0;

  // Hide banner on scroll down, show on scroll up
  useEffect(() => {
    let lastScrollY = 0;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 100) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('free-shipping-banner-closed', 'true');
  };

  useEffect(() => {
    const bannerClosed = localStorage.getItem('free-shipping-banner-closed');
    if (bannerClosed === 'true') {
      setIsVisible(false);
    }
  }, []);

  // Calculate progress percentage
  const progress = Math.min(100, (nettoTotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`fixed top-0 left-0 right-0 z-[100] ${
            isScrolled ? 'transform -translate-y-full' : ''
          } transition-transform duration-300`}
          style={{ transition: 'transform 0.3s ease-out' }}
        >
          {/* Main Banner */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black border-b border-gray-700">
            <div className="max-w-[95vw] mx-auto px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                {/* Left side - Icon and Text */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <Truck className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm sm:text-base leading-tight">
                      <span className="hidden sm:inline">
                        Darmowa dostawa od <span className="font-bold">200 zł netto</span>
                        {hasCart && remainingForFreeShipping > 0 && (
                          <> · Brakuje <span className="font-bold text-emerald-400">{remainingForFreeShipping.toFixed(2)} zł</span></>
                        )}
                        {hasCart && remainingForFreeShipping <= 0 && (
                          <span className="text-emerald-400 font-semibold"> ✅ Masz darmową dostawę!</span>
                        )}
                      </span>
                      <span className="sm:hidden">Darmowa dostawa od 200 zł</span>
                    </p>
                  </div>
                </div>

                {/* Right side - Close button (hidden on mobile if in cart) */}
                <button
                  onClick={handleClose}
                  className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Zamknij"
                >
                  <X className="w-5 h-5 text-white/70 hover:text-white transition-colors" />
                </button>
              </div>
              
              {/* Progress bar - only show if cart has items */}
              {hasCart && (
                <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

