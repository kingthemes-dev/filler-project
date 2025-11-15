import {
  WooProduct,
  WooProductQuery,
  WooApiResponse,
} from '@/types/woocommerce';
import { CartItem } from '@/stores/cart-store';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

type StoreApiPrices = {
  price?: string;
  regular_price?: string;
  sale_price?: string;
};

type StoreApiProduct = Partial<WooProduct> & {
  prices?: StoreApiPrices;
};

interface RawPaymentGateway {
  id: string;
  title?: string;
  method_title?: string;
  description?: string;
  enabled?: boolean | 'yes' | 'no';
}

type ShippingMethodSettings = Record<string, { value?: unknown }>;

interface ValidationDetail {
  path?: Array<string | number>;
  message?: string;
}

// =========================================
// Optimized WooCommerce Service
// =========================================

/**
 * Normalize Store API product response to WooProduct format
 * Store API doesn't return all fields, so we fill in defaults
 */
function normalizeStoreApiProduct(product: StoreApiProduct): WooProduct {
  const now = new Date().toISOString();
  const priceFromStoreApi = product.prices ?? {};

  return {
    id: Number(product.id ?? 0),
    name: String(product.name ?? ''),
    slug: String(product.slug ?? ''),
    permalink:
      typeof product.permalink === 'string'
        ? product.permalink
        : `/${String(product.slug ?? '')}`,
    date_created: product.date_created ?? now,
    date_created_gmt: product.date_created_gmt ?? now,
    date_modified: product.date_modified ?? now,
    date_modified_gmt: product.date_modified_gmt ?? now,
    type: (product.type as WooProduct['type']) ?? 'simple',
    status: (product.status as WooProduct['status']) ?? 'publish',
    featured: Boolean(product.featured),
    catalog_visibility:
      (product.catalog_visibility as WooProduct['catalog_visibility']) ??
      'visible',
    description: String(product.description ?? ''),
    short_description: String(product.short_description ?? ''),
    sku: String(product.sku ?? ''),
    price:
      priceFromStoreApi.price ??
      (typeof product.price === 'string' ? product.price : '0'),
    regular_price:
      priceFromStoreApi.regular_price ??
      (typeof product.regular_price === 'string' ? product.regular_price : '0'),
    sale_price:
      priceFromStoreApi.sale_price ??
      (typeof product.sale_price === 'string' ? product.sale_price : ''),
    date_on_sale_from: product.date_on_sale_from ?? null,
    date_on_sale_from_gmt: product.date_on_sale_from_gmt ?? null,
    date_on_sale_to: product.date_on_sale_to ?? null,
    date_on_sale_to_gmt: product.date_on_sale_to_gmt ?? null,
    price_html: String(product.price_html ?? ''),
    on_sale: Boolean(product.on_sale),
    purchasable: product.purchasable !== false,
    total_sales:
      typeof product.total_sales === 'number'
        ? product.total_sales
        : Number(product.total_sales ?? 0),
    virtual: Boolean(product.virtual),
    downloadable: Boolean(product.downloadable),
    downloads: Array.isArray(product.downloads) ? product.downloads : [],
    download_limit:
      typeof product.download_limit === 'number' ? product.download_limit : -1,
    download_expiry:
      typeof product.download_expiry === 'number'
        ? product.download_expiry
        : -1,
    tax_status: (product.tax_status as WooProduct['tax_status']) ?? 'taxable',
    tax_class: String(product.tax_class ?? ''),
    manage_stock: Boolean(product.manage_stock),
    stock_quantity:
      typeof product.stock_quantity === 'number' ||
      product.stock_quantity === null
        ? product.stock_quantity
        : null,
    stock_status:
      (product.stock_status as WooProduct['stock_status']) ?? 'instock',
    backorders: (product.backorders as WooProduct['backorders']) ?? 'no',
    backorders_allowed: Boolean(product.backorders_allowed),
    backordered: Boolean(product.backordered),
    sold_individually: Boolean(product.sold_individually),
    weight: String(product.weight ?? ''),
    dimensions:
      typeof product.dimensions === 'object' && product.dimensions !== null
        ? product.dimensions
        : { length: '', width: '', height: '' },
    shipping_required: product.shipping_required !== false,
    shipping_taxable: product.shipping_taxable !== false,
    shipping_class: String(product.shipping_class ?? ''),
    shipping_class_id:
      typeof product.shipping_class_id === 'number'
        ? product.shipping_class_id
        : 0,
    categories: Array.isArray(product.categories)
      ? product.categories.map(cat => {
          // Normalize category to ensure it has id, name, slug as strings/numbers
          if (cat && typeof cat === 'object') {
            return {
              id: typeof cat.id === 'number' ? cat.id : Number(cat.id ?? 0),
              name:
                typeof cat.name === 'string'
                  ? cat.name
                  : String(cat.name ?? ''),
              slug:
                typeof cat.slug === 'string'
                  ? cat.slug
                  : String(cat.slug ?? ''),
            };
          }
          // Fallback for non-object categories
          return { id: 0, name: String(cat ?? ''), slug: String(cat ?? '') };
        })
      : [],
    reviews_allowed: product.reviews_allowed !== false,
    average_rating: String(product.average_rating ?? 0),
    rating_count:
      typeof product.rating_count === 'number'
        ? product.rating_count
        : Number(product.rating_count ?? 0),
    related_ids: Array.isArray(product.related_ids) ? product.related_ids : [],
    upsell_ids: Array.isArray(product.upsell_ids) ? product.upsell_ids : [],
    cross_sell_ids: Array.isArray(product.cross_sell_ids)
      ? product.cross_sell_ids
      : [],
    parent_id: typeof product.parent_id === 'number' ? product.parent_id : 0,
    purchase_note: String(product.purchase_note ?? ''),
    tags: Array.isArray(product.tags) ? product.tags : [],
    images: Array.isArray(product.images) ? product.images : [],
    attributes: Array.isArray(product.attributes)
      ? product.attributes.map(attr => {
          // Normalize attribute to ensure options is always string[]
          if (attr && typeof attr === 'object') {
            const normalizedAttr = {
              id: typeof attr.id === 'number' ? attr.id : Number(attr.id ?? 0),
              name:
                typeof attr.name === 'string'
                  ? attr.name
                  : String(attr.name ?? ''),
              position:
                typeof attr.position === 'number'
                  ? attr.position
                  : Number(attr.position ?? 0),
              visible: Boolean(attr.visible),
              variation: Boolean(attr.variation),
              options: [] as string[],
            };

            // Normalize options - handle both string[] and object[]
            if (Array.isArray(attr.options)) {
              normalizedAttr.options = attr.options
                .map((opt: unknown) => {
                  if (typeof opt === 'string') {
                    return opt;
                  } else if (typeof opt === 'object' && opt !== null) {
                    const optObj = opt as Record<string, unknown>;
                    // Try to extract name, value, or option from object
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
                    // Last resort: try to stringify, but skip [object Object]
                    const str = String(opt);
                    return str !== '[object Object]' ? str : '';
                  }
                  return String(opt ?? '');
                })
                .filter((opt): opt is string => Boolean(opt)); // Remove empty strings
            }

            return normalizedAttr;
          }
          // Fallback for non-object attributes
          return {
            id: 0,
            name: String(attr ?? ''),
            position: 0,
            visible: false,
            variation: false,
            options: [],
          };
        })
      : [],
    default_attributes: Array.isArray(product.default_attributes)
      ? product.default_attributes
      : [],
    variations: Array.isArray(product.variations) ? product.variations : [],
    grouped_products: Array.isArray(product.grouped_products)
      ? product.grouped_products
      : [],
    menu_order: typeof product.menu_order === 'number' ? product.menu_order : 0,
    meta_data: Array.isArray(product.meta_data) ? product.meta_data : [],
    _links: product._links ?? { self: [], collection: [] },
  };
}

