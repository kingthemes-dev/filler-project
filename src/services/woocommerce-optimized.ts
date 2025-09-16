import { WooProduct, WooProductQuery, WooApiResponse } from '@/types/woocommerce';

// =========================================
// Optimized WooCommerce Service
// =========================================

class WooCommerceService {
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
      // Return mock data when API is not available
      return this.getMockCategories();
    }
  }

  // =========================================
  // Mock Data Fallbacks
  // =========================================
  private getMockCategories(): any {
    return {
      data: [
        { id: 1, name: 'Kremy', slug: 'kremy', count: 15 },
        { id: 2, name: 'Serum', slug: 'serum', count: 8 },
        { id: 3, name: 'Tonery', slug: 'tonery', count: 12 },
        { id: 4, name: 'Maseczki', slug: 'maseczki', count: 6 },
        { id: 5, name: 'Peelingi', slug: 'peelingi', count: 4 }
      ],
      total: 5,
      totalPages: 1,
      currentPage: 1,
      perPage: 100,
    };
  }

  private getMockProducts(query: WooProductQuery = {}): WooApiResponse<WooProduct> {
    const mockProducts: any[] = [
      {
        id: 1,
        name: 'Krem nawilżający z kwasem hialuronowym',
        slug: 'krem-nawilzajacy-kwas-hialuronowy',
        price: '89.99',
        regular_price: '119.99',
        sale_price: '89.99',
        on_sale: true,
        featured: true,
        images: [{ id: 0, date_created: '', date_created_gmt: '', date_modified: '', date_modified_gmt: '', src: '/images/placeholder-product.jpg', name: 'Placeholder', alt: 'Krem nawilżający' }],
        categories: [{ id: 1, name: 'Kremy', slug: 'kremy' }],
        attributes: [],
        stock_status: 'instock',
        short_description: 'Intensywnie nawilżający krem z kwasem hialuronowym',
        description: 'Profesjonalny krem nawilżający z kwasem hialuronowym dla skóry twarzy.',
        sku: 'KREM-001'
      },
      {
        id: 2,
        name: 'Serum witaminowe C + E',
        slug: 'serum-witaminowe-c-e',
        price: '149.99',
        regular_price: '149.99',
        sale_price: '',
        on_sale: false,
        featured: true,
        images: [{ id: 0, date_created: '', date_created_gmt: '', date_modified: '', date_modified_gmt: '', src: '/images/placeholder-product.jpg', name: 'Placeholder', alt: 'Serum witaminowe' }],
        categories: [{ id: 2, name: 'Serum', slug: 'serum' }],
        attributes: [],
        stock_status: 'instock',
        short_description: 'Silne serum z witaminami C i E',
        description: 'Mocne serum antyoksydacyjne z witaminami C i E.',
        sku: 'SERUM-001'
      },
      {
        id: 3,
        name: 'Toner oczyszczający z kwasem salicylowym',
        slug: 'toner-oczyszczajacy-kwas-salicylowy',
        price: '69.99',
        regular_price: '89.99',
        sale_price: '69.99',
        on_sale: true,
        featured: false,
        images: [{ id: 0, date_created: '', date_created_gmt: '', date_modified: '', date_modified_gmt: '', src: '/images/placeholder-product.jpg', name: 'Placeholder', alt: 'Toner oczyszczający' }],
        categories: [{ id: 3, name: 'Tonery', slug: 'tonery' }],
        attributes: [],
        stock_status: 'instock',
        short_description: 'Delikatny toner z kwasem salicylowym',
        description: 'Oczyszczający toner z kwasem salicylowym dla skóry problematycznej.',
        sku: 'TONER-001'
      }
    ];

    return {
      data: mockProducts,
      total: mockProducts.length,
      totalPages: 1,
      currentPage: 1,
      perPage: query.per_page || 10,
    };
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
      if (query.stock_status) params.append('stock_status', query.stock_status);
      if (query.min_price) params.append('min_price', query.min_price);
      if (query.max_price) params.append('max_price', query.max_price);
      
      // Handle attribute filters (support multiple pairs)
      const attr: any = (query as any).attribute;
      const attrTerm: any = (query as any).attribute_term;
      if (Array.isArray(attr) && Array.isArray(attrTerm)) {
        for (let i = 0; i < Math.min(attr.length, attrTerm.length); i += 1) {
          params.append('attribute', String(attr[i]));
          params.append('attribute_term', String(attrTerm[i]));
        }
      } else {
        if (attr) params.append('attribute', String(attr));
        if (attrTerm) params.append('attribute_term', String(attrTerm));
      }

      // If any dynamic filters are present, bypass caches explicitly
      const hasDynamicFilters = Boolean(
        query.search || query.category || query.min_price || query.max_price || attr || attrTerm
      );
      if (hasDynamicFilters) {
        params.append('cache', 'off');
        params.append('_', String(Date.now()));
      }
      
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
      // Return mock data when API is not available
      return this.getMockProducts(query);
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
      // Return empty product instead of throwing error
      return {
        id: 0,
        name: 'Produkt niedostępny',
        slug: 'produkt-niedostepny',
        price: '0',
        regular_price: '0',
        sale_price: '',
        on_sale: false,
        featured: false,
        status: 'private',
        images: [],
        categories: [],
        attributes: [],
        description: '',
        short_description: '',
        stock_status: 'outofstock',
        stock_quantity: 0,
        manage_stock: false,
        backorders: 'no',
        sold_individually: false,
        weight: '',
        dimensions: { length: '', width: '', height: '' },
        shipping_class: '',
        shipping_class_id: 0,
        reviews_allowed: false,
        average_rating: '0',
        rating_count: 0,
        related_ids: [],
        upsell_ids: [],
        cross_sell_ids: [],
        parent_id: 0,
        purchase_note: '',
        menu_order: 0,
        meta_data: [],
        variations: [],
        grouped_products: [],
        permalink: '',
        date_created: '',
        date_modified: '',
        date_on_sale_from: '',
        date_on_sale_to: '',
        virtual: false,
        downloadable: false,
        downloads: [],
        download_limit: -1,
        download_expiry: -1,
        external_url: '',
        button_text: '',
        tax_status: 'taxable',
        tax_class: '',
        total_sales: 0,
        has_options: false,
        post_password: '',
        catalog_visibility: 'visible',
        featured_media: 0,
        type: 'simple',
        _links: {}
      };
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
      return { success: false, error: error.message };
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

  // Get product variations
  async getProductVariations(productId: number): Promise<any> {
    try {
      const response = await fetch(`/api/woocommerce?endpoint=products/${productId}/variations`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching product variations:', error);
      return { data: [] };
    }
  }

  // Get product attributes
  async getProductAttributes(): Promise<any> {
    try {
      const response = await fetch(`/api/woocommerce?endpoint=products/attributes`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching product attributes:', error);
      return { data: [] };
    }
  }
}

// Export class and singleton instance
export { WooCommerceService };
export const wooCommerceOptimized = new WooCommerceService();
export default wooCommerceOptimized;
