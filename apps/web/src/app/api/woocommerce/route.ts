import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache';
import { WooShippingMethod } from '@/types/woocommerce';
import { sentryMetrics } from '@/utils/sentry-metrics';

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

const WC_URL = process.env.NEXT_PUBLIC_WC_URL;
const SITE_BASE = WC_URL ? WC_URL.replace(/\/wp-json\/wc\/v3.*/, '') : '';
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;

// Check if required environment variables are available
if (!WC_URL || !CK || !CS) {
  console.error('Missing WooCommerce environment variables:', {
    WC_URL: !!WC_URL,
    CK: !!CK,
    CS: !!CS,
    NEXT_PUBLIC_WC_URL: process.env.NEXT_PUBLIC_WC_URL,
    WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY,
    WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET,
  });
}

// Handle password reset using WordPress REST API
async function handlePasswordReset(body: { email: string }) {
  const { email } = body;

  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Email jest wymagany' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Password reset request for:', email);
    
    // Użyj custom mu-plugin endpoint
    const customUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/custom/v1/password-reset`;
    
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
      const data = await response.json();
      console.log('✅ Custom password reset API response:', data);
      
      return NextResponse.json({
        success: data.success,
        message: data.message,
        debug_info: data.debug_info
      });
    } else {
      console.log('❌ Custom password reset API failed:', response.status);
      const errorText = await response.text();
      console.log('❌ Custom endpoint error response:', errorText);
      
      // Fallback: Sprawdź czy użytkownik istnieje przez WooCommerce API
      const wcUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wc/v3/customers`;
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
  const { key, login, password } = body;

  if (!key || !login || !password) {
    return NextResponse.json(
      { success: false, error: 'Wszystkie pola są wymagane' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Password reset confirm for user:', login);
    
    // Użyj custom mu-plugin endpoint
    const customUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/custom/v1/reset-password`;
    
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
      const data = await response.json();
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
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customer_id');
  
  if (!customerId) {
    return NextResponse.json(
      { success: false, error: 'Customer ID jest wymagany' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Fetching invoices for customer:', customerId);
    
    // Call WordPress custom API
    const invoicesUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/custom/v1/invoices?customer_id=${customerId}`;
    
    const response = await fetch(invoicesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HeadlessWoo/1.0)',
      },
    });

    const raw = await response.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (e) { /* not json */ }
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
    const trackingUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/custom/v1/tracking/${orderId}`;
    
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
    try { data = raw ? JSON.parse(raw) : null; } catch (e) { /* not json */ }
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
  const { customer_id, profile_data } = body;

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
      const updateUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/custom/v1/customer/update-profile`;
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
      try { data = raw ? JSON.parse(raw) : null; } catch (e) { /* not json */ }
      if (response.ok && data && data.success) {
        customerFromCustom = data.customer || null;
      } else {
        console.log('ℹ️ Custom update-profile did not return success, continuing with Woo update');
      }
    } catch (e) {
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
      shipping: {
        first_name: profile_data.firstName,
        last_name: profile_data.lastName,
        company: profile_data.shipping?.company || '',
        address_1: profile_data.shipping?.address || '',
        city: profile_data.shipping?.city || '',
        postcode: profile_data.shipping?.postcode || '',
        country: profile_data.shipping?.country || 'PL',
      },
      meta_data: [] as Array<{ key: string; value: string }>,
    };

    const nip = profile_data.billing?.nip || profile_data.nip;
    const invoiceReq = profile_data.billing?.invoiceRequest ?? profile_data.invoiceRequest;
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
    try { wooData = wooRaw ? JSON.parse(wooRaw) : null; } catch (_) { /* not json */ }
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
  const { customer_id, current_password, new_password } = body;

  if (!customer_id || !current_password || !new_password) {
    return NextResponse.json(
      { success: false, error: 'Wszystkie pola są wymagane' },
      { status: 400 }
    );
  }

  try {
    console.log('🔄 Changing customer password:', customer_id);
    
    // Call WordPress custom API
    const changePasswordUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/custom/v1/customer/change-password`;
    
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
    try { data = raw ? JSON.parse(raw) : null; } catch (e) { /* not json */ }
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

async function handleOrderCreation(body: any) {
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
    try { data = raw ? JSON.parse(raw) : null; } catch (e) { /* not json */ }
    
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
    try {
      console.log('📧 Triggering WooCommerce emails for order:', data.id);
      
      // Use our custom email API endpoint
      const emailApiUrl = `${WC_URL}/wp-json/king-email/v1/trigger-order-email`;
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
        console.log('⚠️ Failed to trigger email via API');
      }
      
    } catch (emailError) {
      console.error('❌ Error triggering emails:', emailError);
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

// Handle attributes endpoint - PRO Architecture: Dynamic attributes based on filters
async function handleAttributesEndpoint(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { error: 'Błąd konfiguracji serwera', details: 'Brakuje zmiennych środowiskowych WooCommerce' },
      { status: 500 }
    );
  }

  try {
    // PRO Architecture: WordPress robi całe filtrowanie atrybutów
    const attributesUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/king-shop/v1/attributes?${searchParams.toString()}`;
    
    console.log('🏷️ Attributes endpoint - calling King Shop API:', attributesUrl);
    
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ Attributes data received from WordPress:', {
      attributes: data.attributes ? Object.keys(data.attributes).length : 0,
      total_products: data.total_products || 0
    });

    // WordPress zrobił całe filtrowanie - zwracamy dane jak są
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
        "X-Cache": "MISS",
      },
    });

  } catch (error) {
    console.error('❌ Attributes endpoint error:', error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać atrybutów', details: error instanceof Error ? error.message : 'Nieznany błąd' },
      { status: 500 }
    );
  }
}

