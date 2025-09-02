import { NextRequest, NextResponse } from 'next/server';

const WC_API_URL = process.env.NEXT_PUBLIC_WC_API_URL || 'https://qvwltjhdjw.cfolks.pl/wp-json/wc/v3';
const WC_CONSUMER_KEY = process.env.NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_KEY;
const WC_CONSUMER_SECRET = process.env.NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 });
    }
    
    if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
      return NextResponse.json({ error: 'WooCommerce credentials not configured' }, { status: 500 });
    }
    
    // Build URL with authentication
    const url = new URL(`${WC_API_URL}/${endpoint}`);
    url.searchParams.append('consumer_key', WC_CONSUMER_KEY);
    url.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
    
    // Add other query parameters
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        url.searchParams.append(key, value);
      }
    });
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'WooCommerce API error' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('WooCommerce API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parameter is required' }, { status: 400 });
    }
    
    if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
      return NextResponse.json({ error: 'WooCommerce credentials not configured' }, { status: 500 });
    }
    
    const body = await request.json();
    
    // Build URL with authentication
    const url = new URL(`${WC_API_URL}/${endpoint}`);
    url.searchParams.append('consumer_key', WC_CONSUMER_KEY);
    url.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      return NextResponse.json({ error: 'WooCommerce API error' }, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('WooCommerce API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
