'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Eye,
  Calendar,
  User,
  FileText,
} from 'lucide-react';
import { useAuthUser, useAuthIsAuthenticated } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatPrice } from '@/utils/format-price';
import { httpErrorMessage } from '@/utils/error-messages';
import Image from 'next/image';
import { WooOrder, WooLineItem, WooMetaData } from '@/types/woocommerce';

const PLACEHOLDER_IMAGE =
  'https://qvwltjhdjw.cfolks.pl/wp-content/uploads/woocommerce-placeholder.webp';

const statusMap: Record<string, Order['status']> = {
  pending: 'pending',
  processing: 'processing',
  'on-hold': 'processing',
  completed: 'delivered',
  cancelled: 'cancelled',
  refunded: 'cancelled',
  failed: 'cancelled',
  shipped: 'shipped',
};

const paymentMap: Record<string, string> = {
  cod: 'Za pobraniem',
  google_pay: 'Google Pay',
  apple_pay: 'Apple Pay',
  card: 'Karta płatnicza',
  transfer: 'Przelew bankowy',
  cash: 'Płatność przy odbiorze',
  bacs: 'Przelew bankowy',
  cheque: 'Czek',
  paypal: 'PayPal',
  stripe: 'Karta płatnicza (Stripe)',
  unknown: 'Nieznana metoda',
};

const eligibleStatuses = new Set(['completed', 'processing', 'on-hold']);

const mapOrderStatus = (wcStatus: string): Order['status'] =>
  statusMap[wcStatus] ?? 'pending';

const mapPaymentMethod = (paymentMethod: string): string =>
  paymentMap[paymentMethod] ?? paymentMethod;

const isOrderEligibleForInvoiceWooCommerce = (status: string): boolean =>
  eligibleStatuses.has(status);

const getMetaValue = (
  metaData: WooMetaData[] | undefined,
  key: string
): string | null => {
  if (!metaData) return null;
  const entry = metaData.find(meta => meta.key === key);
  return typeof entry?.value === 'string' ? entry.value : null;
};

const getLineItemImage = (item: WooLineItem): string => {
  const withImage = item as WooLineItem & {
    image?: { src?: string };
    product_image?: string;
  };
  return withImage.image?.src || withImage.product_image || PLACEHOLDER_IMAGE;
};

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

// Cache key for sessionStorage
const ORDERS_CACHE_KEY = 'orders_cache';
const ORDERS_CACHE_TIMESTAMP_KEY = 'orders_cache_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Status info helper function
const getStatusInfo = (status: Order['status']) => {
  switch (status) {
    case 'pending':
      return {
        label: 'Oczekujące',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        icon: Clock,
      };
    case 'processing':
      return {
        label: 'W realizacji',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: Package,
      };
    case 'shipped':
      return {
        label: 'Wysłane',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        icon: Truck,
      };
    case 'delivered':
      return {
        label: 'Dostarczone',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: CheckCircle,
      };
    case 'cancelled':
      return {
        label: 'Anulowane',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: Clock,
      };
    default:
      return {
        label: 'Nieznany',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        icon: Clock,
      };
  }
};

