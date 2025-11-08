import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  woocommerceQuerySchema,
  orderSchema,
  passwordResetSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '@/lib/schemas/woocommerce';
export const runtime = 'nodejs';
// Debug helper (no logs in prod unless explicitly enabled)
const __DEBUG__ = process.env.NEXT_PUBLIC_DEBUG === 'true';
const debugLog = (...args: unknown[]) => { if (__DEBUG__) console.log(...args); };
const maskUrlSecrets = (urlString: string | URL) => {
  try {
    const u = new URL(String(urlString));
    if (u.searchParams.has('consumer_key')) u.searchParams.set('consumer_key', '***');
    if (u.searchParams.has('consumer_secret')) u.searchParams.set('consumer_secret', '***');
    return u.toString();
  } catch {
    return '[invalid-url]';
  }
};
import { cache } from '@/lib/cache';

// 🚀 PRIORITY 2: Request deduplication - cache identycznych requestów w 100ms window
const requestCache = new Map<string, { data: any; timestamp: number; headers: Headers }>();
const DEDUP_WINDOW = 100; // 100ms window dla deduplication
const MAX_CACHE_SIZE = 100; // Maksymalna liczba cached requests (zapobiega memory leak)

function getCacheKey(req: NextRequest): string {
  const url = new URL(req.url);
  // Cache key = endpoint + wszystkie parametry
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function cleanupOldCache() {
  if (requestCache.size > MAX_CACHE_SIZE) {
    // Usuń najstarsze 20% entries
    const entries = Array.from(requestCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      requestCache.delete(entries[i][0]);
    }
  }
}

import { WooShippingMethod } from '@/types/woocommerce';
import { sentryMetrics } from '@/utils/sentry-metrics';
import { env } from '@/config/env';
import { withCircuitBreaker } from '@/utils/circuit-breaker';
import { hposApi } from '@/services/hpos-api';
import { orderLimitHandler } from '@/services/order-limit-handler';
import { hposPerformanceMonitor } from '@/services/hpos-performance-monitor';
import { checkEndpointRateLimit } from '@/utils/rate-limiter';
import { RateLimitError } from '@/lib/errors';
import { getRequestId, setRequestIdHeader } from '@/utils/request-id';
import * as Sentry from '@sentry/nextjs';

// Redis client (optional)
let redis: any = null;

// Initialize Redis if available
try {
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });
  }
} catch (error) {
  console.warn('Redis not available, using in-memory cache', error);
}

const WC_URL = env.NEXT_PUBLIC_WC_URL;
const SITE_BASE = WC_URL ? WC_URL.replace(/\/wp-json\/wc\/v3.*/, '') : '';
const CK = env.WC_CONSUMER_KEY;
const CS = env.WC_CONSUMER_SECRET;
const WORDPRESS_URL = env.NEXT_PUBLIC_WORDPRESS_URL;

// Check if required environment variables are available
if (!WC_URL || !CK || !CS) {
  console.error('Missing WooCommerce environment variables:', {
    WC_URL: !!WC_URL,
    CK: !!CK,
    CS: !!CS,
  });
}

