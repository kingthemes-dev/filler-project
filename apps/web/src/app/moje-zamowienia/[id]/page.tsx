'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Truck,
  User,
  MapPin,
  CreditCard,
} from 'lucide-react';
import { useAuthUser, useAuthIsAuthenticated } from '@/stores/auth-store';
import { formatPrice } from '@/utils/format-price';
import PageContainer from '@/components/ui/page-container';
import { WooOrder, WooLineItem, WooMetaData } from '@/types/woocommerce';

const PLACEHOLDER_IMAGE =
  'https://qvwltjhdjw.cfolks.pl/wp-content/uploads/woocommerce-placeholder.webp';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number; // grosze
  image?: string;
  meta?: Array<{ key: string; value: string }>;
}

interface OrderDetails {
  id: number;
  number: string;
  status: string;
  date_created: string;
  currency: string;
  total: number; // grosze
  customer_id?: number;
  payment_method_title?: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    company?: string;
    address_1: string;
    city: string;
    postcode: string;
    country: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company?: string;
    address_1: string;
    city: string;
    postcode: string;
    country: string;
  };
  line_items: OrderItem[];
  meta_data?: Array<{ key: string; value: string }>;
}

function mapOrderStatusToUi(status: string) {
  switch (status) {
    case 'pending':
      return {
        label: 'Oczekujące',
        color: 'text-yellow-600',
        bg: 'bg-yellow-100',
        Icon: Clock,
      };
    case 'processing':
      return {
        label: 'W realizacji',
        color: 'text-blue-600',
        bg: 'bg-blue-100',
        Icon: Package,
      };
    case 'on-hold':
      return {
        label: 'Wstrzymane',
        color: 'text-amber-700',
        bg: 'bg-amber-100',
        Icon: Clock,
      };
    case 'completed':
      return {
        label: 'Zrealizowane',
        color: 'text-green-600',
        bg: 'bg-green-100',
        Icon: CheckCircle,
      };
    case 'shipped':
      return {
        label: 'Wysłane',
        color: 'text-purple-600',
        bg: 'bg-purple-100',
        Icon: Truck,
      };
    case 'cancelled':
      return {
        label: 'Anulowane',
        color: 'text-red-600',
        bg: 'bg-red-100',
        Icon: Clock,
      };
    default:
      return {
        label: 'Nieznany',
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        Icon: Clock,
      };
  }
}

const lineItemImage = (item: WooLineItem): string => {
  const withImage = item as WooLineItem & {
    image?: { src?: string };
    product_image?: string;
  };
  return withImage.image?.src || withImage.product_image || PLACEHOLDER_IMAGE;
};

const toOrderItem = (item: WooLineItem): OrderItem => ({
  id: item.id,
  name: item.name,
  quantity: item.quantity,
  price: Math.round(
    (typeof item.price === 'number'
      ? item.price
      : Number.parseFloat(String(item.price))) * 100
  ),
  image: lineItemImage(item),
  meta: (item.meta_data as WooMetaData[] | undefined)?.map(meta => ({
    key: meta.key,
    value: String(meta.value ?? ''),
  })),
});

const transformOrder = (data: WooOrder): OrderDetails => ({
  id: data.id,
  number: data.number,
  status: data.status,
  date_created: data.date_created,
  currency: data.currency,
  total: Math.round(Number.parseFloat(data.total) * 100),
  customer_id: data.customer_id,
  payment_method_title: data.payment_method_title,
  billing: data.billing,
  shipping: data.shipping,
  line_items: (data.line_items ?? []).map(toOrderItem),
  meta_data: data.meta_data.map(meta => ({
    key: meta.key,
    value: String(meta.value ?? ''),
  })),
});

export default function OrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useAuthIsAuthenticated();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null
  );

  useEffect(() => {
    let isCancelled = false;
    params.then(value => {
      if (!isCancelled) {
        setResolvedParams(value);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [params]);

  useEffect(() => {
    if (!isAuthenticated) {
      // chronimy dostęp – przekierowanie, ale krótkie okno ładowania dla UX
      router.push('/');
      return;
    }
    const orderId = resolvedParams?.id;
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/woocommerce?endpoint=orders/${orderId}`);
        const data: unknown = await res.json();
        if (!res.ok) {
          const message =
            typeof data === 'object' && data !== null && 'error' in data
              ? String((data as { error?: unknown }).error ?? '')
              : 'Nie udało się pobrać zamówienia';
          throw new Error(message || 'Nie udało się pobrać zamówienia');
        }

        if (!data || typeof data !== 'object') {
          throw new Error('Nieprawidłowa odpowiedź serwera');
        }

        const transformed = transformOrder(data as WooOrder);

        // Autoryzacja po stronie klienta – widok tylko dla właściciela
        if (
          user?.id &&
          transformed.customer_id &&
          Number(user.id) !== Number(transformed.customer_id)
        ) {
          throw new Error('Brak dostępu do tego zamówienia');
        }

        setOrder(transformed);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Wystąpił błąd');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [isAuthenticated, resolvedParams?.id, router, user?.id]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Przekierowywanie...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <PageContainer className="px-6 py-8 pb-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Ładowanie zamówienia...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Link
            href="/moje-zamowienia"
            className="inline-flex items-center text-sm text-gray-700 hover:text-black"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Wróć do zamówień
          </Link>
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700">
              {error || 'Nie znaleziono zamówienia'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusUi = mapOrderStatusToUi(order.status);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/moje-zamowienia"
            className="inline-flex items-center text-sm text-gray-700 hover:text-black"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Wróć do zamówień
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Zamówienie {order.number}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span
                  className={`px-2 py-1 rounded-full ${statusUi.bg} ${statusUi.color} font-medium`}
                >
                  {statusUi.label}
                </span>
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />{' '}
                  {new Date(order.date_created).toLocaleDateString('pl-PL')}
                </span>
                <span className="flex items-center font-semibold text-gray-900">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-700">
              <div className="flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />{' '}
                {order.payment_method_title || 'Płatność'}
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Produkty
              </h2>
              <div className="space-y-4">
                {order.line_items.map(item => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        Ilość: {item.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatPrice(item.price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" /> Dane klienta
                </h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>
                    {order.billing.first_name} {order.billing.last_name}
                  </div>
                  <div>{order.billing.email}</div>
                  <div>{order.billing.phone}</div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" /> Adres dostawy
                </h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>{order.shipping.address_1}</div>
                  <div>
                    {order.shipping.postcode} {order.shipping.city}
                  </div>
                  <div>{order.shipping.country}</div>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Suma</span>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
