'use client';

import { motion } from 'framer-motion';
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCartStore, type CartItem } from '@/stores/cart-store';
import { formatPrice, formatPriceWithVAT } from '@/utils/format-price';
import Link from 'next/link';
import Image from 'next/image';

export default function CartPage() {
  const { items, total, itemCount, removeItem, updateQuantity, clearCart } = useCartStore();

  const handleQuantityChange = (item: CartItem, newQuantity: number) => {
    updateQuantity(item.id, newQuantity, item.variant?.id);
  };

  const handleRemoveItem = (item: CartItem) => {
    removeItem(item.id, item.variant?.id);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white py-12 pb-16">
        <div className="max-w-[95vw] mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Twój koszyk jest pusty
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Dodaj produkty, aby rozpocząć zakupy
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/sklep"
                  className="bg-black text-white px-8 py-4 rounded-lg font-medium hover:bg-gray-800 transition-colors inline-flex items-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Przejdź do sklepu</span>
                </Link>
                <Link
                  href="/"
                  className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Strona główna
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">
                Koszyk ({itemCount})
              </h1>
              <button
                onClick={clearCart}
                className="text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                Wyczyść koszyk
              </button>
            </div>
            <Link
              href="/sklep"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kontynuuj zakupy
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200"
              >
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Produkty w koszyku
                  </h2>
                  <div className="space-y-6">
                    {items.map((item, index) => (
                      <motion.div
                        key={`${item.id}-${item.variant?.id || 'default'}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                      >
                        {/* Product Image */}
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={80}
                              height={80}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-300 rounded-lg flex items-center justify-center">
                              <ShoppingBag className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {item.name}
                          </h3>
                          {item.variant && (
                            <p className="text-sm text-gray-500 mb-2">
                              {item.variant.name}: {item.variant.value}
                            </p>
                          )}
                          <p className="text-lg font-bold text-black">
                            {formatPriceWithVAT(item.sale_price || item.price)}
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleQuantityChange(item, item.quantity - 1)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Minus className="w-5 h-5 text-gray-600" />
                          </button>
                          <span className="w-12 text-center text-lg font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item, item.quantity + 1)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Plus className="w-5 h-5 text-gray-600" />
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="p-3 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Podsumowanie zamówienia
                </h2>

                {/* Order Summary */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Produkty ({itemCount}):</span>
                    <span>{formatPrice(total)} (z VAT)</span>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Razem:</span>
                      <span>{formatPrice(total)} (z VAT)</span>
                    </div>
                  </div>
                </div>

                                            {/* Checkout Button */}
                            <Link
                              href="/checkout"
                              className="w-full bg-black text-white py-4 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 mb-4"
                            >
                              <span>Przejdź do kasy</span>
                              <ArrowRight className="w-5 h-5" />
                            </Link>

                {/* Additional Info */}
                <div className="text-sm text-gray-500 text-center">
                  <p>Bezpieczne płatności</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
