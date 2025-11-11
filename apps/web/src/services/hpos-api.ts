/**
 * HPOS-Compatible WooCommerce API Service
 * Optimized for High-Performance Order Storage
 */

import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { hposCache } from '@/lib/hpos-cache';
import { hposPerformanceMonitor } from './hpos-performance-monitor';
import { httpAgent } from '@/utils/http-agent';
import { getTimeoutConfig, createTimeoutSignal, getRetryDelay } from '@/utils/timeout-config';
import type { WooCommerceOrder } from '@/types/api';

type UnknownRecord = Record<string, unknown>;
type WooOrderAddress = WooCommerceOrder['billing'];
type WooOrderLineItem = WooCommerceOrder['line_items'][number];
type WooOrderMetaData = WooCommerceOrder['meta_data'][number];

interface HPOSConfig {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

interface HPOSOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  date_modified: string;
  total: string;
  currency?: string;
  customer_id: number;
  billing: WooOrderAddress;
  shipping: WooOrderAddress;
  line_items: WooOrderLineItem[];
  meta_data: WooOrderMetaData[];
  payment_method: string;
  payment_method_title: string;
  transaction_id?: string;
  payment_url?: string;
  checkout_payment_url?: string;
}

interface HPOSOrderQuery {
  customer?: number;
  status?: string;
  page?: number;
  per_page?: number;
  orderby?: string;
  order?: 'asc' | 'desc';
  after?: string;
  before?: string;
  search?: string;
}

class HPOSApiService {
  private config: HPOSConfig;
  private cache: Map<string, { data: unknown; expires: number }> = new Map();

  constructor() {
    // Get adaptive timeout configuration for orders
    const timeoutConfig = getTimeoutConfig('orders', 'GET');
    this.config = {
      baseUrl: env.NEXT_PUBLIC_WC_URL,
      consumerKey: env.WC_CONSUMER_KEY,
      consumerSecret: env.WC_CONSUMER_SECRET,
      timeout: timeoutConfig.timeout, // Use adaptive timeout
      retries: timeoutConfig.maxRetries,
      retryDelay: timeoutConfig.retryDelay,
    };
  }

  private getAuthHeader(): string {
    return 'Basic ' + Buffer.from(`${this.config.consumerKey}:${this.config.consumerSecret}`).toString('base64');
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    useCache: boolean = true
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const _cacheKey = `hpos:${endpoint}:${JSON.stringify(options)}`;
    const requestStartTime = Date.now();

    // Check cache first
    if (useCache && options.method === 'GET') {
      const cached = this.cache.get(_cacheKey) as { data: T; expires: number } | undefined;
      if (cached && cached.expires > Date.now()) {
        logger.info('HPOS cache hit', { endpoint });
        hposPerformanceMonitor.recordCacheHit();
        return cached.data;
      }
      hposPerformanceMonitor.recordCacheMiss();
    }

    // Get adaptive timeout for this endpoint
    const endpointPath = endpoint.replace(/^\/wp-json\/wc\/v3\//, '').replace(/^\//, '');
    const timeoutConfig = getTimeoutConfig(endpointPath, options.method || 'GET');
    
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= timeoutConfig.maxRetries; attempt++) {
      try {
        // Create new timeout signal for each attempt
        const timeoutSignal = createTimeoutSignal(timeoutConfig.timeout);
        
        const requestOptions: RequestInit = {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': this.getAuthHeader(),
            'User-Agent': 'HeadlessWoo-HPOS/1.0',
            'X-HPOS-Enabled': 'true', // Signal HPOS compatibility
            ...options.headers,
          },
          signal: timeoutSignal, // Use adaptive timeout
        };

        logger.info('HPOS API request', { 
          endpoint, 
          url,
          baseUrl: this.config.baseUrl,
          attempt, 
          method: options.method || 'GET',
          timeout: timeoutConfig.timeout
        });

        // Use HTTP agent for connection pooling
        const response = await httpAgent.fetch(url, requestOptions);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HPOS API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Cache successful responses
        if (useCache && options.method === 'GET') {
          this.cache.set(_cacheKey, {
            data: data as unknown,
            expires: Date.now() + (5 * 60 * 1000), // 5 minutes cache
          });
        }

        logger.info('HPOS API success', { 
          endpoint, 
          attempt, 
          status: response.status 
        });

        // Record performance metrics
        hposPerformanceMonitor.recordApiCall(true, Date.now() - requestStartTime, true);

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn('HPOS API attempt failed', { 
          endpoint, 
          attempt, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });

        if (attempt < timeoutConfig.maxRetries) {
          // Use exponential backoff
          const retryDelay = getRetryDelay(attempt, timeoutConfig);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError || new Error('HPOS API request failed after all retries');
  }

  /**
   * Get orders with HPOS optimization and caching
   */
  async getOrders(query: HPOSOrderQuery = {}): Promise<HPOSOrder[]> {
    // removed unused cacheKey variable
    
    const cacheParams = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined)
    );

    // Try cache first
    const cached = await hposCache.get('orders', 'list', cacheParams);
    if (cached && Array.isArray(cached)) {
      return cached as HPOSOrder[];
    }

    const params = new URLSearchParams();
    
    // HPOS-optimized query parameters
    if (query.customer) params.append('customer', query.customer.toString());
    if (query.status) params.append('status', query.status);
    if (query.page) params.append('page', query.page.toString());
    if (query.per_page) params.append('per_page', query.per_page.toString());
    if (query.orderby) params.append('orderby', query.orderby);
    if (query.order) params.append('order', query.order);
    if (query.after) params.append('after', query.after);
    if (query.before) params.append('before', query.before);
    if (query.search) params.append('search', query.search);

    // HPOS-specific optimizations
    params.append('_fields', 'id,number,status,date_created,date_modified,total,currency,customer_id,billing,shipping,line_items,meta_data,payment_method,payment_method_title,transaction_id,payment_url,checkout_payment_url');
    
    const orders = await this.makeRequest<HPOSOrder[]>(`/wp-json/wc/v3/orders?${params}`);
    
    // Cache the result
    await hposCache.set('orders', 'list', orders, cacheParams, ['orders', 'customer']);
    
    return orders;
  }

