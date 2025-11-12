/**
 * HTTP Agent with Connection Pooling for WooCommerce REST API
 * 
 * Provides reusable HTTP connections with keep-alive for better performance.
 * Uses undici Agent for connection pooling in Node.js environment.
 */

import { logger } from './logger';

// Check if we're in Node.js environment
const isNode = typeof process !== 'undefined' && process.versions?.node;

// Lazy load undici to avoid bundling issues in edge runtime
let undiciModule: typeof import('undici') | null = null;
let getUndici: () => typeof import('undici') | null;

if (isNode) {
  getUndici = () => {
    if (undiciModule) return undiciModule;
    try {
      undiciModule = require('undici');
      return undiciModule;
    } catch {
      return null;
    }
  };
} else {
  getUndici = () => null;
}

/**
 * HTTP Agent Configuration
 */
interface HttpAgentConfig {
  maxSockets?: number;
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  timeout?: number;
}

/**
 * HTTP Agent for reusable connections
 */
class HttpAgent {
  private static instance: HttpAgent | null = null;
  private config: HttpAgentConfig;
  private dispatchers: Map<string, any> = new Map();

  private constructor(config: HttpAgentConfig = {}) {
    this.config = {
      maxSockets: config.maxSockets || 50,
      keepAlive: config.keepAlive ?? true,
      keepAliveMsecs: config.keepAliveMsecs || 30000,
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: HttpAgentConfig): HttpAgent {
    if (!HttpAgent.instance) {
      HttpAgent.instance = new HttpAgent(config);
    }
    return HttpAgent.instance;
  }

  /**
   * Get or create dispatcher for a specific origin
   */
  private getDispatcher(origin: string): any {
    if (!isNode) return null;

    // Check if dispatcher already exists for this origin
    if (this.dispatchers.has(origin)) {
      return this.dispatchers.get(origin);
    }

    // Try to create new dispatcher with undici
    const undici = getUndici();
    if (!undici) {
      return null;
    }

    try {
      const dispatcher = new undici.Agent({
        connections: this.config.maxSockets || 50,
        pipelining: 1, // Disable pipelining for compatibility
        keepAliveTimeout: this.config.keepAliveMsecs || 30000,
        keepAliveMaxTimeout: (this.config.keepAliveMsecs || 30000) * 2,
      });
      
      this.dispatchers.set(origin, dispatcher);
      logger.info('HTTP Agent: Created undici dispatcher', {
        origin,
        maxSockets: this.config.maxSockets || 50,
        keepAliveMsecs: this.config.keepAliveMsecs || 30000,
      });
      
      return dispatcher;
    } catch (error) {
      logger.warn('HTTP Agent: Failed to create undici dispatcher', { error, origin });
      return null;
    }
  }

  /**
   * Extract origin from URL
   */
  private getOrigin(url: string | URL): string {
    try {
      const urlObj = typeof url === 'string' ? new URL(url) : url;
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Fetch with connection pooling
   */
  async fetch(
    url: string | URL,
    options: RequestInit = {}
  ): Promise<Response> {
    const urlString = typeof url === 'string' ? url : url.toString();
    const origin = this.getOrigin(urlString);
    
    // Prepare headers with keep-alive and compression
    const headers = new Headers(options.headers);
    if (this.config.keepAlive && !headers.has('Connection')) {
      headers.set('Connection', 'keep-alive');
    }
    
    // Add compression support
    if (!headers.has('Accept-Encoding')) {
      headers.set('Accept-Encoding', 'gzip, br, deflate');
    }

    // Use undici dispatcher if available (better connection pooling)
    const dispatcher = this.getDispatcher(origin);
    if (dispatcher && isNode) {
      const undici = getUndici();
      if (undici) {
        try {
          // Use undici.fetch with dispatcher for connection pooling
          // Remove 'next' property as it's not supported by undici.fetch
          const { next, ...undiciOptions } = options as RequestInit & { next?: unknown };
          // Type assertion needed because undici.fetch has different types than standard fetch
          const response = await undici.fetch(urlString, {
            ...undiciOptions,
            headers: Object.fromEntries(headers.entries()),
            dispatcher,
          } as any);
          return response as Response;
        } catch (error) {
          logger.warn('HTTP Agent: undici fetch failed, falling back to native fetch', { 
            error: error instanceof Error ? error.message : String(error),
            url: urlString 
          });
          // Fall through to native fetch
        }
      }
    }

    // Fallback to native fetch with keep-alive headers
    // Native fetch in Node.js 20+ uses undici under the hood, so connection pooling
    // should work, but we add headers for explicit keep-alive
    return fetch(urlString, {
      ...options,
      headers: Object.fromEntries(headers.entries()),
    });
  }

  /**
   * Get agent statistics
   */
  getStats(): {
    usingUndici: boolean;
    keepAlive: boolean;
    maxSockets: number;
    activeDispatchers: number;
  } {
    return {
      usingUndici: this.dispatchers.size > 0,
      keepAlive: this.config.keepAlive ?? true,
      maxSockets: this.config.maxSockets || 50,
      activeDispatchers: this.dispatchers.size,
    };
  }

  /**
   * Reset agent (close connections)
   */
  async reset(): Promise<void> {
    for (const [origin, dispatcher] of this.dispatchers.entries()) {
      try {
        if (dispatcher && typeof dispatcher.destroy === 'function') {
          await dispatcher.destroy();
        }
      } catch (error) {
        logger.warn('HTTP Agent: Error destroying dispatcher', { error, origin });
      }
    }
    this.dispatchers.clear();
  }
}

// Export singleton instance
export const httpAgent = HttpAgent.getInstance({
  maxSockets: 50,
  keepAlive: true,
  keepAliveMsecs: 30000,
});

// Export class for testing
export { HttpAgent };
export type { HttpAgentConfig };

