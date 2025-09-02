import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({ 
      message: 'API route działa!',
      timestamp: new Date().toISOString(),
      env: {
        WOOCOMMERCE_API_URL: process.env.WOOCOMMERCE_API_URL ? 'SET' : 'NOT SET',
        WOOCOMMERCE_CONSUMER_KEY: process.env.WOOCOMMERCE_CONSUMER_KEY ? 'SET' : 'NOT SET',
        WOOCOMMERCE_CONSUMER_SECRET: process.env.WOOCOMMERCE_CONSUMER_SECRET ? 'SET' : 'NOT SET'
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}