// Handle shop endpoint - PRO Architecture: WordPress robi całe filtrowanie
async function handleShopEndpoint(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { error: 'Błąd konfiguracji serwera', details: 'Brakuje zmiennych środowiskowych WooCommerce' },
      { status: 500 }
    );
  }

  try {
    // PRO Architecture: WordPress robi całe filtrowanie
    // Next.js tylko przekazuje parametry i cache'uje odpowiedź
    const shopUrl = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/king-shop/v1/data?${searchParams.toString()}`;
    
    console.log('🛍️ Shop endpoint - calling King Shop API:', shopUrl);
    
    const response = await fetch(shopUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Filler-Store/1.0'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ Shop data received from WordPress:', {
      products: data.products?.length || 0,
      total: data.total,
      categories: data.categories?.length || 0,
      attributes: data.attributes ? Object.keys(data.attributes).length : 0
    });

    // WordPress zrobił całe filtrowanie - zwracamy dane jak są
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
        "X-Cache": "MISS",
      },
    });

  } catch (error) {
    console.error('❌ Shop endpoint error:', error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać danych sklepu', details: error instanceof Error ? error.message : 'Nieznany błąd' },
      { status: 500 }
    );
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
    } catch (_) {
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
        } catch (_) {
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
        return NextResponse.json({ error: 'Nieprawidłowy kod rabatowy' }, { status: 400 });
      }
      
      const coupons = await response.json();
      
      if (coupons.length === 0) {
        return NextResponse.json({ error: 'Nieprawidłowy kod rabatowy' }, { status: 400 });
      }
      
      const coupon = coupons[0];
      
      // Check if coupon is still valid
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        return NextResponse.json({ error: 'Kod rabatowy został już wykorzystany' }, { status: 400 });
      }
      
      if (coupon.date_expires && new Date(coupon.date_expires) < new Date()) {
        return NextResponse.json({ error: 'Kod rabatowy wygasł' }, { status: 400 });
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
      });
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
    });
    
  } catch (error: unknown) {
    console.error('Coupons API error:', error);
    return NextResponse.json(
      { error: 'Nie udało się pobrać kuponów', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Check if required environment variables are available
  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { 
        error: "Błąd konfiguracji serwera", 
        details: "Brakuje zmiennych środowiskowych WooCommerce",
        debug: {
          WC_URL: !!WC_URL,
          CK: !!CK,
          CS: !!CS,
          NEXT_PUBLIC_WC_URL: process.env.NEXT_PUBLIC_WC_URL,
          WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY,
          WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET,
        }
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "products";
  const bypassCache = searchParams.get("cache") === "off";
  
  // Optimized product endpoint
  if (endpoint.startsWith('king-optimized/product/')) {
    const slug = endpoint.replace('king-optimized/product/', '');
    const url = `${process.env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/king-optimized/v1/product/${slug}`;
    
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        cache: bypassCache ? 'no-store' : 'default'
      });
      
      if (!response.ok) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: response.status });
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }
  
  // Customer profile endpoint
  if (endpoint.startsWith('customers/')) {
    const customerId = endpoint.replace('customers/', '');
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
      console.log('🔄 Fetching customer data for ID:', customerId);
      const response = await fetch(`${WC_URL}/customers/${customerId}?consumer_key=${CK}&consumer_secret=${CS}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('🔍 Customer API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Customer API error:', errorText);
        return NextResponse.json({ error: 'Customer not found' }, { status: response.status });
      }
      
      const customerData = await response.json();
      console.log('✅ Customer data fetched:', customerData);
      return NextResponse.json(customerData);
    } catch (error: any) {
      console.error('❌ Customer fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  
  // Payment gateways
  if (endpoint === 'payment_gateways') {
    if (!WC_URL || !CK || !CS) {
      return NextResponse.json({ success: false, error: 'Brak konfiguracji WooCommerce API' }, { status: 500 });
    }
    try {
      const url = `${WC_URL}/payment_gateways?consumer_key=${CK}&consumer_secret=${CS}`;
      const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Filler-Store/1.0' }, cache: 'no-store' });
      const text = await r.text();
      let data: any = null; try { data = text ? JSON.parse(text) : null; } catch (_) {}
      if (!r.ok) {
        const msg = (data && (data.message || data.error)) || text || 'Błąd pobierania metod płatności';
        return NextResponse.json({ success: false, error: String(msg).slice(0, 1000) }, { status: r.status || 502 });
      }
      return NextResponse.json({ success: true, gateways: Array.isArray(data) ? data : [] });
    } catch (e) {
      return NextResponse.json({ success: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
    }
  }

  // Special handling for shipping methods
  if (endpoint === "shipping_methods") {
    return handleShippingMethods(req);
  }
  
  // Special handling for coupons
  if (endpoint === "coupons") {
    return handleCoupons(req);
  }
  
  // Special handling for attributes endpoint - PRO Architecture
  if (endpoint === "attributes") {
    return handleAttributesEndpoint(req);
  }
  
  // Special handling for shop endpoint - use new King Shop API
  if (endpoint === "shop") {
    return handleShopEndpoint(req);
  }
  
  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { error: 'Błąd konfiguracji serwera', details: 'Brakuje zmiennych środowiskowych WooCommerce' },
      { status: 500 }
    );
  }

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimit = cache.checkRateLimit(ip);
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Przekroczono limit zapytań', retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toString()
        }
      }
    );
  }

  const url = new URL(`${WC_URL.replace(/\/$/, "")}/${endpoint}`);
  searchParams.forEach((v, k) => {
    if (k !== "endpoint" && k !== "cache") url.searchParams.set(k, v);
  });
  url.searchParams.set("consumer_key", CK || '');
  url.searchParams.set("consumer_secret", CS || '');

  console.log('🔍 API Route Debug:');
  console.log('WC_URL:', WC_URL);
  console.log('CK:', CK ? 'SET' : 'NOT SET');
  console.log('CS:', CS ? 'SET' : 'NOT SET');
  console.log('Final URL:', url.toString());
  console.log('Bypass cache:', bypassCache);
  console.log('Search params:', Object.fromEntries(searchParams.entries()));

  try {
    // Cache lookup (skip if bypass)
    const cacheKey = cache.generateKey(url.toString());
    let cached = null;
    
    if (!bypassCache) {
      const cacheStart = Date.now();
      cached = await cache.get(cacheKey);
      const cacheTime = Date.now() - cacheStart;
      
      if (cached) {
        // Record cache hit
        sentryMetrics.recordCacheOperation('hit', cacheKey, cacheTime, { endpoint });
        
        return new NextResponse(cached.body, {
          status: 200,
          headers: {
            "content-type": "application/json",
            "Cache-Control": `public, max-age=30, s-maxage=60`,
            "ETag": cached.etag,
            "X-Cache": "HIT",
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
            ...cached.headers
          },
        });
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
        console.log(`🔄 Attempt ${attempt} for ${url.toString()}`);
        
        const startTime = Date.now();
        const r = await fetch(url.toString(), {
          headers: { 
            Accept: "application/json",
            'User-Agent': 'Filler-Store/1.0'
          },
          cache: "no-store",
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
          console.log(`❌ HTTP ${r.status}: ${text}`);
          return new NextResponse(text || r.statusText, {
            status: r.status,
            headers: { "content-type": r.headers.get("content-type") || "text/plain" },
          });
        }

        // Check if response is HTML instead of JSON (WordPress error page)
        if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
          console.log(`❌ WordPress returned HTML instead of JSON: ${text.substring(0, 100)}...`);
          
          // Try to get cached data first
          if (!bypassCache && redis && typeof (redis as Record<string, unknown>).get === 'function') {
            try {
              const cachedData = await (redis as any).get(cacheKey) as string;
              if (cachedData) {
                console.log('✅ Using cached data as fallback');
                return new NextResponse(cachedData, {
                  status: 200,
                  headers: { 'content-type': 'application/json' }
                });
              }
            } catch {
              console.log('⚠️ Redis not available, skipping cache fallback');
            }
          }
          
          // Retry the request once more
          console.log('🔄 Retrying request...');
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
              console.log('✅ Retry successful, returning data');
              return new NextResponse(retryText, {
                status: 200,
                headers: { 'content-type': 'application/json' }
              });
            }
          }
          
          // Return empty data instead of error to prevent app crashes
          console.log('⚠️ Returning empty data as fallback');
          const emptyResponse = {
            data: [],
            total: 0,
            totalPages: 0,
            currentPage: 1,
            perPage: 10,
            error: 'API tymczasowo niedostępne'
          };
          
          return new NextResponse(JSON.stringify(emptyResponse), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
        
        console.log(`✅ Success on attempt ${attempt}`);
        
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
          await cache.set(cacheKey, text, 60000, {
            'X-Response-Time': `${Date.now() - Date.now()}ms`,
            'X-Attempt': attempt.toString()
          });
          const cacheSetTime = Date.now() - cacheSetStart;
          
          // Record cache set
          sentryMetrics.recordCacheOperation('set', cacheKey, cacheSetTime, { endpoint });
        }
        
        const etag = cache.generateETag(text);
        return new NextResponse(text, {
          status: 200,
          headers: {
            "content-type": "application/json",
            "Cache-Control": `public, max-age=30, s-maxage=60`,
            "ETag": etag,
            "X-Cache": bypassCache ? "BYPASS" : "MISS",
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        });
      } catch (error) {
        lastError = error as Error;
        console.log(`❌ Attempt ${attempt} failed:`, error);
        
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
    throw lastError;
  } catch (e: unknown) {
    console.error('🚨 All attempts failed:', e);
    return NextResponse.json(
      { error: "Błąd serwera proxy", message: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "products";

  console.log('🔄 POST request to endpoint:', endpoint);

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

    // Special handling for order creation
    if (endpoint === 'orders') {
      console.log('🔄 Handling order creation request');
      return await handleOrderCreation(body);
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
        console.log(`🔄 POST Attempt ${attempt} for ${url.toString()}`);
        
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
          console.log(`❌ POST HTTP ${r.status}: ${text}`);
          return new NextResponse(text || r.statusText, {
            status: r.status,
            headers: { "content-type": r.headers.get("content-type") || "text/plain" },
          });
        }
        
        console.log(`✅ POST Success on attempt ${attempt}`);
        return new NextResponse(text, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        lastError = error as Error;
        console.log(`❌ POST Attempt ${attempt} failed:`, error);
        
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

