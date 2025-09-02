import { WooProduct, WooCategory, WooProductQuery, WooCategoryQuery, WooApiResponse } from '@/types/woocommerce';
import { API_ENDPOINTS } from '@/config/constants';

// =========================================
// WooCommerce Store API Service
// =========================================

class WooCommerceService {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_WC_API_URL || '';
    this.consumerKey = process.env.NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_KEY || '';
    this.consumerSecret = process.env.NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET || '';
  }

  // =========================================
  // Authentication
  // =========================================
  private getAuthHeaders(): HeadersInit {
    const credentials = btoa(`${this.consumerKey}:${this.consumerSecret}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
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

      const url = `${this.baseUrl}/products?${params.toString()}`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
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
      const url = `${this.baseUrl}/products/${id}`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
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
  // Categories API
  // =========================================
  async getCategories(query: WooCategoryQuery = {}): Promise<WooCategory[]> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const url = `${this.baseUrl}/products/categories?${params.toString()}`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  async getCategory(id: number): Promise<WooCategory> {
    try {
      const url = `${this.baseUrl}/products/categories/${id}`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching category ${id}:`, error);
      throw error;
    }
  }

  async getCategoryBySlug(slug: string): Promise<WooCategory | null> {
    try {
      const categories = await this.getCategories({ slug, per_page: 1 });
      return categories[0] || null;
    } catch (error) {
      console.error(`Error fetching category by slug ${slug}:`, error);
      throw error;
    }
  }

  async getProductsByCategory(categoryId: number, limit: number = 12): Promise<WooProduct[]> {
    try {
      const products = await this.getProducts({ 
        category: categoryId.toString(), 
        per_page: limit,
        status: 'publish'
      });
      return products.data;
    } catch (error) {
      console.error(`Error fetching products for category ${categoryId}:`, error);
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
}

// Export singleton instance
export const wooCommerceService = new WooCommerceService();
export default wooCommerceService;
