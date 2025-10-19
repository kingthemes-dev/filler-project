/**
 * WooCommerce Store API Service
 * Direct calls to WooCommerce Store API v1
 */

interface StoreApiConfig {
  baseUrl: string;
  nonce?: string;
  sessionToken?: string;
}

interface CartItem {
  id: string;
  quantity: number;
  variation?: Record<string, any>;
}

interface CartResponse {
  items: CartItem[];
  totals: {
    total_items: string;
    total_items_tax: string;
    total_fees: string;
    total_fees_tax: string;
    total_discount: string;
    total_discount_tax: string;
    total_shipping: string;
    total_shipping_tax: string;
    total_tax: string;
    total_price: string;
    currency_code: string;
    currency_symbol: string;
  };
  needs_payment: boolean;
  needs_shipping: boolean;
  has_calculated_shipping: boolean;
  shipping_address: any;
  billing_address: any;
  payment_methods: string[];
  payment_requirements: string[];
  extensions: Record<string, any>;
}

class StoreApiService {
  private config: StoreApiConfig;
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL + '/wp-json/wc/store/v1';
    this.config = {
      baseUrl: this.baseUrl,
    };
  }

  /**
   * Get nonce for Store API
   */
  private async getNonce(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/cart`, {
        method: 'GET',
        credentials: 'include',
      });
      
      const nonce = response.headers.get('X-WC-Store-API-Nonce');
      if (nonce) {
        this.config.nonce = nonce;
        return nonce;
      }
      
      throw new Error('No nonce received');
    } catch (error) {
      console.error('Failed to get nonce:', error);
      throw error;
    }
  }

  /**
   * Make authenticated request to Store API
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get nonce if not available
    if (!this.config.nonce) {
      await this.getNonce();
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-WC-Store-API-Nonce': this.config.nonce || '',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Update nonce from response
    const newNonce = response.headers.get('X-WC-Store-API-Nonce');
    if (newNonce) {
      this.config.nonce = newNonce;
    }

    return response;
  }

  /**
   * Get cart contents
   */
  async getCart(): Promise<CartResponse> {
    try {
      const response = await this.makeRequest('/cart');
      
      if (!response.ok) {
        throw new Error(`Cart fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get cart:', error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(productId: number, quantity: number = 1, variation?: Record<string, any>): Promise<CartResponse> {
    try {
      const response = await this.makeRequest('/cart/add-item', {
        method: 'POST',
        body: JSON.stringify({
          id: productId,
          quantity,
          variation,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add item to cart');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to add item to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(itemKey: string, quantity: number): Promise<CartResponse> {
    try {
      const response = await this.makeRequest(`/cart/update-item`, {
        method: 'POST',
        body: JSON.stringify({
          key: itemKey,
          quantity,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update cart item');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(itemKey: string): Promise<CartResponse> {
    try {
      const response = await this.makeRequest(`/cart/remove-item`, {
        method: 'POST',
        body: JSON.stringify({
          key: itemKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove item from cart');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      throw error;
    }
  }

  /**
   * Clear cart
   */
  async clearCart(): Promise<CartResponse> {
    try {
      const response = await this.makeRequest('/cart/clear', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to clear cart');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  }

  /**
   * Get shipping methods
   */
  async getShippingMethods(): Promise<any[]> {
    try {
      const response = await this.makeRequest('/cart/shipping-methods');
      
      if (!response.ok) {
        throw new Error(`Shipping methods fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get shipping methods:', error);
      throw error;
    }
  }

  /**
   * Get payment methods
   */
  async getPaymentMethods(): Promise<any[]> {
    try {
      const response = await this.makeRequest('/cart/payment-methods');
      
      if (!response.ok) {
        throw new Error(`Payment methods fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      throw error;
    }
  }

  /**
   * Update shipping address
   */
  async updateShippingAddress(address: any): Promise<CartResponse> {
    try {
      const response = await this.makeRequest('/cart/update-shipping-address', {
        method: 'POST',
        body: JSON.stringify(address),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update shipping address');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update shipping address:', error);
      throw error;
    }
  }

  /**
   * Update billing address
   */
  async updateBillingAddress(address: any): Promise<CartResponse> {
    try {
      const response = await this.makeRequest('/cart/update-billing-address', {
        method: 'POST',
        body: JSON.stringify(address),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update billing address');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update billing address:', error);
      throw error;
    }
  }

  /**
   * Create order
   */
  async createOrder(orderData: any): Promise<any> {
    try {
      const response = await this.makeRequest('/checkout', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create order');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create order:', error);
      throw error;
    }
  }

  /**
   * Get session data
   */
  async getSession(): Promise<any> {
    try {
      const response = await this.makeRequest('/session');
      
      if (!response.ok) {
        throw new Error(`Session fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get session:', error);
      throw error;
    }
  }

  /**
   * Update session data
   */
  async updateSession(sessionData: any): Promise<any> {
    try {
      const response = await this.makeRequest('/session', {
        method: 'POST',
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update session');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  }
}

export default new StoreApiService();
