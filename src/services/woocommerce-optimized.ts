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

  // =========================================
  // Product by Slug
  // =========================================
  async getProductBySlug(slug: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=products&slug=${slug}`);
      
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
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
}

// Export singleton instance
export const wooCommerceOptimized = new WooCommerceOptimizedService();
export default wooCommerceOptimized;
