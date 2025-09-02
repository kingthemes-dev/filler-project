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

  try {
    const r = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const text = await r.text();
    if (!r.ok) {
      return new NextResponse(text || r.statusText, {
        status: r.status,
        headers: { "content-type": r.headers.get("content-type") || "text/plain" },
      });
    }
    return new NextResponse(text, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
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
    
    const r = await fetch(url.toString(), {
      method: 'POST',
      headers: { 
        Accept: "application/json",
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await r.text();
    if (!r.ok) {
      return new NextResponse(text || r.statusText, {
        status: r.status,
        headers: { "content-type": r.headers.get("content-type") || "text/plain" },
      });
    }
    return new NextResponse(text, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Proxy error", message: e?.message || String(e) },
      { status: 502 }
    );
  }
}
