/**
 * Advanced Analytics with Custom Dashboards
 * Free analytics implementation with detailed insights
 */

import { logger } from './logger';
import { telemetry } from './telemetry';

// Analytics configuration
export const ADVANCED_ANALYTICS_CONFIG = {
  enabled: true,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxEventsPerSession: 1000,
  batchSize: 10,
  flushInterval: 5000 // 5 seconds
};

// Event types for advanced tracking
export const ADVANCED_EVENT_TYPES = {
  // Page events
  PAGE_VIEW: 'page_view',
  
  // E-commerce events
  PRODUCT_VIEW: 'product_view',
  PRODUCT_CLICK: 'product_click',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  CART_ABANDONMENT: 'cart_abandonment',
  CHECKOUT_START: 'checkout_start',
  CHECKOUT_STEP: 'checkout_step',
  CHECKOUT_COMPLETE: 'checkout_complete',
  PAYMENT_METHOD_SELECTED: 'payment_method_selected',
  SHIPPING_METHOD_SELECTED: 'shipping_method_selected',
  
  // User behavior events
  SEARCH_PERFORMED: 'search_performed',
  FILTER_APPLIED: 'filter_applied',
  SORT_CHANGED: 'sort_changed',
  PAGE_SCROLL: 'page_scroll',
  TIME_ON_PAGE: 'time_on_page',
  EXIT_INTENT: 'exit_intent',
  
  // Performance events
  PAGE_LOAD_TIME: 'page_load_time',
  API_RESPONSE_TIME: 'api_response_time',
  IMAGE_LOAD_TIME: 'image_load_time',
  BUNDLE_SIZE: 'bundle_size',
  
  // Error events
  JAVASCRIPT_ERROR: 'javascript_error',
  API_ERROR: 'api_error',
  NETWORK_ERROR: 'network_error',
  
  // Business events
  NEWSLETTER_SIGNUP: 'newsletter_signup',
  CONTACT_FORM_SUBMIT: 'contact_form_submit',
  REVIEW_SUBMITTED: 'review_submitted',
  WISHLIST_ADD: 'wishlist_add',
  WISHLIST_REMOVE: 'wishlist_remove'
} as const;

// Advanced Analytics class
export interface AnalyticsEvent {
  event_type: string;
  properties: Record<string, unknown>;
}

type FlexibleValue = string | number | boolean | null | Record<string, unknown> | Array<unknown>;

