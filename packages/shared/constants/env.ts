/**
 * Environment variables validation and configuration
 */

interface EnvConfig {
  // WooCommerce
  NEXT_PUBLIC_WC_URL: string;
  WC_CONSUMER_KEY: string;
  WC_CONSUMER_SECRET: string;
  
  // WordPress
  NEXT_PUBLIC_WORDPRESS_URL: string;
  
  // SendinBlue
  SENDINBLUE_API_KEY?: string;
  SENDINBLUE_LIST_ID?: string;
  
  // Analytics
  NEXT_PUBLIC_GA_ID?: string; // Legacy, use NEXT_PUBLIC_GA4_ID
  NEXT_PUBLIC_GA4_ID?: string;
  NEXT_PUBLIC_GTM_ID?: string;
  
  // App
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_BASE_URL: string;
}

// Required environment variables (server-side only)
const REQUIRED_SERVER_ENV_VARS = [
  'NEXT_PUBLIC_WC_URL',
  'WC_CONSUMER_KEY',
  'WC_CONSUMER_SECRET'
] as const;

// Required environment variables (client-side)
const REQUIRED_CLIENT_ENV_VARS = [
  'NEXT_PUBLIC_WORDPRESS_URL',
  'NEXT_PUBLIC_BASE_URL'
] as const;

// Optional environment variables
const OPTIONAL_ENV_VARS = [
  'SENDINBLUE_API_KEY',
  'SENDINBLUE_LIST_ID',
  'NEXT_PUBLIC_GA_ID',
  'NEXT_PUBLIC_GA4_ID',
  'NEXT_PUBLIC_GTM_ID'
] as const;

// Validate environment variables
function validateEnv(): EnvConfig {
  // Check if we're on client-side (browser) or server-side
  const isClient = typeof window !== 'undefined';
  
  // Skip validation on client-side to avoid hydration issues
  if (isClient) {
    // Return safe defaults for client-side
    return {
      NEXT_PUBLIC_WC_URL: '',
      WC_CONSUMER_KEY: '',
      WC_CONSUMER_SECRET: '',
      NEXT_PUBLIC_WORDPRESS_URL: process.env.NEXT_PUBLIC_WORDPRESS_URL || '',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || '',
      SENDINBLUE_API_KEY: process.env.SENDINBLUE_API_KEY,
      SENDINBLUE_LIST_ID: process.env.SENDINBLUE_LIST_ID,
      NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
      NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID,
      NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
      NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development'
    };
  }
  
  // Server-side validation
  const missing: string[] = [];
  
  // Check all required variables on server-side
  for (const varName of [...REQUIRED_SERVER_ENV_VARS, ...REQUIRED_CLIENT_ENV_VARS]) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file.'
    );
  }
  
  // Validate URLs (only client-side accessible ones)
  const wordpressUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  
  try {
    new URL(wordpressUrl);
    new URL(baseUrl);
  } catch (error) {
    throw new Error('Invalid URL in environment variables');
  }
  
  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV as EnvConfig['NODE_ENV'];
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, production, or test');
  }
  
  // Return config with safe defaults for client-side
  return {
    NEXT_PUBLIC_WC_URL: process.env.NEXT_PUBLIC_WC_URL || '',
    WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY || '',
    WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET || '',
    NEXT_PUBLIC_WORDPRESS_URL: wordpressUrl,
    NEXT_PUBLIC_BASE_URL: baseUrl,
    SENDINBLUE_API_KEY: process.env.SENDINBLUE_API_KEY,
    SENDINBLUE_LIST_ID: process.env.SENDINBLUE_LIST_ID,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID,
    NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
    NODE_ENV: nodeEnv
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
