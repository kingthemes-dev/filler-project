import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { cartProxySchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

const WC_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';
const CART_API_SECRET = env.KING_CART_API_SECRET;

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const sanitizedBody = validateApiInput(rawBody);
    const validationResult = cartProxySchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError('Nieprawidłowe dane koszyka', validationResult.error.errors),
        { endpoint: 'cart-proxy', method: 'POST' }
      );
    }

    const { action = 'add', ...rest } = validationResult.data;

    let targetUrl = `${WC_URL}/wp-json/king-cart/v1/add-item`;
    let method = 'POST';
    let payload: Record<string, unknown> = { ...rest };

    if (action === 'remove') {
      if (!rest.key) {
        return NextResponse.json(
          { success: false, error: 'Brak identyfikatora pozycji w koszyku' },
          { status: 400 }
        );
      }
      targetUrl = `${WC_URL}/wp-json/king-cart/v1/remove-item`;
      payload = { key: rest.key };
    } else if (action === 'update') {
      if (!rest.key || typeof rest.quantity === 'undefined') {
        return NextResponse.json(
          { success: false, error: 'Klucz pozycji i ilość są wymagane do aktualizacji koszyka' },
          { status: 400 }
        );
      }
      targetUrl = `${WC_URL}/wp-json/king-cart/v1/update-item`;
      payload = { key: rest.key, quantity: rest.quantity };
    } else if (action === 'cart') {
      const getResp = await fetch(`${WC_URL}/wp-json/king-cart/v1/cart`, {
        method: 'GET',
        headers: {
          'X-King-Secret': CART_API_SECRET,
        },
      });
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
        },
      });
    } else {
      if (typeof rest.product_id === 'undefined') {
        return NextResponse.json(
          { success: false, error: 'ID produktu jest wymagane do dodania do koszyka' },
          { status: 400 }
        );
      }
      payload = {
        product_id: rest.product_id,
        quantity: typeof rest.quantity !== 'undefined' ? rest.quantity : 1,
        variation_id: rest.variation_id,
        attributes: rest.attributes,
        cart_item_data: rest.cart_item_data,
      };
    }

    const cartResponse = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-King-Secret': CART_API_SECRET,
      },
      body: method === 'POST' ? JSON.stringify(payload) : undefined,
    });

    const cartText = await cartResponse.text();

    let cartJsonText = cartText;
    const cartJsonMatch = cartText.match(/\{.*\}/);
    if (cartJsonMatch) {
      cartJsonText = cartJsonMatch[0];
    }

    const cartData = JSON.parse(cartJsonText);

    logger.debug('Cart proxy response', {
      status: cartResponse.status,
      payload: cartData?.data ? '[...payload]' : cartData,
      action
    });

    return NextResponse.json(cartData, {
      status: cartResponse.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown cart proxy error');
    logger.error('Cart proxy error', {
      error: err.message,
      action: req.method,
      url: req.url,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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