// Handle password reset using WordPress REST API
async function handlePasswordReset(body: { email: string }) {
  const parsed = passwordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || 'Nieprawidłowe dane' },
      { status: 400 }
    );
  }
  const { email } = parsed.data;

  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Email jest wymagany' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Password reset request for:', email);
    
    // Użyj custom mu-plugin endpoint
    const customUrl = `${WORDPRESS_URL}/wp-json/custom/v1/password-reset`;
    
    const response = await fetch(customUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HeadlessWoo/1.0)',
      },
      body: JSON.stringify({ email }),
    });

    console.log('🔄 Custom endpoint response status:', response.status);
    console.log('🔄 Custom endpoint response headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      const _data = await response.json();
      console.log('✅ Custom password reset API response:', _data);
      
      return NextResponse.json({
        success: _data.success,
        message: _data.message,
        debug_info: _data.debug_info
      });
    } else {
      console.log('❌ Custom password reset API failed:', response.status);
      const errorText = await response.text();
      console.log('❌ Custom endpoint error response:', errorText);
      
      // Fallback: Sprawdź czy użytkownik istnieje przez WooCommerce API
      const wcUrl = `${WORDPRESS_URL}/wp-json/wc/v3/customers`;
      const auth = 'Basic ' + Buffer.from(`${CK}:${CS}`).toString('base64');
      
      const wcResponse = await fetch(`${wcUrl}?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; HeadlessWoo/1.0)',
        },
      });

      if (wcResponse.ok) {
        const customerData = await wcResponse.json();
        console.log('✅ Customer found via WooCommerce API:', customerData.length > 0);
        
        if (customerData.length > 0) {
          return NextResponse.json({
            success: true,
            message: 'Użytkownik został znaleziony. Ze względów bezpieczeństwa, skontaktuj się z obsługą klienta w celu resetowania hasła.'
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'Jeśli podany email istnieje w systemie, otrzymasz link do resetowania hasła.'
      });
    }

  } catch (error) {
    console.error('🚨 Password reset error:', error);
    
    return NextResponse.json({
      success: true,
      message: 'Jeśli podany email istnieje w systemie, otrzymasz link do resetowania hasła.'
    });
  }
}

async function handlePasswordResetConfirm(body: { key: string; login: string; password: string }) {
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || 'Nieprawidłowe dane' },
      { status: 400 }
    );
  }
  const { key, login, password } = parsed.data;

  if (!key || !login || !password) {
    return NextResponse.json(
      { success: false, error: 'Wszystkie pola są wymagane' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Password reset confirm for user:', login);
    
    // Użyj custom mu-plugin endpoint
    const customUrl = `${WORDPRESS_URL}/wp-json/custom/v1/reset-password`;
    
    console.log('🔄 Attempting password reset with:', { key: key.substring(0, 10) + '...', login, passwordLength: password.length });
    
    const response = await fetch(customUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HeadlessWoo/1.0)',
      },
      body: JSON.stringify({
        key: key,
        login: login,
        password: password
      }),
    });
    
    console.log('🔄 Password reset response status:', response.status);

    if (response.ok) {
      const _data = await response.json();
      console.log('✅ Password reset successful for user:', login);
      
      return NextResponse.json({
        success: true,
        message: 'Hasło zostało pomyślnie zresetowane'
      });
    } else {
      console.log('❌ WordPress password reset failed:', response.status);
      return NextResponse.json({
        success: false,
        error: 'Nieprawidłowy lub wygasły klucz resetujący'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('🚨 Password reset confirm error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Wystąpił błąd podczas resetowania hasła'
    }, { status: 500 });
  }
}


async function handleCustomerInvoices(req: NextRequest) {
  console.log('🔍 handleCustomerInvoices called');
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customer_id');
  console.log('🔍 customerId:', customerId);
  
  // Debug environment variables
  console.log('🔍 WORDPRESS_URL:', WORDPRESS_URL);
  console.log('🔍 NODE_ENV:', env.NODE_ENV);
  
  if (!customerId) {
    return NextResponse.json(
      { success: false, error: 'Customer ID jest wymagany' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Fetching invoices for customer:', customerId);
    
    // Call WordPress custom API
    const invoicesUrl = `${WORDPRESS_URL}/wp-json/custom/v1/invoices?customer_id=${customerId}`;
    console.log('🔄 Calling WordPress API:', invoicesUrl);
    
    const response = await fetch(invoicesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HeadlessWoo/1.0)',
      },
    });
    
    console.log('🔄 WordPress API response status:', response.status);

    const raw = await response.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* not json */ }
    if (!response.ok) {
      const msg = (data && (data.error || data.message)) || raw || 'Błąd pobierania faktur';
      return NextResponse.json({ success: false, error: String(msg).slice(0, 1000) }, { status: response.status || 502 });
    }

    if (!data) {
      return NextResponse.json({ success: true, invoices: [] });
    }
    
    console.log('✅ Successfully fetched invoices for customer:', customerId);
    
    const rawInvoices = Array.isArray(data.invoices) ? data.invoices : [];
    const enriched = rawInvoices.map((inv: any) => {
      const id = inv.id || inv.order_id;
      const hasDownload = inv.download_url && typeof inv.download_url === 'string' && inv.download_url.length > 0;
      const pluginUrl = id ? `${SITE_BASE}/?action=generate_wpo_wcpdf&document_type=invoice&order_ids=${id}` : undefined;
      return {
        ...inv,
        download_url: hasDownload ? inv.download_url : pluginUrl
      };
    });

    return NextResponse.json({
      success: true,
      invoices: enriched
    });

  } catch (error) {
    console.error('🚨 Error fetching customer invoices:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Nie udało się pobrać faktur'
    }, { status: 500 });
  }
}

async function handleCustomerInvoicePdf(req: NextRequest) {
  debugLog('🔍 handleCustomerInvoicePdf called');
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');
  debugLog('🔍 orderId:', orderId);
  
  if (!orderId) {
    return NextResponse.json(
      { success: false, error: 'Order ID jest wymagany' },
      { status: 400 }
    );
  }

  try {
    debugLog('🔄 Fetching invoice PDF from WordPress:', orderId);
    
    // Use WordPress custom endpoint for invoice PDF
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const invoicePdfUrl = `${WORDPRESS_URL}/wp-json/custom/v1/invoice/${orderId}/pdf?v=${timestamp}`;
    
    const pdfResponse = await fetch(invoicePdfUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf, application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    });
    
    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      let errorData: any = null;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON
      }
      
      debugLog('⚠️ WordPress invoice PDF endpoint failed:', pdfResponse.status, errorData?.error || errorText);
      
      // If endpoint returns 403 or 404, don't try fallback - invoice is not available
      if (pdfResponse.status === 403 || pdfResponse.status === 404) {
        return NextResponse.json({
          success: false,
          error: errorData?.error || 'Faktura nie jest dostępna dla tego zamówienia'
        }, { status: pdfResponse.status });
      }
      
      // For other errors, try to generate PDF locally as fallback
      debugLog('⚠️ Falling back to local PDF generation');
      return await generateInvoicePdfLocally(orderId);
    }
    
    // Check content type - WordPress endpoint might return binary PDF or JSON with base64
    const contentType = pdfResponse.headers.get('content-type') || '';
    
    if (contentType.includes('application/pdf')) {
      // WordPress returns binary PDF directly (TCPDF)
      debugLog('✅ Received binary PDF from WordPress');
      const pdfBuffer = await pdfResponse.arrayBuffer();
      
      // Return PDF as binary response
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="faktura_${orderId}.pdf"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } else if (contentType.includes('application/json')) {
      // WordPress returns JSON with base64 (fallback - TCPDF not available)
      debugLog('⚠️ Received JSON response (TCPDF not available, using fallback)');
      const jsonData = await pdfResponse.json();
      
      if (jsonData.success && jsonData.base64) {
        // Convert base64 to buffer for binary response
        const pdfBuffer = Buffer.from(jsonData.base64, 'base64');
        
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': jsonData.mime || 'application/pdf',
            'Content-Disposition': `attachment; filename="${jsonData.filename || `faktura_${orderId}.pdf`}"`,
          },
        });
      } else if (jsonData.html) {
        // HTML fallback - return JSON for client-side PDF generation
        return NextResponse.json({
          success: true,
          html: jsonData.html,
          base64: jsonData.base64,
          filename: jsonData.filename || `faktura_${orderId}.html`,
          pdf_available: false
        });
      } else {
        throw new Error('Invalid JSON response from WordPress endpoint');
      }
    } else {
      // Unknown content type - try to parse as PDF
      debugLog('⚠️ Unknown content type, attempting to parse as PDF');
      const pdfBuffer = await pdfResponse.arrayBuffer();
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="faktura_${orderId}.pdf"`,
        },
      });
    }
    
  } catch (error: any) {
    debugLog('🚨 Error fetching invoice PDF:', error);
    
    // Fallback: try to generate PDF locally only if it's a network/server error
    if (error?.message?.includes('fetch') || error?.code === 'ECONNREFUSED') {
      try {
        debugLog('⚠️ Network error, trying local PDF generation');
        return await generateInvoicePdfLocally(orderId);
      } catch (localError: any) {
        debugLog('🚨 Local PDF generation also failed:', localError);
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Nie udało się wygenerować faktury PDF',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

async function generateInvoicePdfLocally(orderId: string) {
  debugLog('🔄 Generating invoice PDF locally for order:', orderId);
  
  // First, get order details to check if it's eligible for invoice
  const orderUrl = `${WORDPRESS_URL}/wp-json/wc/v3/orders/${orderId}`;
  const auth = 'Basic ' + Buffer.from(`${CK}:${CS}`).toString('base64');
  
  const orderResponse = await fetch(orderUrl, {
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
  
  if (!orderResponse.ok) {
    throw new Error('Nie udało się pobrać danych zamówienia');
  }
  
  const orderData = await orderResponse.json();
  
  // Check if order is eligible for invoice generation
  // Allow invoices for: completed, processing, on-hold, and pending (if invoice was requested)
  const eligibleStatuses = ['completed', 'processing', 'on-hold'];
  const invoiceRequested = orderData.meta_data?.some((meta: any) => 
    meta.key === '_invoice_request' && meta.value === 'yes'
  ) || false;
  
  if (!eligibleStatuses.includes(orderData.status) && !(orderData.status === 'pending' && invoiceRequested)) {
    const errorResponse = NextResponse.json({ 
      success: false,
      error: 'Faktura może być wystawiona tylko dla opłaconych lub zrealizowanych zamówień',
      eligible: false,
      status: orderData.status,
      invoiceRequested
    }, { status: 403 });
    return errorResponse;
  }
  
  debugLog('✅ Order is eligible for invoice generation');
  debugLog('🔄 Generating improved PDF for order:', orderId);
  
  // Generate improved PDF using InvoiceGenerator with timeout and sanitization
  const improvedPdf = await generateImprovedInvoicePdf(orderId, {
    base64: '',
    filename: `faktura_${orderId}.pdf`,
    mime: 'application/pdf'
  });
  
  return NextResponse.json({
    success: true,
    base64: improvedPdf.base64,
    filename: improvedPdf.filename,
    mime: improvedPdf.mime
  });
}

/**
 * Sanitize text for PDF generation (remove HTML, escape special chars, limit length)
 */
function sanitizePdfText(text: string | null | undefined, maxLength: number = 200): string {
  if (!text) return '';
  // Remove HTML tags, trim, limit length
  let sanitized = String(text)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, '') // Remove HTML entities
    .trim()
    .substring(0, maxLength);
  // Escape special characters that might cause issues in PDF
  return sanitized.replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}

/**
 * Generate professional invoice PDF using new InvoiceGenerator
 * With timeout and PII sanitization
 */
async function generateImprovedInvoicePdf(orderId: string, originalData: any) {
  const PDF_GENERATION_TIMEOUT = 30000; // 30 seconds
  const MAX_PDF_SIZE_BASE64 = 10 * 1024 * 1024; // 10MB base64 (~7.5MB binary)
  
  try {
    // Create timeout promise for entire PDF generation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: Generowanie PDF przekroczyło limit czasu')), PDF_GENERATION_TIMEOUT);
    });
    
    const pdfGenerationPromise = (async () => {
      // Get order details from WooCommerce API with timeout
      const orderUrl = `${WORDPRESS_URL}/wp-json/wc/v3/orders/${orderId}`;
      const auth = 'Basic ' + Buffer.from(`${CK}:${CS}`).toString('base64');
      
      const orderResponse = await fetch(orderUrl, {
        headers: {
          'Authorization': auth,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout for API call
      });
      
      if (!orderResponse.ok) {
        throw new Error('Nie udało się pobrać danych zamówienia');
      }
      
      const order = await orderResponse.json();
      
      // Sanitize order data before using in PDF
      const sanitizedOrder = {
        number: sanitizePdfText(order.number, 50),
        date_created: order.date_created,
        billing: {
          first_name: sanitizePdfText(order.billing?.first_name, 100),
          last_name: sanitizePdfText(order.billing?.last_name, 100),
          address_1: sanitizePdfText(order.billing?.address_1, 200),
        },
        total: sanitizePdfText(order.total, 50),
      };
      
      // Generate simple PDF using jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('FAKTURA VAT', 20, 30);
      
      // Add order details (sanitized)
      doc.setFontSize(12);
      doc.text(`Zamówienie: ${sanitizedOrder.number}`, 20, 50);
      doc.text(`Data: ${new Date(sanitizedOrder.date_created).toLocaleDateString('pl-PL')}`, 20, 60);
      
      // Add customer info (sanitized)
      const customerName = `${sanitizedOrder.billing.first_name} ${sanitizedOrder.billing.last_name}`.trim();
      if (customerName) {
        doc.text(`Klient: ${customerName}`, 20, 80);
      }
      if (sanitizedOrder.billing.address_1) {
        doc.text(`Adres: ${sanitizedOrder.billing.address_1}`, 20, 90);
      }
      
      // Add total
      doc.setFontSize(14);
      doc.text(`RAZEM: ${sanitizedOrder.total} zł`, 20, 120);
      
      // Add footer
      doc.setFontSize(10);
      doc.text('Dziękujemy za zakupy w KingBrand!', 20, 150);
      
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      const base64 = pdfBuffer.toString('base64');
      
      // Check PDF size limit
      if (base64.length > MAX_PDF_SIZE_BASE64) {
        throw new Error(`PDF przekroczył limit rozmiaru (${Math.round(MAX_PDF_SIZE_BASE64 / 1024 / 1024)}MB)`);
      }
      
      return {
        base64,
        filename: `faktura_${sanitizedOrder.number.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        mime: 'application/pdf'
      };
    })();
    
    // Race between PDF generation and timeout
    return await Promise.race([pdfGenerationPromise, timeoutPromise]) as any;
    
  } catch (error: any) {
    if (error.name === 'TimeoutError' || error.message?.includes('Timeout')) {
      debugLog('⏱️ PDF generation timeout', { orderId });
      throw new Error('Generowanie PDF przekroczyło limit czasu. Spróbuj ponownie.');
    }
    
    debugLog('🚨 Error generating professional PDF:', error);
    // Don't fallback to original data if it contains PII - return error instead
    throw error;
  }
}

/**
 * OLD FUNCTION - REMOVED
 */
function _generateSimplePdf_OLD(html: string, orderId: string, order: any): string {
  // Extract order data from order object
  const orderDate = new Date(order.date_created).toLocaleDateString('pl-PL');
  const invoiceNumber = `FV/${new Date().getFullYear()}/${order.number}`;
  
  // Get customer data
  const customerName = `${order.billing.first_name} ${order.billing.last_name}`;
  const customerAddress = `${order.billing.address_1}, ${order.billing.postcode} ${order.billing.city}`;
  const customerEmail = order.billing.email;
  const customerPhone = order.billing.phone;
  
  // Get products data
  const products = order.line_items.map((item: any) => 
    `${item.name} | ${item.quantity} | ${parseFloat(item.total).toFixed(2)} zł`
  ).join('\n0 -15 Td\n(');
  
  // Get totals
  const subtotal = parseFloat(order.total).toFixed(2);
  const shipping = parseFloat(order.shipping_total || 0).toFixed(2);
  const tax = parseFloat(order.total_tax || 0).toFixed(2);
  const total = parseFloat(order.total).toFixed(2);
  
  // Create PDF content with proper invoice data
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
/F2 6 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 2000
>>
stream
BT
/F2 18 Tf
250 750 Td
(FAKTURA VAT) Tj
0 -30 Td
/F1 14 Tf
280 720 Td
(${invoiceNumber}) Tj
0 -40 Td
/F1 12 Tf
72 680 Td
(Data wystawienia: ${orderDate}) Tj
0 -20 Td
(Data sprzedaży: ${orderDate}) Tj
0 -20 Td
(Numer zamówienia: ${order.number}) Tj
0 -40 Td
(FIRMA SPRZEDAWCY:) Tj
0 -20 Td
(KingBrand Sp. z o.o.) Tj
0 -15 Td
(ul. Przykładowa 123, 00-001 Warszawa) Tj
0 -15 Td
(NIP: 1234567890) Tj
0 -15 Td
(Tel: +48 123 456 789) Tj
0 -15 Td
(Email: info@kingbrand.pl) Tj
0 -40 Td
(DANE NABYWCY:) Tj
0 -20 Td
(Imię i nazwisko: ${customerName}) Tj
0 -15 Td
(Adres: ${customerAddress}) Tj
0 -15 Td
(Email: ${customerEmail}) Tj
0 -15 Td
(Telefon: ${customerPhone}) Tj
0 -40 Td
(PRODUKTY:) Tj
0 -20 Td
(Nazwa produktu | Ilość | Cena) Tj
0 -20 Td
(${products}) Tj
0 -40 Td
(PODSUMOWANIE:) Tj
0 -20 Td
(Wartość netto: ${subtotal} zł) Tj
0 -15 Td
(Dostawa: ${shipping} zł) Tj
0 -15 Td
(VAT: ${tax} zł) Tj
0 -20 Td
/F2 14 Tf
(RAZEM: ${total} zł) Tj
0 -40 Td
/F1 10 Tf
(Płatność: ${order.payment_method_title}) Tj
0 -20 Td
(Dziękujemy za zakupy w KingBrand!) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

6 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000500 00000 n 
0000000600 00000 n 
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
${2000 + 600}
%%EOF`;

  return pdfContent;
}

/**
 * Generate HTML template for invoice
 */
function _generateInvoiceHtmlTemplate(order: any) {
  const orderDate = new Date(order.date_created).toLocaleDateString('pl-PL');
  const invoiceNumber = `FV/${new Date().getFullYear()}/${order.number}`;
  
  const itemsHtml = order.line_items.map((item: any) => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${parseFloat(item.total).toFixed(2)} zł</td>
    </tr>
  `).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Faktura ${invoiceNumber}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
            .company-info { float: left; width: 50%; }
            .invoice-info { float: right; width: 50%; text-align: right; }
            .clear { clear: both; }
            .customer-info { margin: 20px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f5f5f5; font-weight: bold; }
            .totals { float: right; width: 300px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .total-final { font-weight: bold; font-size: 1.2em; border-top: 2px solid #000; padding-top: 10px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>FAKTURA VAT</h1>
            <h2>${invoiceNumber}</h2>
        </div>
        
        <div class="company-info">
            <h3>KingBrand Sp. z o.o.</h3>
            <p>ul. Przykładowa 123, 00-001 Warszawa</p>
            <p>NIP: 1234567890</p>
            <p>Tel: +48 123 456 789</p>
            <p>Email: info@kingbrand.pl</p>
        </div>
        
        <div class="invoice-info">
            <p><strong>Data wystawienia:</strong> ${orderDate}</p>
            <p><strong>Data sprzedaży:</strong> ${orderDate}</p>
            <p><strong>Numer zamówienia:</strong> ${order.number}</p>
        </div>
        
        <div class="clear"></div>
        
        <div class="customer-info">
            <h3>Dane nabywcy:</h3>
            <p><strong>${order.billing.first_name} ${order.billing.last_name}</strong></p>
            <p>${order.billing.address_1}</p>
            <p>${order.billing.postcode} ${order.billing.city}</p>
            <p>Email: ${order.billing.email}</p>
            <p>Tel: ${order.billing.phone}</p>
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>Nazwa produktu</th>
                    <th style="text-align: center;">Ilość</th>
                    <th style="text-align: right;">Cena</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <div class="totals">
            <div class="total-row">
                <span>Wartość netto:</span>
                <span>${parseFloat(order.total).toFixed(2)} zł</span>
            </div>
            <div class="total-row">
                <span>Dostawa:</span>
                <span>0.00 zł</span>
            </div>
            <div class="total-row">
                <span>VAT:</span>
                <span>0.00 zł</span>
            </div>
            <div class="total-row total-final">
                <span>RAZEM:</span>
                <span>${parseFloat(order.total).toFixed(2)} zł</span>
            </div>
        </div>
        
        <div class="clear"></div>
        
        <div class="footer">
            <p>Płatność: ${order.payment_method_title}</p>
            <p>Dziękujemy za zakupy w KingBrand!</p>
        </div>
    </body>
    </html>
  `;
}

async function handleOrderTracking(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('order_id');
  
  if (!orderId) {
    return NextResponse.json(
      { success: false, error: 'Order ID jest wymagany' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Fetching tracking for order:', orderId);
    
    // Call WordPress custom API
    const trackingUrl = `${WORDPRESS_URL}/wp-json/custom/v1/tracking/${orderId}`;
    
    const response = await fetch(trackingUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HeadlessWoo/1.0)',
      },
    });

    const raw = await response.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* not json */ }
    if (!response.ok) {
      const msg = (data && (data.error || data.message)) || raw || 'Błąd pobierania śledzenia';
      return NextResponse.json({ success: false, error: String(msg).slice(0, 1000) }, { status: response.status || 502 });
    }

    if (!data) {
      return NextResponse.json({ success: true, tracking: {} });
    }
    
    console.log('✅ Successfully fetched tracking for order:', orderId);
    
    return NextResponse.json({
      success: true,
      tracking: data.tracking || {}
    });

  } catch (error) {
    console.error('🚨 Error fetching order tracking:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Nie udało się pobrać informacji o śledzeniu'
    }, { status: 500 });
  }
}

async function handleCustomerProfileUpdate(body: any) {
  console.log('🔍 handleCustomerProfileUpdate received body:', JSON.stringify(body, null, 2));
  
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    console.error('❌ Validation failed:', parsed.error.issues);
    console.error('❌ Validation errors:', JSON.stringify(parsed.error.issues, null, 2));
    return NextResponse.json(
      { 
        success: false, 
        error: parsed.error.issues[0]?.message || 'Nieprawidłowe dane',
        details: parsed.error.issues.map((issue: any) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      },
      { status: 400 }
    );
  }
  const { customer_id, profile_data } = parsed.data;

  if (!customer_id || !profile_data) {
    return NextResponse.json(
      { success: false, error: 'Customer ID i dane profilu są wymagane' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Updating customer profile:', customer_id);
    
    // 1) Update via custom WP endpoint (best-effort)
    let customerFromCustom: any = null;
    try {
      const updateUrl = `${WORDPRESS_URL}/wp-json/custom/v1/customer/update-profile`;
      const response = await fetch(updateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; HeadlessWoo/1.0)',
        },
        body: JSON.stringify({
          customer_id: customer_id,
          profile_data: profile_data
        }),
      });
      const raw = await response.text();
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { /* not json */ }
      if (response.ok && data && data.success) {
        customerFromCustom = data.customer || null;
      } else {
        console.log('ℹ️ Custom update-profile did not return success, continuing with Woo update');
      }
    } catch {
      console.log('ℹ️ Custom update-profile call failed, continuing with Woo update');
    }

    // 2) Ensure persistence in WooCommerce via REST API (PATCH customers/{id})
    if (!WC_URL || !CK || !CS) {
      return NextResponse.json({ success: false, error: 'Brak konfiguracji WooCommerce API' }, { status: 500 });
    }

    const wooPayload: Record<string, any> = {
      first_name: profile_data.firstName,
      last_name: profile_data.lastName,
      billing: {
        first_name: profile_data.firstName,
        last_name: profile_data.lastName,
        company: profile_data.billing?.company || '',
        phone: profile_data.billing?.phone || '',
        address_1: profile_data.billing?.address || '',
        city: profile_data.billing?.city || '',
        postcode: profile_data.billing?.postcode || '',
        country: profile_data.billing?.country || 'PL',
        email: undefined,
      },
      // Only include shipping if it's provided (not null)
      ...(profile_data.shipping ? {
        shipping: {
          first_name: profile_data.firstName,
          last_name: profile_data.lastName,
          company: profile_data.shipping.company || '',
          address_1: profile_data.shipping.address || '',
          city: profile_data.shipping.city || '',
          postcode: profile_data.shipping.postcode || '',
          country: profile_data.shipping.country || 'PL',
        }
      } : {}),
      meta_data: [] as Array<{ key: string; value: string }>,
    };

    const nip = profile_data.billing?.nip;
    const invoiceReq = profile_data.billing?.invoiceRequest;
    if (nip !== undefined) {
      wooPayload.meta_data.push({ key: '_billing_nip', value: String(nip) });
    }
    if (invoiceReq !== undefined) {
      wooPayload.meta_data.push({ key: '_invoice_request', value: invoiceReq ? 'yes' : 'no' });
    }

    const wooUrl = `${WC_URL}/customers/${customer_id}?consumer_key=${CK}&consumer_secret=${CS}`;
    const wooResp = await fetch(wooUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HeadlessWoo/1.0)',
      },
      body: JSON.stringify(wooPayload),
    });

    const wooRaw = await wooResp.text();
    let wooData: any = null;
    try { wooData = wooRaw ? JSON.parse(wooRaw) : null; } catch { /* not json */ }
    if (!wooResp.ok) {
      const msg = (wooData && (wooData.error || wooData.message)) || wooRaw || 'Błąd aktualizacji klienta w WooCommerce';
      return NextResponse.json({ success: false, error: String(msg).slice(0, 1000) }, { status: wooResp.status || 502 });
    }

    console.log('✅ WooCommerce customer updated:', customer_id);

    // Merge best available customer data
    const mergedCustomer = customerFromCustom || wooData;
    return NextResponse.json({
      success: true,
      message: 'Profil został zaktualizowany',
      customer: mergedCustomer,
    });

  } catch (error: any) {
    console.error('🚨 Error updating customer profile:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Nie udało się zaktualizować profilu'
    }, { status: 500 });
  }
}

