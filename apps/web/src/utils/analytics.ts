/**
 * Analytics and monitoring utilities
 */

import { env } from '@/config/env';
import { logger } from './logger';

type AnalyticsParameters = Record<string, unknown>;

interface QueuedEvent {
  type: string;
  data: AnalyticsParameters;
}

type GtagFunction = (...args: unknown[]) => void;

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

type TrackedError = {
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  component?: string;
  type?: string;
};

interface ErrorPayload extends TrackedError {
  timestamp: string;
  url: string;
  user_agent: string;
  error_id: string;
}

interface ReactErrorDetail {
  error?: { message?: string; stack?: string };
  component?: string;
}

interface InteractionRecord {
  type: string;
  timestamp: number;
  data?: AnalyticsParameters;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFunction;
    Sentry?: {
      captureException: (error: Error, context?: unknown) => void;
    };
  }
}

// Google Analytics configuration
export const GA_CONFIG = {
  measurementId: env.NEXT_PUBLIC_GA_ID,
  enabled: !!env.NEXT_PUBLIC_GA_ID
};

// Event types for tracking
export const EVENT_TYPES = {
  // User actions
  PAGE_VIEW: 'page_view',
  BUTTON_CLICK: 'button_click',
  LINK_CLICK: 'link_click',
  FORM_SUBMIT: 'form_submit',
  SEARCH: 'search',
  
  // E-commerce
  VIEW_ITEM: 'view_item',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  BEGIN_CHECKOUT: 'begin_checkout',
  PURCHASE: 'purchase',
  
  // User engagement
  SCROLL: 'scroll',
  TIME_ON_PAGE: 'time_on_page',
  VIDEO_PLAY: 'video_play',
  DOWNLOAD: 'file_download',
  
  // Errors
  ERROR: 'error',
  API_ERROR: 'api_error',
  
  // Performance
  PERFORMANCE: 'performance',
  CORE_WEB_VITALS: 'core_web_vitals'
} as const;

// Analytics class
class Analytics {
  private isInitialized = false;
  private queue: QueuedEvent[] = [];

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined' || !GA_CONFIG.enabled) {
      return;
    }

    // Load Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_CONFIG.measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    const win = window as typeof window & { dataLayer?: unknown[]; gtag?: GtagFunction };
    win.dataLayer = win.dataLayer || [];
    const gtag: GtagFunction = (...args) => {
      win.dataLayer?.push(args);
    };
    win.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA_CONFIG.measurementId!, {
      page_title: document.title,
      page_location: window.location.href
    });

    this.isInitialized = true;
    
    // Process queued events
    this.queue.forEach((event) => this.track(event.type, event.data));
    this.queue = [];

    logger.info('Analytics initialized', { measurementId: GA_CONFIG.measurementId });
  }

  // Track page view
  trackPageView(path: string, title?: string) {
    if (!GA_CONFIG.enabled) return;

    const event = {
      type: EVENT_TYPES.PAGE_VIEW,
      data: {
        page_path: path,
        page_title: title || document.title,
        page_location: window.location.href
      }
    };

    if (this.isInitialized) {
      this.sendEvent(event.type, event.data);
    } else {
      this.queue.push(event);
    }

    logger.info('Page view tracked', event.data);
  }

  // Track custom event
  track(eventType: string, parameters: AnalyticsParameters = {}) {
    if (!GA_CONFIG.enabled) return;

    const event = {
      type: eventType,
      data: {
        ...parameters,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        viewport_size: `${window.innerWidth}x${window.innerHeight}`
      }
    };

    if (this.isInitialized) {
      this.sendEvent(event.type, event.data);
    } else {
      this.queue.push(event);
    }

    logger.info('Event tracked', { eventType, parameters });
  }

  // Send event to Google Analytics
  private sendEvent(eventType: string, parameters: AnalyticsParameters) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventType, parameters);
    }
  }

  // E-commerce tracking
  trackViewItem(item: {
    item_id: string;
    item_name: string;
    category: string;
    price: number;
    currency: string;
    image_url?: string;
  }) {
    this.track(EVENT_TYPES.VIEW_ITEM, {
      currency: item.currency,
      value: item.price,
      items: [{
        item_id: item.item_id,
        item_name: item.item_name,
        category: item.category,
        price: item.price,
        currency: item.currency,
        image_url: item.image_url
      }]
    });
  }

  trackAddToCart(item: {
    item_id: string;
    item_name: string;
    category: string;
    price: number;
    currency: string;
    quantity: number;
  }) {
    this.track(EVENT_TYPES.ADD_TO_CART, {
      currency: item.currency,
      value: item.price * item.quantity,
      items: [{
        item_id: item.item_id,
        item_name: item.item_name,
        category: item.category,
        price: item.price,
        currency: item.currency,
        quantity: item.quantity
      }]
    });
  }

  trackPurchase(transaction: {
    transaction_id: string;
    value: number;
    currency: string;
    items: Array<{
      item_id: string;
      item_name: string;
      category: string;
      price: number;
      quantity: number;
    }>;
  }) {
    this.track(EVENT_TYPES.PURCHASE, {
      transaction_id: transaction.transaction_id,
      value: transaction.value,
      currency: transaction.currency,
      items: transaction.items
    });
  }

  // Performance tracking
  trackPerformance(metric: {
    name: string;
    value: number;
    unit?: string;
  }) {
    this.track(EVENT_TYPES.PERFORMANCE, {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_unit: metric.unit || 'ms'
    });
  }

  // Error tracking
  trackError(error: {
    message: string;
    stack?: string;
    component?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }) {
    this.track(EVENT_TYPES.ERROR, {
      error_message: error.message,
      error_stack: error.stack,
      error_component: error.component,
      error_severity: error.severity || 'medium'
    });
  }

  // User identification
  setUserId(userId: string) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_CONFIG.measurementId!, {
        user_id: userId
      });
    }
  }

  // Set user properties
  setUserProperties(properties: AnalyticsParameters) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_CONFIG.measurementId!, {
        custom_map: properties
      });
    }
  }
}

