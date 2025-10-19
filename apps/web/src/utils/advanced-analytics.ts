/**
 * Advanced Analytics System (Free Implementation)
 * Enhanced GA4 tracking with custom events and metrics
 */

interface AnalyticsEvent {
  event_name: string;
  parameters: Record<string, any>;
  timestamp: string;
  user_id?: string;
  session_id: string;
}

interface EcommerceEvent {
  event_name: 'purchase' | 'add_to_cart' | 'remove_from_cart' | 'view_item' | 'begin_checkout';
  ecommerce: {
    transaction_id?: string;
    value?: number;
    currency?: string;
    items: Array<{
      item_id: string;
      item_name: string;
      item_category: string;
      quantity?: number;
      price?: number;
    }>;
  };
  parameters?: Record<string, any>;
}

interface PerformanceEvent {
  event_name: 'web_vitals' | 'page_load' | 'api_response';
  metrics: {
    lcp?: number;
    fid?: number;
    cls?: number;
    page_load_time?: number;
    api_response_time?: number;
  };
  parameters?: Record<string, any>;
}

class AdvancedAnalytics {
  private sessionId: string;
  private userId?: string;
  private eventQueue: AnalyticsEvent[] = [];
  private maxQueueSize = 20;
  private flushInterval = 10000; // 10 seconds

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupAutomaticTracking();
    this.startPeriodicFlush();
    this.setupUserIdentification();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupAutomaticTracking(): void {
    // Page view tracking
    this.trackPageView();
    
    // User interaction tracking
    this.setupInteractionTracking();
    
    // Performance tracking
    this.setupPerformanceTracking();
    
    // Error tracking integration
    this.setupErrorTracking();
  }

  private trackPageView(): void {
    // Track initial page view
    this.trackEvent('page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname,
      referrer: document.referrer,
    });

