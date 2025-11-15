/**
 * UNIVERSAL FILTER USAGE EXAMPLES
 * Senior-level examples for different e-commerce platforms
 */

import { QueryClient } from '@tanstack/react-query';
import {
  prefetchWooCommerceFilters,
  prefetchShopifyFilters,
  prefetchCustomFilters,
  prefetchAutoDetectedFilters,
} from '@/lib/universal-prefetch';
import { getFilterConfig } from '@/config/filter-config';

// ========================================
// EXAMPLE 1: WOOCOMMERCE (Current Project)
// ========================================
export async function prefetchWooCommerceExample(queryClient: QueryClient) {
  await prefetchWooCommerceFilters(queryClient, {
    api: {
      baseUrl: 'https://your-store.com',
      endpoints: {
        categories: '/wp-json/wc/v3/products/categories',
        attributes: '/wp-json/wc/v3/products/attributes',
        products: '/wp-json/wc/v3/products',
      },
      headers: {
        Authorization: 'Bearer your-token',
      },
    },
    categories: {
      autoDiscover: true,
      excludeSlugs: ['uncategorized', 'default'],
    },
    attributes: {
      autoDiscover: true,
      customNames: {
        pa_brand: 'Marka',
        pa_color: 'Kolor',
        pa_size: 'Rozmiar',
      },
    },
  });
}

// ========================================
// EXAMPLE 2: SHOPIFY
// ========================================
export async function prefetchShopifyExample(queryClient: QueryClient) {
  await prefetchShopifyFilters(queryClient, {
    api: {
      baseUrl: 'https://your-shop.myshopify.com',
      endpoints: {
        categories: '/admin/api/2023-10/collections.json',
        attributes: '/admin/api/2023-10/metafields.json',
        products: '/admin/api/2023-10/products.json',
      },
      headers: {
        'X-Shopify-Access-Token': 'your-access-token',
      },
    },
    categories: {
      autoDiscover: true,
      excludeSlugs: ['all', 'featured'],
    },
    attributes: {
      autoDiscover: true,
      customNames: {
        vendor: 'Producent',
        product_type: 'Typ produktu',
      },
    },
  });
}

// ========================================
// EXAMPLE 3: CUSTOM API
// ========================================
export async function prefetchCustomAPIExample(queryClient: QueryClient) {
  await prefetchCustomFilters(queryClient, {
    api: {
      baseUrl: 'https://api.yourstore.com',
      endpoints: {
        categories: '/v1/categories',
        attributes: '/v1/attributes',
        products: '/v1/products',
      },
      headers: {
        'API-Key': 'your-api-key',
        'Content-Type': 'application/json',
      },
    },
    categories: {
      autoDiscover: true,
      customMapping: {
        electronics: {
          name: 'Elektronika',
          subcategories: ['phones', 'laptops', 'tablets'],
          icon: '📱',
        },
      },
    },
    attributes: {
      autoDiscover: true,
      customNames: {
        brand: 'Marka',
        material: 'Materiał',
        color: 'Kolor',
      },
    },
    cache: {
      staleTime: 15 * 60_000, // 15 minutes
      gcTime: 60 * 60_000, // 1 hour
    },
  });
}

// ========================================
// EXAMPLE 4: AUTO-DETECTION
// ========================================
export async function prefetchAutoDetectionExample(queryClient: QueryClient) {
  // Automatically detects API type and prefetches accordingly
  await prefetchAutoDetectedFilters(queryClient, 'https://api.yourstore.com');
}

// ========================================
// EXAMPLE 5: COMPONENT USAGE
// ========================================
export function UniversalShopFiltersExample() {
  // Example configuration for UniversalShopFilters component
  const exampleConfig = {
    filters: {
      search: '',
      minPrice: 0,
      maxPrice: 10000,
      inStock: false,
      onSale: false,
    },
    priceRange: { min: 0, max: 10000 },
    setPriceRange: () => {},
    onFilterChange: () => {},
    onCategoryChange: () => {},
    onClearFilters: () => {},
    showFilters: true,
    onToggleFilters: () => {},
    totalProducts: 0,
    preset: 'woocommerce' as const,
    filterConfig: {
      api: {
        baseUrl: 'https://your-api.com',
        endpoints: {
          categories: '/categories',
          attributes: '/attributes',
          products: '/products',
        },
      },
      categories: {
        autoDiscover: true,
        excludeSlugs: ['uncategorized'],
      },
      attributes: {
        autoDiscover: true,
        customNames: {
          brand: 'Marka',
          color: 'Kolor',
        },
      },
    },
  };

  return exampleConfig;
}

