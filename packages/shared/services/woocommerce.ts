import { WooProduct, WooProductQuery, WooApiResponse } from '@/types/woocommerce';
import { CartItem } from '@/stores/cart-store';

// =========================================
// WooCommerce Store API Service
// =========================================

class WooCommerceService {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor() {
    // SECURITY FIX: Remove NEXT_PUBLIC_ prefixes for secrets
    // These should only be used server-side via API routes
    this.baseUrl = process.env.NEXT_PUBLIC_WC_URL || '';
    this.consumerKey = process.env.WC_CONSUMER_KEY || '';
    this.consumerSecret = process.env.WC_CONSUMER_SECRET || '';
    
    // Debug logging (server-side only)
    if (typeof window === 'undefined') {
      console.log('🔍 WooCommerce Service Constructor (Server-side):');
      console.log('Base URL:', this.baseUrl);
      console.log('Consumer Key:', this.consumerKey ? 'SET' : 'NOT SET');
      console.log('Consumer Secret:', this.consumerSecret ? 'SET' : 'NOT SET');
    }
  
  // Check if variables are loaded
  if (!this.consumerKey || !this.consumerSecret) {
    console.error('❌ ERROR: WooCommerce API keys are missing!');
    console.error('Consumer Key length:', this.consumerKey?.length || 0);
    console.error('Consumer Secret length:', this.consumerSecret?.length || 0);
  } else {
    console.log('✅ WooCommerce API keys loaded successfully!');
  }
  }

  // =========================================
  // Authentication
  // =========================================
  private getAuthParams(): string {
    return `consumer_key=${this.consumerKey}&consumer_secret=${this.consumerSecret}`;
  }

