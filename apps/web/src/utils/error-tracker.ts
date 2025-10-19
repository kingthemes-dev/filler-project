/**
 * Enhanced Error Tracking System (Free Implementation)
 * Replaces Sentry with comprehensive error tracking
 */

interface ErrorReport {
  message: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  level: 'error' | 'warning' | 'info';
  category: string;
  metadata?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  url: string;
  metadata?: Record<string, any>;
}

class ErrorTracker {
  private sessionId: string;
  private errorQueue: ErrorReport[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private maxQueueSize = 50;
  private flushInterval = 30000; // 30 seconds
  private endpoint = '/api/error-tracking';

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupErrorHandlers();
    this.setupPerformanceMonitoring();
    this.startPeriodicFlush();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupErrorHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        level: 'error',
        category: 'javascript',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        level: 'error',
        category: 'promise',
        metadata: {
          reason: event.reason,
        },
      });
    });

    // Network error handler
    this.setupNetworkErrorHandling();
  }

  private setupNetworkErrorHandling(): void {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok) {
          this.captureError({
            message: `Network Error: ${response.status} ${response.statusText}`,
            level: 'error',
            category: 'network',
            metadata: {
              url: args[0],
              status: response.status,
              statusText: response.statusText,
              responseTime: Date.now() - startTime,
            },
          });
        }
        
        return response;
      } catch (error) {
        this.captureError({
          message: `Fetch Error: ${error}`,
          level: 'error',
          category: 'network',
          metadata: {
            url: args[0],
            responseTime: Date.now() - startTime,
          },
        });
        throw error;
      }
    };
  }

  private setupPerformanceMonitoring(): void {
    // Web Vitals monitoring
    this.observeWebVitals();
    
    // Custom performance metrics
    this.observeCustomMetrics();
  }

  private observeWebVitals(): void {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              const lcpEntry = entry as PerformanceEntry & { element?: Element; url?: string };
              this.capturePerformance({
                name: 'LCP',
                value: entry.startTime,
                metadata: {
                  element: lcpEntry.element?.tagName,
                  url: lcpEntry.url,
                },
              });
            }
          }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP monitoring not supported:', error);
      }

      // First Input Delay
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const fidEntry = entry as PerformanceEventTiming;
            this.capturePerformance({
              name: 'FID',
              value: fidEntry.processingStart - fidEntry.startTime,
              metadata: {
                eventType: entry.name,
              },
            });
          }
        });
        observer.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID monitoring not supported:', error);
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
          this.capturePerformance({
            name: 'CLS',
            value: clsValue,
          });
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS monitoring not supported:', error);
      }
    }
  }

  private observeCustomMetrics(): void {
    // Page load time
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.capturePerformance({
        name: 'PageLoad',
        value: loadTime,
      });
    });

    // API response times
    this.observeApiPerformance();
  }

  private observeApiPerformance(): void {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        this.capturePerformance({
          name: 'APIResponse',
          value: endTime - startTime,
          metadata: {
            url: args[0],
            status: response.status,
            method: args[1]?.method || 'GET',
          },
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        this.capturePerformance({
          name: 'APIError',
          value: endTime - startTime,
          metadata: {
            url: args[0],
            error: error instanceof Error ? error.message : String(error),
          },
        });
        throw error;
      }
    };
  }

  public captureError(error: Partial<ErrorReport>): void {
    const errorReport: ErrorReport = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      level: error.level || 'error',
      category: error.category || 'unknown',
      metadata: error.metadata,
    };

    // Add to queue
    this.errorQueue.push(errorReport);

    // Log to console with styling
    this.logError(errorReport);

    // Flush if queue is full
    if (this.errorQueue.length >= this.maxQueueSize) {
      this.flushErrors();
    }
  }

  public capturePerformance(metric: Partial<PerformanceMetric>): void {
    const performanceMetric: PerformanceMetric = {
      name: metric.name || 'unknown',
      value: metric.value || 0,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      metadata: metric.metadata,
    };

    this.performanceQueue.push(performanceMetric);

    // Log performance metrics
    console.log(`[Performance] ${metric.name}: ${metric.value}ms`, metric.metadata);

    // Flush if queue is full
    if (this.performanceQueue.length >= this.maxQueueSize) {
      this.flushPerformance();
    }
  }

  private logError(error: ErrorReport): void {
    const styles = {
      error: 'color: #ff4444; font-weight: bold;',
      warning: 'color: #ffaa00; font-weight: bold;',
      info: 'color: #4488ff; font-weight: bold;',
    };

    console.group(`%c[${error.level.toUpperCase()}] ${error.category}`, styles[error.level]);
    console.log('Message:', error.message);
    console.log('URL:', error.url);
    console.log('Timestamp:', error.timestamp);
    if (error.stack) console.log('Stack:', error.stack);
    if (error.metadata) console.log('Metadata:', error.metadata);
    console.groupEnd();
  }

  private async flushErrors(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'errors',
          data: errors,
        }),
      });
    } catch (error) {
      console.warn('Failed to flush errors:', error);
      // Re-add errors to queue for retry
      this.errorQueue.unshift(...errors);
    }
  }

  private async flushPerformance(): Promise<void> {
    if (this.performanceQueue.length === 0) return;

    const metrics = [...this.performanceQueue];
    this.performanceQueue = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance',
          data: metrics,
        }),
      });
    } catch (error) {
      console.warn('Failed to flush performance metrics:', error);
      // Re-add metrics to queue for retry
      this.performanceQueue.unshift(...metrics);
    }
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushErrors();
      this.flushPerformance();
    }, this.flushInterval);
  }

  // Public API
  public setUserId(userId: string): void {
    // Store user ID for error tracking
    localStorage.setItem('error_tracker_user_id', userId);
  }

  public captureCustomEvent(eventName: string, data: Record<string, any>): void {
    this.captureError({
      message: `Custom Event: ${eventName}`,
      level: 'info',
      category: 'custom',
      metadata: data,
    });
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getStats(): { errors: number; performance: number } {
    return {
      errors: this.errorQueue.length,
      performance: this.performanceQueue.length,
    };
  }
}

// Create global instance
export const errorTracker = new ErrorTracker();

// Export for manual usage
export { ErrorTracker };
