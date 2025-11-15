/**
 * UNIVERSAL FILTER CONFIGURATION
 * Senior-level configuration system for any e-commerce project
 */

export interface FilterConfig {
  api: {
    baseUrl: string;
    endpoints: {
      categories: string;
      attributes: string;
      products: string;
    };
    headers?: Record<string, string>;
  };
  categories: {
    autoDiscover: boolean;
    customMapping?: Record<string, CategoryMapping>;
    excludeSlugs?: string[];
    includeSlugs?: string[];
  };
  attributes: {
    autoDiscover: boolean;
    excludeSlugs?: string[];
    includeSlugs?: string[];
    customNames?: Record<string, string>;
  };
  cache: {
    staleTime: number; // milliseconds
    gcTime: number; // milliseconds
  };
  ui: {
    showCounts: boolean;
    maxItemsPerFilter: number;
    expandByDefault: boolean;
  };
}

export interface CategoryMapping {
  name: string;
  subcategories?: string[];
  icon?: string;
  order?: number;
}

export interface AttributeMapping {
  name: string;
  type: 'select' | 'multiselect' | 'range' | 'boolean';
  order?: number;
}

// DEFAULT CONFIGURATION - works with any WooCommerce/Shopify/etc
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  api: {
    baseUrl: '/api',
    endpoints: {
      categories: '/categories',
      attributes: '/attributes',
      products: '/products',
    },
  },
  categories: {
    autoDiscover: true,
    excludeSlugs: ['uncategorized', 'default'],
    includeSlugs: [],
  },
  attributes: {
    autoDiscover: true,
    excludeSlugs: ['pa_color', 'pa_size'], // Common excluded attributes
    includeSlugs: [],
    customNames: {
      pa_brand: 'Marka',
      pa_material: 'Materiał',
      pa_color: 'Kolor',
      pa_size: 'Rozmiar',
    },
  },
  cache: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  ui: {
    showCounts: true,
    maxItemsPerFilter: 50,
    expandByDefault: true,
  },
};

// ENVIRONMENT-SPECIFIC CONFIGURATIONS
export const CONFIG_PRESETS = {
  woocommerce: {
    ...DEFAULT_FILTER_CONFIG,
    api: {
      ...DEFAULT_FILTER_CONFIG.api,
      baseUrl: '/api',
      endpoints: {
        categories: '/woocommerce?endpoint=products/categories',
        attributes: '/woocommerce?endpoint=products/attributes',
        products: '/woocommerce?endpoint=shop',
      },
    },
  },
  shopify: {
    ...DEFAULT_FILTER_CONFIG,
    api: {
      ...DEFAULT_FILTER_CONFIG.api,
      endpoints: {
        categories: '/shopify/collections',
        attributes: '/shopify/product-options',
        products: '/shopify/products',
      },
    },
  },
  custom: DEFAULT_FILTER_CONFIG,
} as const;

export type ConfigPreset = keyof typeof CONFIG_PRESETS;

/**
 * Get configuration based on environment or preset
 */
export function getFilterConfig(
  preset: ConfigPreset = 'woocommerce',
  overrides?: Partial<FilterConfig>
): FilterConfig {
  const baseConfig = CONFIG_PRESETS[preset];
  return {
    ...baseConfig,
    ...overrides,
    api: {
      ...baseConfig.api,
      ...overrides?.api,
    },
    categories: {
      ...baseConfig.categories,
      ...overrides?.categories,
    },
    attributes: {
      ...baseConfig.attributes,
      ...overrides?.attributes,
    },
    cache: {
      ...baseConfig.cache,
      ...overrides?.cache,
    },
    ui: {
      ...baseConfig.ui,
      ...overrides?.ui,
    },
  };
}

/**
 * Validate configuration
 */
export function validateFilterConfig(config: FilterConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.api.baseUrl) {
    errors.push('API baseUrl is required');
  }

  if (!config.api.endpoints.categories) {
    errors.push('Categories endpoint is required');
  }

  if (!config.api.endpoints.attributes) {
    errors.push('Attributes endpoint is required');
  }

  if (config.cache.staleTime < 0) {
    errors.push('Cache staleTime must be positive');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