  /**
   * Get single order with HPOS optimization
   */
  async getOrder(orderId: number): Promise<HPOSOrder> {
    const params = new URLSearchParams();
    params.append('_fields', 'id,number,status,date_created,date_modified,total,currency,customer_id,billing,shipping,line_items,meta_data,payment_method,payment_method_title,transaction_id,payment_url,checkout_payment_url');
    
    return this.makeRequest<HPOSOrder>(`/wp-json/wc/v3/orders/${orderId}?${params}`);
  }

  /**
   * Create order with HPOS compatibility
   */
  async createOrder(orderData: UnknownRecord): Promise<HPOSOrder> {
    // Check if baseUrl already contains /wp-json/wc/v3
    // If it does, use just /orders, otherwise use full path
    const baseUrlEndsWithApi = this.config.baseUrl.endsWith('/wp-json/wc/v3');
    const endpoint = baseUrlEndsWithApi ? '/orders' : '/wp-json/wc/v3/orders';
    
    logger.info('Creating order', { 
      baseUrl: this.config.baseUrl, 
      endpoint,
      willCall: `${this.config.baseUrl}${endpoint}`
    });
    
    return this.makeRequest<HPOSOrder>(endpoint, {
      method: 'POST',
      body: JSON.stringify(orderData),
      headers: {
        'Content-Type': 'application/json',
      },
    }, false); // Don't cache POST requests
  }

  /**
   * Update order with HPOS compatibility
   */
  async updateOrder(orderId: number, orderData: UnknownRecord): Promise<HPOSOrder> {
    return this.makeRequest<HPOSOrder>(`/wp-json/wc/v3/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    }, false); // Don't cache PUT requests
  }

  /**
   * Get order notes with HPOS optimization
   */
  async getOrderNotes(orderId: number): Promise<UnknownRecord[]> {
    return this.makeRequest<UnknownRecord[]>(`/wp-json/wc/v3/orders/${orderId}/notes`);
  }

  /**
   * Add order note with HPOS compatibility
   */
  async addOrderNote(orderId: number, note: string, customerNote: boolean = false): Promise<UnknownRecord> {
    return this.makeRequest<UnknownRecord>(`/wp-json/wc/v3/orders/${orderId}/notes`, {
      method: 'POST',
      body: JSON.stringify({
        note,
        customer_note: customerNote,
      }),
    }, false);
  }

  /**
   * Get order refunds with HPOS optimization
   */
  async getOrderRefunds(orderId: number): Promise<UnknownRecord[]> {
    return this.makeRequest<UnknownRecord[]>(`/wp-json/wc/v3/orders/${orderId}/refunds`);
  }

  /**
   * Create order refund with HPOS compatibility
   */
  async createOrderRefund(orderId: number, refundData: UnknownRecord): Promise<UnknownRecord> {
    return this.makeRequest<UnknownRecord>(`/wp-json/wc/v3/orders/${orderId}/refunds`, {
      method: 'POST',
      body: JSON.stringify(refundData),
    }, false);
  }

  /**
   * Get order statistics with HPOS optimization
   */
  async getOrderStats(customerId?: number): Promise<UnknownRecord> {
    const params = new URLSearchParams();
    if (customerId) params.append('customer', customerId.toString());
    
    return this.makeRequest<UnknownRecord>(`/wp-json/wc/v3/orders/stats?${params}`);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('HPOS cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const hposApi = new HPOSApiService();
export type { HPOSOrder, HPOSOrderQuery };