// Create singleton instance
export const analytics = new Analytics();

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Track Core Web Vitals
    this.observeWebVitals();
    
    // Track custom performance metrics
    this.observeCustomMetrics();
  }

  private observeWebVitals() {
    // First Contentful Paint
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('fcp', entry.startTime);
            analytics.trackPerformance({
              name: 'First Contentful Paint',
              value: entry.startTime
            });
          }
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);
    } catch (error) {
      logger.error('Failed to observe FCP', { error });
    }

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('lcp', entry.startTime);
          analytics.trackPerformance({
            name: 'Largest Contentful Paint',
            value: entry.startTime
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      logger.error('Failed to observe LCP', { error });
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming;
          const fid = fidEntry.processingStart - fidEntry.startTime;
          this.recordMetric('fid', fid);
          analytics.trackPerformance({
            name: 'First Input Delay',
            value: fid
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      logger.error('Failed to observe FID', { error });
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as PerformanceEntry & { value?: number };
          const shiftValue = layoutShiftEntry.value ?? 0;
          this.recordMetric('cls', shiftValue);
          analytics.trackPerformance({
            name: 'Cumulative Layout Shift',
            value: shiftValue
          });
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      logger.error('Failed to observe CLS', { error });
    }
  }

  private observeCustomMetrics() {
    // Navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      const metrics = {
        'ttfb': navigation.responseStart - navigation.requestStart,
        'dom-content-loaded': navigation.domContentLoadedEventEnd - navigation.fetchStart,
        'load-complete': navigation.loadEventEnd - navigation.fetchStart
      };

      Object.entries(metrics).forEach(([name, value]) => {
        this.recordMetric(name, value);
        analytics.trackPerformance({
          name: name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: value
        });
      });
    });
  }

  private lastLogTs: number = 0;
  private recordMetric(name: string, value: number) {
    this.metrics.set(name, value);
    // Reduce console noise: log only when explicitly enabled or every 2s max
    const now = Date.now();
    if (process.env.NEXT_PUBLIC_PERF_LOGS === 'true' && (now - this.lastLogTs > 2000)) {
      logger.performance(name, value);
      this.lastLogTs = now;
    }
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Error tracking
export class ErrorTracker {
  private errorCount = 0;
  private maxErrors = 10;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        type: 'javascript'
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: string; stack?: string } | string | undefined;
      const message =
        typeof reason === 'object' && reason?.message
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Unhandled promise rejection';

      this.trackError({
        message,
        stack: typeof reason === 'object' ? reason?.stack : undefined,
        type: 'promise'
      });
    });

    // React error boundary integration
    window.addEventListener('react-error', (event) => {
      const reactEvent = event as CustomEvent<ReactErrorDetail>;
      const detail = reactEvent.detail;
      this.trackError({
        message: detail?.error?.message || 'React error',
        stack: detail?.error?.stack,
        component: detail?.component,
        type: 'react'
      });
    });
  }

  trackError(error: TrackedError) {
    if (this.errorCount >= this.maxErrors) {
      logger.warn('Error limit reached, not tracking more errors');
      return;
    }

    this.errorCount++;

    const errorPayload: ErrorPayload = {
      ...error,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent,
      error_id: this.generateErrorId()
    };

    const severity = this.getErrorSeverity(error);

    // Send to analytics
    analytics.trackError({
      message: error.message,
      stack: error.stack,
      component: error.component,
      severity
    });

    // Log error
    logger.error('Error tracked', { ...errorPayload, severity });

    // Send to external error tracking service (optional)
    this.sendToErrorService(errorPayload);
  }

  private generateErrorId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private getErrorSeverity(error: TrackedError): ErrorSeverity {
    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      return 'medium';
    }
    if (error.message?.includes('ChunkLoadError')) {
      return 'high';
    }
    if (error.type === 'react') {
      return 'high';
    }
    return 'medium';
  }

  private sendToErrorService(errorData: ErrorPayload) {
    const severity = this.getErrorSeverity(errorData);
    // Send to Sentry if available
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(new Error(errorData.message), {
        tags: {
          component: errorData.component,
          type: errorData.type,
          severity
        },
        extra: {
          stack: errorData.stack,
          url: errorData.url,
          userAgent: errorData.user_agent,
          timestamp: errorData.timestamp
        }
      });
    }

    // Send to custom error tracking endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...errorData,
          service: 'headless-woo',
          version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
          severity
        })
      }).catch(() => {
        // Ignore errors in error reporting
      });
    }
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();

