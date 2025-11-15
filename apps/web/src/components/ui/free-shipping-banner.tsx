'use client';

import { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCartTotal, useCartItemCount } from '@/stores/cart-store';
import { SHIPPING_CONFIG } from '@/config/constants';

export default function FreeShippingBanner() {
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const total = useCartTotal();
  const itemCount = useCartItemCount();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const FREE_SHIPPING_THRESHOLD = SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD;
  const nettoTotal = total / SHIPPING_CONFIG.VAT_RATE;
  const remainingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - nettoTotal
  );
  const hasCart = itemCount > 0;

  // Show/hide on scroll direction: hide when scrolling down, show when scrolling up or at top
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY || 0;
      const scrollingDown = currentY > lastScrollY;
      const atTop = currentY < 10;

      if (atTop) {
        setIsVisible(true);
      } else if (scrollingDown && currentY > 80) {
        setIsVisible(false);
      } else if (!scrollingDown) {
        setIsVisible(true);
      }

      setLastScrollY(currentY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Listen for shop modal open/close events
  useEffect(() => {
    const handleShopModalToggle = (event: CustomEvent) => {
      setIsShopModalOpen(event.detail.open);
    };

    window.addEventListener(
      'shopModalToggle',
      handleShopModalToggle as EventListener
    );
    return () =>
      window.removeEventListener(
        'shopModalToggle',
        handleShopModalToggle as EventListener
      );
  }, []);

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{
        y: isVisible && !isShopModalOpen ? 0 : -100,
        opacity: isVisible && !isShopModalOpen ? 1 : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 60,
        damping: 15,
        mass: 0.5,
      }}
      className="sticky top-0 z-[100]"
    >
      {/* Main Banner */}
      <div
        className="bg-gradient-to-r from-gray-900 via-gray-800 to-black border-b border-gray-700"
        style={{
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px',
        }}
      >
        <div className="px-6 py-2 ml-4">
          <div className="flex items-center justify-center gap-3">
            {/* White Icon */}
            <div className="flex-shrink-0">
              <Truck className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>

            {/* Text */}
            <div className="flex-shrink-0">
              <p className="text-white font-medium text-xs sm:text-sm leading-tight text-center">
                <span className="hidden sm:inline">
                  Darmowa dostawa od{' '}
                  <span className="font-semibold">200 zł netto</span>
                  {hasCart && remainingForFreeShipping > 0 && (
                    <>
                      {' '}
                      · Brakuje{' '}
                      <span className="font-bold text-emerald-400">
                        {remainingForFreeShipping.toFixed(2)} zł
                      </span>
                    </>
                  )}
                  {hasCart && remainingForFreeShipping <= 0 && (
                    <span className="text-emerald-400 font-semibold">
                      ✅ Masz darmową dostawę!
                    </span>
                  )}
                </span>
                <span className="sm:hidden">Darmowa dostawa od 200 zł</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
