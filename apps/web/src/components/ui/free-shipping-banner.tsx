'use client';

import { useState, useEffect } from 'react';
import { Truck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/stores/cart-store';

export default function FreeShippingBanner() {
  const { total, itemCount } = useCartStore();
  
  const FREE_SHIPPING_THRESHOLD = 200; // PLN netto
  const nettoTotal = total / 1.23;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - nettoTotal);
  const hasCart = itemCount > 0;

  // Calculate progress percentage
  const progress = Math.min(100, (nettoTotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="sticky top-0 z-[100]">
          {/* Main Banner */}
          <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black border border-gray-700 rounded-br-3xl">
            <div className="px-6 py-3 ml-4">
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

              </div>
              
              {/* Progress bar - only show if cart has items */}
              {hasCart && (
                <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
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

