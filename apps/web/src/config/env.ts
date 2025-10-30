/**
 * Environment variables validation and configuration
 */

interface EnvConfig {
  // WooCommerce (server required)
  NEXT_PUBLIC_WC_URL: string; // public base for REST path
  WC_CONSUMER_KEY: string;
  WC_CONSUMER_SECRET: string;

  // WordPress (public)
  NEXT_PUBLIC_WORDPRESS_URL: string;

  // App (public)
  NEXT_PUBLIC_BASE_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';

  // Email (server optional)
  SENDINBLUE_API_KEY?: string;
  SENDINBLUE_LIST_ID?: string;

  // Analytics (public optional)
  NEXT_PUBLIC_GA_ID?: string; // legacy GA id (alias)
  NEXT_PUBLIC_GA4_ID?: string; // primary GA4 id
  NEXT_PUBLIC_GTM_ID?: string;

  // Security tokens (server required)
  REVALIDATE_SECRET: string;
  ADMIN_CACHE_TOKEN: string;
  CSRF_SECRET: string;
  WOOCOMMERCE_WEBHOOK_SECRET: string;
}

// Required environment variables
// On the client we only require public URLs to avoid runtime crashes during hydration
const isBrowser = typeof window !== 'undefined';
const REQUIRED_PUBLIC_VARS = [
  'NEXT_PUBLIC_WORDPRESS_URL',
  'NEXT_PUBLIC_BASE_URL',
  'NEXT_PUBLIC_WC_URL',
] as const;

const REQUIRED_SERVER_VARS = [
  'WC_CONSUMER_KEY',
  'WC_CONSUMER_SECRET',
  'REVALIDATE_SECRET',
  'ADMIN_CACHE_TOKEN',
  'CSRF_SECRET',
  'WOOCOMMERCE_WEBHOOK_SECRET',
] as const;

// Optional environment variables
const OPTIONAL_ENV_VARS = [
  'SENDINBLUE_API_KEY',
  'SENDINBLUE_LIST_ID',
  'NEXT_PUBLIC_GA_ID',
  'NEXT_PUBLIC_GA4_ID',
  'NEXT_PUBLIC_GTM_ID',
] as const;

// Validate environment variables
function validateEnv(): EnvConfig {
  const missingPublic: string[] = [];
  const missingServer: string[] = [];

  // Public envs must exist on both client and server
  for (const varName of REQUIRED_PUBLIC_VARS) {
    if (!process.env[varName]) missingPublic.push(varName);
  }

  // Server-only strict validation when not in the browser (relax in development)
  if (!isBrowser && process.env.NODE_ENV === 'production') {
    for (const varName of REQUIRED_SERVER_VARS) {
      if (!process.env[varName]) missingServer.push(varName);
    }
  }

  if (missingPublic.length > 0 || (!isBrowser && missingServer.length > 0)) {
    const missing = [...missingPublic, ...missingServer];
    const message = `Missing required environment variables: ${missing.join(', ')}\nPlease check your .env.local file.`;
    // W dev nie spamuj konsoli – użyj cichych domyślnych wartości
    if (!isBrowser && process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }
  }
  
  // Validate URLs
  const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  
  if (wordpressUrl && baseUrl) {
    try {
      new URL(wordpressUrl);
      new URL(baseUrl);
    } catch (error) {
      if (!isBrowser) {
        console.warn('Invalid URL in environment variables, using defaults');
      }
    }
  }
  
  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV as EnvConfig['NODE_ENV'];
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, production, or test');
  }
  
  return {
    NEXT_PUBLIC_WC_URL: process.env.NEXT_PUBLIC_WC_URL || `${wordpressUrl || 'http://localhost:3000'}/wp-json/wc/v3`,
    WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY || '',
    WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET || '',
    NEXT_PUBLIC_WORDPRESS_URL: wordpressUrl || 'http://localhost:3000',
    NEXT_PUBLIC_BASE_URL: baseUrl || 'http://localhost:3000',
    SENDINBLUE_API_KEY: process.env.SENDINBLUE_API_KEY,
    SENDINBLUE_LIST_ID: process.env.SENDINBLUE_LIST_ID,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID,
    NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET || 'dev-revalidate-secret',
    ADMIN_CACHE_TOKEN: process.env.ADMIN_CACHE_TOKEN || 'dev-admin-cache-token',
    CSRF_SECRET: process.env.CSRF_SECRET || 'dev-csrf-secret',
    WOOCOMMERCE_WEBHOOK_SECRET: process.env.WOOCOMMERCE_WEBHOOK_SECRET || 'dev-woo-webhook-secret',
    NODE_ENV: nodeEnv || 'development'
  };
}

// Export validated environment configuration
export const env = validateEnv();

// Environment checks
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Feature flags based on environment
export const features = {
  analytics: !!(env.NEXT_PUBLIC_GA4_ID || env.NEXT_PUBLIC_GA_ID),
  newsletter: !!env.SENDINBLUE_API_KEY,
  debugMode: isDevelopment
} as const;

// Log environment status in development
if (isDevelopment) {
  console.log('🔧 Environment Configuration:');
  console.log('- Mode:', env.NODE_ENV);
  console.log('- WordPress URL:', env.NEXT_PUBLIC_WORDPRESS_URL);
  console.log('- Base URL:', env.NEXT_PUBLIC_BASE_URL);
  console.log('- Features:', features);
}
