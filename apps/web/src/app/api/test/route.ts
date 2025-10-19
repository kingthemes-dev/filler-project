import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({ 
      message: 'API route działa!',
      timestamp: new Date().toISOString(),
      env: {
        NEXT_PUBLIC_WC_URL: process.env.NEXT_PUBLIC_WC_URL ? 'SET' : 'NOT SET',
        WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY ? 'SET' : 'NOT SET',
        WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET ? 'SET' : 'NOT SET'
      }
    });
  } catch {
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}
