'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, Euro, Eye } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';

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

export default function MyInvoicesPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

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

  // Fetch invoices
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchInvoices();
    }
  }, [isAuthenticated, user?.id]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      
      // Get all orders for the customer
      const response = await fetch(`/api/woocommerce?endpoint=orders&customer=${user?.id}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        // Show all orders, but mark which ones are eligible for invoices
        const transformedInvoices = data.map((order: any) => {
          const invoiceNumber = order.meta_data?.find((meta: any) => meta.key === '_invoice_number')?.value;
          const invoiceDate = order.meta_data?.find((meta: any) => meta.key === '_invoice_date')?.value;
          const isEligible = isOrderEligibleForInvoice(order.status);
          
          return {
            id: order.id.toString(),
            number: invoiceNumber || `FV/${order.number}`,
            date: invoiceDate || order.date_created,
            total: parseFloat(order.total), // Keep as PLN (not convert to grosze)
            currency: order.currency || 'PLN',
            status: order.status,
            download_url: null, // No longer using WCPDF URLs
            orderNumber: order.number,
            isEligible: isEligible
          };
        });
        
        setInvoices(transformedInvoices);
      } else {
        console.error('Error fetching orders:', data);
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching invoices:', (error as any)?.message || error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

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
  const isOrderEligibleForInvoice = (status: string): boolean => {
    const eligibleStatuses = ['completed', 'processing', 'on-hold'];
    return eligibleStatuses.includes(status);
  };

  // Get tooltip message for disabled invoice buttons
  const getInvoiceTooltip = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Faktura będzie dostępna po opłaceniu zamówienia';
      case 'cancelled':
        return 'Faktura niedostępna - zamówienie anulowane';
      case 'refunded':
        return 'Faktura niedostępna - zamówienie zwrócone';
      case 'failed':
        return 'Faktura niedostępna - płatność nieudana';
      default:
        return 'Faktura niedostępna dla tego statusu zamówienia';
    }
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    // Check if invoice is eligible for viewing
    if (!invoice.isEligible) {
      alert(getInvoiceTooltip(invoice.status));
      return;
    }

    try {
      // Use your custom invoice system - redirect to download endpoint
      const response = await fetch(`/api/woocommerce?endpoint=customers/invoice-pdf&order_id=${invoice.id}`);
      
      if (!response.ok) {
        throw new Error('Nie udało się pobrać faktury');
      }
      
      const data = await response.json();
      
      if (data.success && data.base64) {
        // Convert base64 to blob and open in new tab
        const binaryString = atob(data.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        // Open PDF in new tab for viewing
        window.open(url, '_blank');
        
        // Clean up after a delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
        
        console.log('✅ Invoice opened for viewing');
      } else {
        throw new Error('Nieprawidłowy format faktury');
      }
      
    } catch (error) {
      console.error('❌ Error opening invoice:', error);
      alert('Błąd podczas otwierania faktury');
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    // Check if invoice is eligible for download
    if (!invoice.isEligible) {
      alert(getInvoiceTooltip(invoice.status));
      return;
    }

    try {
      console.log('🔄 Downloading invoice for order:', invoice.id);
      
      // Use Next.js API as proxy to avoid CORS issues
      const response = await fetch(`/api/woocommerce?endpoint=customers/invoice-pdf&order_id=${invoice.id}`);
      
      if (!response.ok) {
        throw new Error('Nie udało się pobrać faktury');
      }
      
      const data = await response.json();
      
      if (data.success && data.base64) {
        // Convert base64 to blob and download
        const binaryString = atob(data.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = data.filename || `faktura_${invoice.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        window.URL.revokeObjectURL(url);
        
        console.log('✅ Invoice downloaded successfully');
      } else {
        throw new Error('Nieprawidłowy format faktury');
      }
      
    } catch (error) {
      console.error('❌ Error downloading invoice:', error);
      alert('Błąd podczas pobierania faktury');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[95vw] mx-auto mobile-container py-8 pb-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">Ładowanie faktur...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[95vw] mx-auto mobile-container py-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Moje faktury
          </h1>
          <p className="text-lg text-gray-600">
            Historia Twoich faktur i możliwość ich pobrania
          </p>
        </div>

        {invoices.length === 0 ? (
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
            {invoices.map((invoice, index) => {
              const statusInfo = getStatusInfo(invoice.status);
              
              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="font-semibold text-gray-900">
                            Faktura {invoice.number}
                          </span>
                          <span className="text-sm text-gray-500">
                            (Zamówienie #{invoice.orderNumber})
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} flex items-center gap-1`}>
                          <span>{statusInfo.icon}</span>
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(invoice.date).toLocaleDateString('pl-PL')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Euro className="w-4 h-4" />
                          <span>{formatPrice(invoice.total)} {invoice.currency}</span>
                        </div>
                        {!invoice.isEligible && (
                          <div className="flex items-center gap-1 text-orange-600">
                            <span className="text-xs">⚠️</span>
                            <span className="text-xs">Faktura niedostępna</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        disabled={!invoice.isEligible}
                        title={!invoice.isEligible ? getInvoiceTooltip(invoice.status) : 'Podgląd faktury'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          invoice.isEligible
                            ? 'text-gray-600 hover:text-black hover:bg-gray-50'
                            : 'text-gray-400 cursor-not-allowed bg-gray-100'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        Podgląd
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(invoice)}
                        disabled={!invoice.isEligible}
                        title={!invoice.isEligible ? getInvoiceTooltip(invoice.status) : 'Pobierz fakturę PDF'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          invoice.isEligible
                            ? 'bg-black text-white hover:bg-gray-800'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                        Pobierz PDF
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
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
                <button
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Pobierz PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