// ========================================
// EXAMPLE 6: ENVIRONMENT-BASED CONFIG
// ========================================
export function getEnvironmentConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  return getFilterConfig('woocommerce', {
    api: {
      baseUrl: apiUrl,
      endpoints: {
        categories: '/wp-json/wc/v3/products/categories',
        attributes: '/wp-json/wc/v3/products/attributes',
        products: '/wp-json/wc/v3/products',
      },
      headers: isProduction
        ? {
            Authorization: `Bearer ${process.env.API_TOKEN}`,
            'X-API-Version': 'v2',
          }
        : {},
    },
    cache: {
      staleTime: isProduction ? 30 * 60_000 : 5 * 60_000, // Longer cache in production
      gcTime: isProduction ? 2 * 60 * 60_000 : 30 * 60_000,
    },
    ui: {
      showCounts: isProduction,
      maxItemsPerFilter: isProduction ? 100 : 20,
      expandByDefault: false,
    },
  });
}

// ========================================
// EXAMPLE 7: MULTI-STORE SETUP
// ========================================
export async function prefetchMultiStoreExample(queryClient: QueryClient) {
  const stores = [
    {
      name: 'electronics',
      url: 'https://electronics-api.com',
      preset: 'woocommerce' as const,
    },
    {
      name: 'clothing',
      url: 'https://clothing-api.com',
      preset: 'shopify' as const,
    },
    { name: 'books', url: 'https://books-api.com', preset: 'custom' as const },
  ];

  // Prefetch filters for all stores
  await Promise.all(
    stores.map(async store => {
      try {
        if (store.preset === 'woocommerce') {
          await prefetchWooCommerceFilters(queryClient, {
            api: {
              baseUrl: store.url,
              endpoints: {
                categories: '/wp-json/wc/v3/products/categories',
                attributes: '/wp-json/wc/v3/products/attributes',
                products: '/wp-json/wc/v3/products',
              },
            },
          });
        } else if (store.preset === 'shopify') {
          await prefetchShopifyFilters(queryClient, {
            api: {
              baseUrl: store.url,
              endpoints: {
                categories: '/admin/api/2023-10/collections.json',
                attributes: '/admin/api/2023-10/metafields.json',
                products: '/admin/api/2023-10/products.json',
              },
            },
          });
        } else {
          await prefetchCustomFilters(queryClient, {
            api: {
              baseUrl: store.url,
              endpoints: {
                categories: '/v1/categories',
                attributes: '/v1/attributes',
                products: '/v1/products',
              },
            },
          });
        }
        console.log(`✅ Prefetched filters for ${store.name}`);
      } catch (error) {
        console.error(
          `❌ Failed to prefetch filters for ${store.name}:`,
          error
        );
      }
    })
  );
}

// ========================================
// EXAMPLE 8: ERROR HANDLING & FALLBACK
// ========================================
export async function prefetchWithErrorHandling(queryClient: QueryClient) {
  try {
    // Try primary API
    await prefetchWooCommerceFilters(queryClient, {
      api: {
        baseUrl: 'https://primary-api.com',
        endpoints: {
          categories: '/wp-json/wc/v3/products/categories',
          attributes: '/wp-json/wc/v3/products/attributes',
          products: '/wp-json/wc/v3/products',
        },
      },
    });
  } catch {
    console.warn('Primary API failed, trying fallback...');

    try {
      // Try fallback API
      await prefetchWooCommerceFilters(queryClient, {
        api: {
          baseUrl: 'https://fallback-api.com',
          endpoints: {
            categories: '/wp-json/wc/v3/products/categories',
            attributes: '/wp-json/wc/v3/products/attributes',
            products: '/wp-json/wc/v3/products',
          },
        },
      });
    } catch {
      console.error('All APIs failed, using cached data');
      // Component will use cached data or show loading state
    }
  }
}
