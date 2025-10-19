/**
 * API helper functions and utilities
 */

import { env } from '../constants/env';
import { CustomError, ERROR_CODES, handleNetworkRequest } from './error-handler';
import { RequestConfig, ApiResponse } from '@/types/api';
import { formatPrice } from './format-price';

// Base API configuration
const API_CONFIG = {
  timeout: 10000,
  retries: 3,
  retryDelay: 1000
};

// WooCommerce API helper
export class WooCommerceAPI {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor() {
    this.baseUrl = env.NEXT_PUBLIC_WC_URL;
    this.consumerKey = env.WC_CONSUMER_KEY;
    this.consumerSecret = env.WC_CONSUMER_SECRET;
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64')}`;
  }

  private async makeRequest<T>(
    endpoint: string, 
    config: RequestConfig = { method: 'GET' }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const requestConfig: RequestInit = {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.getAuthHeader(),
        ...config.headers
      },
      cache: config.cache,
      signal: AbortSignal.timeout(API_CONFIG.timeout)
    };

    if (config.body && config.method !== 'GET') {
      requestConfig.body = JSON.stringify(config.body);
    }

    return handleNetworkRequest(
      () => fetch(url, requestConfig).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new CustomError(
            `WooCommerce API error: ${response.status}`,
            ERROR_CODES.API_ERROR,
            response.status,
            errorText
          );
        }
        return response.json();
      }),
      'Błąd komunikacji z WooCommerce'
    );
  }

  // Customer methods
  async getCustomer(customerId: number) {
    return this.makeRequest(`/wp-json/wc/v3/customers/${customerId}`);
  }

  async updateCustomer(customerId: number, data: any) {
    return this.makeRequest(`/wp-json/wc/v3/customers/${customerId}`, {
      method: 'PUT',
      body: data
    });
  }

  async createCustomer(data: any) {
    return this.makeRequest('/wp-json/wc/v3/customers', {
      method: 'POST',
      body: data
    });
  }

  // Product methods
  async getProducts(params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams(params);
    return this.makeRequest(`/wp-json/wc/v3/products?${searchParams}`);
  }

  async getProduct(productId: number) {
    return this.makeRequest(`/wp-json/wc/v3/products/${productId}`);
  }

  // Order methods
  async getOrders(params: Record<string, any> = {}) {
    const searchParams = new URLSearchParams(params);
    return this.makeRequest(`/wp-json/wc/v3/orders?${searchParams}`);
  }

  async getOrder(orderId: number) {
    return this.makeRequest(`/wp-json/wc/v3/orders/${orderId}`);
  }

  async createOrder(data: any) {
    return this.makeRequest('/wp-json/wc/v3/orders', {
      method: 'POST',
      body: data
    });
  }
}

// WordPress API helper
export class WordPressAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.NEXT_PUBLIC_WORDPRESS_URL;
  }

  async makeRequest<T>(
    endpoint: string, 
    config: RequestConfig = { method: 'GET' }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const requestConfig: RequestInit = {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      signal: AbortSignal.timeout(API_CONFIG.timeout)
    };

    if (config.body && config.method !== 'GET') {
      requestConfig.body = JSON.stringify(config.body);
    }

    return handleNetworkRequest(
      () => fetch(url, requestConfig).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new CustomError(
            `WordPress API error: ${response.status}`,
            ERROR_CODES.API_ERROR,
            response.status,
            errorText
          );
        }
        return response.json();
      }),
      'Błąd komunikacji z WordPress'
    );
  }

  async triggerOrderEmail(data: any) {
    return this.makeRequest('/wp-json/king-email/v1/trigger-order-email', {
      method: 'POST',
      body: data
    });
  }

  async sendDirectEmail(data: any) {
    return this.makeRequest('/wp-json/king-email/v1/send-direct-email', {
      method: 'POST',
      body: data
    });
  }

  async getCustomerInvoices(customerId: number) {
    return this.makeRequest(`/wp-json/custom/v1/invoices?customer_id=${customerId}`);
  }
}

// SendinBlue API helper
export class SendinBlueAPI {
  private apiKey?: string;
  private listId?: number;

  constructor() {
    this.apiKey = env.SENDINBLUE_API_KEY;
    this.listId = env.SENDINBLUE_LIST_ID ? parseInt(env.SENDINBLUE_LIST_ID) : undefined;
  }

  async addContact(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    attributes?: Record<string, any>;
  }) {
    if (!this.apiKey || !this.listId) {
      console.warn('SendinBlue API not configured');
      return { success: false, message: 'Newsletter service not configured' };
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': this.apiKey
      },
      body: JSON.stringify({
        email: data.email,
        listIds: [this.listId],
        updateEnabled: true,
        attributes: {
          FIRSTNAME: data.firstName || '',
          LASTNAME: data.lastName || '',
          ...data.attributes
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new CustomError(
        `SendinBlue API error: ${errorData.message || response.statusText}`,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        response.status
      );
    }

    return { success: true, message: 'Contact added successfully' };
  }
}

// Utility functions
// formatPrice is now imported from format-price.ts to avoid duplication

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
}

export function generateDiscountCode(email: string, source: string): string {
  const timestamp = Date.now().toString().slice(-4);
  const emailPrefix = email.split('@')[0].slice(0, 3).toUpperCase();
  const sourcePrefix = source === 'registration' ? 'REG' : 'NEWS';
  return `${sourcePrefix}${emailPrefix}${timestamp}`;
}

// API instances
export const wooCommerceAPI = new WooCommerceAPI();
export const wordPressAPI = new WordPressAPI();
export const sendinBlueAPI = new SendinBlueAPI();