    // Track page views on navigation (for SPA)
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        this.trackEvent('page_view', {
          page_title: document.title,
          page_location: window.location.href,
          page_path: window.location.pathname,
          referrer: lastUrl,
        });
        lastUrl = window.location.href;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  private setupInteractionTracking(): void {
    // Button clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button, a[href], [role="button"]');
      
      if (button) {
        const buttonText = button.textContent?.trim() || '';
        const buttonId = button.id || '';
        const buttonClass = button.className || '';
        
        this.trackEvent('click', {
          element_type: button.tagName.toLowerCase(),
          element_text: buttonText,
          element_id: buttonId,
          element_class: buttonClass,
          page_location: window.location.href,
        });
      }
    });

    // Form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const formId = form.id || '';
      const formClass = form.className || '';
      
      this.trackEvent('form_submit', {
        form_id: formId,
        form_class: formClass,
        page_location: window.location.href,
      });
    });

    // Search queries
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (target.type === 'search' || target.placeholder?.toLowerCase().includes('search')) {
        const searchTerm = target.value;
        if (searchTerm.length > 2) {
          this.trackEvent('search', {
            search_term: searchTerm,
            page_location: window.location.href,
          });
        }
      }
    });
  }

  private setupPerformanceTracking(): void {
    // Web Vitals tracking
    this.trackWebVitals();
    
    // Page load time
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.trackEvent('page_load_time', {
        load_time: Math.round(loadTime),
        page_location: window.location.href,
      });
    });

    // API response times
    this.trackApiPerformance();
  }

  private trackWebVitals(): void {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              this.trackEvent('web_vitals', {
                metric_name: 'LCP',
                metric_value: Math.round(entry.startTime),
                page_location: window.location.href,
              });
            }
          }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP tracking not supported:', error);
      }

      // First Input Delay
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fidEntry = entry as PerformanceEventTiming;
            this.trackEvent('web_vitals', {
              metric_name: 'FID',
              metric_value: Math.round(fidEntry.processingStart - fidEntry.startTime),
              page_location: window.location.href,
            });
          }
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID tracking not supported:', error);
      }

      // Cumulative Layout Shift
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          this.trackEvent('web_vitals', {
            metric_name: 'CLS',
            metric_value: Math.round(clsValue * 1000) / 1000,
            page_location: window.location.href,
          });
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS tracking not supported:', error);
      }
    }
  }

  private trackApiPerformance(): void {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        this.trackEvent('api_response', {
          api_url: args[0],
          response_time: Math.round(endTime - startTime),
          status_code: response.status,
          method: args[1]?.method || 'GET',
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        this.trackEvent('api_error', {
          api_url: args[0],
          response_time: Math.round(endTime - startTime),
          error_message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    };
  }

  private setupErrorTracking(): void {
    // Integration with error tracker
    window.addEventListener('error', (event) => {
      this.trackEvent('javascript_error', {
        error_message: event.message,
        error_filename: event.filename,
        error_lineno: event.lineno,
        error_colno: event.colno,
        page_location: window.location.href,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('promise_rejection', {
        error_reason: event.reason,
        page_location: window.location.href,
      });
    });
  }

  private setupUserIdentification(): void {
    // Try to get user ID from various sources
    const userId = this.getUserId();
    if (userId) {
      this.setUserId(userId);
    }
  }

  private getUserId(): string | null {
    // Check localStorage
    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) return storedUserId;

    // Check sessionStorage
    const sessionUserId = sessionStorage.getItem('user_id');
    if (sessionUserId) return sessionUserId;

    // Check for authentication tokens
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        return payload.user_id || payload.sub || null;
      } catch (error) {
        console.warn('Failed to parse auth token:', error);
      }
    }

    return null;
  }

  public trackEvent(eventName: string, parameters: Record<string, any> = {}): void {
    const event: AnalyticsEvent = {
      event_name: eventName,
      parameters: {
        ...parameters,
        session_id: this.sessionId,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      session_id: this.sessionId,
    };

    // Add to queue
    this.eventQueue.push(event);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${eventName}:`, parameters);
    }

    // Flush if queue is full
    if (this.eventQueue.length >= this.maxQueueSize) {
      this.flushEvents();
    }

    // Send to GA4 if available
    this.sendToGA4(eventName, parameters);
  }

  public trackEcommerce(event: EcommerceEvent): void {
    this.trackEvent(event.event_name, {
      ...event.parameters,
      ecommerce: event.ecommerce,
    });

    // Send to GA4 ecommerce
    this.sendEcommerceToGA4(event);
  }

  public trackPerformance(event: PerformanceEvent): void {
    this.trackEvent(event.event_name, {
      ...event.parameters,
      metrics: event.metrics,
    });
  }

  private sendToGA4(eventName: string, parameters: Record<string, any>): void {
    // Send to Google Analytics 4 if gtag is available
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', eventName, parameters);
    }
  }

  private sendEcommerceToGA4(event: EcommerceEvent): void {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', event.event_name, {
        transaction_id: event.ecommerce.transaction_id,
        value: event.ecommerce.value,
        currency: event.ecommerce.currency || 'PLN',
        items: event.ecommerce.items,
        ...event.parameters,
      });
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'events',
          data: events,
        }),
      });
    } catch (error) {
      console.warn('Failed to flush analytics events:', error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...events);
    }
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);
  }

  public setUserId(userId: string): void {
    this.userId = userId;
    localStorage.setItem('user_id', userId);
    
    // Send to GA4
    if (typeof window !== 'undefined' && 'gtag' in window && process.env.NEXT_PUBLIC_GA4_ID) {
      (window as any).gtag('config', process.env.NEXT_PUBLIC_GA4_ID, {
        user_id: userId,
      });
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getStats(): { events: number; sessionId: string; userId?: string } {
    return {
      events: this.eventQueue.length,
      sessionId: this.sessionId,
      userId: this.userId,
    };
  }

  // Ecommerce helpers
  public trackPurchase(transactionId: string, value: number, items: any[], currency = 'PLN'): void {
    this.trackEcommerce({
      event_name: 'purchase',
      ecommerce: {
        transaction_id: transactionId,
        value,
        currency,
        items,
      },
    });
  }

  public trackAddToCart(itemId: string, itemName: string, itemCategory: string, price: number, quantity = 1): void {
    this.trackEcommerce({
      event_name: 'add_to_cart',
      ecommerce: {
        items: [{
          item_id: itemId,
          item_name: itemName,
          item_category: itemCategory,
          price,
          quantity,
        }],
      },
    });
  }

  public trackViewItem(itemId: string, itemName: string, itemCategory: string, price: number): void {
    this.trackEcommerce({
      event_name: 'view_item',
      ecommerce: {
        items: [{
          item_id: itemId,
          item_name: itemName,
          item_category: itemCategory,
          price,
        }],
      },
    });
  }
}

// Create global instance
export const analytics = new AdvancedAnalytics();

// Export for manual usage
export { AdvancedAnalytics };
