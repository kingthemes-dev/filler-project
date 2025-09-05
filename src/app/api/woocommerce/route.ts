import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache';

const WC_URL = process.env.WOOCOMMERCE_API_URL;
const CK = process.env.WOOCOMMERCE_CONSUMER_KEY;
const CS = process.env.WOOCOMMERCE_CONSUMER_SECRET;

// Handle shipping methods endpoint
async function handleShippingMethods(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") || "PL";
  const state = searchParams.get("state") || "";
  const city = searchParams.get("city") || "";
  const postcode = searchParams.get("postcode") || "";
  
  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { error: 'Server misconfiguration', details: 'WooCommerce env vars are missing' },
      { status: 500 }
    );
  }

  try {
    // Get shipping zones and methods from WooCommerce
    const shippingZonesUrl = `${WC_URL}/shipping/zones?consumer_key=${CK}&consumer_secret=${CS}`;
    const zonesResponse = await fetch(shippingZonesUrl);
    
    if (!zonesResponse.ok) {
      throw new Error(`Failed to fetch shipping zones: ${zonesResponse.status}`);
    }
    
    const zones = await zonesResponse.json();
    
    // Get methods for each zone
    const shippingMethods = [];
    
    for (const zone of zones) {
      const methodsUrl = `${WC_URL}/shipping/zones/${zone.id}/methods?consumer_key=${CK}&consumer_secret=${CS}`;
      const methodsResponse = await fetch(methodsUrl);
      
      if (methodsResponse.ok) {
        const methods = await methodsResponse.json();
        for (const method of methods) {
          if (method.enabled) {
            shippingMethods.push({
              id: method.id,
              method_id: method.method_id,
              method_title: method.method_title,
              method_description: method.method_description,
              settings: method.settings,
              zone_id: zone.id,
              zone_name: zone.name,
              zone_locations: zone.locations
            });
          }
        }
      }
    }
    
    // Process and normalize shipping methods (same logic as in service)
    const processedMethods = shippingMethods.map((method: any) => {
      let cost = 0;
      let freeShippingThreshold = 0;
      
      // Handle Flexible Shipping methods
      if (method.method_id === 'flexible_shipping_single') {
        const settings = method.settings;
        
        // Get free shipping threshold
        if (settings.method_free_shipping && settings.method_free_shipping.value) {
          freeShippingThreshold = parseFloat(settings.method_free_shipping.value); // Keep as PLN, not cents
        }
        
        // Get cost from rules
        if (settings.method_rules && settings.method_rules.value && settings.method_rules.value.length > 0) {
          const rules = settings.method_rules.value;
          // Find the rule that applies (usually the first one)
          if (rules[0] && rules[0].cost_per_order) {
            cost = parseFloat(rules[0].cost_per_order); // Keep as PLN, not cents
          }
        }
      }
      // Handle Flat Rate methods
      else if (method.method_id === 'flat_rate') {
        const settings = method.settings;
        if (settings.cost && settings.cost.value) {
          cost = parseFloat(settings.cost.value); // Keep as PLN, not cents
        }
      }
      
      // Clean HTML from description
      const cleanDescription = (desc: string) => {
        if (!desc) return '';
        // Remove HTML tags and decode entities
        return desc
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&rarr;/g, '→') // Decode arrow
          .replace(/&nbsp;/g, ' ') // Decode non-breaking space
          .replace(/&amp;/g, '&') // Decode ampersand
          .replace(/&lt;/g, '<') // Decode less than
          .replace(/&gt;/g, '>') // Decode greater than
          .replace(/&quot;/g, '"') // Decode quote
          .trim();
      };

      return {
        id: method.id,
        method_id: method.method_id,
        method_title: method.settings.method_title?.value || method.method_title,
        method_description: cleanDescription(method.settings.method_description?.value || method.method_description),
        cost: cost,
        free_shipping_threshold: freeShippingThreshold,
        zone_id: method.zone_id,
        zone_name: method.zone_name,
        settings: method.settings
      };
    });

    return NextResponse.json({
      success: true,
      shipping_methods: processedMethods,
      country,
      state,
      city,
      postcode
    });
    
  } catch (error: any) {
    console.error('Shipping methods API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shipping methods', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const endpoint = searchParams.get("endpoint") || "products";
  const bypassCache = searchParams.get("cache") === "off";
  
  // Special handling for shipping methods
  if (endpoint === "shipping_methods") {
    return handleShippingMethods(req);
  }
  
  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { error: 'Server misconfiguration', details: 'WooCommerce env vars are missing' },
      { status: 500 }
    );
  }

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const rateLimit = cache.checkRateLimit(ip);
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toString()
        }
      }
    );
  }

  const url = new URL(`${WC_URL.replace(/\/$/, "")}/${endpoint}`);
  searchParams.forEach((v, k) => {
    if (k !== "endpoint" && k !== "cache") url.searchParams.set(k, v);
  });
  url.searchParams.set("consumer_key", CK);
  url.searchParams.set("consumer_secret", CS);

  console.log('🔍 API Route Debug:');
  console.log('WC_URL:', WC_URL);
  console.log('CK:', CK ? 'SET' : 'NOT SET');
  console.log('CS:', CS ? 'SET' : 'NOT SET');
  console.log('Final URL:', url.toString());
  console.log('Bypass cache:', bypassCache);

  try {
    // Cache lookup (skip if bypass)
    const cacheKey = cache.generateKey(url.toString());
    let cached = null;
    
    if (!bypassCache) {
      cached = await cache.get(cacheKey);
    }
    
    if (cached) {
      return new NextResponse(cached.body, {
        status: 200,
        headers: {
          "content-type": "application/json",
          "Cache-Control": `public, max-age=30, s-maxage=60`,
          "ETag": cached.etag,
          "X-Cache": "HIT",
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          ...cached.headers
        },
      });
    }

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
        
        // Populate cache (skip if bypass)
        if (!bypassCache) {
          await cache.set(cacheKey, text, 60000, {
            'X-Response-Time': `${Date.now() - Date.now()}ms`,
            'X-Attempt': attempt.toString()
          });
        }
        
        const etag = cache.generateETag(text);
        return new NextResponse(text, {
          status: 200,
          headers: {
            "content-type": "application/json",
            "Cache-Control": `public, max-age=30, s-maxage=60`,
            "ETag": etag,
            "X-Cache": bypassCache ? "BYPASS" : "MISS",
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
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

  if (!WC_URL || !CK || !CS) {
    return NextResponse.json(
      { error: 'Server misconfiguration', details: 'WooCommerce env vars are missing' },
      { status: 500 }
    );
  }

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
