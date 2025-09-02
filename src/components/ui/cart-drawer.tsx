'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Truck } from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/cart-store';
import { formatPrice } from '@/utils/format-price';
import Link from 'next/link';

export default function CartDrawer() {
  const { isOpen, closeCart, items, total, itemCount, removeItem, updateQuantity } = useCartStore();
  
  console.log('🛒 CartDrawer render - isOpen:', isOpen);
  console.log('🛒 CartDrawer render - items:', items);
  console.log('🛒 CartDrawer render - itemCount:', itemCount);

  // Free shipping config (netto)
  const FREE_SHIPPING_THRESHOLD = 200; // PLN netto
  // Zakładamy, że ceny w koszyku są netto. Jeśli nie, po podpięciu podatków podmień na wartość netto.
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - total);
  const progress = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    updateQuantity(item.id, newQuantity, item.variant?.id);
  };

  const handleRemoveItem = (item: CartItem) => {
    removeItem(item.id, item.variant?.id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - tylko na mobile */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />

          {/* Cart Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-full bg-white shadow-2xl z-50 
                     w-full max-w-sm lg:max-w-md xl:max-w-lg
                     lg:border-l lg:border-gray-200 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="w-6 h-6 text-black" />
                <h2 className="text-xl font-bold text-black">
                  Koszyk ({itemCount})
                </h2>
              </div>
              <button
                onClick={closeCart}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Free shipping notice */}
            {items.length > 0 && (
              <div className="px-6 pt-4">
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"
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
            <div className="flex-1 overflow-y-auto p-6 pb-0">
              {items.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Twój koszyk jest pusty
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Dodaj produkty, aby rozpocząć zakupy
                  </p>
                  <button
                    onClick={closeCart}
                    className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                  >
                    Przejdź do sklepu
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={`${item.id}-${item.variant?.id || 'default'}`}
                      className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                    >
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300 rounded-lg flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </h3>
                        {item.variant && (
                          <p className="text-xs text-gray-500">
                            {item.variant.name}: {item.variant.value}
                          </p>
                        )}
                        <p className="text-sm font-medium text-black mt-1">
                          {formatPrice(item.sale_price || item.price)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityChange(item, item.quantity - 1)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item)}
                        className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-600"
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
              <div className="border-t border-gray-200 p-6 space-y-4 bg-white">
                {/* Free shipping reminder small */}
                <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200">
                  {remainingForFreeShipping > 0 ? (
                    <p className="text-xs text-emerald-800">
                      Dodaj za <span className="font-semibold text-emerald-900">{formatPrice(remainingForFreeShipping)}</span>, aby skorzystać z darmowej dostawy.
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-emerald-800">Darmowa dostawa aktywna.</p>
                  )}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-gray-900">
                    Razem:
                  </span>
                  <span className="text-xl font-bold text-black">
                    {formatPrice(total)}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {/* Top row - View Cart and Checkout */}
                  <div className="flex space-x-3">
                    <Link
                      href="/koszyk"
                      className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
                      onClick={closeCart}
                    >
                      Zobacz koszyk
                    </Link>

                    <Link
                      href="/checkout"
                      className="flex-1 bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
                      onClick={closeCart}
                    >
                      <span>Kasa</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Bottom row - Continue Shopping */}
                  <button
                    onClick={closeCart}
                    className="w-full py-3 px-6 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Kontynuuj zakupy
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