export class AdvancedAnalytics {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private sessionStart: number;
  private lastActivity: number;
  private userId?: string;
  private userProperties: Record<string, unknown> = {};
  private customDimensions: Record<string, FlexibleValue> = {};
  private isInitialized: boolean = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.lastActivity = Date.now();
    this.initialize();
  }

  private initialize() {
    if (!ADVANCED_ANALYTICS_CONFIG.enabled) return;

    // Track session start
    this.trackEvent(ADVANCED_EVENT_TYPES.PAGE_VIEW, {
      page_path: window.location.pathname,
      page_title: document.title,
      referrer: document.referrer,
      session_id: this.sessionId
    });

    // Setup event batching
    this.setupEventBatching();
    
    // Setup session tracking
    this.setupSessionTracking();
    
    // Setup performance tracking
    this.setupPerformanceTracking();
    
    // Setup error tracking
    this.setupErrorTracking();

    this.isInitialized = true;
    logger.info('Advanced Analytics initialized', { sessionId: this.sessionId });
  }

  // Track custom event
  trackEvent(eventType: string, properties: Record<string, unknown> = {}) {
    if (!this.isInitialized) return;

    const event = {
      event_type: eventType,
      properties: {
        ...properties,
        session_id: this.sessionId,
        user_id: this.userId,
        timestamp: new Date().toISOString(),
        page_path: window.location.pathname,
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`,
        ...this.customDimensions
      }
    };

    this.events.push(event);
    this.lastActivity = Date.now();

    // Track in telemetry
    telemetry.trackMetric(`analytics.${eventType}`, 1, {
      session_id: this.sessionId,
      ...properties
    });

    logger.info('Advanced event tracked', { eventType, properties });
  }

  // E-commerce tracking
  trackProductView(product: {
    id: string;
    name: string;
    category: string;
    price: number;
    currency: string;
    brand?: string;
    position?: number;
  }) {
    this.trackEvent(ADVANCED_EVENT_TYPES.PRODUCT_VIEW, {
      product_id: product.id,
      product_name: product.name,
      product_category: product.category,
      product_price: product.price,
      product_currency: product.currency,
      product_brand: product.brand,
      product_position: product.position
    });
  }

  trackAddToCart(
    item:
      | {
          product_id: string;
          product_name: string;
          category: string;
          price: number;
          currency: string;
          quantity: number;
          cart_total?: number;
        }
      | string,
    productName?: string,
    category?: string,
    price?: number
  ) {
    if (typeof item === 'string') {
      this.trackEvent(ADVANCED_EVENT_TYPES.ADD_TO_CART, {
        product_id: item,
        product_name: productName,
        product_category: category,
        product_price: price,
        product_currency: 'PLN',
        quantity: 1,
        value: price,
      });
      return;
    }
    this.trackEvent(ADVANCED_EVENT_TYPES.ADD_TO_CART, {
      product_id: item.product_id,
      product_name: item.product_name,
      product_category: item.category,
      product_price: item.price,
      product_currency: item.currency,
      quantity: item.quantity,
      cart_total: item.cart_total,
      value: item.price * item.quantity,
    });
  }

  // Backwards-compatible signatures for tests using positional args
  trackPurchase(
    order: string | Record<string, unknown>,
    value?: number,
    items?: Array<Record<string, unknown>>
  ) {
    if (typeof order === 'object') {
      return this.trackEvent(ADVANCED_EVENT_TYPES.CHECKOUT_COMPLETE, order);
    }
    this.trackEvent(ADVANCED_EVENT_TYPES.CHECKOUT_COMPLETE, {
      transaction_id: order,
      value,
      items,
    });
  }

  trackAddToCartLegacy(productId: string, productName: string, category: string, price: number) {
    this.trackAddToCart({
      product_id: productId,
      product_name: productName,
      category,
      price,
      currency: 'PLN',
      quantity: 1,
    });
  }

  trackCheckoutStep(step: number, stepName: string, value?: number) {
    this.trackEvent(ADVANCED_EVENT_TYPES.CHECKOUT_STEP, {
      step_number: step,
      step_name: stepName,
      value: value
    });
  }

  // removed duplicate trackPurchase definition (handled earlier with union signature)

  // User behavior tracking
  trackSearch(query: string, resultsCount: number, filters?: Record<string, unknown>) {
    this.trackEvent(ADVANCED_EVENT_TYPES.SEARCH_PERFORMED, {
      search_query: query,
      results_count: resultsCount,
      filters: filters
    });
  }

  trackFilterApplied(filterType: string, filterValue: FlexibleValue, resultsCount: number) {
    this.trackEvent(ADVANCED_EVENT_TYPES.FILTER_APPLIED, {
      filter_type: filterType,
      filter_value: filterValue,
      results_count: resultsCount
    });
  }

  trackSortChanged(sortBy: string, sortOrder: string, resultsCount: number) {
    this.trackEvent(ADVANCED_EVENT_TYPES.SORT_CHANGED, {
      sort_by: sortBy,
      sort_order: sortOrder,
      results_count: resultsCount
    });
  }

  // Performance tracking
  trackPageLoadTime(loadTime: number, page: string) {
    this.trackEvent(ADVANCED_EVENT_TYPES.PAGE_LOAD_TIME, {
      load_time: loadTime,
      page: page
    });
  }

  trackApiResponseTime(endpoint: string, responseTime: number, statusCode: number) {
    this.trackEvent(ADVANCED_EVENT_TYPES.API_RESPONSE_TIME, {
      endpoint: endpoint,
      response_time: responseTime,
      status_code: statusCode
    });
  }

  trackImageLoadTime(imageUrl: string, loadTime: number) {
    this.trackEvent(ADVANCED_EVENT_TYPES.IMAGE_LOAD_TIME, {
      image_url: imageUrl,
      load_time: loadTime
    });
  }

  // Error tracking
  trackError(error: Error, context: Record<string, unknown> = {}) {
    this.trackEvent(ADVANCED_EVENT_TYPES.JAVASCRIPT_ERROR, {
      error_message: error.message,
      error_stack: error.stack,
      error_type: error.constructor.name,
      ...context
    });
  }

  trackApiError(endpoint: string, statusCode: number, errorMessage: string) {
    this.trackEvent(ADVANCED_EVENT_TYPES.API_ERROR, {
      endpoint: endpoint,
      status_code: statusCode,
      error_message: errorMessage
    });
  }

  // User identification
  setUserId(userId: string) {
    this.userId = userId;
    this.trackEvent('user_identified', {
      user_id: userId
    });
  }

  setUserProperties(properties: Record<string, unknown>) {
    this.userProperties = { ...this.userProperties, ...properties };
    this.trackEvent('user_properties_updated', {
      properties: properties
    });
  }

  setCustomDimension(key: string, value: FlexibleValue) {
    this.customDimensions[key] = value;
  }

  // Session management
  private setupSessionTracking() {
    // Track session timeout
    setInterval(() => {
      if (Date.now() - this.lastActivity > ADVANCED_ANALYTICS_CONFIG.sessionTimeout) {
        this.endSession();
        this.startNewSession();
      }
    }, 60000); // Check every minute

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden', {
          time_on_page: Date.now() - this.sessionStart
        });
      } else {
        this.trackEvent('page_visible', {
          time_away: Date.now() - this.lastActivity
        });
        this.lastActivity = Date.now();
      }
    });

    // Track beforeunload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }

  private startNewSession() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.lastActivity = Date.now();
    this.events = [];
    
    this.trackEvent('session_start', {
      session_id: this.sessionId
    });
  }

  private endSession() {
    const sessionDuration = Date.now() - this.sessionStart;
    
    this.trackEvent('session_end', {
      session_id: this.sessionId,
      session_duration: sessionDuration,
      events_count: this.events.length,
      page_views: this.events.filter(e => e.event_type === ADVANCED_EVENT_TYPES.PAGE_VIEW).length
    });

    // Flush remaining events
    this.flushEvents();
  }

  // Performance tracking setup
  private setupPerformanceTracking() {
    // Track page load performance
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      this.trackPageLoadTime(
        navigation.loadEventEnd - navigation.fetchStart,
        window.location.pathname
      );
    });

    // Track image load performance
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      img.addEventListener('load', () => {
        const loadTime = performance.now();
        this.trackImageLoadTime(img.src, loadTime);
      });
    });
  }

  // Error tracking setup
  private setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), {
        type: 'unhandled_promise_rejection'
      });
    });
  }

  // Event batching
  private setupEventBatching() {
    setInterval(() => {
      this.flushEvents();
    }, ADVANCED_ANALYTICS_CONFIG.flushInterval);
  }

  private flushEvents() {
    if (this.events.length === 0) return;

    const eventsToFlush = this.events.splice(0, ADVANCED_ANALYTICS_CONFIG.batchSize);
    
    // Send events to analytics endpoint
    this.sendEvents(eventsToFlush);
  }

  private async sendEvents(events: AnalyticsEvent[]) {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: events,
          session_id: this.sessionId,
          user_id: this.userId,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      logger.error('Failed to send analytics events', { error });
      // Re-add events to queue for retry
      this.events.unshift(...events);
    }
  }

  // Utility methods
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // TEST/Diagnostics helpers expected by unit tests
  getStats() {
    return {
      events: this.events.length,
      userId: this.userId,
      sessionId: this.sessionId,
    };
  }

  getSessionId() {
    return this.sessionId;
  }

  trackViewItem(productId: string, productName: string, category: string, price: number) {
    this.trackEvent('view_item', {
      product_id: productId,
      product_name: productName,
      product_category: category,
      product_price: price,
    });
  }

  trackPerformance(payload: { event_name: string; metrics: Record<string, unknown> }) {
    this.trackEvent(payload.event_name || 'web_vitals', payload.metrics || {});
  }

  // Get analytics data
  getAnalyticsData() {
    return {
      sessionId: this.sessionId,
      sessionStart: this.sessionStart,
      lastActivity: this.lastActivity,
      userId: this.userId,
      eventsCount: this.events.length,
      userProperties: this.userProperties,
      customDimensions: this.customDimensions
    };
  }

  // Export analytics data
  exportAnalyticsData() {
    return {
      session: this.getAnalyticsData(),
      events: this.events,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
export const advancedAnalytics: AdvancedAnalytics | null = typeof window !== 'undefined' ? new AdvancedAnalytics() : null;

// React hooks for analytics
export function useAnalytics() {
  const instance = advancedAnalytics;

  const safeCall = <Args extends unknown[]>(
    fn: ((...args: Args) => unknown) | undefined,
    args: Args
  ) => {
    if (!fn) return;
    try {
      fn(...args);
    } catch (error) {
      logger.warn('Analytics call failed', { error });
    }
  };

  return {
    trackEvent: (...args: Parameters<AdvancedAnalytics['trackEvent']>) =>
      safeCall(instance ? instance.trackEvent.bind(instance) : undefined, args),
    trackProductView: (...args: Parameters<AdvancedAnalytics['trackProductView']>) =>
      safeCall(instance ? instance.trackProductView.bind(instance) : undefined, args),
    trackAddToCart: (...args: Parameters<AdvancedAnalytics['trackAddToCart']>) =>
      safeCall(instance ? instance.trackAddToCart.bind(instance) : undefined, args),
    trackSearch: (...args: Parameters<AdvancedAnalytics['trackSearch']>) =>
      safeCall(instance ? instance.trackSearch.bind(instance) : undefined, args),
    trackFilterApplied: (...args: Parameters<AdvancedAnalytics['trackFilterApplied']>) =>
      safeCall(instance ? instance.trackFilterApplied.bind(instance) : undefined, args),
    trackError: (...args: Parameters<AdvancedAnalytics['trackError']>) =>
      safeCall(instance ? instance.trackError.bind(instance) : undefined, args),
    setUserId: (...args: Parameters<AdvancedAnalytics['setUserId']>) =>
      safeCall(instance ? instance.setUserId.bind(instance) : undefined, args),
    setUserProperties: (...args: Parameters<AdvancedAnalytics['setUserProperties']>) =>
      safeCall(instance ? instance.setUserProperties.bind(instance) : undefined, args),
    setCustomDimension: (...args: Parameters<AdvancedAnalytics['setCustomDimension']>) =>
      safeCall(instance ? instance.setCustomDimension.bind(instance) : undefined, args)
  };
}

export default advancedAnalytics;