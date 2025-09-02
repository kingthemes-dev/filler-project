// =========================================
// WooCommerce Product Types
// =========================================
export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_from_gmt: string | null;
  date_on_sale_to: string | null;
  date_on_sale_to_gmt: string | null;
  price_html: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: WooDownload[];
  download_limit: number;
  download_expiry: number;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: WooDimensions;
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;

  tags: WooTag[];
  images: WooImage[];
  attributes: WooAttribute[];
  default_attributes: WooDefaultAttribute[];
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: WooMetaData[];
  _links: WooLinks;
}

export interface WooDownload {
  id: number;
  name: string;
  file: string;
}

export interface WooDimensions {
  length: string;
  width: string;
  height: string;
}



export interface WooTag {
  id: number;
  name: string;
  slug: string;
}

export interface WooImage {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  src: string;
  name: string;
  alt: string;
}

export interface WooAttribute {
  id: number;
  name: string;
  position: number;
  visible: boolean;
  variation: boolean;
  options: string[];
}

export interface WooDefaultAttribute {
  id: number;
  name: string;
  option: string;
}

export interface WooMetaData {
  id: number;
  key: string;
  value: unknown;
}

export interface WooLinks {
  self: WooLink[];
  collection: WooLink[];
}

export interface WooLink {
  href: string;
}



// =========================================
// WooCommerce Order Types
// =========================================
export interface WooOrder {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: string;
  currency: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  billing: WooBilling;
  shipping: WooShipping;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid: string | null;
  date_paid_gmt: string | null;
  date_completed: string | null;
  date_completed_gmt: string | null;
  cart_hash: string;
  meta_data: WooMetaData[];
  line_items: WooLineItem[];
  tax_lines: WooTaxLine[];
  shipping_lines: WooShippingLine[];
  fee_lines: WooFeeLine[];
  coupon_lines: WooCouponLine[];
  refunds: WooRefund[];
  _links: WooLinks;
}

export interface WooBilling {
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
}

export interface WooShipping {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes: WooTax[];
  meta_data: WooMetaData[];
  sku: string;
  price: number;
}

export interface WooTax {
  id: number;
  total: string;
  subtotal: string;
}

export interface WooTaxLine {
  id: number;
  rate_code: string;
  rate_id: number;
  label: string;
  compound: boolean;
  tax_total: string;
  shipping_tax_total: string;
  meta_data: WooMetaData[];
}

export interface WooShippingLine {
  id: number;
  method_title: string;
  method_id: string;
  instance_id: string;
  total: string;
  total_tax: string;
  taxes: WooTax[];
  meta_data: WooMetaData[];
}

export interface WooFeeLine {
  id: number;
  name: string;
  tax_class: string;
  tax_status: string;
  total: string;
  total_tax: string;
  taxes: WooTax[];
  meta_data: WooMetaData[];
}

export interface WooCouponLine {
  id: number;
  code: string;
  discount: string;
  discount_tax: string;
  meta_data: WooMetaData[];
}

export interface WooRefund {
  id: number;
  reason: string;
  total: string;
}

// =========================================
// WooCommerce Customer Types
// =========================================
export interface WooCustomer {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: WooBilling;
  shipping: WooShipping;
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data: WooMetaData[];
  _links: WooLinks;
}

// =========================================
// API Response Types
// =========================================
export interface WooApiResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
}

export interface WooError {
  code: string;
  message: string;
  data?: unknown;
}

// =========================================
// Filter & Query Types
// =========================================
export interface WooProductQuery {
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  modified_after?: string;
  modified_before?: string;
  dates_are_gmt?: boolean;
  exclude?: number[];
  include?: number[];
  parent?: number[];
  parent_exclude?: number[];
  slug?: string;
  status?: string;
  type?: string;
  sku?: string;
  featured?: boolean;
  category?: string;
  tag?: string;
  shipping_class?: string;
  attribute?: string;
  attribute_term?: string;
  tax_class?: string;
  on_sale?: boolean;
  min_price?: string;
  max_price?: string;
  stock_status?: string;
  orderby?: string;
  order?: 'asc' | 'desc';
}


