/**
 * CORS Configuration Utility
 * 
 * Provides configurable CORS origin for starter template compatibility.
 * - Default: '*' (universal starter template)
 * - Production: Use CORS_ALLOWED_ORIGIN env var for specific domain
 * 
 * Usage:
 *   const origin = getCorsOrigin();
 *   headers['Access-Control-Allow-Origin'] = origin;
 */

/**
 * Get CORS allowed origin from environment variable
 * Falls back to '*' for starter template compatibility
 */
export function getCorsOrigin(): string {
  // Check for explicit CORS configuration
  const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN;
  
  if (allowedOrigin) {
    return allowedOrigin;
  }
  
  // For starter template: use wildcard for universal compatibility
  // In production, set CORS_ALLOWED_ORIGIN env var to specific domain
  return '*';
}

/**
 * Get complete CORS headers
 */
export function getCorsHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  const origin = getCorsOrigin();
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': origin !== '*' ? 'true' : 'false', // Credentials only work with specific origin
    ...additionalHeaders,
  };
}

/**
 * Create CORS response for OPTIONS requests
 */
export function createCorsResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}

