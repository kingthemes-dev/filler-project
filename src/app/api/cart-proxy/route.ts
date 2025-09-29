import { NextRequest, NextResponse } from 'next/server';

const WC_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';

console.log('🔧 Cart Proxy - WC_URL:', WC_URL);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Use our custom mu-plugin endpoint (nonce verification disabled)
    const cartResponse = await fetch(`${WC_URL}/wp-json/king-cart/v1/add-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const cartText = await cartResponse.text();
    
    // Handle HTML errors before JSON (common with WordPress)
    let cartJsonText = cartText;
    const cartJsonMatch = cartText.match(/\{.*\}/);
    if (cartJsonMatch) {
      cartJsonText = cartJsonMatch[0];
    }
    
    const cartData = JSON.parse(cartJsonText);
    
    console.log('🔧 Cart Proxy Response:', { status: cartResponse.status, data: cartData });
    
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