async function handleCustomerPasswordChange(body: any) {
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || 'Nieprawidłowe dane' },
      { status: 400 }
    );
  }
  const { customer_id, current_password, new_password } = parsed.data;

  if (!customer_id || !current_password || !new_password) {
    return NextResponse.json(
      { success: false, error: 'Wszystkie pola są wymagane' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Changing customer password:', customer_id);
    
    // Call WordPress custom API
    const changePasswordUrl = `${WORDPRESS_URL}/wp-json/custom/v1/customer/change-password`;
    
    const response = await fetch(changePasswordUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HeadlessWoo/1.0)',
      },
      body: JSON.stringify({
        customer_id: customer_id,
        current_password: current_password,
        new_password: new_password
      }),
    });

    const raw = await response.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* not json */ }
    if (!response.ok) {
      const msg = response.status === 404
        ? 'Funkcja zmiany hasła nie jest jeszcze dostępna. Skontaktuj się z administratorem.'
        : (data && (data.error || data.message)) || raw || 'Błąd zmiany hasła';
      return NextResponse.json({ success: false, error: String(msg).slice(0, 1000) }, { status: response.status || 502 });
    }

    if (!data) {
      return NextResponse.json({ success: true, message: 'Hasło zostało zmienione' });
    }
    
    console.log('✅ Successfully changed customer password:', customer_id);
    
    return NextResponse.json({
      success: true,
      message: data.message
    });

  } catch (error: any) {
    console.error('🚨 Error changing customer password:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Nie udało się zmienić hasła'
    }, { status: 500 });
  }
}

async function _handleOrderCreation(body: any) {
  const { 
    billing, 
    shipping, 
    line_items, 
    payment_method, 
    payment_method_title,
    shipping_lines,
    customer_id,
    coupon_lines,
    meta_data
  } = body;

  if (!billing || !line_items || !payment_method) {
    return NextResponse.json(
      { success: false, error: 'Brakuje wymaganych danych zamówienia' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Creating order in WooCommerce');
    console.log('🎫 Coupon lines received:', coupon_lines);
    
    // Prepare order data for WooCommerce
    const orderData: any = {
      payment_method: payment_method,
      payment_method_title: payment_method_title || payment_method,
      set_paid: false, // Will be set to true after payment confirmation
      customer_id: customer_id,
      billing: {
        first_name: billing.firstName,
        last_name: billing.lastName,
        email: billing.email,
        phone: billing.phone,
        company: billing.company || '',
        address_1: billing.address,
        city: billing.city,
        state: '',
        postcode: billing.postcode,
        country: billing.country || 'PL'
      },
      shipping: shipping ? {
        first_name: shipping.firstName,
        last_name: shipping.lastName,
        company: shipping.company || '',
        address_1: shipping.address,
        city: shipping.city,
        state: '',
        postcode: shipping.postcode,
        country: shipping.country || 'PL'
      } : {
        first_name: billing.firstName,
        last_name: billing.lastName,
        company: billing.company || '',
        address_1: billing.address,
        city: billing.city,
        state: '',
        postcode: billing.postcode,
        country: billing.country || 'PL'
      },
      line_items: line_items.map((item: any) => ({
        product_id: item.product_id,
        variation_id: item.variation_id || 0,
        quantity: item.quantity,
        meta_data: item.meta_data || []
      })),
      shipping_lines: shipping_lines || [],
      coupon_lines: coupon_lines || [],
      meta_data: [
        ...(meta_data || []),
        { key: '_created_via', value: 'headless-woo' },
        { key: '_order_version', value: '1.0.0' }
      ]
    };


    // Create order via WooCommerce REST API
    const orderUrl = `${WC_URL}/orders?consumer_key=${CK}&consumer_secret=${CS}`;
    
    const response = await fetch(orderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HeadlessWoo/1.0)',
      },
      body: JSON.stringify(orderData),
    });

    const raw = await response.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* not json */ }
    
    if (!response.ok) {
      const msg = (data && (data.message || data.error)) || raw || 'Błąd tworzenia zamówienia';
      return NextResponse.json({ 
        success: false, 
        error: String(msg).slice(0, 1000) 
      }, { status: response.status || 502 });
    }

    if (!data) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nie udało się utworzyć zamówienia' 
      }, { status: 500 });
    }
    
    console.log('✅ Successfully created order:', data.id);
    
    // Trigger WooCommerce emails after order creation
    // IMPORTANT: WooCommerce does NOT automatically send emails for REST API orders
    // We MUST manually trigger emails, especially for "pending" status (COD, bank transfer)
    try {
      console.log('📧 Triggering WooCommerce emails for order:', data.id);
      
      // Use our custom email API endpoint
      const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || WC_URL?.replace('/wp-json/wc/v3', '') || '';
      if (!wordpressUrl) {
        console.warn('⚠️ WordPress URL not configured, cannot trigger emails');
      } else {
        const emailApiUrl = `${wordpressUrl}/wp-json/king-email/v1/trigger-order-email`;
        const emailResponse = await fetch(emailApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            order_id: data.id
          }),
        });
        
        if (emailResponse.ok) {
          const emailResult = await emailResponse.json();
          console.log('✅ Email triggered via API:', emailResult);
        } else {
          const errorText = await emailResponse.text().catch(() => 'Unknown error');
          console.warn('⚠️ Failed to trigger email via API:', emailResponse.status, errorText);
        }
      }
    } catch (emailError) {
      console.error('❌ Error triggering emails:', emailError);
      // Don't fail order creation if email fails
    }
    
    return NextResponse.json({
      success: true,
      order: {
        id: data.id,
        number: data.number,
        status: data.status,
        total: data.total,
        currency: data.currency,
        payment_url: data.payment_url,
        checkout_payment_url: data.checkout_payment_url,
        date_created: data.date_created,
        billing: data.billing,
        shipping: data.shipping,
        line_items: data.line_items
      }
    });

  } catch (error: any) {
    console.error('🚨 Error creating order:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Nie udało się utworzyć zamówienia'
    }, { status: 500 });
  }
}

