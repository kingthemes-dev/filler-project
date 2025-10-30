// =========================================
// Environment Variables
// =========================================
// Avoid duplicating env in shared package. Web app should use its own env module.
export const ENV = {
  WORDPRESS_URL: '',
  GRAPHQL_URL: '',
  WC_API_URL: '',
  WOO_BASE_URL: '',
  WC_CONSUMER_KEY: '',
  WC_CONSUMER_SECRET: '',
  CDN_URL: '',
  APP_ENV: 'development',
  ENABLE_PWA: false,
  ENABLE_ANALYTICS: false,
  GA_ID: '',
  GTM_ID: '',
  RECAPTCHA_SITE_KEY: '',
} as const;

// =========================================
// API Endpoints
// =========================================
export const API_ENDPOINTS = {
  GRAPHQL: '',
  WC_REST: '',
  WC_PRODUCTS: `/products`,
  WC_CATEGORIES: `/products/categories`,
  WC_ORDERS: `/orders`,
  WC_CUSTOMERS: `/customers`,
  WC_COUPONS: `/coupons`,
  WC_REPORTS: `/reports`,
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
