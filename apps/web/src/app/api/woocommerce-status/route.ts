import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { env } from '@/config/env';

interface WooCommerceStatus {
  api: {
    status: string;
    responseTime: number;
    lastCheck: string;
    version?: string;
  };
  products: {
    total: number;
    published: number;
    featured: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
  };
  customers: {
    total: number;
    active: number;
  };
  webhooks: {
    status: string;
    count: number;
  };
  integration: {
    url: string;
    consumerKey: string;
    consumerSecret: string;
    webhookSecret: string;
  };
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const _startTime = Date.now();
    
    // Get environment variables
    const wcUrl = env.NEXT_PUBLIC_WC_URL;
    const consumerKey = env.WC_CONSUMER_KEY;
    const consumerSecret = env.WC_CONSUMER_SECRET;
    const webhookSecret = env.WOOCOMMERCE_WEBHOOK_SECRET;

    if (!wcUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json({
        error: 'WooCommerce configuration missing',
        integration: {
          url: wcUrl || 'Not Set',
          consumerKey: consumerKey ? 'Set' : 'Not Set',
          consumerSecret: consumerSecret ? 'Set' : 'Not Set',
          webhookSecret: webhookSecret ? 'Set' : 'Not Set',
        }
      }, { status: 400 });
    }

    // Test API connection
    let apiStatus = 'error';
    let responseTime = 0;
    let version = 'Unknown';

    try {
      const apiStart = Date.now();
      const apiResponse = await fetch(`${wcUrl}/system_status`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });
      responseTime = Date.now() - apiStart;
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        apiStatus = 'ok';
        version = apiData.version || 'Unknown';
      }
    } catch (error) {
      console.error('WooCommerce API test failed:', error);
    }

    // Get products count
    let products = { total: 0, published: 0, featured: 0 };
    try {
      const productsResponse = await fetch(`${wcUrl}/products?per_page=1`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });
      
      if (productsResponse.ok) {
        const _productsData = await productsResponse.json();
        const _totalPages = parseInt(productsResponse.headers.get('X-WP-TotalPages') || '0');
        const total = parseInt(productsResponse.headers.get('X-WP-Total') || '0');
        
        products = {
          total,
          published: total, // Simplified - in real app you'd count published separately
          featured: 0, // Simplified - in real app you'd count featured separately
        };
      }
    } catch (error) {
      console.error('Products fetch failed:', error);
    }

    // Get orders count
    let orders = { total: 0, pending: 0, completed: 0 };
    try {
      const ordersResponse = await fetch(`${wcUrl}/orders?per_page=1`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });
      
      if (ordersResponse.ok) {
        const total = parseInt(ordersResponse.headers.get('X-WP-Total') || '0');
        orders = {
          total,
          pending: 0, // Simplified
          completed: 0, // Simplified
        };
      }
    } catch (error) {
      console.error('Orders fetch failed:', error);
    }

    // Get customers count
    let customers = { total: 0, active: 0 };
    try {
      const customersResponse = await fetch(`${wcUrl}/customers?per_page=1`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });
      
      if (customersResponse.ok) {
        const total = parseInt(customersResponse.headers.get('X-WP-Total') || '0');
        customers = {
          total,
          active: total, // Simplified
        };
      }
    } catch (error) {
      console.error('Customers fetch failed:', error);
    }

    // Get webhooks count
    let webhooks = { status: 'unknown', count: 0 };
    try {
      const webhooksResponse = await fetch(`${wcUrl}/webhooks?per_page=1`, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
          'Accept': 'application/json',
        },
      });
      
      if (webhooksResponse.ok) {
        const total = parseInt(webhooksResponse.headers.get('X-WP-Total') || '0');
        webhooks = {
          status: total > 0 ? 'active' : 'inactive',
          count: total,
        };
      }
    } catch (error) {
      console.error('Webhooks fetch failed:', error);
    }

    const status: WooCommerceStatus = {
      api: {
        status: apiStatus,
        responseTime,
        lastCheck: new Date().toISOString(),
        version,
      },
      products,
      orders,
      customers,
      webhooks,
      integration: {
        url: wcUrl,
        consumerKey: consumerKey ? 'Set' : 'Not Set',
        consumerSecret: consumerSecret ? 'Set' : 'Not Set',
        webhookSecret: webhookSecret ? 'Set' : 'Not Set',
      },
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('WooCommerce status check failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check WooCommerce status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
