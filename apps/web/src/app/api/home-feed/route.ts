import { NextResponse } from 'next/server';
import { env } from '@/config/env';
import { cache } from '@/lib/cache';
import type { NextRequest } from 'next/server';
import { createErrorResponse, ExternalApiError, InternalError } from '@/lib/errors';
import { logger } from '@/utils/logger';

type HomeFeedCategory = string | { name?: string; slug?: string };

interface HomeFeedProduct {
  id?: number;
  slug?: string;
  name?: string;
  status?: string;
  categories?: HomeFeedCategory[];
  price?: string;
  regular_price?: string;
  sale_price?: string;
  on_sale?: boolean;
  date_created?: string;
  featured?: boolean;
}

type WooProductResponse = {
  products?: unknown;
  data?: {
    products?: unknown;
  };
};

const toProductsArray = (source: unknown): HomeFeedProduct[] => {
  if (!Array.isArray(source)) {
    return [];
  }
  return source as HomeFeedProduct[];
};

export const runtime = 'nodejs';

export async function GET(request?: NextRequest) {
  try {
    // Conditional ETag: check cache first
    const cacheKey = cache.generateKey('/api/home-feed');
    const ifNoneMatch = request?.headers?.get('if-none-match') || null;
    const cached = await cache.get(cacheKey);
    if (cached) {
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        return new NextResponse(null, { status: 304, headers: { ETag: cached.etag } });
      }
      return new NextResponse(cached.body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ETag: cached.etag,
          ...cached.headers,
        },
      });
    }

    // PRO Architecture: Call WordPress King Shop API directly (bypassing internal API during SSG)
    // This works during build time (SSG) when internal fetch won't work
    const WORDPRESS_URL = env.NEXT_PUBLIC_WORDPRESS_URL;
    
    if (!WORDPRESS_URL) {
      logger.error('NEXT_PUBLIC_WORDPRESS_URL is not defined');
      throw new InternalError('WordPress URL not configured', { endpoint: 'home-feed' });
    }
    
    // OPTIMIZATION: Fetch products in parallel instead of sequentially
    // For home feed, we only need first page (8 products per category = 32 total)
    const perPage = 48; // Get more products in one request
    const maxPages = process.env.NODE_ENV === 'development' ? 1 : 2; // Limit pages for performance
    
    // Fetch first page and promocje in parallel
    const fetchPromises = [
      // Main products (first page)
      fetch(`${WORDPRESS_URL}/wp-json/king-shop/v1/data?endpoint=shop&per_page=${perPage}&page=1`, {
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
      }),
      // Promocje (on sale)
      fetch(`${WORDPRESS_URL}/wp-json/king-shop/v1/data?endpoint=shop&per_page=24&page=1&on_sale=true`, {
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
      }),
    ];
    
    // If production and need more pages, fetch second page in parallel too
    if (maxPages > 1) {
      fetchPromises.push(
        fetch(`${WORDPRESS_URL}/wp-json/king-shop/v1/data?endpoint=shop&per_page=${perPage}&page=2`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Filler-Store/1.0'
          },
          next: { 
            revalidate: 300,
            tags: ['home-feed'] 
          },
          signal: AbortSignal.timeout(10000)
        })
      );
    }
    
    // Execute all fetches in parallel
    const responses = await Promise.allSettled(fetchPromises);
    
    // Process main products
    let allProducts: HomeFeedProduct[] = [];
    let promocjeProducts: HomeFeedProduct[] = [];
    
    // First response: main products page 1
    if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
      const responseData = (await responses[0].value.json()) as WooProductResponse;
      const pageProducts =
        toProductsArray(responseData.products) ||
        toProductsArray(responseData.data?.products);
      allProducts = [...allProducts, ...pageProducts];
    } else {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        logger.debug('Failed to fetch main products page 1', {
          status: responses[0].status === 'rejected' ? 'rejected' : 'fulfilled',
          error: responses[0].status === 'rejected' ? responses[0].reason : 'HTTP error',
        });
      }
    }
    
    // Second response: promocje
    if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
      const promocjeData = (await responses[1].value.json()) as WooProductResponse;
      promocjeProducts =
        toProductsArray(promocjeData.products) ||
        toProductsArray(promocjeData.data?.products);
    } else {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        logger.debug('Failed to fetch promocje, will filter from all products');
      }
    }
    
    // Third response: main products page 2 (if fetched)
    if (maxPages > 1 && responses[2]?.status === 'fulfilled' && responses[2].value.ok) {
      const responseData = (await responses[2].value.json()) as WooProductResponse;
      const pageProducts =
        toProductsArray(responseData.products) ||
        toProductsArray(responseData.data?.products);
      allProducts = [...allProducts, ...pageProducts];
    }
    
    const products = allProducts;
    
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      logger.debug('Home feed data received', {
        products: products.length,
        pagesFetched: maxPages,
        promocjeCount: promocjeProducts.length,
      });
    }
    
    // Filter out test products (products with empty prices or generic names)
    // PRO: Don't require images - products can have placeholder images
    const validProducts = products.filter(
      (product): product is HomeFeedProduct =>
        Boolean(product?.name && product.name !== 'Produkt') &&
        (product.status === 'publish' || !product.status)
    );

    // Sort products by date (newest first)
    const getCreatedAt = (product: HomeFeedProduct) =>
      product.date_created ? new Date(product.date_created).getTime() : 0;

    const sortedProducts = [...validProducts].sort((a, b) => getCreatedAt(b) - getCreatedAt(a));

    const ensureUnique = (items: HomeFeedProduct[]) => {
      const seen = new Set<string | number>();
      return items.filter((item) => {
        const key = item?.id ?? item?.slug;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    const takeTop = (items: HomeFeedProduct[], limit = 8) =>
      ensureUnique(items).slice(0, limit);

    const categoryMatches = (product: HomeFeedProduct, categories: string[]) =>
      Array.isArray(product.categories) &&
      product.categories.some((cat) =>
        typeof cat === 'string'
          ? categories.includes(cat)
          : categories.includes(cat?.name ?? '')
      );

    // Organize data into categories with proper fallbacks
    // Use promocjeProducts from API if available, otherwise filter from validProducts
    let finalPromocjeProducts: HomeFeedProduct[] = [];
    const fallbackPromoCategories = ['Promocje', 'Promocja', 'Wyprzedaż'];

    if (promocjeProducts.length > 0) {
      finalPromocjeProducts = promocjeProducts.filter(
        (product): product is HomeFeedProduct =>
          Boolean(product?.name) && (product.status === 'publish' || !product.status)
      );
    }

    if (finalPromocjeProducts.length < 4) {
      const categoryBased = validProducts.filter((product) =>
        categoryMatches(product, fallbackPromoCategories)
      );
      finalPromocjeProducts = [...finalPromocjeProducts, ...categoryBased];
    }

    if (finalPromocjeProducts.length < 4) {
      const discountedFallback = validProducts.filter((product) => {
        const hasSalePrice =
          product?.sale_price !== undefined &&
          product.sale_price !== '' &&
          product.sale_price !== '0';
        const hasOnSaleFlag = product?.on_sale === true;
        const priceDiffers =
          product?.price !== undefined &&
          product?.regular_price !== undefined &&
          parseFloat(product.price) > 0 &&
          parseFloat(product.price) < parseFloat(product.regular_price ?? '0');
        return hasSalePrice || hasOnSaleFlag || priceDiffers;
      });
      finalPromocjeProducts = [...finalPromocjeProducts, ...discountedFallback];
    }

    if (finalPromocjeProducts.length < 4) {
      finalPromocjeProducts = [...finalPromocjeProducts, ...sortedProducts];
    }

    let polecaneProducts = validProducts.filter((product) => product?.featured === true);

    if (polecaneProducts.length < 4) {
      const curatedCategories = ['Stymulatory', 'Kwas hialuronowy', 'Mezoterapia'];
      const categoryFallback = validProducts.filter((product) =>
        categoryMatches(product, curatedCategories)
      );
      polecaneProducts = [...polecaneProducts, ...categoryFallback];
    }

    if (polecaneProducts.length < 4) {
      polecaneProducts = [...polecaneProducts, ...sortedProducts];
    }
    
    
    const data = {
      nowosci: takeTop(sortedProducts, 8),
      promocje: takeTop(finalPromocjeProducts, 8),
      polecane: takeTop(polecaneProducts, 8),
      bestsellery: takeTop(sortedProducts, 8)
    };

    // Prepare response body and headers
    const body = JSON.stringify(data);
    const sMaxAge = process.env.NODE_ENV === 'production' ? 600 : 300;
    const headers = {
      'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=86400`,
      'X-Cache-Status': 'MISS',
      'X-Edge-Runtime': 'true',
      'Content-Type': 'application/json',
    } as Record<string, string>;

    // Save to cache (TTL based on environment)
    const ttlMs = process.env.NODE_ENV === 'production' ? 600_000 : 300_000;
    await cache.set(cacheKey, body, ttlMs, headers);
    const fresh = await cache.get(cacheKey);

    return new NextResponse(body, {
      status: 200,
      headers: {
        ...headers,
        ETag: fresh?.etag ?? '',
      },
    });

  } catch (error) {
    // Check if it's an ExternalApiError (WordPress API failure)
    if (error instanceof ExternalApiError) {
      // Return fallback data for external API errors (graceful degradation)
      const fallbackData = {
        nowosci: [],
        promocje: [],
        polecane: [],
        bestsellery: []
      };
      
      logger.warn('Home feed API error, returning fallback data', {
        error: error.message,
        endpoint: 'home-feed',
      });
      
      return NextResponse.json(fallbackData, {
        status: 200, // Return 200 with empty data (graceful degradation)
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          'X-Fallback': 'true',
        }
      });
    }
    
    // For other errors, use unified error handling
    return createErrorResponse(error, { endpoint: 'home-feed', method: 'GET' });
  }
}
