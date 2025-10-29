/**
 * UNIVERSAL PREFETCHING SYSTEM
 * Senior-level prefetching that works with ANY e-commerce API
 */

import { QueryClient } from '@tanstack/react-query';
import { FilterConfig, getFilterConfig } from '@/config/filter-config';
import { UniversalFilterService } from '@/services/universal-filter-service';

export interface UniversalPrefetchOptions {
  preset?: 'woocommerce' | 'shopify' | 'custom';
  config?: Partial<FilterConfig>;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

/**
 * Universal prefetching function that works with any e-commerce API
 */
export async function prefetchUniversalFilters(
  queryClient: QueryClient,
  options: UniversalPrefetchOptions = {}
): Promise<void> {
  const {
    preset = 'woocommerce',
    config,
    baseUrl,
    timeout = 10000,
    retries = 2
  } = options;

  // Create configuration
  const filterConfig = getFilterConfig(preset, {
    ...config,
    ...(baseUrl && { 
      api: { 
        baseUrl, 
        endpoints: {
          categories: '/wp-json/wc/v3/products/categories',
          attributes: '/wp-json/wc/v3/products/attributes',
          products: '/wp-json/wc/v3/products'
        },
        ...config?.api 
      } 
    })
  });

  // Create service instance
  const service = new UniversalFilterService(filterConfig, preset);

  try {
    // Prefetch categories with fallback
    await queryClient.prefetchQuery({
      queryKey: ['universal-filters', 'categories', preset, config],
      queryFn: async () => {
        console.log(`🚀 Prefetching categories for ${preset}...`);
        try {
          return await service.getCategories();
        } catch (error) {
          console.warn(`⚠️ Categories prefetch failed, returning empty array:`, error);
          return [];
        }
      },
      staleTime: filterConfig.cache.staleTime,
      retry: retries,
      retryDelay: 1000,
    });

    // Prefetch attributes with fallback
    await queryClient.prefetchQuery({
      queryKey: ['universal-filters', 'attributes', preset, config],
      queryFn: async () => {
        console.log(`🚀 Prefetching attributes for ${preset}...`);
        try {
          return await service.getAttributes();
        } catch (error) {
          console.warn(`⚠️ Attributes prefetch failed, returning empty object:`, error);
          return {};
        }
      },
      staleTime: filterConfig.cache.staleTime,
      retry: retries,
      retryDelay: 1000,
    });

    // Prefetch all filters together with fallback
    await queryClient.prefetchQuery({
      queryKey: ['universal-filters', 'all', preset, config],
      queryFn: async () => {
        console.log(`🚀 Prefetching all filters for ${preset}...`);
        try {
          return await service.getAllFilters();
        } catch (error) {
          console.warn(`⚠️ All filters prefetch failed, returning empty data:`, error);
          return { categories: [], attributes: {} };
        }
      },
      staleTime: filterConfig.cache.staleTime,
      retry: retries,
      retryDelay: 1000,
    });

    console.log(`✅ Successfully prefetched all filters for ${preset}`);
  } catch (error) {
    console.error(`❌ Error prefetching filters for ${preset}:`, error);
    // Don't throw - let the app continue with empty data
    console.warn(`⚠️ Continuing with empty filter data`);
  }
}

/**
 * Prefetch filters for WooCommerce
 */
export async function prefetchWooCommerceFilters(
  queryClient: QueryClient,
  overrides?: Partial<FilterConfig>
): Promise<void> {
  console.log('🚀 Prefetching WooCommerce filters...');
  console.log('🚀 Config:', {
    api: {
      baseUrl: '/api',
      endpoints: {
        categories: '/woocommerce?endpoint=products/categories',
        attributes: '/woocommerce?endpoint=products/attributes',
        products: '/woocommerce?endpoint=shop'
      }
    }
  });
  
  return prefetchUniversalFilters(queryClient, {
    preset: 'woocommerce',
    config: {
      api: {
        baseUrl: '/api',
        endpoints: {
          categories: '/woocommerce?endpoint=products/categories',
          attributes: '/woocommerce?endpoint=products/attributes',
          products: '/woocommerce?endpoint=shop'
        }
      },
      ...overrides
    }
  });
}

/**
 * Prefetch filters for Shopify
 */
export async function prefetchShopifyFilters(
  queryClient: QueryClient,
  overrides?: Partial<FilterConfig>
): Promise<void> {
  return prefetchUniversalFilters(queryClient, {
    preset: 'shopify',
    config: overrides
  });
}

/**
 * Prefetch filters for custom API
 */
export async function prefetchCustomFilters(
  queryClient: QueryClient,
  config: Partial<FilterConfig>
): Promise<void> {
  return prefetchUniversalFilters(queryClient, {
    preset: 'custom',
    config
  });
}

/**
 * Auto-detect API type and prefetch accordingly
 */
export async function prefetchAutoDetectedFilters(
  queryClient: QueryClient,
  baseUrl: string
): Promise<void> {
  try {
    // Try to detect API type
    const response = await fetch(`${baseUrl}/api/woocommerce?endpoint=products/categories`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      console.log('🔍 Detected WooCommerce API');
      return prefetchWooCommerceFilters(queryClient, {
        api: { 
          baseUrl,
          endpoints: {
            categories: '/wp-json/wc/v3/products/categories',
            attributes: '/wp-json/wc/v3/products/attributes',
            products: '/wp-json/wc/v3/products'
          }
        }
      });
    }
  } catch (error) {
    console.log('🔍 WooCommerce detection failed, trying Shopify...');
  }

  try {
    const response = await fetch(`${baseUrl}/api/shopify/collections`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      console.log('🔍 Detected Shopify API');
      return prefetchShopifyFilters(queryClient, {
        api: { 
          baseUrl,
          endpoints: {
            categories: '/admin/api/2023-10/collections.json',
            attributes: '/admin/api/2023-10/products.json',
            products: '/admin/api/2023-10/products.json'
          }
        }
      });
    }
  } catch (error) {
    console.log('🔍 Shopify detection failed, using custom config...');
  }

  // Fallback to custom configuration
  console.log('🔍 Using custom configuration');
  return prefetchCustomFilters(queryClient, {
    api: { 
      baseUrl,
      endpoints: {
        categories: '/api/categories',
        attributes: '/api/attributes',
        products: '/api/products'
      }
    }
  });
}

/**
 * Prefetch with error handling and fallback
 */
export async function prefetchFiltersWithFallback(
  queryClient: QueryClient,
  options: UniversalPrefetchOptions = {}
): Promise<boolean> {
  try {
    await prefetchUniversalFilters(queryClient, options);
    return true;
  } catch (error) {
    console.error('❌ Prefetching failed:', error);
    
    // Try with basic configuration as fallback
    try {
      console.log('🔄 Trying fallback configuration...');
      await prefetchUniversalFilters(queryClient, {
        ...options,
        config: {
          ...options.config,
          cache: { staleTime: 5 * 60_000, gcTime: 15 * 60_000 }, // Shorter cache times
          api: {
            baseUrl: options.baseUrl || process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl',
            endpoints: {
              categories: '/wp-json/wc/v3/products/categories',
              attributes: '/wp-json/wc/v3/products/attributes',
              products: '/wp-json/wc/v3/products'
            },
            ...options.config?.api,
            headers: { 'Content-Type': 'application/json' }
          }
        }
      });
      return true;
    } catch (fallbackError) {
      console.error('❌ Fallback prefetching also failed:', fallbackError);
      return false;
    }
  }
}
