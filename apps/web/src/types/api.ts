/**
 * API response types and interfaces
 */

// Base API response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  timestamp?: string;
}

// Pagination
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

// WooCommerce specific types
export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_status: 'instock' | 'outofstock';
  stock_quantity: number;
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
  variations?: number[];
}

export interface WooCommerceOrder {
  id: number;
  number: string;
  status: string;
  date_created: string;
  date_modified: string;
  total: string;
  currency: string;
  payment_method: string;
  payment_method_title: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: string;
    total: string;
    image?: {
      src: string;
      alt: string;
    };
  }>;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

export interface WooCommerceCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
    nip?: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  marketingConsent?: boolean;
}

export interface AuthResponse {
  success: boolean;
  user?: WooCommerceCustomer;
  token?: string;
  message?: string;
}

// Newsletter types
export interface NewsletterRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  consent: boolean;
}

export interface NewsletterResponse {
  success: boolean;
  message: string;
  discountCode?: string;
}

// Cart types
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variation?: Record<string, unknown>;
}

export interface CartResponse {
  items: CartItem[];
  total: number;
  itemCount: number;
}

// Order types
export interface CreateOrderRequest {
  payment_method: string;
  billing: {
    first_name: string;
    last_name: string;
    company?: string;
    address_1: string;
    city: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
    nip?: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company?: string;
    address_1: string;
    city: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    product_id: number;
    quantity: number;
    variation_id?: number;
  }>;
  customer_id?: number;
  meta_data?: Array<{
    key: string;
    value: string;
  }>;
}

export interface CreateOrderResponse {
  success: boolean;
  order?: WooCommerceOrder;
  message?: string;
}

// Profile update types
export interface ProfileUpdateRequest {
  firstName: string;
  lastName: string;
  billing: {
    company?: string;
    address?: string;
    city?: string;
    postcode?: string;
    country?: string;
    phone?: string;
    nip?: string;
  };
  shipping: {
    address?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
}

// Invoice types
export interface Invoice {
  id: string;
  number: string;
  date: string;
  total: number;
  currency: string;
  status: string;
  download_url: string;
}

export interface InvoicesResponse {
  success: boolean;
  invoices: Invoice[];
  message?: string;
}

// Email types
export interface EmailRequest {
  type: string;
  order_id: number;
  customer_email: string;
  customer_name: string;
  order_number: string;
  total: string;
  items: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown> | string | null;
  timestamp: string;
}

// Request/Response helpers
export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestConfig<TBody = unknown> {
  method: RequestMethod;
  headers?: Record<string, string>;
  body?: TBody;
  cache?: RequestCache;
  next?: {
    revalidate?: number;
    tags?: string[];
  };
}
