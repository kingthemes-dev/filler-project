/**
 * Client IP utility
 * Extracts client IP from request headers (supports various proxy headers)
 */

import { NextRequest } from 'next/server';

/**
 * Get client IP address from request headers
 * Supports: x-forwarded-for, x-real-ip, cf-connecting-ip, x-remote-addr
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  // x-forwarded-for can contain multiple IPs, take the first one
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  if (remoteAddr) {
    return remoteAddr;
  }
  
  return 'unknown';
}

