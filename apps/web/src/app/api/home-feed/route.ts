import { NextResponse } from 'next/server';
import { env } from '@/config/env';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // PRO Architecture: Call WordPress King Shop API directly (bypassing internal API during SSG)
    // This works during build time (SSG) when internal fetch won't work
    const WORDPRESS_URL = env.NEXT_PUBLIC_WORDPRESS_URL;
    
    if (!WORDPRESS_URL) {
      console.error('❌ NEXT_PUBLIC_WORDPRESS_URL is not defined');
      return NextResponse.json({
        nowosci: [],
        promocje: [],
        polecane: [],
        bestsellery: []
      }, { status: 200 });
    }
    
    // Fetch ALL pages to get all products
    let allProducts: any[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      // Call WordPress API directly instead of internal API (works during SSG/build)
      const perPage = process.env.NODE_ENV === 'development' ? 24 : 48;
      const shopUrl = `${WORDPRESS_URL}/wp-json/king-shop/v1/data?endpoint=shop&per_page=${perPage}&page=${page}`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🏠 Home feed - calling King Shop API page ${page}:`, shopUrl);
      }
      
      // Fetch products directly from WordPress API with timeout
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
      const pageProducts = responseData.products || responseData.data?.products || [];
      
      allProducts = [...allProducts, ...pageProducts];
      
      // Check if there are more pages
      hasMorePages = pageProducts.length === perPage; // If we got a full page, there might be more
      page++;
      
      // W trybie development pobierz tylko pierwszą stronę, żeby przyspieszyć HMR i TTFB
      if (process.env.NODE_ENV === 'development') {
        hasMorePages = false;
      }
      // Safety limit to prevent infinite loops w produkcji
      if (page > 5) {
        console.warn('Reached page limit (5), stopping pagination');
        break;
      }
    }
    
    // Fetch products on sale separately using API filter
    let promocjeProducts: any[] = [];
    try {
      const promocjeUrl = `${WORDPRESS_URL}/wp-json/king-shop/v1/data?endpoint=shop&per_page=24&page=1&on_sale=true`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🏷️ Home feed - calling King Shop API for promocje:`, promocjeUrl);
      }
      
      const promocjeResponse = await fetch(promocjeUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Filler-Store/1.0'
        },
        next: { 
          revalidate: 300, // 5 minutes
          tags: ['home-feed-promocje'] 
        },
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      if (promocjeResponse.ok) {
        const promocjeData = await promocjeResponse.json();
        promocjeProducts = promocjeData.products || promocjeData.data?.products || [];
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Promocje from API (on_sale=true):`, promocjeProducts.length);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch promocje separately, will filter from all products:', error);
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
    // Use promocjeProducts from API if available, otherwise filter from validProducts
    let finalPromocjeProducts: any[] = [];
    if (promocjeProducts.length > 0) {
      // Use products fetched with on_sale=true from API
      finalPromocjeProducts = promocjeProducts.filter((p: any) => 
        p.price && p.price !== '' && 
        p.name && p.name !== 'Produkt' &&
        (p.status === 'publish' || !p.status)
      );
    } else {
      // Fallback: filter from all products if API didn't return promocje
      finalPromocjeProducts = validProducts.filter((p: any) => {
        const hasSalePrice = p.sale_price && p.sale_price !== '' && p.sale_price !== '0';
        const hasOnSaleFlag = p.on_sale === true;
        const priceDiffers = p.price && p.regular_price && parseFloat(p.price) < parseFloat(p.regular_price);
        
        return hasSalePrice || hasOnSaleFlag || priceDiffers;
      });
    }
    
    
    const data = {
      nowosci: sortedProducts.slice(0, 8), // Latest 8 valid products
      promocje: finalPromocjeProducts.slice(0, 8),
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
