import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const WP_BASE_URL = process.env.WP_BASE_URL || process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';

export async function GET() {
  try {
    // Use standard WooCommerce API instead of custom endpoint
    const baseUrl = `${WP_BASE_URL}/wp-json/wc/v3`;
    const auth = `consumer_key=${process.env.WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${process.env.WOOCOMMERCE_CONSUMER_SECRET}`;
    
    // Fetch all products with basic fields
    const productsResponse = await fetch(`${baseUrl}/products?${auth}&per_page=50&_fields=id,name,slug,price,regular_price,sale_price,on_sale,featured,images,categories,stock_status,date_created,type,variations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Filler-Store/1.0'
      },
      next: { 
        revalidate: 300, // 5 minutes
        tags: ['home-feed'] 
      }
    });

    const raw = await productsResponse.text();
    if (!productsResponse.ok) {
      throw new Error(`WooCommerce API error: ${productsResponse.status} ${raw.slice(0,120)}`);
    }
    let products: any[] = [];
    try { products = raw ? JSON.parse(raw) : []; } catch (e) {
      console.warn('Home feed: non-JSON from WooCommerce, returning empty feed. Snippet:', raw.slice(0, 200));
      return NextResponse.json(
        { nowosci: [], promocje: [], polecane: [], bestsellery: [] },
        {
          status: 200,
          headers: {
            'Cache-Control': 'no-store',
            'X-Feed-Fallback': 'non-json-from-wp'
          }
        }
      );
    }
    
    // Filter out test products (products with empty prices or generic names)
    const validProducts = products.filter((p: any) => 
      p.price && p.price !== '' && 
      p.name && p.name !== 'Produkt' && 
      p.images && p.images.length > 0
    );

    // Sort products by date (newest first)
    const sortedProducts = validProducts.sort((a: any, b: any) => 
      new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
    );

    // Organize data into categories
    const data = {
      nowosci: sortedProducts.slice(0, 8), // Latest 8 valid products
      promocje: validProducts.filter((p: any) => p.on_sale).slice(0, 8),
      polecane: validProducts.filter((p: any) => p.featured).slice(0, 8),
      bestsellery: sortedProducts.slice(0, 8) // For now, just show first 8 as bestsellers
    };

    // Return with cache headers
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        'X-Cache-Status': 'MISS',
        'X-Edge-Runtime': 'true'
      }
    });

  } catch (error) {
    console.error('Home feed API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch home feed data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  }
}
