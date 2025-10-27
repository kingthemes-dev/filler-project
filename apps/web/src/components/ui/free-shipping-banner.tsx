'use client';

import { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCartStore } from '@/stores/cart-store';

export default function FreeShippingBanner() {
  const { total, itemCount } = useCartStore();
  const [showText, setShowText] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  
  const FREE_SHIPPING_THRESHOLD = 200; // PLN netto
  const nettoTotal = total / 1.23;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - nettoTotal);
  const hasCart = itemCount > 0;

  // Calculate progress percentage
  const progress = Math.min(100, (nettoTotal / FREE_SHIPPING_THRESHOLD) * 100);

  // Hide banner on scroll down, show on scroll up
  useEffect(() => {
    let lastScrollY = window.scrollY;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide when scrolling down, show when scrolling up or at top
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY || currentScrollY <= 100) {
        setIsVisible(true);
      }
      
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animate text every 5 seconds - 2 blinks
  useEffect(() => {
    const interval = setInterval(() => {
      // First blink
      setShowText(false);
      setTimeout(() => {
        setShowText(true);
        // Second blink after 300ms
        setTimeout(() => {
          setShowText(false);
          setTimeout(() => setShowText(true), 300);
        }, 300);
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`sticky top-0 z-[100] transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      {/* Main Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black border-b border-gray-700">
        <div className="px-6 py-2 ml-4">
          <div className="flex items-center justify-center gap-3">
            {/* White Icon */}
            <div className="flex-shrink-0">
              <Truck className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            
            {/* Animated Text */}
            <motion.div
              key={showText ? 'visible' : 'hidden'}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex-shrink-0"
            >
              <p className="text-white font-medium text-xs sm:text-sm leading-tight text-center">
                <span className="hidden sm:inline">
                  Darmowa dostawa od <span className="font-semibold">200 zł netto</span>
                  {hasCart && remainingForFreeShipping > 0 && (
                    <> · Brakuje <span className="font-bold text-emerald-400">{remainingForFreeShipping.toFixed(2)} zł</span></>
                  )}
                  {hasCart && remainingForFreeShipping <= 0 && (
                    <span className="text-emerald-400 font-semibold">✅ Masz darmową dostawę!</span>
                  )}
                </span>
                <span className="sm:hidden">Darmowa dostawa od 200 zł</span>
              </p>
            </motion.div>
          </div>
          
          {/* Progress bar - only show if cart has items */}
          {hasCart && (
            <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
