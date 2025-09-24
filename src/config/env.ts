/**
 * Environment variables validation and configuration
 */

interface EnvConfig {
  // WooCommerce
  WOOCOMMERCE_API_URL: string;
  WOOCOMMERCE_CONSUMER_KEY: string;
  WOOCOMMERCE_CONSUMER_SECRET: string;
  
  // WordPress
  NEXT_PUBLIC_WORDPRESS_URL: string;
  
  // SendinBlue
  SENDINBLUE_API_KEY?: string;
  SENDINBLUE_LIST_ID?: string;
  
  // Analytics
  NEXT_PUBLIC_GA_ID?: string;
  
  // App
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_BASE_URL: string;
}

// Required environment variables
const REQUIRED_ENV_VARS = [
  'WOOCOMMERCE_API_URL',
  'WOOCOMMERCE_CONSUMER_KEY',
  'WOOCOMMERCE_CONSUMER_SECRET',
  'NEXT_PUBLIC_WORDPRESS_URL',
  'NEXT_PUBLIC_BASE_URL'
] as const;

// Optional environment variables
const OPTIONAL_ENV_VARS = [
  'SENDINBLUE_API_KEY',
  'SENDINBLUE_LIST_ID',
  'NEXT_PUBLIC_GA_ID'
] as const;

// Validate environment variables
function validateEnv(): EnvConfig {
  const missing: string[] = [];
  
  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
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
  
  // Validate URLs
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
  
  return {
    WOOCOMMERCE_API_URL: process.env.WOOCOMMERCE_API_URL!,
    WOOCOMMERCE_CONSUMER_KEY: process.env.WOOCOMMERCE_CONSUMER_KEY!,
    WOOCOMMERCE_CONSUMER_SECRET: process.env.WOOCOMMERCE_CONSUMER_SECRET!,
    NEXT_PUBLIC_WORDPRESS_URL: wordpressUrl,
    NEXT_PUBLIC_BASE_URL: baseUrl,
    SENDINBLUE_API_KEY: process.env.SENDINBLUE_API_KEY,
    SENDINBLUE_LIST_ID: process.env.SENDINBLUE_LIST_ID,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
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
  analytics: !!env.NEXT_PUBLIC_GA_ID,
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