// Memoized Order Item Component
const OrderItem = memo(
  ({
    order,
    isSelected,
    onViewDetails,
  }: {
    order: Order;
    isSelected: boolean;
    onViewDetails: (id: string) => void;
  }) => {
    const statusInfo = getStatusInfo(order.status);
    const StatusIcon = statusInfo.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
        data-testid="order-card"
      >
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Zamówienie #{order.number}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {statusInfo.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(order.date).toLocaleDateString('pl-PL')}
                </span>
                <span className="font-semibold text-gray-900">
                  {formatPrice(order.total)} zł
                </span>
              </div>
            </div>
            <button
              onClick={() => onViewDetails(order.id)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              {isSelected ? 'Ukryj szczegóły' : 'Zobacz szczegóły'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-200 bg-gray-50"
            >
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Adres rozliczeniowy
                    </h4>
                    <p className="text-sm text-gray-600">
                      {order.billing.address}
                      <br />
                      {order.billing.postcode} {order.billing.city}
                      <br />
                      {order.billing.country}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Adres dostawy
                    </h4>
                    <p className="text-sm text-gray-600">
                      {order.shipping.address}
                      <br />
                      {order.shipping.postcode} {order.shipping.city}
                      <br />
                      {order.shipping.country}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Produkty</h4>
                  <div className="space-y-3">
                    {order.items.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg"
                      >
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <Image
                            src={item.image || '/placeholder-product.png'}
                            alt={item.name}
                            fill
                            className="object-cover rounded"
                            sizes="64px"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Ilość: {item.quantity}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatPrice(item.price * item.quantity)} zł
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
                  <div className="text-sm">
                    <span className="text-gray-600">Metoda płatności: </span>
                    <span className="font-medium text-gray-900">
                      {order.paymentMethod}
                    </span>
                  </div>
                  {order.trackingNumber && (
                    <div className="text-sm">
                      <span className="text-gray-600">Numer przesyłki: </span>
                      <span className="font-medium text-gray-900">
                        {order.trackingNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

OrderItem.displayName = 'OrderItem';

// Use shared error message utility

export default function MyOrdersPage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useAuthIsAuthenticated();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Fetch real orders from WooCommerce API with caching
  const fetchOrders = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id) return;

      try {
        // Check cache FIRST before setting loading state
        if (!forceRefresh) {
          const cachedData = sessionStorage.getItem(ORDERS_CACHE_KEY);
          const cacheTimestamp = sessionStorage.getItem(
            ORDERS_CACHE_TIMESTAMP_KEY
          );

          if (cachedData && cacheTimestamp) {
            const cacheAge = Date.now() - parseInt(cacheTimestamp, 10);
            if (cacheAge < CACHE_DURATION) {
              try {
                const parsedData = JSON.parse(cachedData);
                setOrders(parsedData);
                setLoading(false);
                // Fetch fresh data in background (don't block UI) - only if cache is older than 2 minutes
                if (cacheAge > 2 * 60 * 1000) {
                  fetchOrders(true).catch(console.error);
                }
                return;
              } catch {
                // Cache corrupted, fetch fresh data
                sessionStorage.removeItem(ORDERS_CACHE_KEY);
                sessionStorage.removeItem(ORDERS_CACHE_TIMESTAMP_KEY);
              }
            }
          }
        }

        // Only show loader if we don't have cached data
        if (orders.length === 0) {
          setLoading(true);
        }

        // Add limit and per_page to optimize API call
        const response = await fetch(
          `/api/woocommerce?endpoint=orders&customer=${user.id}&per_page=20&orderby=date&order=desc`
        );
        if (!response.ok) {
          setErrorMessage(prev => prev ?? httpErrorMessage(response.status));
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: unknown = await response.json();

        if (Array.isArray(data)) {
          // Transform WooCommerce orders to our format
          const transformedOrders = (data as WooOrder[]).map(order => {
            const mappedStatus = mapOrderStatus(order.status);
            const isEligible = isOrderEligibleForInvoiceWooCommerce(
              order.status
            );
            const trackingRaw = getMetaValue(
              order.meta_data,
              '_tracking_number'
            );
            const trackingNumber =
              typeof trackingRaw === 'string' && trackingRaw.trim().length > 0
                ? trackingRaw
                : undefined;

            return {
              id: order.id.toString(),
              number: order.number,
              date: order.date_created.split('T')[0],
              status: mappedStatus,
              total: Number.parseFloat(order.total),
              items: (order.line_items ?? []).map((item: WooLineItem) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price:
                  typeof item.price === 'number'
                    ? item.price
                    : Number.parseFloat(String(item.price)),
                image: getLineItemImage(item),
              })),
              billing: {
                address: order.billing?.address_1 || '',
                city: order.billing?.city || '',
                postcode: order.billing?.postcode || '',
                country: order.billing?.country || '',
              },
              shipping: {
                address: order.shipping?.address_1 || '',
                city: order.shipping?.city || '',
                postcode: order.shipping?.postcode || '',
                country: order.shipping?.country || '',
              },
              paymentMethod: mapPaymentMethod(
                order.payment_method_title || order.payment_method || 'unknown'
              ),
              ...(trackingNumber ? { trackingNumber } : {}),
              isEligibleForInvoice: isEligible,
            };
          });

          setOrders(transformedOrders);

          // Cache the results
          sessionStorage.setItem(
            ORDERS_CACHE_KEY,
            JSON.stringify(transformedOrders)
          );
          sessionStorage.setItem(
            ORDERS_CACHE_TIMESTAMP_KEY,
            Date.now().toString()
          );
        } else {
          console.error('Error fetching orders:', data);
          setOrders([]);
        }
      } catch (error) {
        console.error(
          'Error fetching orders:',
          error instanceof Error ? error.message : error
        );
        setErrorMessage(
          prev =>
            prev ?? 'Nie udało się pobrać listy zamówień. Spróbuj ponownie.'
        );
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, orders.length]
  );

  useEffect(() => {
    // Check cache immediately on mount (before waiting for auth)
    if (typeof window !== 'undefined') {
      const cachedData = sessionStorage.getItem(ORDERS_CACHE_KEY);
      const cacheTimestamp = sessionStorage.getItem(ORDERS_CACHE_TIMESTAMP_KEY);

      if (cachedData && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp, 10);
        if (cacheAge < CACHE_DURATION) {
          try {
            const parsedData = JSON.parse(cachedData);
            setOrders(parsedData);
            setLoading(false);
          } catch {
            // Cache corrupted
            sessionStorage.removeItem(ORDERS_CACHE_KEY);
            sessionStorage.removeItem(ORDERS_CACHE_TIMESTAMP_KEY);
          }
        }
      }
    }

    // Then fetch fresh data if authenticated
    if (isAuthenticated && user?.id) {
      fetchOrders();
    }
  }, [isAuthenticated, user?.id, fetchOrders]);

  const handleViewDetails = useCallback(
    (orderId: string) => {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        setSelectedOrder(prev => (prev?.id === orderId ? null : order));
      }
    },
    [orders]
  );

  // Memoize filtered/sorted orders
  const sortedOrders = useMemo(() => {
    return [...orders].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [orders]);

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

  // Show skeleton loader only if we have no data at all
  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <PageContainer className="pb-12">
          <PageHeader
            title="Moje zamówienia"
            subtitle="Historia Twoich zamówień i status realizacji"
            breadcrumbs={[
              { label: 'Strona główna', href: '/' },
              { label: 'Moje zamówienia', href: '/moje-zamowienia' },
            ]}
          />

          {/* Skeleton Loader */}
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PageContainer className="pb-12">
        {/* Header */}
        <PageHeader
          title="Moje zamówienia"
          subtitle="Historia Twoich zamówień i status realizacji"
          breadcrumbs={[
            { label: 'Strona główna', href: '/' },
            { label: 'Moje zamówienia', href: '/moje-zamowienia' },
          ]}
        />

        {errorMessage && (
          <div
            className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="w-full">
            <div className="grid grid-cols-3 bg-white border border-gray-300 p-1 rounded-[28px] sm:h-[80px] h-auto relative overflow-hidden shadow-sm">
              {/* Animated background indicator with layoutId for smooth transition */}
              <motion.div
                layoutId="accountActiveTab"
                className="absolute top-1 bottom-1 bg-gradient-to-r from-black to-[#0f1a26] rounded-[22px] shadow-lg"
                style={{
                  left: `calc(${(['profile', 'orders', 'invoices'].indexOf('orders') * 100) / 3}% + 2px)`,
                  width: `calc(${100 / 3}% - 6px)`,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
              />
              <button
                onClick={() => router.push('/moje-konto')}
                className="relative z-10 flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs sm:text-[17px] font-semibold transition-all duration-300 ease-out border-0 border-transparent rounded-[22px] group"
              >
                <div className="transition-all duration-300 group-hover:scale-110 text-gray-500 group-hover:text-gray-700">
                  <User className="w-5 h-5 sm:w-5 sm:h-5" />
                </div>
                <span className="text-center leading-tight transition-all duration-300 whitespace-nowrap text-gray-500 group-hover:text-gray-700">
                  Moje konto
                </span>
              </button>
              <button className="relative z-10 flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs sm:text-[17px] font-semibold transition-all duration-300 ease-out border-0 border-transparent rounded-[22px] group">
                <div className="transition-all duration-300 scale-110 text-white">
                  <Package className="w-5 h-5 sm:w-5 sm:h-5" />
                </div>
                <span className="text-center leading-tight transition-all duration-300 whitespace-nowrap text-white">
                  Zamówienia
                </span>
              </button>
              <button
                onClick={() => router.push('/moje-faktury')}
                className="relative z-10 flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs sm:text-[17px] font-semibold transition-all duration-300 ease-out border-0 border-transparent rounded-[22px] group"
              >
                <div className="transition-all duration-300 group-hover:scale-110 text-gray-500 group-hover:text-gray-700">
                  <FileText className="w-5 h-5 sm:w-5 sm:h-5" />
                </div>
                <span className="text-center leading-tight transition-all duration-300 whitespace-nowrap text-gray-500 group-hover:text-gray-700">
                  Faktury
                </span>
              </button>
            </div>
          </div>
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
            {sortedOrders.map(order => (
              <OrderItem
                key={order.id}
                order={order}
                isSelected={selectedOrder?.id === order.id}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
