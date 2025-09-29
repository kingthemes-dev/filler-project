import { NextRequest, NextResponse } from 'next/server';

const WC_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Get nonce first
    const nonceResponse = await fetch(`${WC_URL}/wp-json/king-cart/v1/nonce`);
    const nonceData = await nonceResponse.json();
    
    if (!nonceData.success) {
      return NextResponse.json({ success: false, error: 'Failed to get nonce' }, { status: 500 });
    }
    
    // Add item to cart with nonce
    const cartResponse = await fetch(`${WC_URL}/wp-json/king-cart/v1/add-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': nonceData.nonce,
      },
      body: JSON.stringify(body),
    });
    
    const cartData = await cartResponse.json();
    
    return NextResponse.json(cartData, { 
      status: cartResponse.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
    
  } catch (error: any) {
    console.error('Cart proxy error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
