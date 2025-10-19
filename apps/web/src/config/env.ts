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
  NEXT_PUBLIC_GA_ID?: string;
  
  // App
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_BASE_URL: string;
}

// Required environment variables
// On the client we only require public URLs to avoid runtime crashes during hydration
const isBrowser = typeof window !== 'undefined';
const REQUIRED_ENV_VARS = isBrowser
  ? [
      'NEXT_PUBLIC_WORDPRESS_URL'
    ] as const
  : [
      'NEXT_PUBLIC_WC_URL',
      'WC_CONSUMER_KEY',
      'WC_CONSUMER_SECRET',
      'NEXT_PUBLIC_WORDPRESS_URL'
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
    // In the browser, warn instead of crashing; server will still validate strictly
    const message = `Missing required environment variables: ${missing.join(', ')}\nPlease check your .env.local file.`;
    if (isBrowser) {
      console.warn(message);
    } else {
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
    NEXT_PUBLIC_WC_URL: process.env.NEXT_PUBLIC_WC_URL || 'https://qvwltjhdjw.cfolks.pl/wp-json/wc/v3',
    WC_CONSUMER_KEY: process.env.WC_CONSUMER_KEY || 'ck_deb61eadd7301ebfc5f8074ce7c53c6668eb725d',
    WC_CONSUMER_SECRET: process.env.WC_CONSUMER_SECRET || 'cs_0de18ed0e013f96aebfb51c77f506bb94e416cb8',
    NEXT_PUBLIC_WORDPRESS_URL: wordpressUrl || 'https://qvwltjhdjw.cfolks.pl',
    NEXT_PUBLIC_BASE_URL: baseUrl || 'https://www.filler.pl',
    SENDINBLUE_API_KEY: process.env.SENDINBLUE_API_KEY,
    SENDINBLUE_LIST_ID: process.env.SENDINBLUE_LIST_ID,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
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
