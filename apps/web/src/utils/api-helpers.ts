/**
 * API helper functions and utilities
 */

import { env } from '@/config/env';
import {
  CustomError,
  ERROR_CODES,
  handleNetworkRequest,
} from './error-handler';
import { RequestConfig } from '@/types/api';
import { logger } from './logger';
import type { WooCustomer, WooOrder, WooProduct } from '@/types/woocommerce';

type BufferLike = {
  from: (input: string) => { toString: (encoding: string) => string };
};

type WooPayload = Record<string, unknown>;

type WooQueryParams = Record<string, string | number | boolean | undefined>;

type SendinBlueAttributes = Record<
  string,
  string | number | boolean | null | undefined
>;

type Sanitizable = string | number | boolean | null | undefined;

// Base API configuration
const API_CONFIG = {
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
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
    const raw = `${this.consumerKey}:${this.consumerSecret}`;
    try {
      // Node.js (global Buffer)
      const globalBuffer = (globalThis as { Buffer?: BufferLike }).Buffer;
      if (globalBuffer && typeof globalBuffer.from === 'function') {
        return `Basic ${globalBuffer.from(raw).toString('base64')}`;
      }
    } catch {}
    // Browser fallback
    // btoa expects binary string; unescape(encodeURIComponent()) handles unicode
    const encoded =
      typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(raw))) : '';
    return `Basic ${encoded}`;
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
        Authorization: this.getAuthHeader(),
        ...config.headers,
      },
      cache: config.cache,
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    };

    if (config.body && config.method !== 'GET') {
      requestConfig.body = JSON.stringify(config.body);
    }

    return handleNetworkRequest(
      () =>
        fetch(url, requestConfig).then(async response => {
          if (!response.ok) {
            const errorText = await response.text();
            throw new CustomError(
              `WooCommerce API error: ${response.status}`,
              ERROR_CODES.API_ERROR,
              response.status,
              errorText
            );
          }
          const payload = (await response.json()) as T;
          return payload;
        }),
      'Błąd komunikacji z WooCommerce'
    );
  }

  // Customer methods
  async getCustomer(customerId: number): Promise<WooCustomer> {
    return this.makeRequest<WooCustomer>(
      `/wp-json/wc/v3/customers/${customerId}`
    );
  }

  async updateCustomer(
    customerId: number,
    data: Partial<WooCustomer> | WooPayload
  ): Promise<WooCustomer> {
    return this.makeRequest<WooCustomer>(
      `/wp-json/wc/v3/customers/${customerId}`,
      {
        method: 'PUT',
        body: data,
      }
    );
  }

  async createCustomer(
    data: Partial<WooCustomer> | WooPayload
  ): Promise<WooCustomer> {
    return this.makeRequest<WooCustomer>('/wp-json/wc/v3/customers', {
      method: 'POST',
      body: data,
    });
  }

  // Product methods
  async getProducts<T = WooProduct[]>(params: WooQueryParams = {}): Promise<T> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    return this.makeRequest<T>(`/wp-json/wc/v3/products?${searchParams}`);
  }

  async getProduct(productId: number): Promise<WooProduct> {
    return this.makeRequest<WooProduct>(`/wp-json/wc/v3/products/${productId}`);
  }

  // Order methods
  async getOrders<T = WooOrder[]>(params: WooQueryParams = {}): Promise<T> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    });
    return this.makeRequest<T>(`/wp-json/wc/v3/orders?${searchParams}`);
  }

  async getOrder(orderId: number): Promise<WooOrder> {
    return this.makeRequest<WooOrder>(`/wp-json/wc/v3/orders/${orderId}`);
  }

  async createOrder(data: Partial<WooOrder> | WooPayload): Promise<WooOrder> {
    return this.makeRequest<WooOrder>('/wp-json/wc/v3/orders', {
      method: 'POST',
      body: data,
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
        ...config.headers,
      },
      signal: AbortSignal.timeout(API_CONFIG.timeout),
    };

    if (config.body && config.method !== 'GET') {
      requestConfig.body = JSON.stringify(config.body);
    }

    return handleNetworkRequest(
      () =>
        fetch(url, requestConfig).then(async response => {
          if (!response.ok) {
            const errorText = await response.text();
            throw new CustomError(
              `WordPress API error: ${response.status}`,
              ERROR_CODES.API_ERROR,
              response.status,
              errorText
            );
          }
          const payload = (await response.json()) as T;
          return payload;
        }),
      'Błąd komunikacji z WordPress'
    );
  }

  async triggerOrderEmail<T = unknown>(data: WooPayload): Promise<T> {
    return this.makeRequest<T>('/wp-json/king-email/v1/trigger-order-email', {
      method: 'POST',
      body: data,
    });
  }

  async sendDirectEmail<T = unknown>(data: WooPayload): Promise<T> {
    return this.makeRequest<T>('/wp-json/king-email/v1/send-direct-email', {
      method: 'POST',
      body: data,
    });
  }

  async getCustomerInvoices(customerId: number) {
    return this.makeRequest(
      `/wp-json/custom/v1/invoices?customer_id=${customerId}`
    );
  }
}

