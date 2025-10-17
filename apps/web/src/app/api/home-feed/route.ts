import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const WP_BASE_URL = process.env.WP_BASE_URL || process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';

export async function GET() {
  try {
    // PRO Architecture: Call WordPress King Shop API directly (same as /api/woocommerce?endpoint=shop)
    // Fetch ALL pages to get all products
    let allProducts: any[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      const shopUrl = `https://qvwltjhdjw.cfolks.pl/wp-json/king-shop/v1/data?endpoint=shop&per_page=100&page=${page}`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🏠 Home feed - calling King Shop API page ${page}:`, shopUrl);
      }
      
      // Fetch products using our optimized API with timeout
      const productsResponse = await fetch(shopUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Filler-Store/1.0'
        },
        next: { 
          revalidate: 300, // 5 minutes
          tags: ['home-feed'] 
        },
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      if (!productsResponse.ok) {
        throw new Error(`API error: ${productsResponse.status}`);
      }
      
      const responseData = await productsResponse.json();
      const pageProducts = responseData.products || [];
      
      allProducts = [...allProducts, ...pageProducts];
      
      // Check if there are more pages
      hasMorePages = pageProducts.length === 100; // If we got 100 products, there might be more
      page++;
      
      // Safety limit to prevent infinite loops
      if (page > 10) {
        console.warn('Reached page limit (10), stopping pagination');
        break;
      }
    }
    
    const products = allProducts;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Home feed data received:', {
        products: products.length,
        pages: page - 1
      });
    }
    
    // Filter out test products (products with empty prices or generic names)
    // PRO: Don't require images - products can have placeholder images
    const validProducts = products.filter((p: any) => 
      p.price && p.price !== '' && 
      p.name && p.name !== 'Produkt' &&
      (p.status === 'publish' || !p.status) // Only published products or products without status field
    );

    // Sort products by date (newest first)
    const sortedProducts = validProducts.sort((a: any, b: any) => 
      new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
    );

    // Organize data into categories with proper fallbacks
    const data = {
      nowosci: sortedProducts.slice(0, 8), // Latest 8 valid products
      promocje: validProducts.filter((p: any) => (p.sale_price && p.sale_price !== '') || p.on_sale).slice(0, 8),
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
    
    // Return fallback data instead of error
    const fallbackData = {
      nowosci: [],
      promocje: [],
      polecane: [],
      bestsellery: []
    };
    
    return NextResponse.json(fallbackData, {
      status: 200, // Return 200 with empty data instead of 500
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });
  }
}
