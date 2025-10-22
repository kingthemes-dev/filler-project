'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, Clock, Eye, Download, Calendar } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatPrice } from '@/utils/format-price';
import Image from 'next/image';

interface Order {
  id: string;
  number: string;
  date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  billing: {
    address: string;
    city: string;
    postcode: string;
    country: string;
  };
  shipping: {
    address: string;
    city: string;
    postcode: string;
    country: string;
  };
  paymentMethod: string;
  trackingNumber?: string;
  isEligibleForInvoice?: boolean; // Whether this order is eligible for invoice generation
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Redirect if not authenticated (but wait for auth store to load)
  useEffect(() => {
    // Add a small delay to let Zustand persist middleware load from localStorage
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.push('/');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  // Fetch real orders from WooCommerce API
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchOrders();
    }
  }, [isAuthenticated, user?.id]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Use standard WooCommerce orders endpoint with customer filter
      const response = await fetch(`/api/woocommerce?endpoint=orders&customer=${user?.id}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        // Transform WooCommerce orders to our format
        const transformedOrders = data.map((order: any) => {
          const mappedStatus = mapOrderStatus(order.status);
          // Use original WooCommerce status for eligibility check (same as /moje-faktury)
          const isEligible = isOrderEligibleForInvoiceWooCommerce(order.status);
          
          
          return {
            id: order.id.toString(),
            number: order.number,
            date: order.date_created.split('T')[0],
            status: mappedStatus,
            total: parseFloat(order.total), // Keep as PLN (not convert to grosze)
            items: order.line_items.map((item: any) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              price: parseFloat(item.price), // Keep as PLN (not convert to grosze)
              image: item.image?.src || item.product_image || 'https://qvwltjhdjw.cfolks.pl/wp-content/uploads/woocommerce-placeholder.webp'
            })),
            billing: {
              address: order.billing.address_1,
              city: order.billing.city,
              postcode: order.billing.postcode,
              country: order.billing.country
            },
            shipping: {
              address: order.shipping.address_1,
              city: order.shipping.city,
              postcode: order.shipping.postcode,
              country: order.shipping.country
            },
            paymentMethod: mapPaymentMethod(order.payment_method_title || order.payment_method || 'unknown'),
            trackingNumber: order.meta_data?.find((meta: any) => meta.key === '_tracking_number')?.value || null,
            isEligibleForInvoice: isEligible
          };
        });
        setOrders(transformedOrders);
      } else {
        console.error('Error fetching orders:', data);
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const mapOrderStatus = (wcStatus: string): 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' => {
    const statusMap: Record<string, 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'> = {
      'pending': 'pending',
      'processing': 'processing', 
      'on-hold': 'processing',
      'completed': 'delivered',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'failed': 'cancelled',
      'shipped': 'shipped'
    };
    
    return statusMap[wcStatus] || 'pending';
  };

  const mapPaymentMethod = (paymentMethod: string): string => {
    const paymentMap: Record<string, string> = {
      'cod': 'Za pobraniem',
      'google_pay': 'Google Pay',
      'apple_pay': 'Apple Pay',
      'card': 'Karta płatnicza',
      'transfer': 'Przelew bankowy',
      'cash': 'Płatność przy odbiorze',
      'bacs': 'Przelew bankowy',
      'cheque': 'Czek',
      'paypal': 'PayPal',
      'stripe': 'Karta płatnicza (Stripe)',
      'unknown': 'Nieznana metoda'
    };
    
    return paymentMap[paymentMethod] || paymentMethod;
  };


  const handleViewDetails = (orderId: string) => {
    console.log('🔄 Viewing details for order:', orderId);
    console.log('🔄 Current selectedOrder:', selectedOrder);
    console.log('🔄 selectedOrder?.id:', selectedOrder?.id);
    console.log('🔄 orderId:', orderId);
    console.log('🔄 Comparison result:', selectedOrder?.id === orderId);
    
    const order = orders.find(o => o.id === orderId);
    if (order) {
      // Toggle details - if already selected, hide; if not, show
      if (selectedOrder?.id === orderId) {
        console.log('🔄 Closing details for order:', orderId);
        setSelectedOrder(null);
      } else {
        console.log('🔄 Opening details for order:', orderId);
        setSelectedOrder(order);
      }
    }
  };


  const getStatusInfo = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Oczekujące',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          icon: Clock
        };
      case 'processing':
        return {
          label: 'W realizacji',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          icon: Package
        };
      case 'shipped':
        return {
          label: 'Wysłane',
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          icon: Truck
        };
      case 'delivered':
        return {
          label: 'Dostarczone',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: CheckCircle
        };
      case 'cancelled':
        return {
          label: 'Anulowane',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: Clock
        };
      default:
        return {
          label: 'Nieznany',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: Clock
        };
    }
  };

  // Check if order is eligible for invoice generation (using mapped statuses)
  const isOrderEligibleForInvoice = (status: Order['status']): boolean => {
    // Use the same logic as /moje-faktury - eligible statuses are those that map to completed/processing/on-hold
    const eligibleStatuses = ['processing', 'shipped', 'delivered'];
    return eligibleStatuses.includes(status);
  };

  // Check if order is eligible for invoice generation (using original WooCommerce statuses)
  const isOrderEligibleForInvoiceWooCommerce = (wcStatus: string): boolean => {
    // Use the same logic as /moje-faktury - eligible WooCommerce statuses
    const eligibleStatuses = ['completed', 'processing', 'on-hold'];
    return eligibleStatuses.includes(wcStatus);
  };

  // Get tooltip message for disabled invoice buttons
  const getInvoiceTooltip = (status: Order['status']): string => {
    switch (status) {
      case 'pending':
        return 'Faktura będzie dostępna po opłaceniu zamówienia';
      case 'cancelled':
        return 'Faktura niedostępna - zamówienie anulowane';
      default:
        return 'Faktura niedostępna dla tego statusu zamówienia';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Przekierowywanie...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[95vw] mx-auto px-6 py-8 pb-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Ładowanie zamówień...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Moje zamówienia
          </h1>
          <p className="text-lg text-gray-600">
            Historia Twoich zamówień i status realizacji
          </p>
        </div>

        {orders.length === 0 ? (
          // Empty state
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center py-16"
          >
            <Package className="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Brak zamówień
            </h3>
            <p className="text-gray-600 mb-6">
              Nie masz jeszcze żadnych zamówień. Rozpocznij zakupy!
            </p>
            <Link
              href="/sklep"
              className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Przejdź do sklepu
            </Link>
          </motion.div>
        ) : (
          // Orders list
          <div className="space-y-6">
            {orders.map((order, index) => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Order Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
                          <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {order.number}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formatDate(order.date)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                            {!order.isEligibleForInvoice && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600 flex items-center gap-1">
                                <span>⚠️</span>
                                <span>Faktura niedostępna</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className="text-xl font-bold text-gray-900">
                          {formatPrice(order.total)}
                        </span>
                        <button
                          onClick={() => handleViewDetails(order.id)}
                          className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm">
                            {selectedOrder?.id === order.id ? 'Ukryj' : 'Szczegóły'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Order Details - Collapsible */}
                  {selectedOrder?.id === order.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-gray-200"
                    >
                      <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Order Items */}
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-4">
                              Produkty
                            </h4>
                            <div className="space-y-4">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center space-x-4">
                                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                                    {item.image ? (
                                      <Image
                                        src={item.image}
                                        alt={item.name}
                                        width={64}
                                        height={64}
                                        className="w-full h-full object-cover rounded-lg"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gray-300 rounded-lg flex items-center justify-center">
                                        <Package className="w-8 h-8 text-gray-500" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="text-sm font-medium text-gray-900 truncate">
                                      {item.name}
                                    </h5>
                                    <p className="text-sm text-gray-600">
                                      Ilość: {item.quantity}
                                    </p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {formatPrice(item.price)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Information */}
                          <div className="space-y-6">
                            {/* Billing Address */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                Adres rozliczeniowy
                              </h4>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p>{order.billing.address}</p>
                                <p>{order.billing.city}, {order.billing.postcode}</p>
                                <p>{order.billing.country}</p>
                              </div>
                            </div>

                            {/* Shipping Address */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                Adres dostawy
                              </h4>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p>{order.shipping.address}</p>
                                <p>{order.shipping.city}, {order.shipping.postcode}</p>
                                <p>{order.shipping.country}</p>
                              </div>
                            </div>

                            {/* Payment & Tracking */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                  Płatność
                                </h4>
                                <p className="text-sm text-gray-600">{order.paymentMethod}</p>
                              </div>

                              {order.trackingNumber && (
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                                    Numer śledzenia
                                  </h4>
                                  <div className="flex items-center space-x-3">
                                    <span className="text-sm font-mono text-gray-800 bg-gray-100 px-3 py-2 rounded">
                                      {order.trackingNumber}
                                    </span>
                                    <button className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
                                      Śledź przesyłkę
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t border-gray-200">
                          {order.isEligibleForInvoice ? (
                            <Link
                              href="/moje-faktury"
                              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span>Pobierz fakturę</span>
                            </Link>
                          ) : (
                            <button
                              disabled
                              title={getInvoiceTooltip(order.status)}
                              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed transition-colors"
                            >
                              <Download className="w-4 h-4" />
                              <span>Pobierz fakturę</span>
                            </button>
                          )}
                          
                          {order.status === 'shipped' && (
                            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                              <Truck className="w-4 h-4" />
                              <span>Śledź przesyłkę</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
