'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, Euro, Eye } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { generateInvoicePDF } from '@/components/ui/invoice-pdf-generator';

export interface Invoice {
  id: string;
  number: string;
  date: string;
  total: number;
  currency: string;
  status: string;
  download_url: string;
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
      
      // Try WCPDF plugin first - get orders with invoices
      const response = await fetch(`/api/woocommerce?endpoint=orders&customer=${user?.id}&status=completed,processing,pending`);
      const data = await response.json();

      if (Array.isArray(data)) {
        // Filter orders that have invoices generated
        const ordersWithInvoices = data.filter((order: any) => 
          order.meta_data?.some((meta: any) => 
            meta.key === '_invoice_generated' && meta.value === 'yes'
          )
        );
        
        // Transform to invoice format
        const transformedInvoices = ordersWithInvoices.map((order: any) => {
          const invoiceNumber = order.meta_data?.find((meta: any) => meta.key === '_invoice_number')?.value;
          const invoiceDate = order.meta_data?.find((meta: any) => meta.key === '_invoice_date')?.value;
          
          return {
            id: order.id.toString(),
            number: invoiceNumber || `FV/${order.id}`,
            date: invoiceDate || order.date_created,
            total: parseFloat(order.total) * 100, // Convert to grosze
            currency: order.currency || 'PLN',
            status: order.status,
            download_url: `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/?action=generate_wpo_wcpdf&document_type=invoice&order_ids=${order.id}`
          };
        });
        
        setInvoices(transformedInvoices);
      } else {
        // Fallback to custom endpoint
        console.log('🔄 Trying fallback custom invoices endpoint...');
        const fallbackResponse = await fetch(`/api/woocommerce?endpoint=customers/invoices&customer_id=${user?.id}`);
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.success && Array.isArray(fallbackData.invoices)) {
          const transformedInvoices = fallbackData.invoices.map((invoice: any) => ({
            id: invoice.id.toString(),
            number: invoice.number,
            date: invoice.date,
            total: parseFloat(invoice.total) * 100, // Convert to grosze
            currency: invoice.currency || 'PLN',
            status: invoice.status,
            download_url: invoice.download_url
          }));
          setInvoices(transformedInvoices);
        } else {
          console.error('Error fetching invoices:', fallbackData?.error || fallbackData?.message || 'Nie udało się pobrać faktur');
          setInvoices([]);
        }
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
          label: 'Zapłacona',
          color: 'bg-green-100 text-green-800'
        };
      case 'processing':
        return {
          label: 'W trakcie',
          color: 'bg-blue-100 text-blue-800'
        };
      case 'pending':
        return {
          label: 'Oczekująca',
          color: 'bg-yellow-100 text-yellow-800'
        };
      default:
        return {
          label: 'Nieznana',
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const formatPrice = (priceInGrosze: number) => {
    return (priceInGrosze / 100).toFixed(2);
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      // Use direct WCPDF link for viewing
      if (invoice.download_url) {
        window.open(invoice.download_url, '_blank');
      } else {
        // Fallback: generate WCPDF link
        const wcpdfUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/?action=generate_wpo_wcpdf&document_type=invoice&order_ids=${invoice.id}`;
        window.open(wcpdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Error opening invoice:', error);
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // Generate and download PDF
    generateInvoicePDF(invoice);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[95vw] mx-auto px-6 py-8 pb-16">
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
      <div className="max-w-[95vw] mx-auto px-6 py-8 pb-16">
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
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
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
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Podgląd
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(invoice)}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
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
                <h2 className="text-2xl font-bold text-gray-900">
                  Faktura {selectedInvoice.number}
                </h2>
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
