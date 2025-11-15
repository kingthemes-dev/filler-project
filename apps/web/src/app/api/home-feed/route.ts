import { NextResponse } from 'next/server';
import { env } from '@/config/env';
import { cache } from '@/lib/cache';
import type { NextRequest } from 'next/server';
import {
  createErrorResponse,
  ExternalApiError,
  InternalError,
} from '@/lib/errors';
import { logger } from '@/utils/logger';
import { httpAgent } from '@/utils/http-agent';

type HomeFeedCategory = string | { name?: string; slug?: string };

interface HomeFeedProduct {
  id?: number;
  slug?: string;
  name?: string;
  status?: string;
  categories?: HomeFeedCategory[];
  attributes?: unknown[];
  price?: string;
  regular_price?: string;
  sale_price?: string;
  on_sale?: boolean;
  date_created?: string;
  featured?: boolean;
}

// Removed unused type - using inline type checks instead

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Normalize product categories and attributes to ensure consistent format
 * Optimized for batch processing
 */
function normalizeProductData(product: unknown): unknown {
  if (!isRecord(product)) return product;

  // Normalize categories - optimized batch processing
  // Handle both objects (id, name, slug) and strings (legacy format)
  const normalizedCategories = Array.isArray(product.categories)
    ? product.categories.map((cat: unknown) => {
        // Handle object format: { id, name, slug }
        if (cat && typeof cat === 'object') {
          const catObj = cat as Record<string, unknown>;
          return {
            id:
              typeof catObj.id === 'number'
                ? catObj.id
                : Number(catObj.id ?? 0),
            name:
              typeof catObj.name === 'string'
                ? catObj.name
                : String(catObj.name ?? ''),
            slug:
              typeof catObj.slug === 'string'
                ? catObj.slug
                : String(catObj.slug ?? ''),
          };
        }
        // Handle string format (legacy - just category name)
        if (typeof cat === 'string') {
          return { id: 0, name: cat, slug: cat.toLowerCase().replace(/\s+/g, '-') };
        }
        // Fallback for unknown types
        return { id: 0, name: String(cat ?? ''), slug: String(cat ?? '') };
      })
    : [];

  // Normalize attributes - optimized batch processing
  const normalizedAttributes = Array.isArray(product.attributes)
    ? product.attributes.map((attr: unknown) => {
        if (!attr || typeof attr !== 'object') {
          return {
            id: 0,
            name: String(attr ?? ''),
            position: 0,
            visible: false,
            variation: false,
            options: [],
          };
        }

        const attrObj = attr as Record<string, unknown>;
        const normalizedAttr = {
          id:
            typeof attrObj.id === 'number'
              ? attrObj.id
              : Number(attrObj.id ?? 0),
          name:
            typeof attrObj.name === 'string'
              ? attrObj.name
              : String(attrObj.name ?? ''),
          position:
            typeof attrObj.position === 'number'
              ? attrObj.position
              : Number(attrObj.position ?? 0),
          visible: Boolean(attrObj.visible),
          variation: Boolean(attrObj.variation),
          options: [] as string[],
        };

        // Normalize options - handle both string[] and object[]
        if (Array.isArray(attrObj.options)) {
          normalizedAttr.options = attrObj.options
            .map((opt: unknown) => {
              if (typeof opt === 'string') {
                return opt;
              } else if (typeof opt === 'object' && opt !== null) {
                const optObj = opt as Record<string, unknown>;
                if ('name' in optObj && typeof optObj.name === 'string') {
                  return optObj.name;
                } else if (
                  'value' in optObj &&
                  typeof optObj.value === 'string'
                ) {
                  return optObj.value;
                } else if (
                  'option' in optObj &&
                  typeof optObj.option === 'string'
                ) {
                  return optObj.option;
                } else if (
                  'slug' in optObj &&
                  typeof optObj.slug === 'string'
                ) {
                  return optObj.slug;
                }
                const str = String(opt);
                return str !== '[object Object]' ? str : '';
              }
              return String(opt ?? '');
            })
            .filter((opt): opt is string => Boolean(opt));
        }

        return normalizedAttr;
      })
    : [];

  return {
    ...product,
    categories: normalizedCategories,
    attributes: normalizedAttributes,
  };
}

/**
 * Batch normalize products array for better performance
 */
function normalizeProductsBatch(products: unknown[]): HomeFeedProduct[] {
  return products.map(product => 
    normalizeProductData(product) as HomeFeedProduct
  );
}