// Handle attribute terms endpoint - PRO Architecture: Get terms for specific attribute
async function handleAttributeTermsEndpoint(req: NextRequest, endpoint: string) {
  const { searchParams } = new URL(req.url);
  
  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { error: 'Błąd konfiguracji serwera', details: 'Brakuje zmiennych środowiskowych WooCommerce' },
      { status: 500 }
    );
  }

  try {
    // Extract attribute slug from endpoint (e.g., "attributes/pa_marka/terms" -> "pa_marka")
    const attributeSlug = endpoint.split('/')[1];
    
    // Call WooCommerce Store API for attribute terms (public API)
    const termsUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wc/store/v1/products/attributes/${attributeSlug}/terms?${searchParams.toString()}`;
    
    console.log('🏷️ Attribute terms endpoint - calling WooCommerce Store API:', termsUrl);
    
    const response = await fetch(termsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Filler-Store/1.0'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('❌ WooCommerce API error for attribute terms:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Błąd pobierania termów atrybutu', details: response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('✅ Attribute terms received from WooCommerce:', {
      attribute: attributeSlug,
      terms_count: Array.isArray(data) ? data.length : 0
    });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=900",
        "X-Cache": "MISS",
      },
    });

  } catch (error: any) {
    console.error('❌ Error in handleAttributeTermsEndpoint:', error);
    return NextResponse.json(
      { error: 'Błąd serwera', details: error.message },
      { status: 500 }
    );
  }
}

// Handle attributes endpoint - PRO Architecture: Dynamic attributes based on filters
async function handleAttributesEndpoint(req: NextRequest, requestId?: string) {
  const { searchParams } = new URL(req.url);
  
  // Check WordPress URL first - if not set, return empty data instead of error
  if (!WORDPRESS_URL) {
    console.warn('⚠️ WORDPRESS_URL is not defined, returning empty attributes');
    const response = NextResponse.json(
      { 
        attributes: {},
        total_products: 0
      },
      { status: 200 }
    );
    if (requestId) setRequestIdHeader(response, requestId);
    return response;
  }

  try {
    // PRO Architecture: WordPress robi całe filtrowanie atrybutów
    const attributesUrl = `${WORDPRESS_URL}/wp-json/king-shop/v1/attributes?${searchParams.toString()}`;
    
    console.log('🏷️ Attributes endpoint - calling King Shop API:', attributesUrl);
    console.log('🔍 WordPress URL:', WORDPRESS_URL);
    
    // Try King Shop API first
    let response;
    try {
      response = await fetch(attributesUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Filler-Store/1.0'
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (primaryError) {
      console.log('⚠️ King Shop API failed, trying Store API fallback:', primaryError);
      
      // Try Store API as fallback
      const storeAttributesUrl = `${WORDPRESS_URL}/wp-json/wc/store/v1/products/attributes`;
      const storeResponse = await fetch(storeAttributesUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Filler-Store/1.0'
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      });
      
      if (storeResponse.ok) {
        const storeData = await storeResponse.json();
        // Normalize Store API response to match expected format
        const normalized = {
          attributes: Array.isArray(storeData) ? storeData.reduce((acc: any, attr: any) => {
            acc[attr.slug] = {
              id: attr.id,
              name: attr.name,
              slug: attr.slug,
              terms: []
            };
            return acc;
          }, {}) : {},
          total_products: 0
        };
        
        console.log('✅ Attributes from Store API fallback:', {
          attributes: Object.keys(normalized.attributes).length
        });
        
        const fallbackResponse = NextResponse.json(normalized, {
          status: 200,
          headers: {
            "content-type": "application/json",
            "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
            "X-Cache": "MISS-FALLBACK",
          },
        });
        if (requestId) setRequestIdHeader(fallbackResponse, requestId);
        return fallbackResponse;
      }
      
      // If both fail, throw the original error
      throw primaryError;
    }

    console.log('🔍 King Shop API response status:', response.status);

    const data = await response.json();
    
    console.log('✅ Attributes data received from WordPress:', {
      attributes: data.attributes ? Object.keys(data.attributes).length : 0,
      total_products: data.total_products || 0
    });

    // WordPress zrobił całe filtrowanie - zwracamy dane jak są
    const successResponse = NextResponse.json(data, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
        "X-Cache": "MISS",
      },
    });
    if (requestId) setRequestIdHeader(successResponse, requestId);
    return successResponse;

  } catch (error) {
    console.error('❌ Attributes endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
    
    // Log detailed error for debugging
    console.error('❌ Attributes endpoint error details:', {
      message: errorMessage,
      WORDPRESS_URL: WORDPRESS_URL ? 'SET' : 'NOT SET',
      errorType: error?.constructor?.name
    });
    
    // Return empty attributes as fallback instead of error
    const fallbackResponse = NextResponse.json(
      { 
        attributes: {},
        total_products: 0
      },
      { status: 200 }
    );
    if (requestId) setRequestIdHeader(fallbackResponse, requestId);
    return fallbackResponse;
  }
}

// Handle products/categories endpoint
async function handleProductsCategoriesEndpoint(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { error: 'Błąd konfiguracji serwera', details: 'Brakuje zmiennych środowiskowych WooCommerce' },
      { status: 500 }
    );
  }

  try {
    // Ensure smaller payload if client did not specify fields
    if (!searchParams.has('_fields')) {
      searchParams.set('_fields', 'id,name,slug,display,image,parent,menu_order,count');
    }
    const categoriesUrl = `${WC_URL}/products/categories?consumer_key=${CK}&consumer_secret=${CS}&${searchParams.toString()}`;

    console.log('📂 Products categories endpoint - calling WooCommerce API:', categoriesUrl);
    
    // Retry logic (2 attempts) for Woo API
    let wcResp: Response | null = null;
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        wcResp = await fetch(categoriesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Filler-Store/1.0'
      },
      cache: 'no-store'
    });
        if (wcResp.ok) break;
        console.log(`⚠️ Woo categories HTTP ${wcResp.status}, attempt ${attempt}`);
        if (attempt < 2) await new Promise(r => setTimeout(r, attempt * 500));
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await new Promise(r => setTimeout(r, attempt * 500));
      }
    }

    if (wcResp && wcResp.ok) {
      const data = await wcResp.json();
      console.log('✅ Categories received from WooCommerce:', { categories_count: Array.isArray(data) ? data.length : 0 });
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=900",
        "X-Cache": "MISS",
      },
    });
    }

    // Fallback to Store API (public)
    const perPage = searchParams.get('per_page') || '100';
    const storeUrl = `${WORDPRESS_URL}/wp-json/wc/store/v1/products/categories?per_page=${encodeURIComponent(perPage)}`;
    console.log('📂 Fallback to Store API for categories:', storeUrl);
    const storeResp = await fetch(storeUrl, {
      headers: { Accept: 'application/json', 'User-Agent': 'Filler-Store/1.0' },
      cache: 'no-store'
    });
    if (storeResp.ok) {
      const arr = await storeResp.json();
      // Normalize to WC v3-like minimal fields
      const mapped = Array.isArray(arr) ? arr.map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        parent: c.parent || 0,
        count: c.count || 0,
        image: c.image || null,
        display: c.display || 'default',
        menu_order: c.menu_order || 0,
      })) : [];
      console.log('✅ Categories from Store API:', { categories_count: mapped.length });
      return NextResponse.json(mapped, {
        status: 200,
        headers: {
          "content-type": "application/json",
          "Cache-Control": "public, max-age=120, s-maxage=300, stale-while-revalidate=900",
          "X-Cache": "MISS-FALLBACK",
        },
      });
    }

    console.error('❌ Both WC and Store API failed for categories');
    return NextResponse.json(
      { error: 'Błąd pobierania kategorii', details: (wcResp && !wcResp.ok) ? wcResp.statusText : (lastErr?.message || 'Unknown') },
      { status: (wcResp && !wcResp.ok) ? wcResp.status : 502 }
    );

  } catch (error: any) {
    console.error('❌ Error in handleProductsCategoriesEndpoint:', error);
    return NextResponse.json(
      { error: 'Błąd serwera', details: error.message },
      { status: 500 }
    );
  }
}

// Handle products/attributes endpoint
async function handleProductsAttributesEndpoint(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { error: 'Błąd konfiguracji serwera', details: 'Brakuje zmiennych środowiskowych WooCommerce' },
      { status: 500 }
    );
  }

  try {
    // Ensure smaller payload if client did not specify fields
    if (!searchParams.has('_fields')) {
      searchParams.set('_fields', 'id,name,slug,has_archives');
    }
    const attributesUrl = `${WC_URL}/products/attributes?consumer_key=${CK}&consumer_secret=${CS}&${searchParams.toString()}`;

    console.log('🏷️ Products attributes endpoint - calling WooCommerce API:', attributesUrl);
    
    const response = await fetch(attributesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Filler-Store/1.0'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('❌ WooCommerce API error for attributes:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Błąd pobierania atrybutów', details: response.statusText },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('✅ Attributes received from WooCommerce:', {
      attributes_count: Array.isArray(data) ? data.length : 0
    });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=900",
        "X-Cache": "MISS",
      },
    });

  } catch (error: any) {
    console.error('❌ Error in handleProductsAttributesEndpoint:', error);
    return NextResponse.json(
      { error: 'Błąd serwera', details: error.message },
      { status: 500 }
    );
  }
}

// Handle shop endpoint - PRO Architecture: WordPress robi całe filtrowanie
async function handleShopEndpoint(req: NextRequest, requestId?: string) {
  const { searchParams } = new URL(req.url);
  
  // Check WordPress URL first - if not set, return empty data instead of error
  if (!WORDPRESS_URL) {
    console.warn('⚠️ WORDPRESS_URL is not defined, returning empty shop data');
    const response = NextResponse.json(
      { 
        products: [],
        total: 0,
        categories: [],
        attributes: {}
      },
      { status: 200 }
    );
    if (requestId) setRequestIdHeader(response, requestId);
    return response;
  }

  try {
    // PRO Architecture: WordPress robi całe filtrowanie
    // Next.js tylko przekazuje parametry i cache'uje odpowiedź
    
    // Remove 'endpoint' from searchParams to avoid duplicate
    const cleanParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        cleanParams.append(key, value);
      }
    });
    
    const shopUrl = `${WORDPRESS_URL}/wp-json/king-shop/v1/data?endpoint=shop&${cleanParams.toString()}`;
    
      console.log('🛍️ Shop endpoint - calling King Shop API:', shopUrl);
      console.log('🔍 WordPress URL:', WORDPRESS_URL);
    
    // Try King Shop API first
    let wpResponse;
    try {
      wpResponse = await fetch(shopUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Filler-Store/1.0'
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      });
      
      if (!wpResponse.ok) {
        throw new Error(`HTTP ${wpResponse.status}: ${wpResponse.statusText}`);
      }
    } catch (primaryError) {
      console.log('⚠️ King Shop API failed, trying Store API fallback:', primaryError);
      
      // Try Store API as fallback - get products and basic data
      const perPage = cleanParams.get('per_page') || '24';
      const page = cleanParams.get('page') || '1';
      const storeProductsUrl = `${WORDPRESS_URL}/wp-json/wc/store/v1/products?per_page=${perPage}&page=${page}`;
      
      const storeResponse = await fetch(storeProductsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Filler-Store/1.0'
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      });
      
      if (storeResponse.ok) {
        const storeProducts = await storeResponse.json();
        // Normalize Store API response to match expected format
        const normalized = {
          products: Array.isArray(storeProducts) ? storeProducts.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.prices?.price || p.price || '0',
            regular_price: p.prices?.regular_price || p.regular_price || '0',
            sale_price: p.prices?.sale_price || p.sale_price || '',
            images: p.images || [],
            stock_status: p.stock_status || 'instock',
            categories: p.categories || [],
            attributes: p.attributes || [],
          })) : [],
          total: Array.isArray(storeProducts) ? storeProducts.length : 0,
          categories: [],
          attributes: {}
        };
        
        console.log('✅ Shop data from Store API fallback:', {
          products: normalized.products.length,
          total: normalized.total
        });
        
        const fallbackResponse = NextResponse.json(normalized, {
          status: 200,
          headers: {
            "content-type": "application/json",
            "Cache-Control": "public, max-age=60, s-maxage=180, stale-while-revalidate=300",
            "X-Cache": "MISS-FALLBACK",
            "CDN-Cache-Control": "public, max-age=180",
          },
        });
        if (requestId) setRequestIdHeader(fallbackResponse, requestId);
        
        // Cache response dla request deduplication
        const shopCacheKey = getCacheKey(req);
        cleanupOldCache();
        requestCache.set(shopCacheKey, {
          data: normalized,
          timestamp: Date.now(),
          headers: fallbackResponse.headers,
        });
        
        return fallbackResponse;
      }
      
      // If both fail, throw the original error
      throw primaryError;
    }

    console.log('🔍 King Shop API response status:', wpResponse.status);

    const data = await wpResponse.json();
    
      console.log('✅ Shop data received from WordPress:', {
        products: data.products?.length || 0,
        total: data.total,
        categories: data.categories?.length || 0,
        attributes: data.attributes ? Object.keys(data.attributes).length : 0
      });

    // WordPress zrobił całe filtrowanie - zwracamy dane jak są
    // 🚀 OPTIMIZATION: Agresywniejsze cache headers dla lepszej wydajności
    const nextResponse = NextResponse.json(data, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=180, stale-while-revalidate=300",
        "X-Cache": "MISS",
        "CDN-Cache-Control": "public, max-age=180",
      },
    });
    if (requestId) setRequestIdHeader(nextResponse, requestId);

    // 🚀 PRIORITY 2: Cache response dla request deduplication (tylko dla shop endpoint)
    const shopCacheKey = getCacheKey(req);
    cleanupOldCache();
    requestCache.set(shopCacheKey, {
      data,
      timestamp: Date.now(),
      headers: nextResponse.headers,
    });

    return nextResponse;

  } catch (error) {
    console.error('❌ Shop endpoint error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
    
    // Log detailed error for debugging
    console.error('❌ Shop endpoint error details:', {
      message: errorMessage,
      WORDPRESS_URL: WORDPRESS_URL ? 'SET' : 'NOT SET',
      errorType: error?.constructor?.name
    });
    
    // Return empty shop data as fallback instead of error
    const fallbackResponse = NextResponse.json(
      { 
        products: [],
        total: 0,
        categories: [],
        attributes: {}
      },
      { status: 200 }
    );
    if (requestId) setRequestIdHeader(fallbackResponse, requestId);
    return fallbackResponse;
  }
}

// Handle shipping methods endpoint
async function handleShippingMethods(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") || "PL";
  const state = searchParams.get("state") || "";
  const city = searchParams.get("city") || "";
  const postcode = searchParams.get("postcode") || "";
  
  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { error: 'Błąd konfiguracji serwera', details: 'Brakuje zmiennych środowiskowych WooCommerce' },
      { status: 500 }
    );
  }

  try {
    // Get shipping zones and methods from WooCommerce
    const shippingZonesUrl = `${WC_URL}/shipping/zones?consumer_key=${CK}&consumer_secret=${CS}`;
    const zonesResponse = await fetch(shippingZonesUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Filler-Store/1.0'
      }
    });
    
    if (!zonesResponse.ok) {
      throw new Error(`Nie udało się pobrać stref wysyłki: ${zonesResponse.status}`);
    }
    
    // Harden against HTML/non-JSON responses
    const zonesText = await zonesResponse.text();
    let zonesParsed: Array<{ id: number; name: string }>; 
    try {
      zonesParsed = JSON.parse(zonesText);
    } catch {
      console.error('Shipping zones returned non-JSON (truncated):', zonesText.substring(0, 200));
      zonesParsed = [] as any;
    }
    const zones = Array.isArray(zonesParsed) ? zonesParsed : [];
    
    // Get methods for each zone
    const shippingMethods: Array<{
      id: string;
      method_id: string;
      title: string;
      cost: string;
      zone_id: number;
      zone_name: string;
    }> = [];
    
    for (const zone of zones) {
      const methodsUrl = `${WC_URL}/shipping/zones/${zone.id}/methods?consumer_key=${CK}&consumer_secret=${CS}`;
      const methodsResponse = await fetch(methodsUrl);
      
      if (methodsResponse.ok) {
        const responseText = await methodsResponse.text();
        let methods: Array<{
          id: string;
          method_id: string;
          title: string;
          cost: string;
          enabled: boolean;
        }> = [];
        
        // Prefer native JSON parsing first
        try {
          methods = await JSON.parse(responseText);
        } catch {
          // If parsing fails due to raw HTML inside fields (e.g. method_description),
          // sanitize the payload by stripping HTML-bearing properties before parsing again.
          try {
            const sanitized = responseText
              // Remove/empty method_description HTML blobs that can break JSON
              .replace(/"method_description"\s*:\s*"[\s\S]*?"(?=,|\}|\])/g, '"method_description":""')
              // Ensure method_title is a flat string (strip tags if any)
              .replace(/"method_title"\s*:\s*"([\s\S]*?)"/g, (_m, g1) => {
                const clean = String(g1).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                return `"method_title":"${clean}"`;
              });
            methods = JSON.parse(sanitized);
          } catch (error) {
            console.error('Nie udało się bezpiecznie sparsować metod wysyłki:', error);
            console.log('Response text (truncated):', responseText.substring(0, 200));
            methods = [];
          }
        }
        for (const method of methods) {
          if (method.enabled) {
            shippingMethods.push({
              id: method.id,
              method_id: method.method_id,
              title: method.title,
              cost: method.cost || '0',
              zone_id: zone.id,
              zone_name: zone.name,
              // Additional properties for internal use
              method_title: (method as Record<string, unknown>).method_title as string || method.title,
              method_description: (method as Record<string, unknown>).method_description as string || '',
              settings: (method as Record<string, unknown>).settings as Record<string, unknown> || {},
              zone_locations: (zone as Record<string, unknown>).locations as unknown[] || []
            } as WooShippingMethod);
          }
        }
      }
    }
    
    // Process and normalize shipping methods (same logic as in service)
    const processedMethods = shippingMethods.map((method: Record<string, unknown>) => {
      let cost = 0;
      let freeShippingThreshold = 0;
      
      // Handle Flexible Shipping methods
      if (method.method_id === 'flexible_shipping_single') {
        const settings = method.settings || {};
        
        // Get free shipping threshold
        if ((settings as any).method_free_shipping && (settings as any).method_free_shipping.value) {
          freeShippingThreshold = parseFloat((settings as any).method_free_shipping.value); // Keep as PLN, not cents
        }
        
        // Get cost from rules
        if ((settings as any).method_rules && (settings as any).method_rules.value && (settings as any).method_rules.value.length > 0) {
          const rules = (settings as any).method_rules.value;
          // Find the rule that applies (usually the first one)
          if (rules[0] && rules[0].cost_per_order) {
            cost = parseFloat(rules[0].cost_per_order); // Keep as PLN, not cents
          }
        }
      }
      // Handle Flat Rate methods
      else if (method.method_id === 'flat_rate') {
        const settings = method.settings || {};
        if ((settings as any).cost && (settings as any).cost.value) {
          cost = parseFloat((settings as any).cost.value); // Keep as PLN, not cents
        }
      }
      
      // Clean HTML from description
      const cleanDescription = (desc: string) => {
        if (!desc) return '';
        // Remove HTML tags and decode entities
        return desc
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&rarr;/g, '→') // Decode arrow
          .replace(/&nbsp;/g, ' ') // Decode non-breaking space
          .replace(/&amp;/g, '&') // Decode ampersand
          .replace(/&lt;/g, '<') // Decode less than
          .replace(/&gt;/g, '>') // Decode greater than
          .replace(/&quot;/g, '"') // Decode quote
          .trim();
      };

      return {
        id: method.id,
        method_id: method.method_id,
        method_title: (method.settings as any)?.method_title?.value || method.method_title,
        method_description: cleanDescription((method.settings as any)?.method_description?.value || method.method_description),
        cost: cost,
        free_shipping_threshold: freeShippingThreshold,
        zone_id: method.zone_id,
        zone_name: method.zone_name,
        settings: method.settings
      };
    });

    // Fallback: if no methods found, provide sensible defaults so checkout remains usable
    const methodsOut = Array.isArray(processedMethods) && processedMethods.length > 0
      ? processedMethods
      : [
          {
            id: 'free_shipping_default',
            method_id: 'free_shipping',
            method_title: 'Darmowa dostawa',
            method_description: '',
            cost: 0,
            free_shipping_threshold: 0,
            zone_id: 0,
            zone_name: 'Domyślna',
            settings: {}
          },
          {
            id: 'flat_rate_default',
            method_id: 'flat_rate',
            method_title: 'Dostawa standardowa',
            method_description: '',
            cost: 15,
            free_shipping_threshold: 0,
            zone_id: 0,
            zone_name: 'Domyślna',
            settings: {}
          },
          {
            id: 'local_pickup_default',
            method_id: 'local_pickup',
            method_title: 'Odbiór osobisty',
            method_description: '',
            cost: 0,
            free_shipping_threshold: 0,
            zone_id: 0,
            zone_name: 'Domyślna',
            settings: {}
          }
        ];

    return NextResponse.json({
      success: true,
      shipping_methods: methodsOut,
      country,
      state,
      city,
      postcode
    });
    
  } catch (error: unknown) {
    console.error('Shipping methods API error:', error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać metod wysyłki', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Handle payment gateways endpoint
async function handlePaymentGateways(req: NextRequest) {
  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { error: 'Błąd konfiguracji serwera', details: 'Brakuje zmiennych środowiskowych WooCommerce' },
      { status: 500 }
    );
  }

  try {
    const gatewaysUrl = `${WC_URL}/payment_gateways?consumer_key=${CK}&consumer_secret=${CS}`;
    const response = await fetch(gatewaysUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Filler-Store/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nie udało się pobrać metod płatności: ${response.status}`);
    }

    const gatewaysText = await response.text();
    let gateways: Array<{
      id: string;
      title: string;
      description?: string;
      enabled: boolean;
    }> = [];

    try {
      const parsed = JSON.parse(gatewaysText);
      gateways = Array.isArray(parsed)
        ? parsed.map((gateway: Record<string, unknown>) => ({
            id: String(gateway.id ?? ''),
            title: typeof gateway.title === 'string' ? gateway.title : String(gateway.id ?? ''),
            description: typeof gateway.description === 'string' ? gateway.description : undefined,
            enabled: gateway.enabled === true || gateway.enabled === 'yes',
          }))
        : [];
    } catch {
      console.error('Nie udało się sparsować metod płatności');
      gateways = [];
    }

    // Filter only enabled gateways and normalize
    const enabledGateways = gateways
      .filter(g => g.enabled)
      .map(g => ({
        id: g.id,
        title: g.title || g.id,
        description: g.description || '',
        enabled: true
      }));

    // Fallback gateways if none found
    const gatewaysOut = enabledGateways.length > 0
      ? enabledGateways
      : [
          { id: 'bacs', title: 'Przelew bankowy', description: 'Bezpośredni przelew na nasze konto', enabled: true },
          { id: 'cod', title: 'Płatność przy odbiorze', description: 'Płatność gotówką przy odbiorze', enabled: true }
        ];

    return NextResponse.json({
      success: true,
      gateways: gatewaysOut
    });

  } catch (error: unknown) {
    console.error('Payment gateways API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Nie udało się pobrać metod płatności', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

async function handleCoupons(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    
    if (!WC_URL || !CK || !CS) {
      return NextResponse.json({ error: 'Brak konfiguracji WooCommerce' }, { status: 500 });
    }

    // If specific code requested, validate it
    if (code) {
      const response = await fetch(`${WC_URL}/coupons?code=${encodeURIComponent(code)}&status=active`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${CK}:${CS}`).toString('base64')}`,
        },
      });
      
      if (!response.ok) {
        return NextResponse.json({ error: 'Nieprawidłowy kod rabatowy' }, { status: 400, headers: { 'Cache-Control': 'public, max-age=60' } });
      }
      
      const coupons = await response.json();
      
      if (coupons.length === 0) {
        return NextResponse.json({ error: 'Nieprawidłowy kod rabatowy' }, { status: 400, headers: { 'Cache-Control': 'public, max-age=60' } });
      }
      
      const coupon = coupons[0];
      
      // Check if coupon is still valid
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return NextResponse.json({ error: 'Kod rabatowy został już wykorzystany' }, { status: 400, headers: { 'Cache-Control': 'public, max-age=60' } });
      }
      
      if (coupon.date_expires && new Date(coupon.date_expires) < new Date()) {
        return NextResponse.json({ error: 'Kod rabatowy wygasł' }, { status: 400, headers: { 'Cache-Control': 'public, max-age=60' } });
      }
      
      // Check per-user usage limit
      if (coupon.usage_limit_per_user && coupon.usage_limit_per_user > 0) {
        // For now, we'll rely on WooCommerce to enforce this when creating the order
        // The used_by array will be checked by WooCommerce API
        console.log('ℹ️ Coupon has per-user limit:', coupon.usage_limit_per_user);
      }
      
      return NextResponse.json({
        success: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discount_type: coupon.discount_type,
          amount: parseFloat(coupon.amount),
          minimum_amount: coupon.minimum_amount ? parseFloat(coupon.minimum_amount) : null,
          maximum_amount: coupon.maximum_amount ? parseFloat(coupon.maximum_amount) : null,
          usage_limit: coupon.usage_limit,
          usage_count: coupon.usage_count,
          date_expires: coupon.date_expires
        }
      }, { headers: { 'Cache-Control': 'public, max-age=60' } });
    }
    
    // Return all active coupons (for admin purposes)
    const response = await fetch(`${WC_URL}/coupons?status=active&_fields=id,code,discount_type,amount,minimum_amount,maximum_amount,usage_limit,usage_count,date_expires`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${CK}:${CS}`).toString('base64')}`,
      },
    });
    
    const coupons = await response.json();
    
    return NextResponse.json({
      success: true,
      coupons: coupons.map((coupon: any) => ({
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        amount: parseFloat(coupon.amount),
        minimum_amount: coupon.minimum_amount ? parseFloat(coupon.minimum_amount) : null,
        maximum_amount: coupon.maximum_amount ? parseFloat(coupon.maximum_amount) : null,
        usage_limit: coupon.usage_limit,
        usage_count: coupon.usage_count,
        date_expires: coupon.date_expires
      }))
    }, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=900' } });
    
  } catch (error: unknown) {
    console.error('Coupons API error:', error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać kuponów', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Helper to get client IP (using utility from middleware)
function getClientIPFromRequest(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  return 'unknown';
}

export async function GET(req: NextRequest) {
  // Generate/retrieve request ID for correlation
  const requestId = getRequestId(req);
  
  // Start Sentry span for performance monitoring (optional)
  let span: any = null;
  try {
    span = Sentry.startSpan(
      {
        name: `API ${req.method} ${req.nextUrl.pathname}`,
        op: 'http.server',
        attributes: {
          url: req.url,
          method: req.method,
          request_id: requestId,
        },
      },
      (span) => {
        Sentry.getCurrentScope().setTag('request_id', requestId);
        Sentry.getCurrentScope().setContext('request', {
          url: req.url,
          method: req.method,
          requestId,
        });
        return span;
      }
    );
  } catch (sentryError) {
    console.warn('Sentry initialization failed, continuing without it:', sentryError);
  }

  try {
    // 🚀 PRIORITY 2: Request deduplication - sprawdź cache przed wykonaniem
    const cacheKey = getCacheKey(req);
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < DEDUP_WINDOW) {
      // Return cached response with same headers
      const cachedResponse = NextResponse.json(cached.data, {
        status: 200,
        headers: {
          ...Object.fromEntries(cached.headers.entries()),
          'X-Cache': 'DEDUP',
        },
      });
      setRequestIdHeader(cachedResponse, requestId);
      if (span) {
        span.setAttribute('cache', 'dedup');
        span.end();
      }
      return cachedResponse;
    }

    debugLog('🔍 GET request received:', req.url);
    
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || "products";
    const bypassCache = searchParams.get("cache") === "off";

      if (span) {
        Sentry.getCurrentScope().setTag('endpoint', endpoint);
        span.setAttribute('endpoint', endpoint);
      }
    
    // Per-endpoint rate limiting
    const clientIp = getClientIPFromRequest(req);
    const path = req.nextUrl.pathname;
    let rateLimitResult: Awaited<ReturnType<typeof checkEndpointRateLimit>> | null = null;
    
    try {
      rateLimitResult = await checkEndpointRateLimit(path, clientIp, searchParams);
      
      if (!rateLimitResult.allowed) {
        debugLog(`⛔ Rate limit exceeded for ${endpoint}`, { ip: clientIp, remaining: rateLimitResult.remaining });
          if (span) {
            span.setAttribute('rate_limited', 'true');
            span.setStatus({ code: 8, message: 'resource_exhausted' }); // 8 = RESOURCE_EXHAUSTED
            span.end();
          }
        
        const { createErrorResponse } = await import('@/lib/errors');
        const response = createErrorResponse(
          new RateLimitError(
            `Rate limit exceeded for endpoint: ${endpoint}`,
            rateLimitResult.retryAfter
          ),
          { endpoint, method: 'GET', requestId }
        );
        setRequestIdHeader(response, requestId);
        return response;
      }
    } catch (error) {
      // If it's a RateLimitError, return it directly
      if (error instanceof RateLimitError) {
        if (span) {
          span.setStatus({ code: 8, message: 'resource_exhausted' });
          span.end();
        }
        const { createErrorResponse } = await import('@/lib/errors');
        const response = createErrorResponse(error, { endpoint, method: 'GET', requestId });
        setRequestIdHeader(response, requestId);
        return response;
      }
      // Otherwise, continue (might be a different error)
    }
    
    // Special endpoints routing (aliases and helpers)
    if (endpoint === 'attributes') {
      try {
        return await handleAttributesEndpoint(req, requestId);
      } catch (error) {
        console.error('❌ Error in handleAttributesEndpoint:', error);
          if (span) {
            span.setStatus({ code: 2, message: 'internal_error' }); // 2 = ERROR
            span.end();
          }
        const fallbackResponse = NextResponse.json(
          { attributes: {}, total_products: 0 },
          { status: 200 }
        );
        setRequestIdHeader(fallbackResponse, requestId);
        return fallbackResponse;
      }
    }
    if (endpoint === 'products/attributes') {
      return handleProductsAttributesEndpoint(req);
    }
    if (endpoint === 'products/categories' || endpoint.startsWith('products/categories')) {
      return handleProductsCategoriesEndpoint(req);
    }
    if (endpoint.startsWith('attributes/') && endpoint.endsWith('/terms')) {
      return handleAttributeTermsEndpoint(req, endpoint);
    }
    if (endpoint === 'shop') {
      try {
        return await handleShopEndpoint(req, requestId);
      } catch (error) {
        console.error('❌ Error in handleShopEndpoint:', error);
          if (span) {
            span.setStatus({ code: 2, message: 'internal_error' }); // 2 = ERROR
            span.end();
          }
        const fallbackResponse = NextResponse.json(
          { products: [], total: 0, categories: [], attributes: {} },
          { status: 200 }
        );
        setRequestIdHeader(fallbackResponse, requestId);
        return fallbackResponse;
      }
    }
    if (endpoint === 'shipping_methods') {
      try {
        return await handleShippingMethods(req);
      } catch (error) {
        console.error('❌ Error in handleShippingMethods:', error);
        if (span) {
          span.setStatus({ code: 2, message: 'internal_error' });
          span.end();
        }
        // Return fallback methods
        const fallbackResponse = NextResponse.json({
          success: true,
          shipping_methods: [
            {
              id: 'free_shipping_default',
              method_id: 'free_shipping',
              method_title: 'Darmowa dostawa',
              method_description: '',
              cost: 0,
              free_shipping_threshold: 0,
              zone_id: 0,
              zone_name: 'Domyślna',
              settings: {}
            }
          ]
        }, { status: 200 });
        setRequestIdHeader(fallbackResponse, requestId);
        return fallbackResponse;
      }
    }
    if (endpoint === 'payment_gateways') {
      try {
        return await handlePaymentGateways(req);
      } catch (error) {
        console.error('❌ Error in handlePaymentGateways:', error);
        if (span) {
          span.setStatus({ code: 2, message: 'internal_error' });
          span.end();
        }
        // Return fallback gateways
        const fallbackResponse = NextResponse.json({
          success: true,
          gateways: [
            { id: 'bacs', title: 'Przelew bankowy', description: 'Bezpośredni przelew na nasze konto', enabled: true },
            { id: 'cod', title: 'Płatność przy odbiorze', description: 'Płatność gotówką przy odbiorze', enabled: true }
          ]
        }, { status: 200 });
        setRequestIdHeader(fallbackResponse, requestId);
        return fallbackResponse;
      }
    }
    if (endpoint === 'customers/invoice-pdf') {
      try {
        return await handleCustomerInvoicePdf(req);
      } catch (error) {
        console.error('❌ Error in handleCustomerInvoicePdf:', error);
        if (span) {
          span.setStatus({ code: 2, message: 'internal_error' });
          span.end();
        }
        const errorResponse = NextResponse.json({
          success: false,
          error: 'Nie udało się wygenerować faktury PDF'
        }, { status: 500 });
        setRequestIdHeader(errorResponse, requestId);
        return errorResponse;
      }
    }

    // Cap per_page to avoid huge payloads
    if (endpoint === 'products') {
      const per = parseInt(searchParams.get('per_page') || '24');
      if (per > 24) searchParams.set('per_page', '24');
      // If searching by term, increase per_page to improve hit rate (cap at 100)
      if (searchParams.has('search')) {
        const current = parseInt(searchParams.get('per_page') || '0');
        const desired = Math.min(100, current || 100);
        searchParams.set('per_page', String(desired));
      }
    }
    if (endpoint === 'orders' || endpoint.startsWith('orders/')) {
      const per = parseInt(searchParams.get('per_page') || '20');
      if (per > 20) searchParams.set('per_page', '20');
    }

    // Handle conditional requests (If-None-Match)
    const ifNoneMatch = req.headers.get('if-none-match');

    // Fast slug mapping endpoint: endpoint=slug/{slug}
    if (endpoint.startsWith('slug/')) {
      const slug = endpoint.replace('slug/', '').trim();
      const key = `slug:${slug}`;
      try {
        const hit = await cache.get(key);
        if (hit) {
          if (span) {
            span.setStatus({ code: 1, message: 'ok' });
            span.setAttribute('cache_status', 'hit');
            span.end();
          }
          const response = new NextResponse(hit.body, {
            status: 200,
            headers: { 'content-type': 'application/json', ETag: hit.etag, 'Cache-Control': 'public, max-age=600' },
          });
          setRequestIdHeader(response, requestId);
          return response;
        }
        // If not in cache, try to resolve via products search
        const searchTerm = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const slugUrl = new URL(`${WC_URL.replace(/\/$/, '')}/products`);
        slugUrl.searchParams.set('search', searchTerm);
        slugUrl.searchParams.set('per_page', '100');
        slugUrl.searchParams.set('_fields', 'id,slug');
        slugUrl.searchParams.set('consumer_key', CK || '');
        slugUrl.searchParams.set('consumer_secret', CS || '');
        const r = await fetch(slugUrl.toString(), { headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!r.ok) {
          if (span) {
            span.setStatus({ code: 5, message: 'not_found' }); // 5 = NOT_FOUND
            span.end();
          }
          const response = NextResponse.json({ error: 'Lookup failed' }, { status: r.status });
          setRequestIdHeader(response, requestId);
          return response;
        }
        const arr = await r.json();
        const found = Array.isArray(arr) ? arr.find((p: any) => p.slug === slug) : null;
        const body = JSON.stringify(found ? { id: found.id, slug: found.slug } : { id: null, slug, error: 'not_found' });
        await cache.set(key, body, 600_000, {});
        if (span) {
          span.setStatus({ code: found ? 1 : 5, message: found ? 'ok' : 'not_found' });
          span.end();
        }
        const response = new NextResponse(body, {
          status: found ? 200 : 404,
          headers: { 'content-type': 'application/json', 'Cache-Control': 'public, max-age=600' },
        });
        setRequestIdHeader(response, requestId);
        return response;
      } catch (e) {
          if (span) {
            span.setStatus({ code: 2, message: 'internal_error' }); // 2 = ERROR
            span.end();
          }
        const response = NextResponse.json({ error: 'Lookup error', message: (e as Error).message }, { status: 500 });
        setRequestIdHeader(response, requestId);
        return response;
      }
    }

    // HPOS-optimized orders endpoints
    if (endpoint === 'orders' || (endpoint.startsWith('orders/') && !endpoint.includes('/notes') && !endpoint.includes('/refunds'))) {
      try {
        if (endpoint === 'orders') {
          // GET orders list - use hposApi.getOrders()
          const query: any = {};
          const customer = searchParams.get('customer');
          if (customer) query.customer = parseInt(customer);
          const status = searchParams.get('status');
          if (status) query.status = status;
          const page = searchParams.get('page');
          if (page) query.page = parseInt(page);
          const perPage = searchParams.get('per_page');
          if (perPage) {
            const per = parseInt(perPage);
            query.per_page = per > 20 ? 20 : per; // Cap at 20
          } else {
            query.per_page = 20;
          }
          const orderby = searchParams.get('orderby');
          if (orderby) query.orderby = orderby;
          const order = searchParams.get('order');
          if (order) query.order = order as 'asc' | 'desc';
          const after = searchParams.get('after');
          if (after) query.after = after;
          const before = searchParams.get('before');
          if (before) query.before = before;
          const search = searchParams.get('search');
          if (search) query.search = search;

          const orders = await hposApi.getOrders(query);
          
          // Build rate limit headers
          const rateLimitHeaders: Record<string, string> = {};
          if (rateLimitResult) {
            const limit = rateLimitResult.remaining + (rateLimitResult.allowed ? 1 : 0);
            rateLimitHeaders["X-RateLimit-Limit"] = String(limit);
            rateLimitHeaders["X-RateLimit-Remaining"] = String(rateLimitResult.remaining);
            rateLimitHeaders["X-RateLimit-Reset"] = String(Math.ceil(rateLimitResult.resetAt / 1000));
          }

          if (span) {
            span.setStatus({ code: 1, message: 'ok' });
            span.setAttribute('cache_status', 'hpos-api');
            span.end();
          }

          const response = NextResponse.json(orders, {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'Cache-Control': 'private, max-age=120',
              'X-HPOS-Enabled': 'true',
              ...rateLimitHeaders,
            },
          });
          setRequestIdHeader(response, requestId);
          return response;
        } else if (endpoint.startsWith('orders/')) {
          // GET single order - use hposApi.getOrder(id)
          const orderIdMatch = endpoint.match(/^orders\/(\d+)$/);
          if (orderIdMatch) {
            const orderId = parseInt(orderIdMatch[1]);
            const order = await hposApi.getOrder(orderId);
            
            // Build rate limit headers
            const rateLimitHeaders: Record<string, string> = {};
            if (rateLimitResult) {
              const limit = rateLimitResult.remaining + (rateLimitResult.allowed ? 1 : 0);
              rateLimitHeaders["X-RateLimit-Limit"] = String(limit);
              rateLimitHeaders["X-RateLimit-Remaining"] = String(rateLimitResult.remaining);
              rateLimitHeaders["X-RateLimit-Reset"] = String(Math.ceil(rateLimitResult.resetAt / 1000));
            }

            if (span) {
              span.setStatus({ code: 1, message: 'ok' });
              span.setAttribute('cache_status', 'hpos-api');
              span.end();
            }

            const response = NextResponse.json(order, {
              status: 200,
              headers: {
                'content-type': 'application/json',
                'Cache-Control': 'private, max-age=120',
                'X-HPOS-Enabled': 'true',
                ...rateLimitHeaders,
              },
            });
            setRequestIdHeader(response, requestId);
            return response;
          }
        }
      } catch (error: any) {
        // If hposApi fails, fall back to generic passthrough
        debugLog('hposApi failed, falling back to generic passthrough', { error: error.message, endpoint });
        // Continue to generic passthrough below
      }
    }

    // Only enforce WC credentials for endpoints that truly need them
    const requiresWooCreds = (
      endpoint === 'payment_gateways' ||
      endpoint === 'shipping_methods' ||
      endpoint.startsWith('customers/') ||
      (
        // generic proxy to wc/v3 below requires creds
        endpoint !== 'attributes' &&
        endpoint !== 'shop' &&
        endpoint === 'products' // generic products passthrough
      )
    );
    if (requiresWooCreds && (!WC_URL || !CK || !CS)) {
          if (span) {
            span.setStatus({ code: 2, message: 'internal_error' }); // 2 = ERROR
            span.end();
          }
      const response = NextResponse.json(
      { 
        error: "Błąd konfiguracji serwera", 
        details: "Brakuje zmiennych środowiskowych WooCommerce",
        debug: {
          WC_URL: !!WC_URL,
          CK: !!CK,
          CS: !!CS,
          NEXT_PUBLIC_WC_URL: WC_URL,
          WC_CONSUMER_KEY: CK,
          WC_CONSUMER_SECRET: CS,
        }
      },
        { status: 500 }
      );
      setRequestIdHeader(response, requestId);
      return response;
    }

    const url = new URL(`${WC_URL.replace(/\/$/, "")}/${endpoint}`);
    searchParams.forEach((v, k) => {
      if (k !== "endpoint" && k !== "cache") url.searchParams.set(k, v);
    });
    url.searchParams.set("consumer_key", CK || '');
    url.searchParams.set("consumer_secret", CS || '');

    // Reduce payload for common list endpoints when caller did not request fields explicitly
    // BUT: if search is used, include more fields as it's likely for product detail page
    if (endpoint === 'products' && !url.searchParams.has('_fields')) {
      if (url.searchParams.has('search')) {
        // For search (product detail page), include all necessary fields
        url.searchParams.set('_fields', 'id,name,slug,price,regular_price,sale_price,images,stock_status,description,short_description,attributes,categories,featured,average_rating,rating_count,cross_sell_ids,related_ids,sku,on_sale');
      } else if (url.searchParams.has('include')) {
        // For batch fetch (include parameter), include all necessary fields for product cards
        url.searchParams.set('_fields', 'id,name,slug,price,regular_price,sale_price,on_sale,featured,images,stock_status,average_rating,rating_count,categories,attributes');
      } else {
        // For list endpoints, keep minimal fields for performance
        url.searchParams.set('_fields', 'id,name,slug,price,regular_price,sale_price,images,stock_status');
      }
    }
    // Reduce payload for single product by default (omit long HTML fields)
    if (endpoint.startsWith('products/') && !url.searchParams.has('_fields')) {
      url.searchParams.set('_fields', 'id,name,slug,price,regular_price,sale_price,images,stock_status,attributes,categories,featured,average_rating,rating_count,sku,on_sale,related_ids,cross_sell_ids');
    }

    // Reduce payload for orders endpoint (HPOS-optimized fields)
    if ((endpoint === 'orders' || endpoint.startsWith('orders/')) && !url.searchParams.has('_fields')) {
      if (endpoint === 'orders') {
        // List of orders - minimal fields for list view
        url.searchParams.set('_fields', 'id,number,status,date_created,date_modified,total,customer_id,billing,shipping,line_items,meta_data,payment_method,payment_method_title,transaction_id');
      } else if (endpoint.startsWith('orders/') && !endpoint.includes('/notes') && !endpoint.includes('/refunds')) {
        // Single order - include all necessary fields but exclude long HTML fields
        url.searchParams.set('_fields', 'id,number,status,date_created,date_modified,total,customer_id,billing,shipping,line_items,meta_data,payment_method,payment_method_title,transaction_id,currency,date_paid,date_completed,shipping_lines,coupon_lines,fee_lines,tax_lines');
      }
      // For orders/{id}/notes, orders/{id}/refunds - don't add _fields (let WooCommerce handle it)
    }

    // Reduce payload for customers endpoint
    if ((endpoint === 'customers' || endpoint.startsWith('customers/')) && !url.searchParams.has('_fields')) {
      if (endpoint === 'customers') {
        // List of customers - minimal fields for list view
        url.searchParams.set('_fields', 'id,email,username,first_name,last_name,date_created,date_modified,orders_count,total_spent,avatar_url');
      } else if (endpoint.startsWith('customers/') && !endpoint.includes('/password-reset') && !endpoint.includes('/reset-password') && !endpoint.includes('/invoices')) {
        // Single customer - include all necessary fields but exclude sensitive data
        url.searchParams.set('_fields', 'id,email,username,first_name,last_name,date_created,date_modified,orders_count,total_spent,avatar_url,billing,shipping,meta_data');
      }
      // For customers/password-reset, customers/reset-password, customers/invoices - don't add _fields
    }

    // Decide cache policy for pass-through responses
    const isUserFeatures = endpoint.startsWith('orders') || endpoint.startsWith('customers');
    const passThroughCacheHeader = isUserFeatures
      ? 'private, max-age=120'
      : 'public, max-age=60, s-maxage=180, stale-while-revalidate=300';

    if (__DEBUG__) {
      console.log('🔍 API Route Debug:');
      console.log('WC_URL:', WC_URL ? 'SET' : 'NOT SET');
      console.log('CK:', CK ? 'SET' : 'NOT SET');
      console.log('CS:', CS ? 'SET' : 'NOT SET');
      console.log('Final URL:', maskUrlSecrets(url.toString()));
      console.log('Bypass cache:', bypassCache);
      console.log('Search params:', Object.fromEntries(searchParams.entries()));
    }

    // Cache lookup and fetch logic
    try {
      // Cache lookup (skip if bypass)
      const cacheKey = cache.generateKey(url.toString());
      let cached = null;
      
      if (!bypassCache) {
        const cacheStart = Date.now();
        cached = await cache.get(cacheKey);
        const cacheTime = Date.now() - cacheStart;
        
        if (cached) {
          // Conditional 304 if ETag matches
          if (ifNoneMatch && ifNoneMatch === cached.etag) {
            if (span) {
              span.setStatus({ code: 1, message: 'ok' });
              span.setAttribute('cache_status', 'hit');
              span.end();
            }
            const response = new NextResponse(null, { status: 304, headers: { ETag: cached.etag } });
            setRequestIdHeader(response, requestId);
            return response;
          }
          // Record cache hit
          sentryMetrics.recordCacheOperation('hit', cacheKey, cacheTime, { endpoint });
          
          // Build rate limit headers
          const rateLimitHeaders: Record<string, string> = {};
          if (rateLimitResult) {
            const limit = rateLimitResult.remaining + (rateLimitResult.allowed ? 1 : 0);
            rateLimitHeaders["X-RateLimit-Limit"] = String(limit);
            rateLimitHeaders["X-RateLimit-Remaining"] = String(rateLimitResult.remaining);
            rateLimitHeaders["X-RateLimit-Reset"] = String(Math.ceil(rateLimitResult.resetAt / 1000));
          }
          
          // Finish transaction with cache hit
          if (span) {
            span.setStatus({ code: 1, message: 'ok' });
            span.setAttribute('cache_status', 'hit');
            span.end();
          }
          
          const response = new NextResponse(cached.body, {
            status: 200,
            headers: {
              "content-type": "application/json",
              "Cache-Control": `${passThroughCacheHeader}`,
              "ETag": cached.etag,
              "X-Cache": "HIT",
              ...rateLimitHeaders,
              ...cached.headers
            },
          });
          setRequestIdHeader(response, requestId);
          return response;
        } else {
          // Record cache miss
          sentryMetrics.recordCacheOperation('miss', cacheKey, cacheTime, { endpoint });
        }
      }

      // Retry logic for better reliability
      let lastError: Error | null = null;
      let responseTime = 0;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          debugLog(`🔄 Attempt ${attempt} for ${maskUrlSecrets(url.toString())}`);
          
          const startTime = Date.now();
          // Determine ISR tags based on endpoint
          const isrTags: string[] = [];
          if (endpoint === 'products' || endpoint.startsWith('products/')) {
            isrTags.push('products');
            if (searchParams.has('category')) {
              isrTags.push(`category-${searchParams.get('category')}`);
            }
          } else if (endpoint === 'products/categories' || endpoint.startsWith('products/categories')) {
            isrTags.push('categories');
          } else if (endpoint === 'products/attributes' || endpoint.startsWith('products/attributes')) {
            isrTags.push('attributes');
          }
          
        const r = await fetch(url.toString(), {
          headers: { 
            Accept: "application/json",
            'User-Agent': 'Filler-Store/1.0'
          },
          cache: "no-store",
            // Add ISR for static data endpoints
            ...(isrTags.length > 0 && {
              next: { 
                revalidate: endpoint.includes('categories') || endpoint.includes('attributes') ? 1800 : 300, // 30min for categories/attributes, 5min for products
                tags: isrTags 
              }
            })
        });
        responseTime = Date.now() - startTime;
        
        // Record API metrics
        sentryMetrics.recordApiResponse(
          endpoint,
          'GET',
          responseTime,
          r.status,
          { attempt: attempt.toString() }
        );

        const text = await r.text();
        if (!r.ok) {
          debugLog(`❌ HTTP ${r.status}: ${text.slice(0, 300)}`);
            
            // Special handling for products endpoint with 502/503/504 - try fallback
            if ((r.status === 502 || r.status === 503 || r.status === 504) && endpoint === 'products' && attempt === 3) {
              debugLog('🔄 Products endpoint failed, trying Store API fallback...');
              try {
                const perPage = searchParams.get('per_page') || '24';
                const storeUrl = `${WORDPRESS_URL}/wp-json/wc/store/v1/products?per_page=${encodeURIComponent(perPage)}`;
                const storeResp = await fetch(storeUrl, {
                  headers: { Accept: 'application/json', 'User-Agent': 'Filler-Store/1.0' },
                  cache: 'no-store',
                  signal: AbortSignal.timeout(5000)
                });
                if (storeResp.ok) {
                  const storeData = await storeResp.json();
                  debugLog('✅ Products from Store API fallback:', { count: Array.isArray(storeData) ? storeData.length : 0 });
                  span.setStatus({ code: 1, message: 'ok' });
                  span.setAttribute('cache_status', 'fallback');
                  span.end();
                  const response = new NextResponse(JSON.stringify(Array.isArray(storeData) ? storeData : []), {
                    status: 200,
                    headers: {
                      "content-type": "application/json",
                      "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
                      "X-Cache": "MISS-FALLBACK",
                    },
                  });
                  setRequestIdHeader(response, requestId);
                  return response;
                }
              } catch (fallbackError) {
                debugLog('❌ Store API fallback also failed:', fallbackError);
              }
            }

            // Special handling for single product endpoint with 502/503/504 - try Store API by ID (earlier fallback)
            if ((r.status === 502 || r.status === 503 || r.status === 504) && endpoint.startsWith('products/') && attempt >= 2) {
              try {
                const id = endpoint.replace('products/', '').trim();
                const storeSingleUrl = `${WORDPRESS_URL}/wp-json/wc/store/v1/products/${encodeURIComponent(id)}`;
                debugLog(`🔄 Single product failed (attempt ${attempt}), trying Store API by id:`, storeSingleUrl);
                const storeSingleResp = await fetch(storeSingleUrl, {
                  headers: { Accept: 'application/json', 'User-Agent': 'Filler-Store/1.0' },
                  cache: 'no-store',
                  signal: AbortSignal.timeout(6000) // Increased timeout for Store API
                });
                if (storeSingleResp.ok) {
                  const json = await storeSingleResp.json();
                  // Normalize a few fields to be closer to WC v3
                  const normalized = json && json.id ? {
                    id: json.id,
                    name: json.name,
                    slug: json.slug,
                    price: json.prices?.price || json.price || null,
                    regular_price: json.prices?.regular_price || null,
                    sale_price: json.prices?.sale_price || null,
                    images: json.images || [],
                    stock_status: json.stock_status || 'instock',
                    attributes: json.attributes || [],
                    categories: json.categories || [],
                    average_rating: json.average_rating || 0,
                    rating_count: json.rating_count || 0,
                    related_ids: json.related_ids || [],
                    cross_sell_ids: json.cross_sell_ids || [],
                    sku: json.sku || null,
                    on_sale: Boolean(json.on_sale),
                    description: json.description || null,
                    short_description: json.short_description || null,
                  } : null;
                  if (normalized) {
                    debugLog('✅ Store API fallback successful for product:', id);
                    if (span) {
                      span.setStatus({ code: 1, message: 'ok' });
                      span.setAttribute('cache_status', 'fallback');
                      span.end();
                    }
                    const response = new NextResponse(JSON.stringify(normalized), {
                      status: 200,
                      headers: { "content-type": "application/json", "X-Cache": "MISS-FALLBACK" },
                    });
                    setRequestIdHeader(response, requestId);
                    return response;
                  }
                }
              } catch (e) {
                debugLog('❌ Store API single product fallback failed:', e);
              }
            }
            
            // If not last attempt, continue retry loop
            if (attempt < 3) {
              lastError = new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
              await new Promise(resolve => setTimeout(resolve, attempt * 500));
              continue;
            }
            
            span.setStatus({ code: 2, message: 'internal_error' });
            span.end();
            const response = new NextResponse(text || r.statusText, {
            status: r.status,
            headers: { "content-type": r.headers.get("content-type") || "text/plain" },
          });
            setRequestIdHeader(response, requestId);
            return response;
        }

        // Check if response is HTML instead of JSON (WordPress error page)
        if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
          debugLog(`❌ WordPress returned HTML instead of JSON: ${text.substring(0, 100)}...`);
          
          // Try to get cached data first
          if (!bypassCache && redis && typeof (redis as Record<string, unknown>).get === 'function') {
            try {
              const cachedData = await (redis as any).get(cacheKey) as string;
              if (cachedData) {
                debugLog('✅ Using cached data as fallback');
                  span.setStatus({ code: 1, message: 'ok' });
                  span.setAttribute('cache_status', 'fallback');
                  span.end();
                  const response = new NextResponse(cachedData, {
                  status: 200,
                  headers: { 'content-type': 'application/json' }
                });
                  setRequestIdHeader(response, requestId);
                  return response;
              }
            } catch {
              console.log('⚠️ Redis not available, skipping cache fallback');
            }
          }
          
          // Retry the request once more
          debugLog('🔄 Retrying request...');
          const retryResponse = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: "application/json",
              'User-Agent': 'Filler-Store/1.0'
            },
            cache: "no-store",
          });
          
          if (retryResponse.ok) {
            const retryText = await retryResponse.text();
            if (!retryText.trim().startsWith('<!DOCTYPE html>') && !retryText.trim().startsWith('<html')) {
              debugLog('✅ Retry successful, returning data');
                span.setStatus({ code: 1, message: 'ok' });
                span.setAttribute('cache_status', 'retry');
                span.end();
                const response = new NextResponse(retryText, {
                status: 200,
                headers: { 'content-type': 'application/json' }
              });
                setRequestIdHeader(response, requestId);
                return response;
            }
          }
          
          // Return empty data instead of error to prevent app crashes
          debugLog('⚠️ Returning empty data as fallback');
          const emptyResponse = {
            data: [],
            total: 0,
            totalPages: 0,
            currentPage: 1,
            perPage: 10,
            error: 'API tymczasowo niedostępne'
          };
          
            span.setStatus({ code: 1, message: 'ok' });
            span.setAttribute('cache_status', 'fallback-empty');
            span.end();
            const response = new NextResponse(JSON.stringify(emptyResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
            setRequestIdHeader(response, requestId);
            return response;
        }
        
        debugLog(`✅ Success on attempt ${attempt}`);
        
        // Record successful WooCommerce operation
        sentryMetrics.recordWooCommerceOperation(
          endpoint,
          responseTime,
          true,
          { attempt: attempt.toString(), status_code: r.status.toString() }
        );
        
        // Populate cache (skip if bypass)
        if (!bypassCache) {
          const cacheSetStart = Date.now();
            // Determine TTL based on endpoint type
            let ttlMs = 60000; // Default 60s
            if (endpoint === 'products/categories' || endpoint.startsWith('products/categories')) {
              ttlMs = 1800000; // 30 minutes for categories
            } else if (endpoint === 'products/attributes' || endpoint.startsWith('products/attributes')) {
              ttlMs = 1800000; // 30 minutes for attributes
            } else if (endpoint === 'products' || endpoint.startsWith('products/')) {
              ttlMs = 300000; // 5 minutes for products
            } else if (endpoint.startsWith('orders') || endpoint.startsWith('customers')) {
              ttlMs = 120000; // 2 minutes for user-specific data
            }
            
            await cache.set(cacheKey, text, ttlMs, {
            'X-Response-Time': `${Date.now() - Date.now()}ms`,
              'X-Attempt': attempt.toString(),
              ...(isrTags.length > 0 && { 'X-Cache-Tags': isrTags.join(',') })
          });
          const cacheSetTime = Date.now() - cacheSetStart;
          
          // Record cache set
          sentryMetrics.recordCacheOperation('set', cacheKey, cacheSetTime, { endpoint });
        }
          
          // Build rate limit headers
          const rateLimitHeaders: Record<string, string> = {};
          if (rateLimitResult) {
            const limit = rateLimitResult.remaining + (rateLimitResult.allowed ? 1 : 0);
            rateLimitHeaders["X-RateLimit-Limit"] = String(limit);
            rateLimitHeaders["X-RateLimit-Remaining"] = String(rateLimitResult.remaining);
            rateLimitHeaders["X-RateLimit-Reset"] = String(Math.ceil(rateLimitResult.resetAt / 1000));
          }
        
        const etag = cache.generateETag(text);
          
          // Finish transaction with success
          span.setStatus({ code: 1, message: 'ok' });
          span.setAttribute('cache_status', bypassCache ? 'bypass' : 'miss');
          span.end();
          
          const response = new NextResponse(text, {
          status: 200,
          headers: {
            "content-type": "application/json",
            "Cache-Control": `${passThroughCacheHeader}`,
            "ETag": etag,
            "X-Cache": bypassCache ? "BYPASS" : "MISS",
              ...rateLimitHeaders,
          },
        });
          setRequestIdHeader(response, requestId);
          return response;
      } catch (error) {
        lastError = error as Error;
          debugLog(`❌ Attempt ${attempt} failed:`, error);
        
        // Record failed WooCommerce operation
        sentryMetrics.recordWooCommerceOperation(
          endpoint,
          responseTime || 0,
          false,
          { 
            attempt: attempt.toString(), 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        );
        
        if (attempt < 3) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
        }
      }
      
      // All attempts failed
      throw lastError || new Error('Unknown error');
    } catch (e: unknown) {
      // Use unified error handling
      if (span) {
        span.setStatus({ code: 2, message: 'internal_error' });
      }
      
      const { createErrorResponse, ExternalApiError } = await import('@/lib/errors');
      const error = e instanceof Error 
        ? new ExternalApiError(
            `WooCommerce API error: ${e.message}`,
            502,
            { endpoint, attempts: 3 },
            true
          )
        : new ExternalApiError('WooCommerce API error', 502, { endpoint }, true);
      const response = createErrorResponse(error, { endpoint, method: 'GET', requestId });
      setRequestIdHeader(response, requestId);
      if (span) {
        span.end();
      }
      return response;
    } finally {
      // Ensure span is ended if not already
      if (span) {
        span.end();
      }
    }
  } finally {
    // Ensure Sentry span is ended if not already
    if (span) {
      span.end();
    }
  }
}

