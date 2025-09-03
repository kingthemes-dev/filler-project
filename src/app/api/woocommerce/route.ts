import { NextRequest, NextResponse } from 'next/server';

const WC_URL = process.env.WOOCOMMERCE_API_URL!;
const CK = process.env.WOOCOMMERCE_CONSUMER_KEY!;
const CS = process.env.WOOCOMMERCE_CONSUMER_SECRET!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "products";

  const url = new URL(`${WC_URL.replace(/\/$/, "")}/${endpoint}`);
  searchParams.forEach((v, k) => {
    if (k !== "endpoint") url.searchParams.set(k, v);
  });
  url.searchParams.set("consumer_key", CK);
  url.searchParams.set("consumer_secret", CS);

  console.log('🔍 API Route Debug:');
  console.log('WC_URL:', WC_URL);
  console.log('CK:', CK ? 'SET' : 'NOT SET');
  console.log('CS:', CS ? 'SET' : 'NOT SET');
  console.log('Final URL:', url.toString());

  try {
    // Retry logic for better reliability
    let lastError: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt} for ${url.toString()}`);
        
        const r = await fetch(url.toString(), {
          headers: { 
            Accept: "application/json",
            'User-Agent': 'Filler-Store/1.0'
          },
          cache: "no-store",
        });

        const text = await r.text();
        if (!r.ok) {
          console.log(`❌ HTTP ${r.status}: ${text}`);
          return new NextResponse(text || r.statusText, {
            status: r.status,
            headers: { "content-type": r.headers.get("content-type") || "text/plain" },
          });
        }
        
        console.log(`✅ Success on attempt ${attempt}`);
        return new NextResponse(text, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt} failed:`, error);
        
        if (attempt < 3) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    
    // All attempts failed
    throw lastError;
  } catch (e: any) {
    console.error('🚨 All attempts failed:', e);
    return NextResponse.json(
      { error: "Proxy error", message: e?.message || String(e) },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "products";

  const url = new URL(`${WC_URL.replace(/\/$/, "")}/${endpoint}`);
  url.searchParams.set("consumer_key", CK);
  url.searchParams.set("consumer_secret", CS);

  try {
    const body = await req.json();
    
    // Retry logic for POST requests too
    let lastError: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 POST Attempt ${attempt} for ${url.toString()}`);
        
        const r = await fetch(url.toString(), {
          method: 'POST',
          headers: { 
            Accept: "application/json",
            'Content-Type': 'application/json',
            'User-Agent': 'Filler-Store/1.0'
          },
          body: JSON.stringify(body),
          cache: "no-store",
        });

        const text = await r.text();
        if (!r.ok) {
          console.log(`❌ POST HTTP ${r.status}: ${text}`);
          return new NextResponse(text || r.statusText, {
            status: r.status,
            headers: { "content-type": r.headers.get("content-type") || "text/plain" },
          });
        }
        
        console.log(`✅ POST Success on attempt ${attempt}`);
        return new NextResponse(text, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        lastError = error;
        console.log(`❌ POST Attempt ${attempt} failed:`, error);
        
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    
    throw lastError;
  } catch (e: any) {
    console.error('🚨 POST All attempts failed:', e);
    return NextResponse.json(
      { error: "Proxy error", message: e?.message || String(e) },
      { status: 502 }
    );
  }
}