// User behavior tracking
export class BehaviorTracker {
  private sessionStart = Date.now();
  private pageViews: string[] = [];
  private interactions: InteractionRecord[] = [];

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Track page views
    this.trackPageView(window.location.pathname);

    // Track scroll depth
    this.trackScrollDepth();

    // Track time on page
    this.trackTimeOnPage();

    // Track clicks
    this.trackClicks();
  }

  private trackPageView(path: string) {
    this.pageViews.push(path);
    this.interactions.push({
      type: EVENT_TYPES.PAGE_VIEW,
      timestamp: Date.now(),
      data: { page_path: path }
    });
    analytics.trackPageView(path);
  }

  private trackScrollDepth() {
    let maxScroll = 0;
    
    const trackScroll = throttle(() => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        
        // Track milestone scroll depths
        if ([25, 50, 75, 90, 100].includes(scrollPercent)) {
          const data = {
            scroll_depth: scrollPercent,
            page_path: window.location.pathname
          };
          analytics.track('scroll', {
            ...data
          });
          this.interactions.push({
            type: EVENT_TYPES.SCROLL,
            timestamp: Date.now(),
            data
          });
        }
      }
    }, 100);

    window.addEventListener('scroll', trackScroll);
  }

  private trackTimeOnPage() {
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - this.sessionStart;
      const data = {
        time_on_page: timeOnPage,
        page_path: window.location.pathname
      };
      analytics.track('time_on_page', data);
      this.interactions.push({
        type: EVENT_TYPES.TIME_ON_PAGE,
        timestamp: Date.now(),
        data
      });
    });
  }

  private trackClicks() {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // Track button clicks
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const data = {
          button_text: target.textContent?.trim(),
          button_id: target.id,
          button_class: target.className,
          page_path: window.location.pathname
        };
        analytics.track('button_click', data);
        this.interactions.push({
          type: EVENT_TYPES.BUTTON_CLICK,
          timestamp: Date.now(),
          data
        });
      }
      
      // Track link clicks
      if (target.tagName === 'A' || target.closest('a')) {
        const link = target.closest('a') as HTMLAnchorElement;
        const data = {
          link_url: link.href,
          link_text: link.textContent?.trim(),
          page_path: window.location.pathname
        };
        analytics.track('link_click', data);
        this.interactions.push({
          type: EVENT_TYPES.LINK_CLICK,
          timestamp: Date.now(),
          data
        });
      }
    });
  }

  getSessionData() {
    return {
      session_duration: Date.now() - this.sessionStart,
      page_views: this.pageViews,
      interactions_count: this.interactions.length
    };
  }
}

// Throttle utility
function throttle<T extends (...args: unknown[]) => void>(func: T, limit: number): T {
  let inThrottle = false;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      window.setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  }) as T;
}

// Create singleton instance
export const behaviorTracker = new BehaviorTracker();

// Export all analytics utilities
const analyticsExports = {
  analytics,
  performanceMonitor,
  errorTracker,
  behaviorTracker,
  EVENT_TYPES
};
export default analyticsExports;