  // =========================================
  // Products API
  // =========================================
  async getProducts(query: WooProductQuery = {}): Promise<WooApiResponse<WooProduct>> {
    try {
      const params = new URLSearchParams();
      
      // Add query parameters
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const url = `${this.baseUrl}/products?${params.toString()}&${this.getAuthParams()}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const totalPages = Math.ceil(data.length / (query.per_page || 10));
      
      return {
        data,
        total: data.length,
        totalPages,
        currentPage: query.page || 1,
        perPage: query.per_page || 10,
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getProduct(id: number): Promise<WooProduct> {
    try {
      const url = `${this.baseUrl}/products/${id}?${this.getAuthParams()}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  }

  async getProductBySlug(slug: string): Promise<WooProduct | null> {
    try {
      const products = await this.getProducts({ slug, per_page: 1 });
      return products.data[0] || null;
    } catch (error) {
      console.error(`Error fetching product by slug ${slug}:`, error);
      throw error;
    }
  }

  async getFeaturedProducts(limit: number = 8): Promise<WooProduct[]> {
    try {
      const products = await this.getProducts({ 
        featured: true, 
        per_page: limit,
        status: 'publish'
      });
      return products.data;
    } catch (error) {
      console.error('Error fetching featured products:', error);
      throw error;
    }
  }

  async getOnSaleProducts(limit: number = 8): Promise<WooProduct[]> {
    try {
      const products = await this.getProducts({ 
        on_sale: true, 
        per_page: limit,
        status: 'publish'
      });
      return products.data;
    } catch (error) {
      console.error('Error fetching on-sale products:', error);
      throw error;
    }
  }

  async searchProducts(searchTerm: string, limit: number = 12): Promise<WooProduct[]> {
    try {
      const products = await this.getProducts({ 
        search: searchTerm, 
        per_page: limit,
        status: 'publish'
      });
      return products.data;
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }










  // =========================================
  // Utility Methods
  // =========================================
  formatPrice(price: string): string {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return '0,00 zł';
    
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numPrice);
  }

  getProductImageUrl(product: WooProduct, size: 'thumbnail' | 'medium' | 'large' = 'medium'): string {
    if (!product.images || product.images.length === 0) {
      return '/images/placeholder-product.jpg';
    }

    const image = product.images[0];
    if (size === 'thumbnail') {
      return image.src.replace(/\.(jpg|jpeg|png|webp)$/, '-150x150.$1');
    } else if (size === 'large') {
      return image.src.replace(/\.(jpg|jpeg|png|webp)$/, '-800x800.$1');
    }
    
    return image.src;
  }

  isProductOnSale(product: WooProduct): boolean {
    return product.on_sale && product.sale_price !== '';
  }

  getProductDiscount(product: WooProduct): number {
    if (!this.isProductOnSale(product)) return 0;
    
    const regularPrice = parseFloat(product.regular_price);
    const salePrice = parseFloat(product.sale_price);
    
    if (isNaN(regularPrice) || isNaN(salePrice)) return 0;
    
    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  }

  // =========================================
  // Cart Methods - King Cart API Integration
  // =========================================
  async getCart(): Promise<{ success: boolean; cart?: { items: CartItem[]; total: number }; error?: string }> {
    try {
      // Get cart using King Cart API
      const cartUrl = `${this.baseUrl.replace('/wp-json/wc/v3', '/wp-json/king-cart/v1')}/cart`;
      const response = await fetch(cartUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  }

  async addToCart(productId: number, quantity: number = 1, variationId?: number): Promise<{ success: boolean; message?: string; cart?: { items: CartItem[]; total: number }; error?: string }> {
    try {
      // Get nonce first
      const nonceUrl = `${this.baseUrl.replace('/wp-json/wc/v3', '/wp-json/king-cart/v1')}/nonce`;
      const nonceResponse = await fetch(nonceUrl);
      
      if (!nonceResponse.ok) {
        throw new Error(`Failed to get nonce: ${nonceResponse.status}`);
      }
      
      const nonceData = await nonceResponse.json();
      const nonce = nonceData.nonce;
      
      // Add item to cart using King Cart API
      const addItemUrl = `${this.baseUrl.replace('/wp-json/wc/v3', '/wp-json/king-cart/v1')}/add-item`;
      const response = await fetch(addItemUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify({
          id: productId,
          quantity: quantity,
          ...(variationId && { variation: { id: variationId } })
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  async removeFromCart(itemKey: string): Promise<{ success: boolean; message?: string; cart?: { items: CartItem[]; total: number }; error?: string }> {
    try {
      // Get nonce first
      const nonceUrl = `${this.baseUrl.replace('/wp-json/wc/v3', '/wp-json/king-cart/v1')}/nonce`;
      const nonceResponse = await fetch(nonceUrl);
      
      if (!nonceResponse.ok) {
        throw new Error(`Failed to get nonce: ${nonceResponse.status}`);
      }
      
      const nonceData = await nonceResponse.json();
      const nonce = nonceData.nonce;
      
      // Remove item from cart using King Cart API
      const removeItemUrl = `${this.baseUrl.replace('/wp-json/wc/v3', '/wp-json/king-cart/v1')}/remove-item`;
      const response = await fetch(removeItemUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify({ key: itemKey }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  async updateCartItem(itemKey: string, quantity: number): Promise<{ success: boolean; message?: string; cart?: { items: CartItem[]; total: number }; error?: string }> {
    try {
      // Get nonce first
      const nonceUrl = `${this.baseUrl.replace('/wp-json/wc/v3', '/wp-json/king-cart/v1')}/nonce`;
      const nonceResponse = await fetch(nonceUrl);
      
      if (!nonceResponse.ok) {
        throw new Error(`Failed to get nonce: ${nonceResponse.status}`);
      }
      
      const nonceData = await nonceResponse.json();
      const nonce = nonceData.nonce;
      
      // Update cart item using King Cart API
      const updateItemUrl = `${this.baseUrl.replace('/wp-json/wc/v3', '/wp-json/king-cart/v1')}/update-item`;
      const response = await fetch(updateItemUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify({
          key: itemKey,
          quantity: quantity
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  // =========================================
  // Categories API
  // =========================================
async getCategories(): Promise<{ success: boolean; categories?: Array<{ id: number; name: string; slug: string; count: number }>; error?: string }> {
  try {
    const url = `${this.baseUrl}/products/categories?${this.getAuthParams()}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      categories: data || [],
      error: undefined
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

// =========================================
// User Authentication API
// =========================================
async registerUser(userData: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ success: boolean; user?: { id: number; email: string; first_name: string; last_name: string; username: string }; error?: string }> {
  try {
    const url = `${this.baseUrl}/customers`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${this.consumerKey}:${this.consumerSecret}`)}`
      },
      body: JSON.stringify({
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        billing: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone: userData.phone
        },
        shipping: {
          first_name: userData.firstName,
          last_name: userData.lastName
        },
        password: userData.password
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

async loginUser(email: string, password: string): Promise<{ success: boolean; user?: { id: number; email: string; name: string; token: string }; error?: string }> {
  try {
    // Use our custom JWT endpoint
    const url = `${this.baseUrl.replace('/wp-json/wc/v3', '/wp-json/king-jwt/v1')}/login`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Błąd logowania');
    }

    return data.user;
  } catch (error) {
    console.error('Error logging in user:', error);
    throw error;
  }
}

async getUserProfile(userId: number): Promise<{ success: boolean; user?: { id: number; email: string; first_name: string; last_name: string; username: string }; error?: string }> {
  try {
    const url = `${this.baseUrl}/customers/${userId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${btoa(`${this.consumerKey}:${this.consumerSecret}`)}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

async validateJWTToken(token: string): Promise<{ success: boolean; valid?: boolean; user?: { id: number; email: string; name: string }; error?: string }> {
  try {
    const url = `${this.baseUrl.replace('/wp-json/wc/v3', '/wp-json/king-jwt/v1')}/validate`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error validating JWT token:', error);
    throw error;
  }
}

async refreshJWTToken(token: string): Promise<{ success: boolean; token?: string; user?: { id: number; email: string; name: string }; error?: string }> {
  try {
    const url = `${this.baseUrl.replace('/wp-json/wc/v3', '/wp-json/king-jwt/v1')}/refresh`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error refreshing JWT token:', error);
    throw error;
  }
}
}

// Export singleton instance
export const wooCommerceService = new WooCommerceService();
export default wooCommerceService;
