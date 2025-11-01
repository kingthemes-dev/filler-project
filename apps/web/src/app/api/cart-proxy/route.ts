import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

const WC_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';

console.log('🔧 Cart Proxy - WC_URL:', WC_URL);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action || 'add';
    let targetUrl = `${WC_URL}/wp-json/king-cart/v1/add-item`;
    let method = 'POST';
    let payload: any = body;

    if (action === 'remove') {
      targetUrl = `${WC_URL}/wp-json/king-cart/v1/remove-item`;
      method = 'POST';
      payload = { key: body.key };
    } else if (action === 'update') {
      targetUrl = `${WC_URL}/wp-json/king-cart/v1/update-item`;
      method = 'POST';
      payload = { key: body.key, quantity: body.quantity };
    } else if (action === 'cart') {
      // Fetch current cart state
      const getResp = await fetch(`${WC_URL}/wp-json/king-cart/v1/cart`, { method: 'GET' });
      const getText = await getResp.text();
      let getJsonText = getText;
      const getMatch = getText.match(/\{.*\}/);
      if (getMatch) getJsonText = getMatch[0];
      const getData = JSON.parse(getJsonText);
      return NextResponse.json(getData, {
        status: getResp.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // Use our custom mu-plugin endpoints (nonce verification disabled)
    const cartResponse = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method === 'POST' ? JSON.stringify(payload) : undefined,
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

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