export async function POST(req: NextRequest) {
  // Generate/retrieve request ID for correlation
  const requestId = getRequestId(req);
  
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "products";

  debugLog('🔄 POST request to endpoint:', endpoint);

  try {
    const body = await req.json();

    // Special handling for password reset
    if (endpoint === 'customers/password-reset') {
      console.log('🔄 Handling password reset request');
      return await handlePasswordReset(body);
    }

    // Special handling for password reset confirmation
    if (endpoint === 'customers/reset-password') {
      console.log('🔄 Handling password reset confirm request');
      return await handlePasswordResetConfirm(body);
    }


    // Special handling for customer invoices
    if (endpoint === 'customers/invoices') {
      console.log('🔄 Handling customer invoices request');
      return await handleCustomerInvoices(req);
    }

    // HPOS-optimized order creation with limit handling
    if (endpoint === 'orders') {
        debugLog('🔄 HPOS Order creation request');
      const orderStartTime = Date.now();
      
      try {
        // Transform body to match schema format (firstName -> first_name)
        const transformedBody: any = {
          ...body,
          billing: body.billing ? {
            first_name: body.billing.firstName || body.billing.first_name,
            last_name: body.billing.lastName || body.billing.last_name,
            company: body.billing.company || '',
            address_1: body.billing.address || body.billing.address_1,
            address_2: body.billing.address_2 || '',
            city: body.billing.city,
            state: body.billing.state || '',
            postcode: body.billing.postcode,
            country: body.billing.country || 'PL',
            email: body.billing.email,
            phone: body.billing.phone,
          } : undefined,
          shipping: (body.shipping && body.shipping !== null) ? {
            first_name: body.shipping.firstName || body.shipping.first_name,
            last_name: body.shipping.lastName || body.shipping.last_name,
            company: body.shipping.company || '',
            address_1: body.shipping.address || body.shipping.address_1,
            address_2: body.shipping.address_2 || '',
            city: body.shipping.city,
            state: body.shipping.state || '',
            postcode: body.shipping.postcode,
            country: body.shipping.country || 'PL',
          } : null,
          line_items: body.line_items?.map((item: any) => {
            const variationId = item.variation_id || item.variant?.id;
            // Only include variation_id if it's a valid positive number, otherwise omit it
            const lineItem: any = {
              product_id: item.product_id || item.id,
              quantity: item.quantity,
              meta_data: item.meta_data || [],
            };
            // Only add variation_id if it's > 0 (0 means no variation, so we omit it)
            if (variationId && variationId > 0) {
              lineItem.variation_id = variationId;
            }
            return lineItem;
          }),
        };

        // Validate order data with Zod
        console.log('🔍 Validating order data:', JSON.stringify(transformedBody, null, 2));
        const validationResult = orderSchema.safeParse(transformedBody);
        
        if (!validationResult.success) {
          console.error('❌ Order validation failed:', {
            errors: validationResult.error.errors,
            issues: validationResult.error.issues,
            formattedErrors: validationResult.error.format(),
            body: transformedBody
          });
          const { createErrorResponse, ValidationError } = await import('@/lib/errors');
          const validationError = new ValidationError('Invalid order data', validationResult.error.errors);
          const response = createErrorResponse(
            validationError,
            { endpoint: 'orders', method: 'POST', requestId }
          );
          
          // Log the actual response body for debugging
          const responseClone = response.clone();
          const responseText = await responseClone.text();
          console.log('📤 Validation error response status:', response.status);
          console.log('📤 Validation error response body:', responseText);
          
          return response;
        }
        
        const validatedBody = validationResult.data;
        
        // Extract customer ID and session ID for limit checking
        const customerId = validatedBody.customer_id || validatedBody.billing?.customer_id;
        const sessionId = req.headers.get('x-session-id') || 'anonymous';
        
        // Check order limits
        if (customerId) {
          const limitCheck = await orderLimitHandler.checkOrderLimit(customerId, sessionId);
          
          if (!limitCheck.allowed) {
            debugLog('❌ Order limit exceeded', { customerId, reason: limitCheck.reason });
            
            // Record limit exceeded
            hposPerformanceMonitor.recordOrderLimitExceeded();
            
            return NextResponse.json({
              error: 'Przekroczono limit prób zamówienia',
              message: limitCheck.reason,
              blockedUntil: limitCheck.blockedUntil,
              attemptsRemaining: limitCheck.attemptsRemaining,
            }, { status: 429 });
          }
        }
        
        // Add HPOS-specific metadata
        const hposOrderData = {
          ...validatedBody,
          meta_data: [
            ...(validatedBody.meta_data || []),
            {
              key: '_hpos_enabled',
              value: 'true'
            },
            {
              key: '_created_via',
              value: 'headless-api'
            },
            {
              key: '_api_version',
              value: 'hpos-v1'
            },
            {
              key: '_session_id',
              value: sessionId
            }
          ]
        };
        
        const order = await hposApi.createOrder(hposOrderData);
        
        // Record successful order creation
        if (customerId) {
          await orderLimitHandler.recordOrderAttempt(customerId, sessionId, true);
        }
        
        // Record performance metrics
        hposPerformanceMonitor.recordOrderCreated(Date.now() - orderStartTime);
        
        sentryMetrics.recordWooCommerceOperation(
          'orders/create',
          Date.now(),
          true,
          { order_id: order.id.toString(), hpos_enabled: 'true' }
        );
        
        // Trigger WooCommerce emails after order creation
        // Use custom king-email endpoint to trigger emails
        try {
          console.log('📧 Triggering WooCommerce emails for order:', order.id);
          
          const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || WC_URL?.replace('/wp-json/wc/v3', '') || '';
          
          if (wordpressUrl) {
            // Use king-email endpoint to trigger WooCommerce emails
            const emailTriggerUrl = `${wordpressUrl}/wp-json/king-email/v1/trigger-order-email`;
            const emailResponse = await fetch(emailTriggerUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                order_id: order.id
              }),
            }).catch((err) => {
              console.error('❌ Email trigger fetch error:', err);
              return null;
            });
            
            if (emailResponse?.ok) {
              const emailResult = await emailResponse.json().catch(() => ({}));
              console.log('✅ WooCommerce email triggered via king-email API:', emailResult);
            } else {
              const errorText = await emailResponse?.text().catch(() => 'Unknown error');
              console.warn('⚠️ Failed to trigger email via king-email API:', emailResponse?.status, errorText);
              // WooCommerce should still send emails automatically, but log the warning
            }
          } else {
            console.warn('⚠️ WordPress URL not configured, cannot trigger emails');
          }
        } catch (emailError) {
          console.error('❌ Error triggering emails:', emailError);
          // Don't fail the order creation if email fails
        }
        
        // Return in expected format for frontend
        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            number: order.number || order.id.toString(),
            status: order.status,
            total: order.total,
            currency: order.currency,
            payment_url: order.payment_url,
            checkout_payment_url: order.checkout_payment_url,
            date_created: order.date_created,
            billing: order.billing,
            shipping: order.shipping,
            line_items: order.line_items
          }
        });
      } catch (error: any) {
        console.error('❌ HPOS Order creation error:', error);
        
        // Record failed order creation
        // Try to get customer ID from body if validation failed
        const customerId = (body as any)?.customer_id || (body as any)?.billing?.customer_id;
        const sessionId = req.headers.get('x-session-id') || 'anonymous';
        
        if (customerId) {
          await orderLimitHandler.recordOrderAttempt(customerId, sessionId, false);
        }
        
        // Record failed order creation
        hposPerformanceMonitor.recordOrderFailed();
        
        // Record failed order creation
        sentryMetrics.recordWooCommerceOperation(
          'orders/create',
          Date.now(),
          false,
          { error: error.message, hpos_enabled: 'true' }
        );
        
        // Return in expected format for frontend
        return NextResponse.json(
          { 
            success: false,
            error: error.message || 'Failed to create order',
            details: error.message 
          },
          { status: 500 }
        );
      }
    }

    // Special handling for order tracking
    if (endpoint === 'orders/tracking') {
      console.log('🔄 Handling order tracking request');
      return await handleOrderTracking(req);
    }

    // Special handling for customer profile update
    if (endpoint === 'customer/update-profile') {
      console.log('🔄 Handling customer profile update request');
      return await handleCustomerProfileUpdate(body);
    }

    // Special handling for customer password change
    if (endpoint === 'customer/change-password') {
      console.log('🔄 Handling customer password change request');
      return await handleCustomerPasswordChange(body);
    }

    // Special handling for customer invoices
    if (endpoint === 'customers/invoices') {
      console.log('🔄 Handling customer invoices request');
      return await handleCustomerInvoices(req);
    }

    console.log('🔄 Using standard WooCommerce endpoint:', endpoint);


    const url = new URL(`${WC_URL?.replace(/\/$/, "") || `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wc/v3`}/${endpoint}`);
    url.searchParams.set("consumer_key", CK || '');
    url.searchParams.set("consumer_secret", CS || '');
    
    // Retry logic for POST requests too
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        debugLog(`🔄 POST Attempt ${attempt} for ${maskUrlSecrets(url.toString())}`);
        
        const r = await fetch(url.toString(), {
          method: 'POST',
          headers: { 
            Accept: "application/json",
            'Content-Type': 'application/json',
            'User-Agent': 'Filler-Store/1.0'
          },
          body: JSON.stringify(body),
          cache: "no-store",
        });

        const text = await r.text();
        if (!r.ok) {
          debugLog(`❌ POST HTTP ${r.status}: ${text.slice(0, 300)}`);
          return new NextResponse(text || r.statusText, {
            status: r.status,
            headers: { "content-type": r.headers.get("content-type") || "text/plain" },
          });
        }
        
        debugLog(`✅ POST Success on attempt ${attempt}`);
        return new NextResponse(text, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        lastError = error as Error;
        debugLog(`❌ POST Attempt ${attempt} failed:`, error);
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    
    throw lastError;
  } catch (e: unknown) {
    console.error('🚨 POST All attempts failed:', e);
    return NextResponse.json(
      { error: "Błąd serwera proxy", message: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}

