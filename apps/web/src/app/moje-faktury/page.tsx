'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, Eye, User, Package, RefreshCw } from 'lucide-react';
import { useAuthUser, useAuthIsAuthenticated } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { httpErrorMessage } from '@/utils/error-messages';
import { WooOrder } from '@/types/woocommerce';

export interface Invoice {
  id: string;
  number: string;
  date: string;
  total: number;
  currency: string;
  status: string;
  download_url: string | null; // Can be null since we don't use WCPDF URLs anymore
  orderNumber: string;
  isEligible?: boolean; // Whether this order is eligible for invoice generation
}

// Use shared error message utility

// Cache key for sessionStorage
const INVOICES_CACHE_KEY = 'invoices_cache';
const INVOICES_CACHE_TIMESTAMP_KEY = 'invoices_cache_timestamp';
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (reduced for better freshness)

// Memoized Invoice Item Component
interface InvoiceItemProps {
  invoice: Invoice;
  onViewInvoice: (invoice: Invoice) => void;
  onDownloadInvoice: (invoice: Invoice, e?: React.MouseEvent) => void;
}

const InvoiceItem = memo(({ invoice, onViewInvoice, onDownloadInvoice }: InvoiceItemProps) => {
  const statusInfo = getStatusInfo(invoice.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{invoice.number}</h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.icon} {statusInfo.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(invoice.date).toLocaleDateString('pl-PL')}
              </span>
              <span className="font-semibold text-gray-900">{formatPrice(invoice.total)} {invoice.currency}</span>
              <span className="text-gray-500">Zamówienie #{invoice.orderNumber}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => onDownloadInvoice(invoice, e)}
              disabled={!invoice.isEligible}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                invoice.isEligible
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title={!invoice.isEligible ? getInvoiceTooltip(invoice.status) : 'Pobierz fakturę PDF'}
            >
              <Download className="w-4 h-4" />
              Pobierz PDF
            </button>
            <button
              onClick={() => onViewInvoice(invoice)}
              disabled={!invoice.isEligible}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                invoice.isEligible
                  ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                  : 'text-gray-400 bg-gray-100 cursor-not-allowed'
              }`}
              title={!invoice.isEligible ? getInvoiceTooltip(invoice.status) : 'Podgląd faktury'}
            >
              <Eye className="w-4 h-4" />
              Podgląd
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

InvoiceItem.displayName = 'InvoiceItem';

// Status info helper function
const getStatusInfo = (status: string) => {
  switch (status) {
    case 'completed':
      return {
        label: 'Zrealizowane',
        color: 'bg-green-100 text-green-800',
        icon: '✅'
      };
    case 'processing':
      return {
        label: 'W trakcie',
        color: 'bg-blue-100 text-blue-800',
        icon: '⏳'
      };
    case 'on-hold':
      return {
        label: 'Wstrzymane',
        color: 'bg-yellow-100 text-yellow-800',
        icon: '⏸️'
      };
    case 'pending':
      return {
        label: 'Oczekujące',
        color: 'bg-orange-100 text-orange-800',
        icon: '⏳'
      };
    case 'cancelled':
      return {
        label: 'Anulowane',
        color: 'bg-red-100 text-red-800',
        icon: '❌'
      };
    case 'refunded':
      return {
        label: 'Zwrócone',
        color: 'bg-gray-100 text-gray-800',
        icon: '↩️'
      };
    case 'failed':
      return {
        label: 'Nieudane',
        color: 'bg-red-100 text-red-800',
        icon: '❌'
      };
    default:
      return {
        label: 'Nieznana',
        color: 'bg-gray-100 text-gray-800',
        icon: '❓'
      };
  }
};

// Check if order is eligible for invoice generation
// Faktura dostępna tylko dla zamówień zrealizowanych lub opłaconych
// - completed: zrealizowane (zawsze dostępna)
// - processing: w trakcie realizacji (tylko jeśli opłacone/zapłacone przy zamówieniu)
// - pending: oczekujące na płatność (NIE dostępna - nie zapłacone)
// - on-hold: wstrzymane (NIE dostępna - może być problem z płatnością)
const isOrderEligibleForInvoice = (status: string): boolean => {
  // Tylko completed i processing (opłacone/zapłacone)
  const eligibleStatuses = ['completed', 'processing'];
  return eligibleStatuses.includes(status);
};

// Get tooltip message for disabled invoice buttons
const getInvoiceTooltip = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Faktura będzie dostępna po opłaceniu zamówienia. Zamówienie oczekuje na płatność.';
    case 'on-hold':
      return 'Faktura będzie dostępna po potwierdzeniu i opłaceniu zamówienia.';
    case 'cancelled':
      return 'Faktura niedostępna - zamówienie zostało anulowane';
    case 'refunded':
      return 'Faktura niedostępna - zamówienie zostało zwrócone';
    case 'failed':
      return 'Faktura niedostępna - płatność nie powiodła się';
    default:
      return 'Faktura dostępna tylko dla zamówień opłaconych lub zrealizowanych';
  }
};

const formatPrice = (price: number) => {
  return price.toFixed(2);
};

export default function MyInvoicesPage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useAuthIsAuthenticated();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
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

  // Fetch invoices with caching
  const fetchInvoices = useCallback(async (forceRefresh = false) => {
    if (!user?.id) return;

    try {
      // Check cache FIRST before setting loading state
      if (!forceRefresh) {
        const cachedData = sessionStorage.getItem(INVOICES_CACHE_KEY);
        const cacheTimestamp = sessionStorage.getItem(INVOICES_CACHE_TIMESTAMP_KEY);
        
        if (cachedData && cacheTimestamp) {
          const cacheAge = Date.now() - parseInt(cacheTimestamp, 10);
          if (cacheAge < CACHE_DURATION) {
            try {
              const parsedData = JSON.parse(cachedData);
              setInvoices(parsedData);
              setLoading(false);
              // Fetch fresh data in background (don't block UI) - only if cache is older than 2 minutes
              if (cacheAge > 2 * 60 * 1000) {
                fetchInvoices(true).catch(console.error);
              }
              return;
            } catch {
              // Cache corrupted, fetch fresh data
              sessionStorage.removeItem(INVOICES_CACHE_KEY);
              sessionStorage.removeItem(INVOICES_CACHE_TIMESTAMP_KEY);
            }
          }
        }
      }

      // Only show loader if we don't have cached data
      if (invoices.length === 0) {
        setLoading(true);
      }
      
      // Add limit and per_page to optimize API call
      const response = await fetch(`/api/woocommerce?endpoint=orders&customer=${user.id}&per_page=20&orderby=date&order=desc`);
      
      if (!response.ok) {
        setErrorMessage((prev) => prev ?? httpErrorMessage(response.status));
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        // Show all orders, but mark which ones are eligible for invoices
        const transformedInvoices = data.map((order: WooOrder): Invoice => {
          const invoiceNumberRaw = order.meta_data?.find((meta) => meta.key === '_invoice_number')?.value;
          const invoiceDateRaw = order.meta_data?.find((meta) => meta.key === '_invoice_date')?.value;
          const isEligible = isOrderEligibleForInvoice(order.status);
          const invoiceNumber =
            typeof invoiceNumberRaw === 'string' && invoiceNumberRaw.trim().length > 0
              ? invoiceNumberRaw
              : `FV/${order.number}`;
          const invoiceDate =
            typeof invoiceDateRaw === 'string' && invoiceDateRaw.trim().length > 0
              ? invoiceDateRaw
              : order.date_created;
          
          return {
            id: order.id.toString(),
            number: invoiceNumber,
            date: invoiceDate,
            total: parseFloat(order.total),
            currency: order.currency || 'PLN',
            status: order.status,
            download_url: null,
            orderNumber: order.number,
            isEligible: isEligible
          };
        });
        
        setInvoices(transformedInvoices);
        
        // Cache the results
        sessionStorage.setItem(INVOICES_CACHE_KEY, JSON.stringify(transformedInvoices));
        sessionStorage.setItem(INVOICES_CACHE_TIMESTAMP_KEY, Date.now().toString());
      } else {
        console.error('Error fetching orders:', data);
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error instanceof Error ? error.message : error);
      setErrorMessage((prev) => prev ?? 'Nie udało się pobrać listy faktur. Spróbuj ponownie.');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, invoices.length]);

  // Handle manual refresh button
  const handleRefresh = useCallback(async () => {
    // Clear cache
    sessionStorage.removeItem(INVOICES_CACHE_KEY);
    sessionStorage.removeItem(INVOICES_CACHE_TIMESTAMP_KEY);
    
    // Force refresh
    setRefreshing(true);
    setErrorMessage(null);
    try {
      await fetchInvoices(true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchInvoices]);

  useEffect(() => {
    // Check cache immediately on mount (before waiting for auth)
    if (typeof window !== 'undefined') {
      const cachedData = sessionStorage.getItem(INVOICES_CACHE_KEY);
      const cacheTimestamp = sessionStorage.getItem(INVOICES_CACHE_TIMESTAMP_KEY);
      
      if (cachedData && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp, 10);
        if (cacheAge < CACHE_DURATION) {
          try {
            const parsedData = JSON.parse(cachedData);
            setInvoices(parsedData);
            setLoading(false);
          } catch {
            // Cache corrupted
            sessionStorage.removeItem(INVOICES_CACHE_KEY);
            sessionStorage.removeItem(INVOICES_CACHE_TIMESTAMP_KEY);
          }
        }
      }
    }
    
    // Then fetch fresh data if authenticated
    if (isAuthenticated && user?.id) {
      fetchInvoices();
    }
  }, [isAuthenticated, user?.id, fetchInvoices]);

  const handleViewInvoice = useCallback(async (invoice: Invoice) => {
    // Check if invoice is eligible for viewing
    if (!invoice.isEligible) {
      setErrorMessage(getInvoiceTooltip(invoice.status));
      return;
    }

    try {
      // Use your custom invoice system - fetch PDF endpoint
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = await fetch(`/api/woocommerce?endpoint=customers/invoice-pdf&order_id=${invoice.id}&v=${timestamp}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Nie udało się pobrać faktury' }));
        throw new Error(errorData.error || 'Nie udało się pobrać faktury');
      }
      
      // Check content type
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/pdf')) {
        // Binary PDF response - create blob and open
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Open PDF in new tab for viewing
        window.open(url, '_blank');
        
        // Clean up after a delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
      } else {
        // JSON response (fallback - HTML or base64)
        const data = await response.json();
        
        if (data.success && data.base64) {
          // Convert base64 to blob and open in new tab
          const binaryString = atob(data.base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: data.mime || 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          
          // Open PDF/HTML in new tab for viewing
          window.open(url, '_blank');
          
          // Clean up after a delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);
        } else if (data.html) {
          // HTML fallback - open in new window
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(data.html);
            newWindow.document.close();
          }
        } else {
          throw new Error('Nieprawidłowa odpowiedź z serwera');
        }
      }
    } catch (error) {
      console.error('Error viewing invoice:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się wyświetlić faktury. Spróbuj ponownie.');
    }
  }, []);

  const handleDownloadInvoice = useCallback(async (invoice: Invoice, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    // Check if invoice is eligible for download
    if (!invoice.isEligible) {
      setErrorMessage(getInvoiceTooltip(invoice.status));
      return;
    }

    try {
      // Use your custom invoice system - fetch PDF endpoint
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = await fetch(`/api/woocommerce?endpoint=customers/invoice-pdf&order_id=${invoice.id}&v=${timestamp}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Nie udało się pobrać faktury' }));
        throw new Error(errorData.error || 'Nie udało się pobrać faktury');
      }
      
      // Check content type
      const contentType = response.headers.get('content-type') || '';
      let blob: Blob;
      let filename = `faktura_${invoice.number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      
      if (contentType.includes('application/pdf')) {
        // Binary PDF response
        blob = await response.blob();
        // Get filename from Content-Disposition header if available
        const contentDisposition = response.headers.get('content-disposition');
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
      } else {
        // JSON response (fallback - HTML or base64)
        const data = await response.json();
        
        if (data.success && data.base64) {
          // Convert base64 to blob
          const binaryString = atob(data.base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: data.mime || 'application/pdf' });
          filename = data.filename || filename;
        } else if (data.html) {
          // HTML fallback - create HTML blob
          blob = new Blob([data.html], { type: 'text/html' });
          filename = data.filename || filename.replace('.pdf', '.html');
        } else {
          throw new Error('Nieprawidłowa odpowiedź z serwera');
        }
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error downloading invoice:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Nie udało się pobrać faktury. Spróbuj ponownie.');
    }
  }, []);

  // Memoize sorted invoices
  const sortedInvoices = useMemo(() => {
    return [...invoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices]);

  // Show skeleton loader only if we have no data at all
  if (loading && invoices.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <PageContainer className="pb-12">
          <PageHeader 
            title="Moje faktury"
            subtitle="Historia Twoich faktur i możliwość ich pobrania"
            breadcrumbs={[
              { label: 'Strona główna', href: '/' },
              { label: 'Moje faktury', href: '/moje-faktury' }
            ]}
          />
          
          {/* Skeleton Loader */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
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
          title="Moje faktury"
          subtitle="Historia Twoich faktur i możliwość ich pobrania"
          breadcrumbs={[
            { label: 'Strona główna', href: '/' },
            { label: 'Moje faktury', href: '/moje-faktury' }
          ]}
        />

        {errorMessage && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Odśwież listę faktur"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Odświeżanie...' : 'Odśwież'}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="w-full">
            <div className="grid grid-cols-3 bg-white border border-gray-300 p-1 rounded-[28px] sm:h-[80px] h-auto relative overflow-hidden shadow-sm">
              {/* Animated background indicator with layoutId for smooth transition */}
              <motion.div 
                layoutId="accountActiveTab"
                className="absolute top-1 bottom-1 bg-gradient-to-r from-black to-[#0f1a26] rounded-[22px] shadow-lg"
                style={{
                  left: `calc(${(['profile', 'orders', 'invoices'].indexOf('invoices') * 100) / 3}% + 2px)`,
                  width: `calc(${100 / 3}% - 6px)`,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30
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
              <button
                onClick={() => router.push('/moje-zamowienia')}
                className="relative z-10 flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs sm:text-[17px] font-semibold transition-all duration-300 ease-out border-0 border-transparent rounded-[22px] group"
              >
                <div className="transition-all duration-300 group-hover:scale-110 text-gray-500 group-hover:text-gray-700">
                  <Package className="w-5 h-5 sm:w-5 sm:h-5" />
                </div>
                <span className="text-center leading-tight transition-all duration-300 whitespace-nowrap text-gray-500 group-hover:text-gray-700">
                  Zamówienia
                </span>
              </button>
              <button
                className="relative z-10 flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs sm:text-[17px] font-semibold transition-all duration-300 ease-out border-0 border-transparent rounded-[22px] group"
              >
                <div className="transition-all duration-300 scale-110 text-white">
                  <FileText className="w-5 h-5 sm:w-5 sm:h-5" />
                </div>
                <span className="text-center leading-tight transition-all duration-300 whitespace-nowrap text-white">
                  Faktury
                </span>
              </button>
            </div>
          </div>
        </div>

        {sortedInvoices.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Brak faktur
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Nie masz jeszcze żadnych faktur. Faktury pojawią się tutaj po złożeniu pierwszego zamówienia.
            </p>
            <button
              onClick={() => router.push('/sklep')}
              className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Przejdź do sklepu
            </button>
          </motion.div>
        ) : (
          /* Invoices List */
          <div className="space-y-4">
                         {sortedInvoices.map((invoice) => (
               <InvoiceItem
                 key={invoice.id}
                 invoice={invoice}
                 onViewInvoice={handleViewInvoice}
                 onDownloadInvoice={handleDownloadInvoice}
               />
             ))}
          </div>
        )}

        {/* Invoice Details Modal */}
        {selectedInvoice && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoice(null)}
            />

            {/* Modal */}
            <motion.div
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Faktura {selectedInvoice.number}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Zamówienie #{selectedInvoice.orderNumber}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data wystawienia</label>
                      <p className="text-gray-900">{new Date(selectedInvoice.date).toLocaleDateString('pl-PL')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Kwota</label>
                      <p className="text-gray-900 font-semibold">{formatPrice(selectedInvoice.total)} {selectedInvoice.currency}</p>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <p className="text-gray-600">
                      Szczegółowe informacje o fakturze będą dostępne po implementacji pełnego systemu PDF.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Zamknij
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={(e) => handleDownloadInvoice(selectedInvoice, e)}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Download className="w-4 h-4 inline mr-2" />
                    Pobierz PDF
                  </button>
                  <button
                    onClick={() => handleViewInvoice(selectedInvoice)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="w-4 h-4 inline mr-2" />
                    Podgląd
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </PageContainer>
    </div>
  );
}