class WooCommerceService {
  private baseUrl: string;

  constructor() {
    // Zawsze korzystamy z lokalnego proxy `/api/woocommerce` (SSR i CSR)
    // Na serwerze ustawiamy absolutny adres bazowy, by uniknąć zależności od WordPress przy SSR w dev
    this.baseUrl =
      typeof window !== 'undefined'
        ? '/api/woocommerce'
        : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/woocommerce`;
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      logger.debug('WooCommerce Optimized Service initialized', {
        baseUrl: this.baseUrl,
      });
    }
  }

  /**
   * Get payment gateways from WooCommerce
   */
  async getPaymentGateways(): Promise<{
    success: boolean;
    gateways?: Array<{
      id: string;
      title: string;
      description?: string;
      enabled: boolean;
    }>;
    error?: string;
  }> {
    try {
      const r = await fetch(`${this.baseUrl}?endpoint=payment_gateways`, {
        headers: { Accept: 'application/json' },
      });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || 'Nie udało się pobrać metod płatności');
      }
      const data = await r.json();
      const gateways = (data.gateways || []).map(
        (gateway: RawPaymentGateway) => ({
          id: gateway.id,
          title: gateway.title || gateway.method_title || gateway.id,
          description: gateway.description || '',
          enabled: gateway.enabled === true || gateway.enabled === 'yes',
        })
      );
      return { success: true, gateways };
    } catch (error) {
      logger.error('Error fetching payment gateways', { error });
      return { success: false, error: 'Nie udało się pobrać metod płatności' };
    }
  }
  // =========================================
  // Homepage Data - All tabs in one request
  // =========================================
  async getHomepageData(): Promise<{
    newProducts: WooProduct[];
    saleProducts: WooProduct[];
    featuredProducts: WooProduct[];
  }> {
    try {
      // PERFORMANCE FIX: Add _fields to reduce payload size
      const response = await fetch(
        `${this.baseUrl}?endpoint=homepage&_fields=id,name,slug,price,regular_price,sale_price,on_sale,featured,images,stock_status,average_rating,rating_count`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Error fetching homepage data', { error });
      throw error;
    }
  }

  // =========================================
  // Shop Data - Optimized product list
  // =========================================
  async getShopData(
    page: number = 1,
    perPage: number = 12,
    options?: {
      category?: string;
      search?: string;
      orderby?: 'date' | 'price' | 'title' | 'popularity';
      order?: 'asc' | 'desc';
      on_sale?: boolean;
      featured?: boolean;
      min_price?: number | string;
      max_price?: number | string;
      capacities?: string[]; // attribute terms (slugs)
      brands?: string[]; // attribute terms (slugs)
    }
  ): Promise<{
    products: WooProduct[];
    total: number;
    totalPages: number;
    categories?: Array<{
      id: number;
      name: string;
      slug: string;
      count?: number;
    }>;
    attributes?: {
      capacities?: Array<{ id: number | string; name: string; slug: string }>;
      brands?: Array<{ id: number | string; name: string; slug: string }>;
    };
  }> {
    try {
      const params = new URLSearchParams({
        endpoint: 'shop',
        page: page.toString(),
        per_page: perPage.toString(),
        // PERFORMANCE FIX: Add _fields to reduce payload size
        _fields:
          'id,name,slug,price,regular_price,sale_price,on_sale,featured,images,stock_status,average_rating,rating_count,categories,attributes',
      });

      if (options?.category) params.append('category', options.category);
      if (options?.search) params.append('search', options.search);
      if (options?.orderby) params.append('orderby', options.orderby);
      if (options?.order) params.append('order', options.order);
      if (options?.on_sale) params.append('on_sale', String(options.on_sale));
      if (options?.featured)
        params.append('featured', String(options.featured));
      if (options?.min_price !== undefined)
        params.append('min_price', String(options.min_price));
      if (options?.max_price !== undefined)
        params.append('max_price', String(options.max_price));
      if (options?.capacities && options.capacities.length > 0)
        params.append('capacities', options.capacities.join(','));
      if (options?.brands && options.brands.length > 0)
        params.append('brands', options.brands.join(','));

      // Use local API route instead of direct call (aggregated response)
      // Use relative URL for all calls
      const response = await fetch(`${this.baseUrl}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        products: data.products || [],
        total: parseInt(data.total) || 0,
        totalPages: Math.ceil((parseInt(data.total) || 0) / perPage),
        categories: data.categories || [],
        attributes: {
          capacities: data.attributes?.capacities || [],
          brands: data.attributes?.brands || [],
        },
      };
    } catch (error) {
      logger.error('Error fetching shop data', { error });
      throw error;
    }
  }

  // =========================================
  // Product Data - Single product
  // =========================================
  async getProductData(productId: number): Promise<WooProduct | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}?endpoint=products/${productId}`
      );

      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.error('Error fetching product data', { error });
      return null;
    }
  }

  async getProductById(productId: number): Promise<WooProduct | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}?endpoint=products/${productId}`
      );

      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.error('Error fetching product by ID', { error });
      return null;
    }
  }

  // =========================================
  // Product by Slug
  // =========================================
  async getProductBySlug(slug: string): Promise<WooProduct | null> {
    const startTime = Date.now();
    try {
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        logger.debug('[getProductBySlug] Starting fetch', {
          slug,
          baseUrl: this.baseUrl,
        });
      }

      // Client-side short cache to avoid repeated lookups during navigation
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const cached = window.sessionStorage.getItem(`slug:${slug}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.id) {
              if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                logger.debug('[getProductBySlug] Found in sessionStorage', {
                  slug,
                });
              }
              return parsed as WooProduct;
            }
          } catch {}
        }
      }

      // Helper to add timeout to fetch
      const withTimeout = async (
        url: string,
        ms: number,
        init: RequestInit = {},
        label: string
      ) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), ms);
        try {
          const res = await fetch(url, { ...init, signal: controller.signal });
          if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
            logger.debug(`[${label}] Fetch result`, {
              status: res.status,
              ok: res.ok,
              url: url.substring(0, 80),
            });
          }
          return res;
        } catch (err) {
          if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
            logger.debug(`[${label}] Timeout/Error`, {
              timeout: ms,
              error: err instanceof Error ? err.message : 'unknown',
            });
          }
          throw err;
        } finally {
          clearTimeout(id);
        }
      };

      const attempts: Array<Promise<WooProduct | null>> = [];

      // E) Direct WordPress Store API (FASTEST - try first, bypass proxy)
      attempts.push(
        (async () => {
          try {
            const wpUrl = env.NEXT_PUBLIC_WORDPRESS_URL;
            if (!wpUrl) return null;

            // Try Store API directly (fastest, no proxy overhead)
            const storeUrl = `${wpUrl}/wp-json/wc/store/v1/products?slug=${encodeURIComponent(slug)}`;
            if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
              logger.debug('[E] Trying direct WordPress Store API', {
                url: storeUrl,
              });
            }

            const res = await withTimeout(
              storeUrl,
              3000,
              {
                headers: {
                  Accept: 'application/json',
                  'User-Agent': 'Filler-Store/1.0',
                },
              },
              'E:store-api'
            );

            if (!res.ok) return null;
            const data = await res.json();

            // Store API returns array or single object
            let product: StoreApiProduct | null = null;
            if (Array.isArray(data) && data.length > 0) {
              product =
                (data as StoreApiProduct[]).find(p => p.slug === slug) ||
                (data[0] as StoreApiProduct);
            } else if (
              data &&
              typeof data === 'object' &&
              (data as StoreApiProduct).id
            ) {
              product = data as StoreApiProduct;
            }

            if (product && product.id) {
              // Normalize Store API response to WooProduct format
              const normalized = normalizeStoreApiProduct(product);

              if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                logger.debug('[E] Found product via Store API', {
                  productId: normalized.id,
                });
              }
              return normalized;
            }
            return null;
          } catch (e) {
            if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
              logger.debug('[E] Store API failed', {
                error: e instanceof Error ? e.message : 'unknown',
              });
            }
            return null;
          }
        })()
      );

      // A) Fast slug→ID map + product (with retry for slow API)
      attempts.push(
        (async () => {
          try {
            const slugRes = await withTimeout(
              `${this.baseUrl}?endpoint=slug/${encodeURIComponent(slug)}`,
              2000,
              { headers: { Accept: 'application/json' }, cache: 'no-store' },
              'A:slug→id'
            );
            if (!slugRes.ok) return null;
            const map = await slugRes.json();
            if (!map || !map.id) return null;

            // Retry logic for product fetch (WooCommerce API can be slow)
            let product: WooProduct | null = null;
            for (let retry = 0; retry < 2; retry++) {
              try {
                const timeout = retry === 0 ? 5000 : 8000; // First try 5s, retry 8s
                const pr = await withTimeout(
                  `${this.baseUrl}?endpoint=products/${map.id}`,
                  timeout,
                  { headers: { Accept: 'application/json' } },
                  `A:product${retry > 0 ? `-retry${retry}` : ''}`
                );
                if (pr.ok) {
                  const pd = await pr.json();
                  if (pd && pd.id) {
                    product = pd as WooProduct;
                    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                      logger.debug('[A] Found product via slug→id', {
                        productId: pd.id,
                        attempt: retry + 1,
                      });
                    }
                    break;
                  }
                } else if (pr.status === 404) {
                  // Product doesn't exist, don't retry
                  break;
                }
              } catch (e) {
                if (process.env.NEXT_PUBLIC_DEBUG === 'true' && retry === 1) {
                  logger.debug('[A] Product fetch failed after retries', {
                    error: e instanceof Error ? e.message : 'unknown',
                  });
                }
                if (retry < 1) {
                  // Wait a bit before retry
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
            }
            return product;
          } catch (e) {
            if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
              logger.debug('[A] Slug→ID failed', {
                error: e instanceof Error ? e.message : 'unknown',
              });
            }
            return null;
          }
        })()
      );

      // B) Optimized endpoint (mu-plugin) - increased timeout
      attempts.push(
        (async () => {
          try {
            const res = await withTimeout(
              `${this.baseUrl}?endpoint=king-optimized/product/${encodeURIComponent(slug)}`,
              3000,
              { headers: { Accept: 'application/json' } },
              'B:optimized'
            );
            if (!res.ok) return null;
            const data = await res.json();
            if (process.env.NEXT_PUBLIC_DEBUG === 'true' && data && data.id) {
              logger.debug('[B] Found product via optimized', {
                productId: data.id,
              });
            }
            return data && data.id ? (data as WooProduct) : null;
          } catch (e) {
            if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
              logger.debug('[B] Failed', {
                error: e instanceof Error ? e.message : 'unknown',
              });
            }
            return null;
          }
        })()
      );

      // C) Direct slug param (exact match) - increased timeout
      attempts.push(
        (async () => {
          try {
            const res = await withTimeout(
              `${this.baseUrl}?endpoint=products&slug=${encodeURIComponent(slug)}&per_page=1`,
              5000,
              { headers: { Accept: 'application/json' } },
              'C:direct'
            );
            if (!res.ok) return null;
            const arr = await res.json();
            if (
              process.env.NEXT_PUBLIC_DEBUG === 'true' &&
              Array.isArray(arr) &&
              arr.length > 0
            ) {
              logger.debug('[C] Found product via direct slug', {
                productId: arr[0].id,
              });
            }
            return Array.isArray(arr) && arr.length > 0
              ? (arr[0] as WooProduct)
              : null;
          } catch (e) {
            if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
              logger.debug('[C] Failed', {
                error: e instanceof Error ? e.message : 'unknown',
              });
            }
            return null;
          }
        })()
      );

      // D) Search by prettified name (broader) - increased timeout
      attempts.push(
        (async () => {
          try {
            const searchTerm = slug
              .replace(/-/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());
            const res = await withTimeout(
              `${this.baseUrl}?endpoint=products&search=${encodeURIComponent(searchTerm)}&per_page=100&cache=off`,
              6000,
              { headers: { Accept: 'application/json' } },
              'D:search'
            );
            if (!res.ok) return null;
            const arr = await res.json();
            if (Array.isArray(arr)) {
              const found = (arr as StoreApiProduct[]).find(
                p => p.slug === slug
              );
              if (found?.id) {
                if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                  logger.debug('[D] Found product via search', {
                    productId: found.id,
                  });
                }
                return normalizeStoreApiProduct(found);
              }
            }
            return null;
          } catch (e) {
            if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
              logger.debug('[D] Failed', {
                error: e instanceof Error ? e.message : 'unknown',
              });
            }
            return null;
          }
        })()
      );

      // Resolve first successful - use Promise.race to get fastest result
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        logger.debug('[getProductBySlug] Waiting for attempts', {
          attemptsCount: attempts.length,
        });
      }

      // Use Promise.race with timeout to get first successful result quickly
      // Store API (E) is first and fastest, so it should win most of the time
      const attemptNames = [
        'E:store-api',
        'A:slug→id',
        'B:optimized',
        'C:direct',
        'D:search',
      ];

      // Create a race with timeout - first successful result wins
      const raceWithTimeout = Promise.race([
        // Race all attempts - first one that returns a product wins
        Promise.any(
          attempts.map(async (attempt, idx) => {
            const result = await attempt;
            if (result) {
              if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
                logger.debug(`[${attemptNames[idx]}] First success`, {
                  productId: result.id,
                });
              }
              return result;
            }
            // If null, reject so Promise.any can try next attempt
            throw new Error('No product');
          })
        ),
        // Timeout after 4 seconds (Store API should respond in ~1-2s if working)
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 4000)
        ),
      ]);

      let found: WooProduct | null = null;
      try {
        found = await raceWithTimeout;
      } catch (error) {
        // If timeout or all attempts failed, check allSettled as fallback
        const reason = error instanceof Error ? error.message : 'unknown';
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          logger.debug(
            'Race timeout or all failed, checking allSettled fallback',
            { reason }
          );
        }
        const candidates = await Promise.allSettled(attempts);
        found = candidates
          .map(r => (r.status === 'fulfilled' && r.value ? r.value : null))
          .find(Boolean) as WooProduct | null;
      }

      const duration = Date.now() - startTime;
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        if (found) {
          logger.debug('[getProductBySlug] Found product', {
            productId: found.id,
            duration,
          });
        } else {
          logger.debug('[getProductBySlug] No product found', { duration });
        }
      }

      if (found && typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.setItem(`slug:${slug}`, JSON.stringify(found));
        } catch {}
      }

      return found || null;
    } catch (error) {
      logger.error('[getProductBySlug] Error', { error, slug });
      return null; // Return null instead of throwing to prevent UI crashes
    }
  }

  // =========================================
  // Categories
  // =========================================
  async getCategories(): Promise<{
    data: Array<{ id: number; name: string; slug: string; count: number }>;
    total: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}?endpoint=products/categories`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        data: Array.isArray(data) ? data : [data],
        total: Array.isArray(data) ? data.length : 1,
        totalPages: 1,
        currentPage: 1,
        perPage: 100,
      };
    } catch (error) {
      logger.error('Error fetching categories', { error });
      // Return mock data when API is not available
      return this.getMockCategories();
    }
  }

  // =========================================
  // Mock Data Fallbacks
  // =========================================
  private getMockCategories(): {
    data: Array<{ id: number; name: string; slug: string; count: number }>;
    total: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
  } {
    return {
      data: [
        { id: 1, name: 'Kremy', slug: 'kremy', count: 15 },
        { id: 2, name: 'Serum', slug: 'serum', count: 8 },
        { id: 3, name: 'Tonery', slug: 'tonery', count: 12 },
        { id: 4, name: 'Maseczki', slug: 'maseczki', count: 6 },
        { id: 5, name: 'Peelingi', slug: 'peelingi', count: 4 },
      ],
      total: 5,
      totalPages: 1,
      currentPage: 1,
      perPage: 100,
    };
  }

  private getMockProducts(
    query: WooProductQuery = {}
  ): WooApiResponse<WooProduct> {
    const mockProductsData: StoreApiProduct[] = [
      {
        id: 1,
        name: 'Krem nawilżający z kwasem hialuronowym',
        slug: 'krem-nawilzajacy-kwas-hialuronowy',
        price: '89.99',
        regular_price: '119.99',
        sale_price: '89.99',
        on_sale: true,
        featured: true,
        images: [
          {
            id: 0,
            date_created: '',
            date_created_gmt: '',
            date_modified: '',
            date_modified_gmt: '',
            src: '/images/placeholder-product.jpg',
            name: 'Placeholder',
            alt: 'Krem nawilżający',
          },
        ],
        categories: [{ id: 1, name: 'Kremy', slug: 'kremy' }],
        attributes: [],
        stock_status: 'instock',
        short_description: 'Intensywnie nawilżający krem z kwasem hialuronowym',
        description:
          'Profesjonalny krem nawilżający z kwasem hialuronowym dla skóry twarzy.',
        sku: 'KREM-001',
      },
      {
        id: 2,
        name: 'Serum witaminowe C + E',
        slug: 'serum-witaminowe-c-e',
        price: '149.99',
        regular_price: '149.99',
        sale_price: '',
        on_sale: false,
        featured: true,
        images: [
          {
            id: 0,
            date_created: '',
            date_created_gmt: '',
            date_modified: '',
            date_modified_gmt: '',
            src: '/images/placeholder-product.jpg',
            name: 'Placeholder',
            alt: 'Serum witaminowe',
          },
        ],
        categories: [{ id: 2, name: 'Serum', slug: 'serum' }],
        attributes: [],
        stock_status: 'instock',
        short_description: 'Silne serum z witaminami C i E',
        description: 'Mocne serum antyoksydacyjne z witaminami C i E.',
        sku: 'SERUM-001',
      },
      {
        id: 3,
        name: 'Toner oczyszczający z kwasem salicylowym',
        slug: 'toner-oczyszczajacy-kwas-salicylowy',
        price: '69.99',
        regular_price: '89.99',
        sale_price: '69.99',
        on_sale: true,
        featured: false,
        images: [
          {
            id: 0,
            date_created: '',
            date_created_gmt: '',
            date_modified: '',
            date_modified_gmt: '',
            src: '/images/placeholder-product.jpg',
            name: 'Placeholder',
            alt: 'Toner oczyszczający',
          },
        ],
        categories: [{ id: 3, name: 'Tonery', slug: 'tonery' }],
        attributes: [],
        stock_status: 'instock',
        short_description: 'Delikatny toner z kwasem salicylowym',
        description:
          'Oczyszczający toner z kwasem salicylowym dla skóry problematycznej.',
        sku: 'TONER-001',
      },
    ];
    const mockProducts = mockProductsData.map(product =>
      normalizeStoreApiProduct(product)
    );

    return {
      data: mockProducts,
      total: mockProducts.length,
      totalPages: 1,
      currentPage: 1,
      perPage: query.per_page || 10,
    };
  }

  // =========================================
  // Legacy Methods - Fallback to original service
  // =========================================
  async getProducts(
    query: WooProductQuery = {}
  ): Promise<WooApiResponse<WooProduct>> {
    try {
      const params = new URLSearchParams();

      if (query.per_page) params.append('per_page', query.per_page.toString());
      if (query.page) params.append('page', query.page.toString());
      if (query.search) params.append('search', query.search);
      if (query.category) params.append('category', query.category);
      if (query.orderby) params.append('orderby', query.orderby);
      if (query.order) params.append('order', query.order);
      if (query.featured) params.append('featured', query.featured.toString());
      if (query.on_sale) params.append('on_sale', query.on_sale.toString());
      if (query.stock_status) params.append('stock_status', query.stock_status);
      if (query.min_price) params.append('min_price', query.min_price);
      if (query.max_price) params.append('max_price', query.max_price);

      // Handle attribute filters (support multiple pairs)
      const attr: string | string[] | undefined = (
        query as WooProductQuery & { attribute?: string | string[] }
      ).attribute;
      const attrTerm: string | string[] | undefined = (
        query as WooProductQuery & { attribute_term?: string | string[] }
      ).attribute_term;
      if (Array.isArray(attr) && Array.isArray(attrTerm)) {
        for (let i = 0; i < Math.min(attr.length, attrTerm.length); i += 1) {
          params.append('attribute', String(attr[i]));
          params.append('attribute_term', String(attrTerm[i]));
        }
      } else {
        if (attr) params.append('attribute', String(attr));
        if (attrTerm) params.append('attribute_term', String(attrTerm));
      }

      // If any dynamic filters are present, bypass caches explicitly
      const hasDynamicFilters = Boolean(
        query.search ||
          query.category ||
          query.min_price ||
          query.max_price ||
          attr ||
          attrTerm
      );
      if (hasDynamicFilters) {
        params.append('cache', 'off');
        params.append('_', String(Date.now()));
      }

      const response = await fetch(
        `${this.baseUrl}?endpoint=products&${params}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        data: Array.isArray(data) ? data : [data],
        total: Array.isArray(data) ? data.length : 1,
        totalPages: 1,
        currentPage: 1,
        perPage: query.per_page || 10,
      };
    } catch (error) {
      logger.error('Error fetching products', { error });
      // Return mock data when API is not available
      return this.getMockProducts(query);
    }
  }

  async getProduct(productId: number): Promise<WooProduct | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}?endpoint=products/${productId}`,
        {
          headers: { Accept: 'application/json' },
        }
      );

      if (response.status === 404) {
        return null; // Return null for missing products
      }
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      logger.error('Error fetching product', { error });
      return null; // Return null on error
    }
  }

  // =========================================
  // Cart Operations - Use existing cart API
  // =========================================
  async getNonce(): Promise<{
    success: boolean;
    nonce: string;
    expires: number;
  }> {
    try {
      const response = await fetch(
        `${env.NEXT_PUBLIC_WORDPRESS_URL}/wp-json/king-cart/v1/nonce`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();

      // Handle HTML errors before JSON (common with WordPress)
      let jsonText = text;
      const jsonMatch = text.match(/\{.*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      return JSON.parse(jsonText);
    } catch (error) {
      logger.error('Error getting nonce', { error });
      throw error;
    }
  }

  async addToCart(
    productId: number,
    quantity: number = 1,
    variation?: { id: number; attributes: Record<string, string> }
  ): Promise<{
    success: boolean;
    message: string;
    cart?: { items: CartItem[]; total: number };
  }> {
    try {
      const response = await fetch('/api/cart-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          id: productId,
          quantity: quantity,
          variation: variation,
        }),
      });

      if (!response.ok) {
        // In headless mode, don't throw errors for cart operations
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          logger.debug('WooCommerce cart API unavailable', {
            status: response.status,
          });
        }
        return { success: false, message: `HTTP ${response.status}` };
      }

      return await response.json();
    } catch (error: unknown) {
      // In headless mode, don't throw errors for cart operations
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        logger.debug('WooCommerce cart API unavailable', { error });
      }
      const errMsg = error instanceof Error ? error.message : 'unknown error';
      return { success: false, message: errMsg };
    }
  }

  async removeFromCart(itemKey: string): Promise<{
    success: boolean;
    message: string;
    cart?: { items: CartItem[]; total: number };
  }> {
    try {
      const response = await fetch('/api/cart-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'remove', key: itemKey }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Error removing from cart', { error });
      throw error;
    }
  }

  async updateCartItem(
    itemKey: string,
    quantity: number
  ): Promise<{
    success: boolean;
    message: string;
    cart?: { items: CartItem[]; total: number };
  }> {
    try {
      const response = await fetch('/api/cart-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'update', key: itemKey, quantity }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Error updating cart item', { error });
      throw error;
    }
  }

  async getCart(): Promise<{
    success: boolean;
    cart?: { items: CartItem[]; total: number };
    error?: string;
  }> {
    try {
      const response = await fetch('/api/cart-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cart' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Error getting cart', { error });
      throw error;
    }
  }

  // =========================================
  // Product Reviews
  // =========================================
  async getProductReviews(productId: number): Promise<{
    success: boolean;
    reviews?: Array<{
      id: number;
      review: string;
      rating: number;
      reviewer: string;
      date_created: string;
    }>;
    error?: string;
  }> {
    try {
      // Use dedicated /api/reviews endpoint instead of /api/woocommerce
      // This endpoint uses king-reviews/v1/reviews which is more reliable
      const response = await fetch(`/api/reviews?product_id=${productId}`, {
        headers: { Accept: 'application/json' },
      });

      if (response.status === 404) {
        return { success: true, reviews: [] };
      }
      if (!response.ok) {
        const err = await response.text().catch(() => '');
        return {
          success: false,
          error: err || `HTTP error ${response.status}`,
        };
      }
      const arr = await response.json();
      return { success: true, reviews: Array.isArray(arr) ? arr : [] };
    } catch (error) {
      // Only log in debug mode - 404 is expected for products without reviews
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        logger.debug('Error fetching product reviews', { productId, error });
      }
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to fetch reviews',
      };
    }
  }

  async createProductReview(reviewData: {
    product_id: number;
    review: string;
    reviewer: string;
    reviewer_email: string;
    rating: number;
    images?: (number | string)[];
    videos?: string[];
  }): Promise<{
    success: boolean;
    review?: {
      id: number;
      review: string;
      rating: number;
      reviewer: string;
      date_created: string;
      images?: unknown[];
      videos?: string[];
    };
    error?: string;
  }> {
    try {
      // PRO: Use dedicated reviews endpoint
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle ValidationError format from createErrorResponse (AppError structure)
        // Format: { error: { message: string, type: string, details: [...] } }
        let errorMessage: string;

        if (errorData.error) {
          const errorObj = errorData.error;

          // If error is a string, use it directly
          if (typeof errorObj === 'string') {
            errorMessage = errorObj;
          }
          // If error is an object with message
          else if (errorObj.message) {
            errorMessage = errorObj.message;

            // Append details if available (Zod validation errors)
            if (
              Array.isArray(errorObj.details) &&
              errorObj.details.length > 0
            ) {
              const details = (errorObj.details as ValidationDetail[])
                .map(detail => {
                  const path = Array.isArray(detail.path)
                    ? detail.path.join('.')
                    : 'field';
                  return `${path}: ${detail.message ?? 'Invalid value'}`;
                })
                .join(', ');
              errorMessage += ` (${details})`;
            }
          }
          // Fallback: stringify the error object
          else {
            errorMessage = JSON.stringify(errorObj);
          }
        }
        // Legacy format: direct message
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
        // Fallback
        else {
          errorMessage = `HTTP error! status: ${response.status}`;
        }

        logger.error('Error creating product review', {
          error: errorMessage,
          status: response.status,
          errorData,
          rawErrorData: JSON.stringify(errorData),
        });
        throw new Error(errorMessage);
      }

      const review = await response.json();

      // Check if response has success field (from king-reviews API)
      if (review.success === false) {
        throw new Error(
          review.error || review.message || 'Failed to create review'
        );
      }

      logger.debug('Review created successfully', {
        reviewId: review.id,
        productId: reviewData.product_id,
      });

      return {
        success: true,
        review: {
          id: review.id,
          review: review.review,
          rating: review.rating,
          reviewer: review.reviewer,
          date_created:
            review.date_created ||
            review.date_created_gmt ||
            new Date().toISOString(),
          images: review.images || [],
          videos: review.videos || [],
        },
      };
    } catch (error) {
      logger.error('Error creating product review', { error, reviewData });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create review',
      };
    }
  }

  // =========================================
  // Authentication Methods
  // =========================================
  async loginUser(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    user?: { id: number; email: string; name: string; token: string };
    error?: string;
  }> {
    try {
      const wordpressUrl =
        env.NEXT_PUBLIC_WORDPRESS_URL ||
        env.NEXT_PUBLIC_WC_URL?.replace('/wp-json/wc/v3', '') ||
        '';
      if (!wordpressUrl) {
        throw new Error('WordPress URL not configured');
      }

      // Use JWT authentication endpoint
      const url = `${wordpressUrl}/wp-json/king-jwt/v1/login`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success || !data.token || !data.user) {
        return {
          success: false,
          error: data.message || 'Błąd logowania. Sprawdź email i hasło.',
        };
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name:
            `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() ||
            data.user.email,
          token: data.token,
        },
      };
    } catch (error) {
      logger.error('Error logging in user', { error });
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Błąd logowania. Sprawdź email i hasło.',
      };
    }
  }

  async registerUser(userData: {
    username: string;
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
  }): Promise<{
    success: boolean;
    message: string;
    user?: { id: number; username: string; email: string };
  }> {
    try {
      const payload = {
        email: userData.email,
        password: userData.password,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        billing: {
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
        },
        shipping: {
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
        },
      };

      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        logger.debug('Register user payload', {
          payload: { ...payload, password: '[REDACTED]' },
        });
      }

      const response = await fetch(`/api/woocommerce?endpoint=customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Registration error response', {
          status: response.status,
          error: errorText,
        });

        // Try to parse error response for better error message
        try {
          const errorData = JSON.parse(errorText);
          if (
            errorData.code === 'registration-error-email-exists' ||
            errorData.message?.includes('istnieje')
          ) {
            throw new Error(errorData.message || 'Email już istnieje');
          }
        } catch {
          // If parsing fails, use generic error
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        message: 'Rejestracja udana!',
        user: {
          id: responseData.id,
          username: responseData.username,
          email: responseData.email,
        },
      };
    } catch (error) {
      logger.error('Error registering user', { error });
      throw error;
    }
  }

  // =========================================
  // Product Helper Methods
  // =========================================
  isProductOnSale(product: WooProduct): boolean {
    return product.on_sale || false;
  }

  getProductDiscount(product: WooProduct): number {
    if (!this.isProductOnSale(product)) return 0;

    const regularPrice = parseFloat(product.regular_price || '0');
    const salePrice = parseFloat(product.sale_price || product.price || '0');

    if (regularPrice === 0) return 0;

    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  }

  getProductImageUrl(product: WooProduct, _size: string = 'medium'): string {
    if (!product.images || product.images.length === 0) {
      return '/images/placeholder-product.jpg';
    }

    const image = product.images[0];
    let imageUrl = '';

    // Handle both string array format and object format
    if (typeof image === 'string') {
      imageUrl = image;
    } else if (typeof image === 'object' && image.src) {
      imageUrl = image.src;
    } else {
      return '/images/placeholder-product.jpg';
    }

    // Convert to higher quality image by replacing size suffix
    // Use 600x600 for good quality without WebP conversion
    if (imageUrl.includes('-300x300.')) {
      imageUrl = imageUrl.replace('-300x300.', '-600x600.');
    } else if (imageUrl.includes('-150x150.')) {
      imageUrl = imageUrl.replace('-150x150.', '-600x600.');
    } else if (imageUrl.includes('-100x100.')) {
      imageUrl = imageUrl.replace('-100x100.', '-600x600.');
    }

    return imageUrl;
  }

  formatPrice(price: string | number): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2,
    }).format(numPrice);
  }

  /**
   * Get shipping methods for a location
   */
  async getShippingMethods(
    country: string = 'PL',
    state: string = '',
    city: string = '',
    postcode: string = ''
  ): Promise<{
    success: boolean;
    methods?: Array<{
      id: string;
      method_id: string;
      method_title: string;
      method_description: string;
      cost: number;
      free_shipping_threshold: number;
      zone_id: string;
      zone_name: string;
    }>;
    error?: string;
  }> {
    try {
      const params = new URLSearchParams({
        endpoint: 'shipping_methods',
        country,
        state,
        city,
        postcode,
        // PERFORMANCE FIX: Add _fields to reduce payload size
        _fields: 'id,method_id,title,cost,settings,zone_id,zone_name',
      });

      const response = await fetch(`/api/woocommerce?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Nie udało się pobrać metod wysyłki'
        );
      }

      const data = await response.json();
      const methods = data.shipping_methods || [];

      // Process and normalize shipping methods
      const processedMethods = methods.map(
        (method: {
          id: string;
          method_id: string;
          title: string;
          settings?: ShippingMethodSettings;
          cost?: string;
          zone_id?: string;
          zone_name?: string;
        }) => {
          let cost = 0;
          let freeShippingThreshold = 0;

          // Handle Flexible Shipping methods
          if (method.method_id === 'flexible_shipping_single') {
            const settings = method.settings ?? {};

            // Get free shipping threshold
            const freeShippingValue = settings['method_free_shipping']?.value;
            if (
              typeof freeShippingValue === 'string' ||
              typeof freeShippingValue === 'number'
            ) {
              freeShippingThreshold = parseFloat(String(freeShippingValue)); // Keep as PLN, not cents
            }

            // Get cost from rules
            const rules = settings['method_rules']?.value;
            if (Array.isArray(rules) && rules.length > 0) {
              const [firstRule] = rules as Array<{ cost_per_order?: unknown }>;
              if (
                firstRule &&
                (typeof firstRule.cost_per_order === 'string' ||
                  typeof firstRule.cost_per_order === 'number')
              ) {
                cost = parseFloat(String(firstRule.cost_per_order)); // Keep as PLN, not cents
              }
            }
          }
          // Handle Flat Rate methods
          else if (method.method_id === 'flat_rate') {
            const costValue = method.settings?.['cost']?.value;
            if (
              typeof costValue === 'string' ||
              typeof costValue === 'number'
            ) {
              cost = parseFloat(String(costValue)); // Keep as PLN, not cents
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
            method_title:
              typeof method.settings?.['method_title']?.value === 'string'
                ? (method.settings['method_title']?.value as string)
                : method.title || 'Dostawa',
            method_description: cleanDescription(
              typeof method.settings?.['method_description']?.value === 'string'
                ? (method.settings['method_description']?.value as string)
                : ''
            ),
            cost,
            free_shipping_threshold: freeShippingThreshold,
            zone_id: method.zone_id ?? '0',
            zone_name: method.zone_name ?? '',
            settings: method.settings,
          };
        }
      );

      return {
        success: true,
        methods: processedMethods,
      };
    } catch (error: unknown) {
      logger.error('Error fetching shipping methods', { error });
      // Return fallback shipping methods if API fails
      return {
        success: true,
        methods: [
          {
            id: '1',
            method_id: 'free_shipping',
            method_title: 'Darmowa wysyłka',
            method_description: 'Darmowa dostawa od 200 zł',
            cost: 0,
            free_shipping_threshold: 20000,
            zone_id: '1',
            zone_name: 'Polska',
          },
          {
            id: '2',
            method_id: 'flat_rate',
            method_title: 'Kurier DPD',
            method_description: 'Dostawa w 1-2 dni robocze',
            cost: 1500,
            free_shipping_threshold: 0,
            zone_id: '1',
            zone_name: 'Polska',
          },
          {
            id: '3',
            method_id: 'local_pickup',
            method_title: 'Odbiór osobisty',
            method_description: 'Gdańsk, ul. Partyzantów 8/101',
            cost: 0,
            free_shipping_threshold: 0,
            zone_id: '1',
            zone_name: 'Polska',
          },
        ],
      };
    }
  }

  // Get product variations
  async getProductVariations(productId: number): Promise<{
    success: boolean;
    variations?: Array<{
      id: number;
      attributes?: Array<{ slug: string; option: string }>;
      price: string;
      regular_price: string;
      sale_price: string;
      name: string;
      menu_order: number;
    }>;
    error?: string;
  }> {
    try {
      // PERFORMANCE FIX: Add _fields to reduce payload size
      const response = await fetch(
        `${this.baseUrl}?endpoint=products/${productId}/variations&_fields=id,attributes,price,regular_price,sale_price,name,menu_order`
      );

      if (response.status === 404) {
        // Product has no variations - this is normal, don't log
        return { success: true, variations: [] };
      }

      if (!response.ok) {
        // Return empty array instead of throwing error - only log in debug mode
        if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
          logger.debug(
            `Variations API error: ${response.status} for product ${productId}`
          );
        }
        return { success: true, variations: [] };
      }

      const data = await response.json();
      return { success: true, variations: Array.isArray(data) ? data : [] };
    } catch (error) {
      // Only log errors in debug mode - graceful fallback is expected
      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        logger.debug('Error fetching product variations', { productId, error });
      }
      // Return empty array instead of error to prevent UI crashes
      return { success: true, variations: [] };
    }
  }

  // Get product attributes
  async getProductAttributes(): Promise<{
    success: boolean;
    attributes?: Array<{
      id: number;
      name: string;
      slug: string;
      type: string;
      order_by: string;
      has_archives: boolean;
    }>;
    error?: string;
  }> {
    try {
      // PERFORMANCE FIX: Add _fields to reduce payload size
      const response = await fetch(
        `${this.baseUrl}?endpoint=products/attributes&_fields=id,name,slug,type,order_by,has_archives`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('Error fetching product attributes', { error });
      return {
        success: false,
        error: 'Nie udało się pobrać atrybutów produktu',
      };
    }
  }

  // =========================================
  // JWT Token Methods
  // =========================================
  async validateJWTToken(token: string): Promise<{
    success: boolean;
    valid?: boolean;
    user?: { id: number; email: string; name: string };
    error?: string;
  }> {
    try {
      const wordpressUrl =
        env.NEXT_PUBLIC_WORDPRESS_URL ||
        env.NEXT_PUBLIC_WC_URL?.replace('/wp-json/wc/v3', '') ||
        '';
      if (!wordpressUrl) {
        throw new Error('WordPress URL not configured');
      }

      const url = `${wordpressUrl}/wp-json/king-jwt/v1/validate`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        return {
          success: false,
          valid: false,
          error: errorData.message || `HTTP error! status: ${response.status}`,
        };
      }

      const data = await response.json();
      // Ensure response has success field
      return {
        success: data.success !== false,
        valid: data.valid !== false,
        user: data.user,
        error: data.error,
      };
    } catch (error) {
      logger.error('Error validating JWT token', { error });
      return {
        success: false,
        valid: false,
        error:
          error instanceof Error ? error.message : 'Error validating token',
      };
    }
  }

  async refreshJWTToken(token: string): Promise<{
    success: boolean;
    token?: string;
    user?: { id: number; email: string; name: string };
    error?: string;
  }> {
    try {
      const wordpressUrl =
        env.NEXT_PUBLIC_WORDPRESS_URL ||
        env.NEXT_PUBLIC_WC_URL?.replace('/wp-json/wc/v3', '') ||
        '';
      if (!wordpressUrl) {
        throw new Error('WordPress URL not configured');
      }

      const url = `${wordpressUrl}/wp-json/king-jwt/v1/refresh`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        return {
          success: false,
          error:
            errorData.message ||
            errorData.code ||
            `HTTP error! status: ${response.status}`,
        };
      }

      const data = await response.json();
      // Ensure response has success field and token
      return {
        success: data.success !== false,
        token: data.token,
        user: data.user,
        error: data.error,
      };
    } catch (error) {
      logger.error('Error refreshing JWT token', { error });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Error refreshing token',
      };
    }
  }
}

// Export class and singleton instance
export { WooCommerceService };
export const wooCommerceOptimized = new WooCommerceService();
export default wooCommerceOptimized;