/**
 * Normalize products array (for list endpoints)
 */
function normalizeProductsData(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(product => normalizeProductData(product));
  }
  if (isRecord(data) && Array.isArray(data.data)) {
    return {
      ...data,
      data: data.data.map((product: unknown) => normalizeProductData(product)),
    };
  }
  if (isRecord(data) && Array.isArray(data.products)) {
    return {
      ...data,
      products: data.products.map((product: unknown) =>
        normalizeProductData(product)
      ),
    };
  }
  return normalizeProductData(data);
}

const _toProductsArray = (source: unknown): HomeFeedProduct[] => {
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
        return new NextResponse(null, {
          status: 304,
          headers: { ETag: cached.etag },
        });
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
      throw new InternalError('WordPress URL not configured', {
        endpoint: 'home-feed',
      });
    }

    // OPTIMIZATION: Fetch products in parallel with httpAgent for connection pooling
    // Reduced perPage from 48 to 24 for smaller payload
    const perPage = 24; // Reduced from 48 for better performance
    const maxPages = process.env.NODE_ENV === 'development' ? 1 : 2; // Limit pages for performance

    // Check cache for promocje separately
    const promocjeCacheKey = cache.generateKey('/api/home-feed-promocje');
    const promocjeCached = await cache.get(promocjeCacheKey);

    // Fetch first page and promocje in parallel using httpAgent
    // King Shop API returns { products: [...], total: ..., categories: [...], attributes: {...} }
    const fetchPromises: Promise<Response>[] = [
      // Main products (first page)
      httpAgent.fetch(
        `${WORDPRESS_URL}/wp-json/king-shop/v1/data?endpoint=shop&per_page=${perPage}&page=1`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'Filler-Store/1.0',
          },
          signal: AbortSignal.timeout(15000), // 15s timeout
        }
      ),
    ];

    // Only fetch promocje if not cached
    if (!promocjeCached) {
      fetchPromises.push(
        httpAgent.fetch(
          `${WORDPRESS_URL}/wp-json/king-shop/v1/data?endpoint=shop&per_page=24&page=1&on_sale=true`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'User-Agent': 'Filler-Store/1.0',
            },
            signal: AbortSignal.timeout(15000), // 15s timeout
          }
        )
      );
    }

    // If production and need more pages, fetch second page in parallel too
    if (maxPages > 1) {
      fetchPromises.push(
        httpAgent.fetch(
          `${WORDPRESS_URL}/wp-json/king-shop/v1/data?endpoint=shop&per_page=${perPage}&page=2`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'User-Agent': 'Filler-Store/1.0',
            },
            signal: AbortSignal.timeout(15000),
          }
        )
      );
    }

    // Execute all fetches in parallel
    const responses = await Promise.allSettled(fetchPromises);

    // Process main products
    let allProducts: HomeFeedProduct[] = [];
    let promocjeProducts: HomeFeedProduct[] = [];

    // Track which response index is for promocje
    const promocjeResponseIndex = promocjeCached ? -1 : 1;

    // First response: main products page 1
    if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
      try {
        const responseData = await responses[0].value.json();
        // King Shop API returns { products: [...], total: ..., categories: [...], attributes: {...} }
        let rawProducts: unknown = null;
        if (isRecord(responseData)) {
          // Check for products array in the response
          if (Array.isArray(responseData.products)) {
            rawProducts = responseData.products;
          } else if (
            isRecord(responseData.data) &&
            Array.isArray(responseData.data.products)
          ) {
            rawProducts = responseData.data.products;
          } else if (Array.isArray(responseData)) {
            // Response might be a direct array
            rawProducts = responseData;
          }
        } else if (Array.isArray(responseData)) {
          rawProducts = responseData;
        }

        if (
          rawProducts &&
          Array.isArray(rawProducts) &&
          rawProducts.length > 0
        ) {
          // Batch normalize products for better performance
          const pageProducts = normalizeProductsBatch(rawProducts);
          allProducts = [...allProducts, ...pageProducts];

          logger.info('Home feed: parsed products from page 1', {
            count: pageProducts.length,
            rawCount: Array.isArray(rawProducts) ? rawProducts.length : 0,
          });
        } else {
          logger.warn('Home feed: no products found in page 1 response', {
            hasResponseData: !!responseData,
            isRecord: isRecord(responseData),
            hasProducts: isRecord(responseData) && 'products' in responseData,
            productsType:
              isRecord(responseData) && 'products' in responseData
                ? typeof responseData.products
                : 'N/A',
          });
        }
      } catch (error) {
        logger.error('Home feed: error parsing main products page 1', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    } else {
      const errorDetails =
        responses[0].status === 'rejected'
          ? { reason: String(responses[0].reason) }
          : responses[0].status === 'fulfilled' && !responses[0].value.ok
            ? {
                status: responses[0].value.status,
                statusText: responses[0].value.statusText,
              }
            : { status: 'unknown' };
      logger.warn(
        'Home feed: failed to fetch main products page 1',
        errorDetails
      );
    }

    // Second response: promocje
    if (promocjeCached) {
      // Use cached promocje data
      try {
        const cachedPromocje = JSON.parse(promocjeCached.body) as HomeFeedProduct[];
        promocjeProducts = Array.isArray(cachedPromocje) ? cachedPromocje : [];
        logger.info('Home feed: using cached promocje products', {
          count: promocjeProducts.length,
        });
      } catch (error) {
        logger.warn('Home feed: error parsing cached promocje', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (
      promocjeResponseIndex >= 0 &&
      responses[promocjeResponseIndex]?.status === 'fulfilled' &&
      responses[promocjeResponseIndex].value.ok
    ) {
      try {
        const promocjeData = await responses[promocjeResponseIndex].value.json();
        // King Shop API returns { products: [...], total: ..., categories: [...], attributes: {...} }
        let rawPromocje: unknown = null;
        if (isRecord(promocjeData)) {
          if (Array.isArray(promocjeData.products)) {
            rawPromocje = promocjeData.products;
          } else if (
            isRecord(promocjeData.data) &&
            Array.isArray(promocjeData.data.products)
          ) {
            rawPromocje = promocjeData.data.products;
          } else if (Array.isArray(promocjeData)) {
            rawPromocje = promocjeData;
          }
        } else if (Array.isArray(promocjeData)) {
          rawPromocje = promocjeData;
        }

        if (
          rawPromocje &&
          Array.isArray(rawPromocje) &&
          rawPromocje.length > 0
        ) {
          // Batch normalize promocje products
          promocjeProducts = normalizeProductsBatch(rawPromocje);
          
          // Cache promocje separately for better cache hit rate
          const promocjeBody = JSON.stringify(promocjeProducts);
          const promocjeTtlMs = process.env.NODE_ENV === 'production' ? 300_000 : 180_000; // 5min prod, 3min dev
          await cache.set(
            promocjeCacheKey,
            promocjeBody,
            promocjeTtlMs,
            {
              'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
              'Content-Type': 'application/json',
            },
            ['products', 'promocje'] // OPTIMIZATION: Cache tags for invalidation
          );

          logger.info('Home feed: parsed and cached promocje products', {
            count: promocjeProducts.length,
          });
        } else {
          logger.warn('Home feed: no promocje products found in response');
        }
      } catch (error) {
        logger.error('Home feed: error parsing promocje', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (promocjeResponseIndex >= 0) {
      const errorDetails =
        responses[promocjeResponseIndex].status === 'rejected'
          ? { reason: String(responses[promocjeResponseIndex].reason) }
          : responses[promocjeResponseIndex].status === 'fulfilled' &&
              !responses[promocjeResponseIndex].value.ok
            ? {
                status: responses[promocjeResponseIndex].value.status,
                statusText: responses[promocjeResponseIndex].value.statusText,
              }
            : { status: 'unknown' };
      logger.warn(
        'Home feed: failed to fetch promocje, will filter from all products',
        errorDetails
      );
    }

    // Third response: main products page 2 (if fetched)
    // Adjust index based on whether promocje was fetched
    const page2ResponseIndex = maxPages > 1 ? (promocjeCached ? 1 : 2) : -1;
    if (
      page2ResponseIndex >= 0 &&
      responses[page2ResponseIndex]?.status === 'fulfilled' &&
      responses[page2ResponseIndex].value.ok
    ) {
      try {
        const responseData = await responses[page2ResponseIndex].value.json();
        let rawProducts: unknown = null;
        if (isRecord(responseData)) {
          if (Array.isArray(responseData.products)) {
            rawProducts = responseData.products;
          } else if (
            isRecord(responseData.data) &&
            Array.isArray(responseData.data.products)
          ) {
            rawProducts = responseData.data.products;
          } else if (Array.isArray(responseData)) {
            rawProducts = responseData;
          }
        } else if (Array.isArray(responseData)) {
          rawProducts = responseData;
        }

        if (
          rawProducts &&
          Array.isArray(rawProducts) &&
          rawProducts.length > 0
        ) {
          // Batch normalize products for better performance
          const pageProducts = normalizeProductsBatch(rawProducts);
          allProducts = [...allProducts, ...pageProducts];

          logger.info('Home feed: parsed products from page 2', {
            count: pageProducts.length,
          });
        }
      } catch (error) {
        logger.error('Home feed: error parsing main products page 2', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const products = allProducts;

    logger.info('Home feed data received', {
      products: products.length,
      pagesFetched: maxPages,
      promocjeCount: promocjeProducts.length,
      allProductsCount: allProducts.length,
    });

    // Filter out test products (products with empty prices or generic names)
    // PRO: Don't require images - products can have placeholder images
    // Relaxed filter: only filter out products with invalid names, don't require status
    const validProducts = products.filter(
      (product): product is HomeFeedProduct => {
        // Basic validation: must have a name and it must not be "Produkt"
        const hasValidName = Boolean(
          product?.name &&
            typeof product.name === 'string' &&
            product.name.trim() !== '' &&
            product.name !== 'Produkt'
        );
        // Status is optional - if present, it should be 'publish', but if absent, allow it
        const hasValidStatus = !product.status || product.status === 'publish';
        return hasValidName && hasValidStatus;
      }
    );

    logger.info('Home feed: filtered valid products', {
      total: products.length,
      valid: validProducts.length,
      filtered: products.length - validProducts.length,
    });

    // Sort products by date (newest first)
    const getCreatedAt = (product: HomeFeedProduct) =>
      product.date_created ? new Date(product.date_created).getTime() : 0;

    const sortedProducts = [...validProducts].sort(
      (a, b) => getCreatedAt(b) - getCreatedAt(a)
    );

    const ensureUnique = (items: HomeFeedProduct[]) => {
      const seen = new Set<string | number>();
      return items.filter(item => {
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
      product.categories.some(cat =>
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
          Boolean(product?.name) &&
          (product.status === 'publish' || !product.status)
      );
    }

    if (finalPromocjeProducts.length < 4) {
      const categoryBased = validProducts.filter(product =>
        categoryMatches(product, fallbackPromoCategories)
      );
      finalPromocjeProducts = [...finalPromocjeProducts, ...categoryBased];
    }

    if (finalPromocjeProducts.length < 4) {
      const discountedFallback = validProducts.filter(product => {
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

    let polecaneProducts = validProducts.filter(
      product => product?.featured === true
    );

    if (polecaneProducts.length < 4) {
      const curatedCategories = [
        'Stymulatory',
        'Kwas hialuronowy',
        'Mezoterapia',
      ];
      const categoryFallback = validProducts.filter(product =>
        categoryMatches(product, curatedCategories)
      );
      polecaneProducts = [...polecaneProducts, ...categoryFallback];
    }

    if (polecaneProducts.length < 4) {
      polecaneProducts = [...polecaneProducts, ...sortedProducts];
    }

    // Final data - normalize all products before returning
    // Note: Products are already normalized when parsed, so we just need to take top 8
    const finalNowosci = takeTop(sortedProducts, 8);
    const finalPromocje = takeTop(finalPromocjeProducts, 8);
    const finalPolecane = takeTop(polecaneProducts, 8);
    const finalBestsellery = takeTop(sortedProducts, 8);

    // Log final counts for debugging
    logger.info('Home feed: final product counts', {
      nowosci: finalNowosci.length,
      promocje: finalPromocje.length,
      polecane: finalPolecane.length,
      bestsellery: finalBestsellery.length,
      allProductsCount: allProducts.length,
      validProductsCount: validProducts.length,
    });

    const data = {
      nowosci: finalNowosci,
      promocje: finalPromocje,
      polecane: finalPolecane,
      bestsellery: finalBestsellery,
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

    // Save to cache (TTL based on environment) with tags
    const ttlMs = process.env.NODE_ENV === 'production' ? 600_000 : 300_000;
    await cache.set(cacheKey, body, ttlMs, headers, ['home-feed', 'products']); // OPTIMIZATION: Cache tags for invalidation
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
        bestsellery: [],
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
        },
      });
    }

    // For other errors, use unified error handling
    return createErrorResponse(error, { endpoint: 'home-feed', method: 'GET' });
  }
}
