'use client';

import jsPDF from 'jspdf';
import { Invoice } from '@/app/moje-faktury/page';

interface InvoiceCustomerInfo {
  name?: string;
  company?: string;
  nip?: string;
  email?: string;
  address?: string;
}

interface InvoiceItem {
  name?: string;
  quantity?: number;
  price?: string | number;
}

interface InvoiceOrderData {
  customer?: InvoiceCustomerInfo;
  items?: InvoiceItem[];
}

interface InvoicePDFGeneratorProps {
  invoice: Invoice;
  orderData?: InvoiceOrderData;
}

const formatItemPrice = (
  price: string | number | undefined,
  quantity: number
): string => {
  const numericPrice =
    typeof price === 'number'
      ? price
      : price
        ? parseFloat(price.replace(',', '.'))
        : NaN;
  const validPrice = Number.isFinite(numericPrice) ? numericPrice : 0;
  return (validPrice * quantity).toFixed(2);
};

export const generateInvoicePDF = (
  invoice: Invoice,
  orderData?: InvoiceOrderData
) => {
  const doc = new jsPDF();

  // Set up fonts and colors
  const primaryColor = '#000000';
  const secondaryColor = '#666666';
  const lightGray = '#f5f5f5';

  let yPosition = 20;

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('Faktura', 20, yPosition);

  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text(`Nr: ${invoice.number}`, 20, yPosition);

  yPosition += 10;
  doc.text(
    `Data: ${new Date(invoice.date).toLocaleDateString('pl-PL')}`,
    20,
    yPosition
  );

  // Company info
  yPosition += 30;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('KingBrand Sp. z o.o.', 20, yPosition);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('ul. Przykładowa 123', 20, yPosition);
  yPosition += 5;
  doc.text('00-001 Warszawa', 20, yPosition);
  yPosition += 5;
  doc.text('NIP: 1234567890', 20, yPosition);
  yPosition += 5;
  doc.text('Tel: +48 123 456 789', 20, yPosition);
  yPosition += 5;
  doc.text('Email: info@kingbrand.pl', 20, yPosition);

  // Customer info (if available)
  if (orderData) {
    yPosition += 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Nabywca:', 20, yPosition);

    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor);
    if (orderData.customer?.name) {
      doc.text(orderData.customer.name, 20, yPosition);
      yPosition += 5;
    }
    if (orderData.customer?.company) {
      doc.text(orderData.customer.company, 20, yPosition);
      yPosition += 5;
    }
    if (orderData.customer?.nip) {
      doc.text(`NIP: ${orderData.customer.nip}`, 20, yPosition);
      yPosition += 5;
    }
    if (orderData.customer?.email) {
      doc.text(orderData.customer.email, 20, yPosition);
      yPosition += 5;
    }
    if (orderData.customer?.address) {
      doc.text(orderData.customer.address, 20, yPosition);
      yPosition += 5;
    }
  }

  // Invoice details table
  yPosition += 20;

  // Table header
  doc.setFillColor(lightGray);
  doc.rect(20, yPosition - 5, 170, 10, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text('Opis', 25, yPosition);
  doc.text('Ilość', 120, yPosition);
  doc.text('Cena', 140, yPosition);
  doc.text('Wartość', 170, yPosition);

  yPosition += 15;

  // Table rows (mock data for now)
  const items: InvoiceItem[] = orderData?.items || [
    {
      name: 'Produkt KingBrand',
      quantity: 1,
      price: (invoice.total / 100).toFixed(2),
    },
  ];

  items.forEach(item => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor);
    doc.text(item.name || 'Produkt', 25, yPosition);
    const quantity = item.quantity ?? 1;
    doc.text(quantity.toString(), 120, yPosition);

    const unitPrice =
      typeof item.price === 'number'
        ? item.price.toFixed(2)
        : (item.price ?? (invoice.total / 100).toFixed(2));
    doc.text(`${unitPrice} PLN`, 140, yPosition);

    const lineTotal = formatItemPrice(item.price, quantity);
    doc.text(`${lineTotal} PLN`, 170, yPosition);

    yPosition += 8;
  });

  // Total
  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor);
  doc.text(`RAZEM: ${(invoice.total / 100).toFixed(2)} PLN`, 140, yPosition);

  // Footer
  yPosition += 30;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor);
  doc.text('Dziękujemy za zakup w KingBrand!', 20, yPosition);
  yPosition += 5;
  doc.text(
    'Wszystkie produkty są oryginalne i pochodzą z autoryzowanych źródeł.',
    20,
    yPosition
  );

  // Save the PDF
  const fileName = `faktura_${invoice.number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
};

export default function InvoicePDFGenerator({
  invoice,
  orderData,
}: InvoicePDFGeneratorProps) {
  const handleGeneratePDF = () => {
    generateInvoicePDF(invoice, orderData);
  };

  return (
    <button
      onClick={handleGeneratePDF}
      className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Pobierz PDF
    </button>
  );
}