// SendinBlue API helper
export class SendinBlueAPI {
  private apiKey?: string;
  private listId?: number;

  constructor() {
    this.apiKey = env.SENDINBLUE_API_KEY;
    this.listId = env.SENDINBLUE_LIST_ID
      ? parseInt(env.SENDINBLUE_LIST_ID)
      : undefined;
  }

  /**
   * Check if a contact exists in Brevo by email
   * @param email - Email address to check
   * @returns Object with exists flag, optional contact data, and error flag
   */
  async checkContactExists(email: string): Promise<{
    exists: boolean;
    contact?: {
      id: number;
      email: string;
      attributes?: Record<string, unknown>;
    };
    error?: boolean;
    errorMessage?: string;
  }> {
    if (!this.apiKey) {
      logger.warn('SendinBlue API not configured');
      return { exists: false, error: true, errorMessage: 'API not configured' };
    }

    try {
      // Brevo API endpoint: GET /v3/contacts/{email}
      // Returns 200 if contact exists, 404 if not found
      const response = await fetch(
        `https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'api-key': this.apiKey,
          },
        }
      );

      if (response.status === 404) {
        // Contact does not exist - this is not an error
        return { exists: false };
      }

      if (response.ok) {
        // Contact exists
        const contactData = await response.json();
        return {
          exists: true,
          contact: {
            id: contactData.id,
            email: contactData.email,
            attributes: contactData.attributes,
          },
        };
      }

      // Other error status - this is an API error
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || response.statusText || 'Unknown API error';
      logger.warn('Brevo API error when checking contact', {
        email,
        status: response.status,
        error: errorData,
      });
      return {
        exists: false,
        error: true,
        errorMessage: `API error: ${errorMessage}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error checking contact existence in Brevo', {
        email,
        error: errorMessage,
      });
      return {
        exists: false,
        error: true,
        errorMessage: `Network error: ${errorMessage}`,
      };
    }
  }

  async addContact(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    attributes?: SendinBlueAttributes;
  }) {
    if (!this.apiKey || !this.listId) {
      logger.warn('SendinBlue API not configured');
      return { success: false, message: 'Newsletter service not configured' };
    }

    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        email: data.email,
        listIds: [this.listId],
        updateEnabled: true,
        attributes: {
          FIRSTNAME: data.firstName || '',
          LASTNAME: data.lastName || '',
          ...data.attributes,
        },
      }),
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

  /**
   * Update contact attributes in Brevo
   * @param email - Email address of the contact
   * @param attributes - Attributes to update
   * @returns Success status and message
   */
  async updateContact(
    email: string,
    attributes: SendinBlueAttributes
  ): Promise<{ success: boolean; message: string }> {
    if (!this.apiKey) {
      logger.warn('SendinBlue API not configured');
      return { success: false, message: 'Newsletter service not configured' };
    }

    try {
      const response = await fetch(
        `https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`,
        {
          method: 'PUT',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
          },
          body: JSON.stringify({
            attributes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Brevo API error when updating contact', {
          email,
          status: response.status,
          error: errorData,
        });
        throw new CustomError(
          `SendinBlue API error: ${errorData.message || response.statusText}`,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          response.status
        );
      }

      logger.info('Contact updated in Brevo', { email });
      return { success: true, message: 'Contact updated successfully' };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Error updating contact in Brevo', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new CustomError(
        `Failed to update contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        500
      );
    }
  }

  /**
   * Remove contact from Brevo list (unsubscribe)
   * @param email - Email address of the contact
   * @returns Success status and message
   */
  async removeContact(email: string): Promise<{ success: boolean; message: string }> {
    if (!this.apiKey || !this.listId) {
      logger.warn('SendinBlue API not configured');
      return { success: false, message: 'Newsletter service not configured' };
    }

    try {
      const response = await fetch(
        `https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`,
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            'api-key': this.apiKey,
          },
        }
      );

      // 204 No Content means success, 404 means contact doesn't exist (also success for our purposes)
      if (response.status === 204 || response.status === 404) {
        logger.info('Contact removed from Brevo', { email });
        return { success: true, message: 'Contact removed successfully' };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Brevo API error when removing contact', {
          email,
          status: response.status,
          error: errorData,
        });
        throw new CustomError(
          `SendinBlue API error: ${errorData.message || response.statusText}`,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          response.status
        );
      }

      return { success: true, message: 'Contact removed successfully' };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Error removing contact from Brevo', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new CustomError(
        `Failed to remove contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        500
      );
    }
  }

  /**
   * Unsubscribe contact from newsletter list (removes from list but keeps contact)
   * @param email - Email address of the contact
   * @returns Success status and message
   */
  async unsubscribeContact(email: string): Promise<{ success: boolean; message: string }> {
    if (!this.apiKey || !this.listId) {
      logger.warn('SendinBlue API not configured');
      return { success: false, message: 'Newsletter service not configured' };
    }

    try {
      // Remove contact from specific list
      const response = await fetch(
        `https://api.brevo.com/v3/contacts/lists/${this.listId}/contacts/remove`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
          },
          body: JSON.stringify({
            emails: [email],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Brevo API error when unsubscribing contact', {
          email,
          listId: this.listId,
          status: response.status,
          error: errorData,
        });
        throw new CustomError(
          `SendinBlue API error: ${errorData.message || response.statusText}`,
          ERROR_CODES.EXTERNAL_SERVICE_ERROR,
          response.status
        );
      }

      logger.info('Contact unsubscribed from Brevo list', { email, listId: this.listId });
      return { success: true, message: 'Contact unsubscribed successfully' };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      logger.error('Error unsubscribing contact from Brevo', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new CustomError(
        `Failed to unsubscribe contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        500
      );
    }
  }
}

// Utility functions
export function formatPrice(price: number, currency: string = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency,
  }).format(price / 100);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function generateDiscountCode(email: string, source: string): string {
  const timestamp = Date.now().toString().slice(-4);
  const emailPrefix = email.split('@')[0].slice(0, 3).toUpperCase();
  const sourcePrefix = source === 'registration' ? 'REG' : 'NEWS';
  return `${sourcePrefix}${emailPrefix}${timestamp}`;
}

// Backwards-compatible helpers expected by tests
export function buildApiUrl(
  baseUrl: string,
  endpoint: string,
  params?: Record<string, string | number | boolean>
): string {
  const base = (baseUrl || env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${base}${path}`);
  if (params && Object.keys(params).length > 0) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export function sanitizeInput(value: Sanitizable): string {
  if (typeof value !== 'string') return value ? String(value).trim() : '';
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function validateEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function formatError(err: unknown): {
  message: string;
  type: string;
  timestamp: string;
  stack?: string;
} {
  if (err instanceof Error) {
    return {
      message: err.message,
      type: err.name || 'Error',
      timestamp: new Date().toISOString(),
      stack: err.stack,
    };
  }
  if (typeof err === 'string') {
    return {
      message: err,
      type: 'string',
      timestamp: new Date().toISOString(),
    };
  }
  return {
    message: 'Unknown error',
    type: 'unknown',
    timestamp: new Date().toISOString(),
  };
}

// API instances
export const wooCommerceAPI = new WooCommerceAPI();
export const wordPressAPI = new WordPressAPI();
export const sendinBlueAPI = new SendinBlueAPI();
