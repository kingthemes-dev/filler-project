import crypto from 'crypto';

/**
 * Generate SRI hash for external scripts
 */
export function generateSRIHash(content: string, algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'): string {
  const hash = crypto.createHash(algorithm).update(content).digest('base64');
  return `${algorithm}-${hash}`;
}

/**
 * Predefined SRI hashes for common external scripts
 */
export const SRI_HASHES = {
  // Google Analytics
  'https://www.googletagmanager.com/gtag/js': 'sha384-...', // Update with actual hash
  'https://www.google-analytics.com/analytics.js': 'sha384-...', // Update with actual hash
  
  // Google Fonts
  'https://fonts.googleapis.com/css2': 'sha384-...', // Update with actual hash
  'https://fonts.gstatic.com': 'sha384-...', // Update with actual hash
  
  // Sentry
  'https://browser.sentry-cdn.com': 'sha384-...', // Update with actual hash
} as const;

/**
 * Get SRI hash for external script
 */
export function getSRIHash(url: string): string | undefined {
  return SRI_HASHES[url as keyof typeof SRI_HASHES];
}

/**
 * Generate SRI attribute for script tag
 */
export function generateSRIAttribute(url: string, content?: string): string {
  if (content) {
    return `integrity="${generateSRIHash(content)}"`;
  }
  
  const hash = getSRIHash(url);
  if (hash) {
    return `integrity="${hash}"`;
  }
  
  return '';
}
