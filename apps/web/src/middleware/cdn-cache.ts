/**
 * CDN Cache Strategy Middleware
 * Optimizes caching for Vercel Edge Network and CDN
 */

import { NextRequest, NextResponse } from 'next/server';

interface CacheConfig {
  maxAge: number;
  sMaxAge: number;
  staleWhileRevalidate: number;
  mustRevalidate: boolean;
  noStore: boolean;
  private: boolean;
}

class CDNCacheStrategy {
  private static readonly CACHE_CONFIGS: Record<string, CacheConfig> = {
    // Static assets - long cache
    static: {
      maxAge: 31536000, // 1 year
      sMaxAge: 31536000,
      staleWhileRevalidate: 86400, // 1 day
      mustRevalidate: false,
      noStore: false,
      private: false,
    },

    // API responses - short cache
    api: {
      maxAge: 300, // 5 minutes
      sMaxAge: 300,
      staleWhileRevalidate: 60, // 1 minute
      mustRevalidate: true,
      noStore: false,
      private: false,
    },

    // HTML pages - medium cache with revalidation
    html: {
      maxAge: 0,
      sMaxAge: 300, // 5 minutes
      staleWhileRevalidate: 60, // 1 minute
      mustRevalidate: true,
      noStore: false,
      private: false,
    },

    // User-specific content - no cache
    private: {
      maxAge: 0,
      sMaxAge: 0,
      staleWhileRevalidate: 0,
      mustRevalidate: true,
      noStore: true,
      private: true,
    },
  };

  /**
   * Determine cache strategy based on request
   */
  private getCacheStrategy(request: NextRequest): CacheConfig {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Static assets
    if (
      pathname.startsWith('/_next/static/') ||
      pathname.startsWith('/_next/image/') ||
      pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
    ) {
      return CDNCacheStrategy.CACHE_CONFIGS.static;
    }

    // API routes
    if (pathname.startsWith('/api/')) {
      // Health check - no cache
      if (pathname === '/api/health') {
        return CDNCacheStrategy.CACHE_CONFIGS.private;
      }

      // User-specific API routes - no cache
      if (
        pathname.includes('/user/') ||
        pathname.includes('/cart/') ||
        pathname.includes('/favorites/')
      ) {
        return CDNCacheStrategy.CACHE_CONFIGS.private;
      }

      // Public API routes - short cache
      return CDNCacheStrategy.CACHE_CONFIGS.api;
    }

    // User-specific pages - no cache
    if (
      pathname.includes('/moje-') ||
      pathname.includes('/koszyk') ||
      pathname.includes('/checkout')
    ) {
      return CDNCacheStrategy.CACHE_CONFIGS.private;
    }

    // HTML pages - medium cache
    return CDNCacheStrategy.CACHE_CONFIGS.html;
  }

  /**
   * Apply cache headers to response
   */
  applyCacheHeaders(
    request: NextRequest,
    response: NextResponse
  ): NextResponse {
    const config = this.getCacheStrategy(request);

    // Set Cache-Control header
    const cacheControl = this.buildCacheControlHeader(config);
    response.headers.set('Cache-Control', cacheControl);

    // Set CDN-specific headers
    if (config.sMaxAge > 0) {
      response.headers.set('CDN-Cache-Control', `max-age=${config.sMaxAge}`);
    }

    // Set Vercel-specific headers
    response.headers.set('Vercel-CDN-Cache-Control', cacheControl);
    response.headers.set('Vercel-Cache', this.getVercelCacheValue(config));

    // Set ETag for better caching
    if (!response.headers.get('ETag') && !config.noStore) {
      const etag = this.generateETag(request);
      response.headers.set('ETag', etag);
    }

    // Set Vary header for proper cache key generation
    const vary = this.getVaryHeader(request);
    if (vary) {
      response.headers.set('Vary', vary);
    }

    return response;
  }

  /**
   * Build Cache-Control header
   */
  private buildCacheControlHeader(config: CacheConfig): string {
    const directives: string[] = [];

    if (config.noStore) {
      directives.push('no-store');
      return directives.join(', ');
    }

    if (config.private) {
      directives.push('private');
    } else {
      directives.push('public');
    }

    if (config.maxAge > 0) {
      directives.push(`max-age=${config.maxAge}`);
    }

    if (config.sMaxAge > 0) {
      directives.push(`s-maxage=${config.sMaxAge}`);
    }

    if (config.staleWhileRevalidate > 0) {
      directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }

    if (config.mustRevalidate) {
      directives.push('must-revalidate');
    }

    return directives.join(', ');
  }

  /**
   * Get Vercel cache value
   */
  private getVercelCacheValue(config: CacheConfig): string {
    if (config.noStore) return 'MISS';
    if (config.maxAge > 0) return 'HIT';
    return 'MISS';
  }

  /**
   * Generate ETag for request
   */
  private generateETag(request: NextRequest): string {
    const url = new URL(request.url);
    const content = `${url.pathname}${url.search}`;

    // Simple hash function for ETag
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `"${Math.abs(hash).toString(36)}"`;
  }

  /**
   * Get Vary header based on request
   */
  private getVaryHeader(request: NextRequest): string | null {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // API routes that depend on user authentication
    if (
      pathname.startsWith('/api/') &&
      (pathname.includes('/user/') || pathname.includes('/cart/'))
    ) {
      return 'Authorization, Cookie';
    }

    // Pages that depend on user preferences
    if (pathname.includes('/moje-') || pathname.includes('/koszyk')) {
      return 'Cookie';
    }

    // Internationalization
    if (pathname.startsWith('/en/') || pathname.startsWith('/pl/')) {
      return 'Accept-Language';
    }

    return null;
  }

  /**
   * Check if request should bypass cache
   */
  shouldBypassCache(request: NextRequest): boolean {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Bypass cache for POST, PUT, DELETE requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      return true;
    }

    // Bypass cache for user-specific content
    if (
      pathname.includes('/moje-') ||
      pathname.includes('/koszyk') ||
      pathname.includes('/checkout')
    ) {
      return true;
    }

    // Bypass cache if no-cache header is present
    const cacheControl = request.headers.get('Cache-Control');
    if (cacheControl && cacheControl.includes('no-cache')) {
      return true;
    }

    // Bypass cache for preview mode
    if (url.searchParams.has('preview') || url.searchParams.has('draft')) {
      return true;
    }

    return false;
  }
}

const cdnCacheStrategy = new CDNCacheStrategy();

export function applyCDNCache(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  return cdnCacheStrategy.applyCacheHeaders(request, response);
}

export function shouldBypassCDNCache(request: NextRequest): boolean {
  return cdnCacheStrategy.shouldBypassCache(request);
}

export default cdnCacheStrategy;
