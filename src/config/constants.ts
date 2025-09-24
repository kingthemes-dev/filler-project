// =========================================
// Environment Variables
// =========================================
export const ENV = {
  WORDPRESS_URL: process.env.NEXT_PUBLIC_WORDPRESS_URL || '',
  GRAPHQL_URL: process.env.NEXT_PUBLIC_GRAPHQL_URL || '',
  WC_API_URL: process.env.WOOCOMMERCE_API_URL || '', // SECURITY FIX: Use server-side env var
  WOO_BASE_URL: process.env.WOO_BASE_URL || '',
  // SECURITY FIX: Remove NEXT_PUBLIC_ prefixes for secrets - these should only be used server-side
  WC_CONSUMER_KEY: process.env.WOOCOMMERCE_CONSUMER_KEY || '',
  WC_CONSUMER_SECRET: process.env.WOOCOMMERCE_CONSUMER_SECRET || '',
  CDN_URL: process.env.NEXT_PUBLIC_CDN_URL || '',
  APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  ENABLE_PWA: process.env.NEXT_PUBLIC_ENABLE_PWA === 'true',
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  GA_ID: process.env.NEXT_PUBLIC_GA_ID || '',
  GTM_ID: process.env.NEXT_PUBLIC_GTM_ID || '',
  RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '',
} as const;

// =========================================
// API Endpoints
// =========================================
export const API_ENDPOINTS = {
  GRAPHQL: ENV.GRAPHQL_URL,
  WC_REST: ENV.WC_API_URL,
  WC_PRODUCTS: `${ENV.WC_API_URL}/products`,
  WC_CATEGORIES: `${ENV.WC_API_URL}/products/categories`,
  WC_ORDERS: `${ENV.WC_API_URL}/orders`,
  WC_CUSTOMERS: `${ENV.WC_API_URL}/customers`,
  WC_COUPONS: `${ENV.WC_API_URL}/coupons`,
  WC_REPORTS: `${ENV.WC_API_URL}/reports`,
} as const;

// =========================================
// Auth Configuration
// =========================================
export const AUTH_CONFIG = {
  TOKEN_KEY: process.env.NEXT_PUBLIC_AUTH_TOKEN_SS_KEY || 'auth-token',
  REFRESH_TOKEN_KEY: process.env.NEXT_PUBLIC_REFRESH_TOKEN_LS_KEY || 'refresh-token',
  SESSION_TOKEN_KEY: process.env.NEXT_PUBLIC_SESSION_TOKEN_LS_KEY || 'session-token',
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_AUTH_KEY_TIMEOUT || '300000'),
} as const;

// =========================================
// App Configuration
// =========================================
export const APP_CONFIG = {
  NAME: 'King WooCommerce Store',
  DESCRIPTION: 'Headless WooCommerce Store',
  VERSION: '1.0.0',
  AUTHOR: 'King Themes',
  SUPPORT_EMAIL: 'support@kingthemes.com',
} as const;

// =========================================
// Pagination
// =========================================
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [12, 24, 48, 96],
} as const;

// =========================================
// Cache Configuration
// =========================================
export const CACHE_CONFIG = {
  PRODUCTS_TTL: 5 * 60 * 1000, // 5 minutes
  CATEGORIES_TTL: 30 * 60 * 1000, // 30 minutes
  ORDERS_TTL: 1 * 60 * 1000, // 1 minute
  CUSTOMERS_TTL: 10 * 60 * 1000, // 10 minutes
} as const;

// =========================================
// Currency & Locale
// =========================================
export const LOCALE_CONFIG = {
  CURRENCY: 'PLN',
  CURRENCY_SYMBOL: 'zł',
  DECIMAL_SEPARATOR: ',',
  THOUSANDS_SEPARATOR: ' ',
  DECIMAL_PLACES: 2,
  LOCALE: 'pl-PL',
} as const;

// =========================================
// Validation Rules
// =========================================
export const VALIDATION_RULES = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
  MIN_PHONE_LENGTH: 9,
  MAX_PHONE_LENGTH: 15,
  MIN_ADDRESS_LENGTH: 10,
  MAX_ADDRESS_LENGTH: 200,
} as const;
