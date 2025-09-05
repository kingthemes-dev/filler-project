import { WooProduct, WooProductQuery, WooApiResponse } from '@/types/woocommerce';

// =========================================
// Optimized WooCommerce Service
// =========================================

class WooCommerceOptimizedService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/woocommerce';
    console.log('🚀 WooCommerce Optimized Service initialized');
  }

  // =========================================
  // Homepage Data - All tabs in one request
  // =========================================
  async getHomepageData(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=homepage`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching homepage data:', error);
      throw error;
    }
  }

  // =========================================
  // Shop Data - Optimized product list
  // =========================================
  async getShopData(page: number = 1, perPage: number = 12, category?: string): Promise<any> {
    try {
      const params = new URLSearchParams({
        endpoint: 'shop',
        page: page.toString(),
        per_page: perPage.toString()
      });
      
      if (category) {
        params.append('category', category);
      }
      
      const response = await fetch(`${this.baseUrl}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching shop data:', error);
      throw error;
    }
  }

  // =========================================
  // Product Data - Single product
  // =========================================
  async getProductData(productId: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=product/${productId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching product data:', error);
      throw error;
    }
  }

  async getProductById(productId: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=products/${productId}&cache=off`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      throw error;
    }
  }

  // =========================================
  // Product by Slug
  // =========================================
  async getProductBySlug(slug: string): Promise<any> {
    try {
      // Use cache=off to ensure fresh data for product pages
      const response = await fetch(`${this.baseUrl}?endpoint=products&slug=${slug}&cache=off`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // WooCommerce API zwraca array, więc bierzemy pierwszy element
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching product by slug:', error);
      throw error;
    }
  }

  // =========================================
  // Categories
  // =========================================
  async getCategories(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=products/categories`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        data: Array.isArray(data) ? data : [data],
        total: Array.isArray(data) ? data.length : 1,
        totalPages: 1,
        currentPage: 1,
        perPage: 100,
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // =========================================
  // Legacy Methods - Fallback to original service
  // =========================================
  async getProducts(query: WooProductQuery = {}): Promise<WooApiResponse<WooProduct>> {
    try {
      const params = new URLSearchParams();
      
      if (query.per_page) params.append('per_page', query.per_page.toString());
      if (query.page) params.append('page', query.page.toString());
      if (query.search) params.append('search', query.search);
      if (query.category) params.append('category', query.category);
      if (query.orderby) params.append('orderby', query.orderby);
      if (query.order) params.append('order', query.order);
      if (query.featured) params.append('featured', query.featured.toString());
      if (query.on_sale) params.append('on_sale', query.on_sale.toString());
      if (query.attribute) params.append('attribute', query.attribute);
      if (query.attribute_term) params.append('attribute_term', query.attribute_term);
      if (query.min_price) params.append('min_price', query.min_price);
      if (query.max_price) params.append('max_price', query.max_price);
      if (query.stock_status) params.append('stock_status', query.stock_status);
      
      const response = await fetch(`${this.baseUrl}?endpoint=products&${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        data: Array.isArray(data) ? data : [data],
        total: Array.isArray(data) ? data.length : 1,
        totalPages: 1,
        currentPage: 1,
        perPage: query.per_page || 10,
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getProduct(productId: number): Promise<WooProduct> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=products/${productId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  // =========================================
  // Cart Operations - Use existing cart API
  // =========================================
  async getNonce(): Promise<{ success: boolean; nonce: string; expires: number }> {
    try {
      const response = await fetch('https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/nonce');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting nonce:', error);
      throw error;
    }
  }

  async addToCart(productId: number, quantity: number = 1, variation?: any): Promise<any> {
    try {
      const nonceResponse = await this.getNonce();
      if (!nonceResponse.success) {
        throw new Error('Failed to get nonce');
      }

      const response = await fetch('https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/add-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonceResponse.nonce,
        },
        body: JSON.stringify({
          id: productId,
          quantity: quantity,
          variation: variation
        }),
      });

      if (!response.ok) {
        // In headless mode, don't throw errors for cart operations
        console.log(`ℹ️ WooCommerce cart API unavailable (${response.status}), using local cart only`);
        return { success: false, error: `HTTP ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      // In headless mode, don't throw errors for cart operations
      console.log('ℹ️ WooCommerce cart API unavailable, using local cart only');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async removeFromCart(itemKey: string): Promise<any> {
    try {
      const nonceResponse = await this.getNonce();
      if (!nonceResponse.success) {
        throw new Error('Failed to get nonce');
      }

      const response = await fetch('https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/remove-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonceResponse.nonce,
        },
        body: JSON.stringify({
          key: itemKey
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  async updateCartItem(itemKey: string, quantity: number): Promise<any> {
    try {
      const nonceResponse = await this.getNonce();
      if (!nonceResponse.success) {
        throw new Error('Failed to get nonce');
      }

      const response = await fetch('https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/update-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonceResponse.nonce,
        },
        body: JSON.stringify({
          key: itemKey,
          quantity: quantity
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  async getCart(): Promise<any> {
    try {
      const response = await fetch('https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting cart:', error);
      throw error;
    }
  }

  // =========================================
  // Product Reviews
  // =========================================
  async getProductReviews(productId: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=reviews&product_id=${productId}&cache=off`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      throw error;
    }
  }

  async createProductReview(reviewData: {
    product_id: number;
    review: string;
    reviewer: string;
    reviewer_email: string;
    rating: number;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating product review:', error);
      throw error;
    }
  }

  // =========================================
  // Authentication Methods
  // =========================================
  async loginUser(email: string, password: string): Promise<any> {
    try {
      const response = await fetch('https://qvwltjhdjw.cfolks.pl/wp-json/king-jwt/v1/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error logging in user:', error);
      throw error;
    }
  }

  async registerUser(userData: any): Promise<any> {
    try {
      const response = await fetch('https://qvwltjhdjw.cfolks.pl/wp-json/king-jwt/v1/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  // =========================================
  // Product Helper Methods
  // =========================================
  isProductOnSale(product: WooProduct): boolean {
    return product.on_sale || false;
  }

  getProductDiscount(product: WooProduct): number {
    if (!this.isProductOnSale(product)) return 0;
    
    const regularPrice = parseFloat(product.regular_price || '0');
    const salePrice = parseFloat(product.sale_price || product.price || '0');
    
    if (regularPrice === 0) return 0;
    
    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  }

  getProductImageUrl(product: WooProduct, size: string = 'medium'): string {
    if (!product.images || product.images.length === 0) {
      return '/images/placeholder-product.jpg';
    }
    
    const image = product.images[0];
    // Use type assertion to access dynamic properties
    return (image as any)[size] || image.src || '/images/placeholder-product.jpg';
  }

  formatPrice(price: string | number): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2,
    }).format(numPrice);
  }

  /**
   * Get shipping methods for a location
   */
  async getShippingMethods(country: string = 'PL', state: string = '', city: string = '', postcode: string = ''): Promise<any> {
    try {
      const params = new URLSearchParams({
        endpoint: 'shipping_methods',
        country,
        state,
        city,
        postcode
      });

      const response = await fetch(`/api/woocommerce?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch shipping methods');
      }

      const data = await response.json();
      const methods = data.shipping_methods || [];
      
      // Process and normalize shipping methods
      return methods.map((method: any) => {
        let cost = 0;
        let freeShippingThreshold = 0;
        
        // Handle Flexible Shipping methods
        if (method.method_id === 'flexible_shipping_single') {
          const settings = method.settings;
          
          // Get free shipping threshold
          if (settings.method_free_shipping && settings.method_free_shipping.value) {
            freeShippingThreshold = parseFloat(settings.method_free_shipping.value); // Keep as PLN, not cents
          }
          
          // Get cost from rules
          if (settings.method_rules && settings.method_rules.value && settings.method_rules.value.length > 0) {
            const rules = settings.method_rules.value;
            // Find the rule that applies (usually the first one)
            if (rules[0] && rules[0].cost_per_order) {
              cost = parseFloat(rules[0].cost_per_order); // Keep as PLN, not cents
            }
          }
        }
        // Handle Flat Rate methods
        else if (method.method_id === 'flat_rate') {
          const settings = method.settings;
          if (settings.cost && settings.cost.value) {
            cost = parseFloat(settings.cost.value); // Keep as PLN, not cents
          }
        }
        
        // Clean HTML from description
        const cleanDescription = (desc: string) => {
          if (!desc) return '';
          // Remove HTML tags and decode entities
          return desc
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&rarr;/g, '→') // Decode arrow
            .replace(/&nbsp;/g, ' ') // Decode non-breaking space
            .replace(/&amp;/g, '&') // Decode ampersand
            .replace(/&lt;/g, '<') // Decode less than
            .replace(/&gt;/g, '>') // Decode greater than
            .replace(/&quot;/g, '"') // Decode quote
            .trim();
        };

        return {
          id: method.id,
          method_id: method.method_id,
          method_title: method.settings.method_title?.value || method.method_title,
          method_description: cleanDescription(method.settings.method_description?.value || method.method_description),
          cost: cost,
          free_shipping_threshold: freeShippingThreshold,
          zone_id: method.zone_id,
          zone_name: method.zone_name,
          settings: method.settings
        };
      });
      
    } catch (error: any) {
      console.error('Error fetching shipping methods:', error);
      // Return fallback shipping methods if API fails
      return [
        {
          id: 1,
          method_id: 'free_shipping',
          method_title: 'Darmowa wysyłka',
          method_description: 'Darmowa dostawa od 200 zł',
          cost: 0,
          free_shipping_threshold: 20000,
          zone_id: 1,
          zone_name: 'Polska'
        },
        {
          id: 2,
          method_id: 'flat_rate',
          method_title: 'Kurier DPD',
          method_description: 'Dostawa w 1-2 dni robocze',
          cost: 1500,
          free_shipping_threshold: 0,
          zone_id: 1,
          zone_name: 'Polska'
        },
        {
          id: 3,
          method_id: 'local_pickup',
          method_title: 'Odbiór osobisty',
          method_description: 'Gdańsk, ul. Partyzantów 8/101',
          cost: 0,
          free_shipping_threshold: 0,
          zone_id: 1,
          zone_name: 'Polska'
        }
      ];
    }
  }

  // =========================================
  // Attribute Terms - Get attribute values
  // =========================================
  async getAttributeTerms(attributeId: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=products/attributes/${attributeId}/terms`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching attribute terms for attribute ${attributeId}:`, error);
      throw error;
    }
  }

  // =========================================
  // Product Variations - Get product variants
  // =========================================
  async getProductVariations(productId: number): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=products/${productId}/variations`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching product variations for product ${productId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const wooCommerceOptimized = new WooCommerceOptimizedService();
export default wooCommerceOptimized;
