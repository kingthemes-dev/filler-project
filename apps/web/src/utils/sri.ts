import crypto from 'crypto';

/**
 * Generate SRI hash for external scripts
 */
export function generateSRIHash(
  content: string,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384'
): string {
  const hash = crypto.createHash(algorithm).update(content).digest('base64');
  return `${algorithm}-${hash}`;
}

/**
 * Predefined SRI hashes for common external scripts
 * 
 * NOTE: SRI hashes are placeholders. To generate actual hashes:
 * 1. Download the script content
 * 2. Use: openssl dgst -sha384 -binary <script.js> | openssl base64 -A
 * 3. Or use online tools like https://www.srihash.org/
 * 
 * Currently not used in the codebase - kept for future use if needed.
 */
export const SRI_HASHES = {
  // Google Analytics - placeholder (update when needed)
  'https://www.googletagmanager.com/gtag/js': 'sha384-...', // TODO: Generate actual hash
  'https://www.google-analytics.com/analytics.js': 'sha384-...', // TODO: Generate actual hash

  // Google Fonts - placeholder (update when needed)
  'https://fonts.googleapis.com/css2': 'sha384-...', // TODO: Generate actual hash
  'https://fonts.gstatic.com': 'sha384-...', // TODO: Generate actual hash

  // Sentry - placeholder (update when needed)
  'https://browser.sentry-cdn.com': 'sha384-...', // TODO: Generate actual hash
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
