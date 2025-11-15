/**
 * GDPR/RODO Types and Interfaces
 */

// Cookie Consent Types
export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export interface CookieConsent {
  preferences: CookiePreferences;
  created_at: string;
  updated_at: string;
  version: string;
  ip_address?: string;
  user_agent?: string;
}

export interface CookieInfo {
  name: string;
  category: 'necessary' | 'analytics' | 'marketing' | 'preferences';
  purpose: string;
  expiration: string;
  provider: string;
}

// GDPR Request Types
export type GDPRRequestType =
  | 'export'
  | 'delete'
  | 'portability'
  | 'restrict'
  | 'rectify';

export interface GDPRRequest {
  id: string;
  user_id: number;
  type: GDPRRequestType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  metadata?: Record<string, unknown>;
}

// Data Export Types
export interface UserDataExport {
  account: {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    date_created: string;
    date_modified: string;
  };
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
  orders: Array<{
    id: number;
    number: string;
    status: string;
    date_created: string;
    total: string;
    currency: string;
    payment_method: string;
    billing: Record<string, string>;
    shipping: Record<string, string>;
    line_items: Array<{
      name: string;
      quantity: number;
      price: string;
      total: string;
    }>;
  }>;
  reviews: Array<{
    id: number;
    product_id: number;
    product_name: string;
    rating: number;
    comment: string;
    date_created: string;
  }>;
  favorites: number[];
  cookie_consents: CookieConsent[];
  newsletter_subscriptions: Array<{
    email: string;
    subscribed_at: string;
    status: string;
  }>;
  export_date: string;
  export_version: string;
}

// GDPR API Request/Response Types
export interface GDPRExportRequest {
  format?: 'json' | 'pdf' | 'csv';
}

export interface GDPRExportResponse {
  success: boolean;
  data?: UserDataExport;
  download_url?: string;
  expires_at?: string;
  message?: string;
  error?: string;
}

export interface GDPRDeleteRequest {
  email: string;
  confirmation: boolean;
  reason?: string;
}

export interface GDPRDeleteResponse {
  success: boolean;
  message: string;
  anonymized_at?: string;
  data_retained?: string[];
  error?: string;
}

export interface GDPRPortabilityRequest {
  format: 'json' | 'csv';
}

export interface GDPRPortabilityResponse {
  success: boolean;
  data?: UserDataExport;
  download_url?: string;
  expires_at?: string;
  message?: string;
  error?: string;
}

export interface GDPRRestrictRequest {
  categories: Array<'marketing' | 'analytics' | 'preferences'>;
  reason?: string;
}

export interface GDPRRestrictResponse {
  success: boolean;
  message: string;
  restricted_categories?: string[];
  error?: string;
}

export interface GDPRRectifyRequest {
  field: string;
  old_value: string;
  new_value: string;
  reason?: string;
}

export interface GDPRRectifyResponse {
  success: boolean;
  message: string;
  updated_field?: string;
  error?: string;
}

// GDPR Audit Log Types
export interface GDPRAuditLog {
  id: string;
  user_id: number;
  action: GDPRRequestType | 'consent_changed' | 'consent_accepted' | 'consent_rejected';
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Cookie Manager Types
export interface CookieManagerConfig {
  consent_key: string;
  version: string;
  cookie_list: CookieInfo[];
}

export interface CookieManager {
  getConsent(): CookieConsent | null;
  setConsent(preferences: CookiePreferences): void;
  hasConsent(): boolean;
  getCookieList(): CookieInfo[];
  clearCookies(categories?: Array<'analytics' | 'marketing' | 'preferences'>): void;
  loadScripts(preferences: CookiePreferences): void;
  unloadScripts(categories?: Array<'analytics' | 'marketing' | 'preferences'>): void;
}

