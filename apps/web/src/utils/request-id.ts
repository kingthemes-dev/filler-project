/**
 * Request ID utility for correlation tracking
 * Generates unique request IDs and manages correlation across services
 */

import { randomBytes } from 'crypto';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Get request ID from headers or generate new one
 */
export function getRequestId(
  request:
    | Request
    | { headers: Headers | { get: (key: string) => string | null } }
): string {
  const headers = 'headers' in request ? request.headers : request;
  const requestId =
    headers.get('x-request-id') ||
    headers.get('x-correlation-id') ||
    headers.get('x-trace-id') ||
    generateRequestId();
  return requestId;
}

/**
 * Set request ID in response headers
 */
export function setRequestIdHeader(
  response: Response,
  requestId: string
): void {
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('X-Correlation-ID', requestId);
}
