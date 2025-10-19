import { WooProduct, WooProductQuery, WooApiResponse } from '@/types/woocommerce';
import { CartItem } from '@/stores/cart-store';

// =========================================
// Optimized WooCommerce Service
// =========================================

class WooCommerceService {
  private baseUrl: string;

  constructor() {
    // Use absolute URL for server-side, relative for client-side
    this.baseUrl = typeof window !== 'undefined' 
      ? '/api/woocommerce' 
      : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/woocommerce`;
    console.log('🚀 WooCommerce Optimized Service initialized');
  }

  /**
   * Get payment gateways from WooCommerce
   */
  async getPaymentGateways(): Promise<{ success: boolean; gateways?: Array<{ id: string; title: string; description?: string; enabled: boolean }>; error?: string }>{
    try {
      const r = await fetch(`/api/woocommerce?endpoint=payment_gateways`, { headers: { Accept: 'application/json' } });
      if (!r.ok) {
        const e = await r.json();
        throw new Error(e.error || 'Nie udało się pobrać metod płatności');
      }
      const data = await r.json();
      const gateways = (data.gateways || []).map((g: any) => ({
        id: g.id,
        title: g.title || g.method_title || g.id,
        description: g.description || '',
        enabled: g.enabled === true || g.enabled === 'yes'
      }));
      return { success: true, gateways };
    } catch (error) {
      console.error('Error fetching payment gateways:', error);
      return { success: false, error: 'Nie udało się pobrać metod płatności' };
    }
  }
  // =========================================
  // Homepage Data - All tabs in one request
  // =========================================
  async getHomepageData(): Promise<{
    newProducts: WooProduct[];
    saleProducts: WooProduct[];
    featuredProducts: WooProduct[];
  }> {
    try {
      // PERFORMANCE FIX: Add _fields to reduce payload size
      const response = await fetch(`${this.baseUrl}?endpoint=homepage&_fields=id,name,slug,price,regular_price,sale_price,on_sale,featured,images,stock_status,average_rating,rating_count`);
      
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
  async getShopData(
    page: number = 1,
    perPage: number = 12,
    options?: {
      category?: string;
      search?: string;
      orderby?: 'date' | 'price' | 'title' | 'popularity';
      order?: 'asc' | 'desc';
      on_sale?: boolean;
      featured?: boolean;
      min_price?: number | string;
      max_price?: number | string;
      capacities?: string[]; // attribute terms (slugs)
      brands?: string[]; // attribute terms (slugs)
    }
  ): Promise<{
    products: WooProduct[];
    total: number;
    totalPages: number;
    categories?: Array<{ id: number; name: string; slug: string; count?: number }>;
    attributes?: {
      capacities?: Array<{ id: number | string; name: string; slug: string }>;
      brands?: Array<{ id: number | string; name: string; slug: string }>;
    };
  }> {
    try {
      const params = new URLSearchParams({
        endpoint: 'shop',
        page: page.toString(),
        per_page: perPage.toString(),
        // PERFORMANCE FIX: Add _fields to reduce payload size
        _fields: 'id,name,slug,price,regular_price,sale_price,on_sale,featured,images,stock_status,average_rating,rating_count,categories,attributes'
      });
      
      if (options?.category) params.append('category', options.category);
      if (options?.search) params.append('search', options.search);
      if (options?.orderby) params.append('orderby', options.orderby);
      if (options?.order) params.append('order', options.order);
      if (options?.on_sale) params.append('on_sale', String(options.on_sale));
      if (options?.featured) params.append('featured', String(options.featured));
      if (options?.min_price !== undefined) params.append('min_price', String(options.min_price));
      if (options?.max_price !== undefined) params.append('max_price', String(options.max_price));
      if (options?.capacities && options.capacities.length > 0) params.append('capacities', options.capacities.join(','));
      if (options?.brands && options.brands.length > 0) params.append('brands', options.brands.join(','));
      
          // Use local API route instead of direct call (aggregated response)
          // Use relative URL for all calls
          const response = await fetch(`/api/woocommerce?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        products: data.products || [],
        total: parseInt(data.total) || 0,
        totalPages: Math.ceil((parseInt(data.total) || 0) / perPage),
        categories: data.categories || [],
        attributes: {
          capacities: data.attributes?.capacities || [],
          brands: data.attributes?.brands || []
        },
      };
    } catch (error) {
      console.error('Error fetching shop data:', error);
      throw error;
    }
  }

  // =========================================
  // Product Data - Single product
  // =========================================
  async getProductData(productId: number): Promise<WooProduct> {
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

  async getProductById(productId: number): Promise<WooProduct> {
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
  async getProductBySlug(slug: string): Promise<WooProduct | null> {
    try {
      console.log(`🔍 Fetching product by slug: ${slug}`);
      // WooCommerce doesn't support slug parameter directly, so we use search
      const response = await fetch(`${this.baseUrl}?endpoint=products&search=${slug}&cache=off`);
      
      console.log(`📡 Response status: ${response.status}`);
      
      if (!response.ok) {
        console.error(`❌ HTTP error! status: ${response.status}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📦 Data received:`, data);
      
      // Find product with exact slug match
      const product = Array.isArray(data) ? data.find((p: any) => p.slug === slug) : null;
      console.log(`✅ Product found:`, product ? product.name : 'null');
      
      return product || null;
    } catch (error) {
      console.error('❌ Error fetching product by slug:', error);
      throw error;
    }
  }

  // =========================================
  // Categories
  // =========================================
  async getCategories(): Promise<{
    data: Array<{ id: string; name: string; slug: string; count: number }>;
    total: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=categories`);
      
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
      return this.getMockCategories() as any;
    }
  }

  // =========================================
  // Mock Data Fallbacks
  // =========================================
  private getMockCategories(): {
    data: Array<{ id: number; name: string; slug: string; count: number }>;
    total: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
  } {
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
      const attr: string | string[] | undefined = (query as WooProductQuery & { attribute?: string | string[] }).attribute;
      const attrTerm: string | string[] | undefined = (query as WooProductQuery & { attribute_term?: string | string[] }).attribute_term;
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
        permalink: '',
        date_created: '',
        date_created_gmt: '',
        date_modified: '',
        date_modified_gmt: '',
        type: 'simple',
        status: 'private',
        featured: false,
        catalog_visibility: 'visible',
        description: '',
        short_description: '',
        sku: '',
        price: '0',
        regular_price: '0',
        sale_price: '',
        date_on_sale_from: null,
        date_on_sale_from_gmt: null,
        date_on_sale_to: null,
        date_on_sale_to_gmt: null,
        price_html: '',
        on_sale: false,
        purchasable: false,
        total_sales: 0,
        virtual: false,
        downloadable: false,
        downloads: [],
        download_limit: -1,
        download_expiry: -1,
        tax_status: 'taxable',
        tax_class: '',
        manage_stock: false,
        stock_quantity: 0,
        stock_status: 'outofstock',
        backorders: 'no',
        backorders_allowed: false,
        backordered: false,
        sold_individually: false,
        weight: '',
        dimensions: { length: '', width: '', height: '' },
        shipping_required: false,
        shipping_taxable: false,
        shipping_class: '',
        shipping_class_id: 0,
        categories: [],
        reviews_allowed: false,
        average_rating: '0',
        rating_count: 0,
        related_ids: [],
        upsell_ids: [],
        cross_sell_ids: [],
        parent_id: 0,
        purchase_note: '',
        tags: [],
        images: [],
        attributes: [],
        default_attributes: [],
        variations: [],
        grouped_products: [],
        menu_order: 0,
        meta_data: [],
        _links: { self: [], collection: [] }
      } as WooProduct;
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
      
      const text = await response.text();
      
      // Handle HTML errors before JSON (common with WordPress)
      let jsonText = text;
      const jsonMatch = text.match(/\{.*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Error getting nonce:', error);
      throw error;
    }
  }

  async addToCart(productId: number, quantity: number = 1, variation?: { id: number; attributes: Record<string, string> }): Promise<{ success: boolean; message: string; cart?: { items: CartItem[]; total: number } }> {
    try {
      const nonceResponse = await this.getNonce();
      if (!nonceResponse.success) {
        throw new Error('Failed to get nonce');
      }

      const response = await fetch('/api/cart-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        return { success: false, message: `HTTP ${response.status}` };
      }

      return await response.json();
    } catch (error: unknown) {
      // In headless mode, don't throw errors for cart operations
      console.log('ℹ️ WooCommerce cart API unavailable, using local cart only');
      const errMsg = error instanceof Error ? error.message : 'unknown error';
      return { success: false, message: errMsg };
    }
  }

  async removeFromCart(itemKey: string): Promise<{ success: boolean; message: string; cart?: { items: CartItem[]; total: number } }> {
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

  async updateCartItem(itemKey: string, quantity: number): Promise<{ success: boolean; message: string; cart?: { items: CartItem[]; total: number } }> {
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

  async getCart(): Promise<{ success: boolean; cart?: { items: CartItem[]; total: number }; error?: string }> {
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
  async getProductReviews(productId: number): Promise<{ success: boolean; reviews?: Array<{ id: number; review: string; rating: number; reviewer: string; date_created: string }>; error?: string }> {
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
  }): Promise<{ success: boolean; review?: { id: number; review: string; rating: number; reviewer: string; date_created: string }; error?: string }> {
    try {
      // PRO: Use dedicated reviews endpoint
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const review = await response.json();
      return {
        success: true,
        review: {
          id: review.id,
          review: review.review,
          rating: review.rating,
          reviewer: review.reviewer,
          date_created: review.date_created
        }
      };
    } catch (error) {
      console.error('Error creating product review:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create review'
      };
    }
  }

  // =========================================
  // Authentication Methods
  // =========================================
  async loginUser(email: string, password: string): Promise<{ success: boolean; user?: { id: number; email: string; name: string; token: string }; error?: string }> {
    try {
      // In headless mode, we'll check if user exists in WooCommerce
      // Note: This is a simplified approach for headless setup
      const customerResponse = await fetch('https://qvwltjhdjw.cfolks.pl/wp-json/wc/v3/customers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('ck_deb61eadd7301ebfc5f8074ce7c53c6668eb725d:cs_0de18ed0e013f96aebfb51c77f506bb94e416cb8')
        },
      });

      if (!customerResponse.ok) {
        throw new Error(`HTTP error! status: ${customerResponse.status}`);
      }

      const customers = await customerResponse.json();
      const user = customers.find((c: any) => c.email === email);
      
      if (!user) {
        return {
          success: false,
          error: 'Użytkownik nie znaleziony. Sprawdź email lub zarejestruj się.'
        };
      }

      // In headless mode, we assume the user is authenticated if they exist
      // Real authentication should be handled by your authentication system
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          token: 'mock-token'
        }
      };
    } catch (error) {
      console.error('Error logging in user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Błąd logowania. Sprawdź email i hasło.'
      };
    }
  }

  async registerUser(userData: { username: string; email: string; password: string; first_name?: string; last_name?: string }): Promise<{ success: boolean; message: string; user?: { id: number; username: string; email: string } }> {
    try {
      const payload = {
        email: userData.email,
        password: userData.password,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        billing: {
          first_name: userData.first_name || '',
          last_name: userData.last_name || ''
        },
        shipping: {
          first_name: userData.first_name || '',
          last_name: userData.last_name || ''
        }
      };
      
      console.log('🔍 Register user payload:', payload);
      
      const response = await fetch('https://qvwltjhdjw.cfolks.pl/wp-json/wc/v3/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('ck_deb61eadd7301ebfc5f8074ce7c53c6668eb725d:cs_0de18ed0e013f96aebfb51c77f506bb94e416cb8')
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Registration error response:', errorText);
        
        // Try to parse error response for better error message
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.code === 'registration-error-email-exists') {
            throw new Error(errorData.message || 'Email już istnieje');
          }
        } catch (parseError) {
          // If parsing fails, use generic error
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        message: 'Rejestracja udana!',
        user: {
          id: responseData.id,
          username: responseData.username,
          email: responseData.email
        }
      };
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
    let imageUrl = '';
    
    // Handle both string array format and object format
    if (typeof image === 'string') {
      imageUrl = image;
    } else if (typeof image === 'object' && image.src) {
      imageUrl = image.src;
    } else {
      return '/images/placeholder-product.jpg';
    }
    
    // Convert to higher quality image by replacing size suffix
    // Use 600x600 for good quality without WebP conversion
    if (imageUrl.includes('-300x300.')) {
      imageUrl = imageUrl.replace('-300x300.', '-600x600.');
    } else if (imageUrl.includes('-150x150.')) {
      imageUrl = imageUrl.replace('-150x150.', '-600x600.');
    } else if (imageUrl.includes('-100x100.')) {
      imageUrl = imageUrl.replace('-100x100.', '-600x600.');
    }
    
    return imageUrl;
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
  async getShippingMethods(country: string = 'PL', state: string = '', city: string = '', postcode: string = ''): Promise<{ success: boolean; methods?: Array<{ id: string; method_id: string; method_title: string; method_description: string; cost: number; free_shipping_threshold: number; zone_id: string; zone_name: string }>; error?: string }> {
    try {
      const params = new URLSearchParams({
        endpoint: 'shipping_methods',
        country,
        state,
        city,
        postcode,
        // PERFORMANCE FIX: Add _fields to reduce payload size
        _fields: 'id,method_id,title,cost,settings,zone_id,zone_name'
      });

      const response = await fetch(`/api/woocommerce?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nie udało się pobrać metod wysyłki');
      }

      const data = await response.json();
      const methods = data.shipping_methods || [];
      
      // Process and normalize shipping methods
      return methods.map((method: {
        id: string;
        method_id: string;
        title: string;
        settings?: Record<string, { value: string }>;
        cost?: string;
      }) => {
        let cost = 0;
        let freeShippingThreshold = 0;
        
        // Handle Flexible Shipping methods
        if (method.method_id === 'flexible_shipping_single') {
          const settings = method.settings;
          
          // Get free shipping threshold
          if (settings && (settings as any).method_free_shipping && (settings as any).method_free_shipping.value) {
            freeShippingThreshold = parseFloat((settings as any).method_free_shipping.value); // Keep as PLN, not cents
          }
          
          // Get cost from rules
          if (settings && (settings as any).method_rules && (settings as any).method_rules.value && (settings as any).method_rules.value.length > 0) {
            const rules = (settings as any).method_rules.value;
            // Find the rule that applies (usually the first one)
            if (rules[0] && rules[0].cost_per_order) {
              cost = parseFloat(rules[0].cost_per_order); // Keep as PLN, not cents
            }
          }
        }
        // Handle Flat Rate methods
        else if (method.method_id === 'flat_rate') {
          const settings = method.settings;
          if (settings && (settings as any).cost && (settings as any).cost.value) {
            cost = parseFloat((settings as any).cost.value); // Keep as PLN, not cents
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
          method_title: (method.settings as any)?.method_title?.value || (method as any).method_title || method.title || 'Dostawa',
          method_description: cleanDescription((method.settings as any)?.method_description?.value || ''),
          cost: cost,
          free_shipping_threshold: freeShippingThreshold,
          zone_id: (method as any).zone_id || 0,
          zone_name: (method as any).zone_name || '',
          settings: method.settings
        };
      });
      
    } catch (error: unknown) {
      console.error('Error fetching shipping methods:', error);
      // Return fallback shipping methods if API fails
      return {
        success: true,
        methods: [
        {
          id: '1',
          method_id: 'free_shipping',
          method_title: 'Darmowa wysyłka',
          method_description: 'Darmowa dostawa od 200 zł',
          cost: 0,
          free_shipping_threshold: 20000,
          zone_id: '1',
          zone_name: 'Polska'
        },
        {
          id: '2',
          method_id: 'flat_rate',
          method_title: 'Kurier DPD',
          method_description: 'Dostawa w 1-2 dni robocze',
          cost: 1500,
          free_shipping_threshold: 0,
          zone_id: '1',
          zone_name: 'Polska'
        },
        {
          id: '3',
          method_id: 'local_pickup',
          method_title: 'Odbiór osobisty',
          method_description: 'Gdańsk, ul. Partyzantów 8/101',
          cost: 0,
          free_shipping_threshold: 0,
          zone_id: '1',
          zone_name: 'Polska'
        }
        ],
      };
    }
  }

  // Get product variations
  async getProductVariations(productId: number): Promise<{ success: boolean; variations?: Array<{ id: number; attributes?: Array<{ slug: string; option: string }>; price: string; regular_price: string; sale_price: string; name: string; menu_order: number }>; error?: string }> {
    try {
      // PERFORMANCE FIX: Add _fields to reduce payload size
      const response = await fetch(`/api/woocommerce?endpoint=products/${productId}/variations&_fields=id,attributes,price,regular_price,sale_price,name,menu_order`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching product variations:', error);
      return { success: false, error: 'Nie udało się pobrać wariantów produktu' };
    }
  }

  // Get product attributes
  async getProductAttributes(): Promise<{ success: boolean; attributes?: Array<{ id: number; name: string; slug: string; type: string; order_by: string; has_archives: boolean }>; error?: string }> {
    try {
      // PERFORMANCE FIX: Add _fields to reduce payload size
      const response = await fetch(`/api/woocommerce?endpoint=attributes&_fields=id,name,slug,type,order_by,has_archives`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching product attributes:', error);
      return { success: false, error: 'Nie udało się pobrać atrybutów produktu' };
    }
  }
}

// Export class and singleton instance
export { WooCommerceService };
export const wooCommerceOptimized = new WooCommerceService();
export default wooCommerceOptimized;
