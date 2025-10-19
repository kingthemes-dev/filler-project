import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check environment variables (server-side only)
    const woocommerce = {
      url: (process.env.NEXT_PUBLIC_WORDPRESS_URL || '') + '/wp-json/wc/v3',
      consumerKey: process.env.WC_CONSUMER_KEY || '',
      consumerSecret: process.env.WC_CONSUMER_SECRET || '',
      webhookSecret: process.env.WOOCOMMERCE_WEBHOOK_SECRET || ''
    };

    const redis = {
      url: process.env.REDIS_URL || '',
      enabled: !!process.env.REDIS_URL
    };

    const performance = {
      cacheEnabled: true,
      cacheTtl: 60,
      monitoringEnabled: true
    };

    const security = {
      csrfEnabled: true,
      rateLimitEnabled: true,
      corsEnabled: true
    };

    return NextResponse.json({
      woocommerce,
      redis,
      performance,
      security
    });

  } catch (error) {
    console.error('Error fetching settings status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch settings status',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
