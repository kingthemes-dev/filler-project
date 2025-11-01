import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { env } from '@/config/env';

// Readiness: sprawdza kluczowe zależności wymagane do obsługi ruchu
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const checks = {
    wordpress: false,
    woocommerce: false,
  };
  let status: number = 200;

  try {
    // WordPress API
    const wp = await fetch(
      `${env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=1`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000) }
    );
    checks.wordpress = wp.ok;
  } catch {
    checks.wordpress = false;
  }

  try {
    // WooCommerce API
    const wc = await fetch(
      `${env.NEXT_PUBLIC_WC_URL}/products?per_page=1`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}` ).toString('base64')}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    checks.woocommerce = wc.ok;
  } catch {
    checks.woocommerce = false;
  }

  if (!checks.wordpress || !checks.woocommerce) {
    status = 503;
  }

  return NextResponse.json(
    {
      status: status === 200 ? 'ready' : 'not-ready',
      timestamp: new Date().toISOString(),
      services: checks,
    },
    { status }
  );
}

export async function HEAD(): Promise<NextResponse> {
  const res = await GET(new Request('http://localhost') as unknown as NextRequest);
  return new NextResponse(null, { status: res.status });
}


