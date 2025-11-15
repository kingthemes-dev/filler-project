/**
 * GA4 Event Types and Parameters
 * TypeScript definitions for Google Analytics 4 events
 */

/**
 * GA4 Measurement ID format
 */
export type GA4MeasurementId = `G-${string}`;

/**
 * GA4 Event Name
 */
export type GA4EventName =
  | 'page_view'
  | 'view_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'search'
  | 'scroll'
  | 'time_on_page'
  | 'button_click'
  | 'link_click'
  | 'form_submit'
  | 'file_download'
  | 'video_play'
  | 'error'
  | 'api_error'
  | 'performance'
  | 'core_web_vitals'
  | string; // Allow custom event names

/**
 * GA4 Item (for e-commerce events)
 */
export interface GA4Item {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_brand?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  currency?: string;
  discount?: number;
  affiliation?: string;
  coupon?: string;
  creative_name?: string;
  creative_slot?: string;
  location_id?: string;
  promotion_id?: string;
  promotion_name?: string;
}

/**
 * GA4 E-commerce Event Parameters
 */
export interface GA4EcommerceParameters {
  currency?: string;
  value?: number;
  items?: GA4Item[];
  transaction_id?: string;
  shipping?: number;
  tax?: number;
  coupon?: string;
  payment_type?: string;
  shipping_tier?: string;
}

/**
 * GA4 Page View Parameters
 */
export interface GA4PageViewParameters {
  page_title?: string;
  page_location?: string;
  page_path?: string;
  content_group1?: string;
  content_group2?: string;
  content_group3?: string;
  content_group4?: string;
  content_group5?: string;
}

/**
 * GA4 Search Parameters
 */
export interface GA4SearchParameters {
  search_term?: string;
  search_engine?: string;
  results_count?: number;
}

/**
 * GA4 Custom Parameters
 */
export interface GA4CustomParameters {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * GA4 Event Parameters (union of all parameter types)
 */
export type GA4EventParameters = GA4EcommerceParameters &
  GA4PageViewParameters &
  GA4SearchParameters &
  GA4CustomParameters;

/**
 * GA4 Event Payload
 */
export interface GA4Event {
  event_name: GA4EventName;
  parameters?: GA4EventParameters;
}

/**
 * GA4 View Item Event (specific type)
 */
export interface GA4ViewItemEvent extends GA4Event {
  event_name: 'view_item';
  parameters: {
    currency: string;
    value: number;
    items: [GA4Item]; // Single item for view_item
  } & GA4CustomParameters;
}

/**
 * GA4 Add to Cart Event (specific type)
 */
export interface GA4AddToCartEvent extends GA4Event {
  event_name: 'add_to_cart';
  parameters: {
    currency: string;
    value: number;
    items: GA4Item[];
  } & GA4CustomParameters;
}

/**
 * GA4 Begin Checkout Event (specific type)
 */
export interface GA4BeginCheckoutEvent extends GA4Event {
  event_name: 'begin_checkout';
  parameters: {
    currency: string;
    value: number;
    items: GA4Item[];
  } & GA4CustomParameters;
}

/**
 * GA4 Purchase Event (specific type)
 */
export interface GA4PurchaseEvent extends GA4Event {
  event_name: 'purchase';
  parameters: {
    transaction_id: string;
    value: number;
    currency: string;
    items: GA4Item[];
    shipping?: number;
    tax?: number;
    coupon?: string;
  } & GA4CustomParameters;
}

/**
 * GA4 Config Parameters
 */
export interface GA4ConfigParameters {
  page_title?: string;
  page_location?: string;
  page_path?: string;
  user_id?: string;
  anonymize_ip?: boolean;
  cookie_flags?: string;
  send_page_view?: boolean;
  custom_map?: Record<string, string>;
  [key: string]: string | number | boolean | Record<string, string> | undefined;
}

