/**
 * Enhanced Error Tracking System (Free Implementation)
 * Replaces Sentry with comprehensive error tracking
 */

import { logger } from './logger';

type ErrorMetadata = Record<string, unknown>;
type PerformanceMetadata = Record<string, unknown>;

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
  metadata?: ErrorMetadata;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  url: string;
  metadata?: PerformanceMetadata;
}

type LayoutShiftEntry = PerformanceEntry & {
  value?: number;
  hadRecentInput?: boolean;
};

class ErrorTracker {
  private sessionId: string;
  private errorQueue: ErrorReport[] = [];
  private performanceQueue: PerformanceMetric[] = [];
  private maxQueueSize = 50;
  private flushInterval = 30000; // 30 seconds
  private endpoint = '/api/error-tracking';
  private pendingErrorFlush: Promise<void> | null = null;
  private pendingPerformanceFlush: Promise<void> | null = null;

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
    window.addEventListener('error', event => {
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
    window.addEventListener('unhandledrejection', event => {
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
    if (!originalFetch) {
      return;
    }

    window.fetch = async (...args: Parameters<typeof originalFetch>) => {
      const startTime = Date.now();
      const [requestInfo] = args;
      const requestUrl =
        requestInfo instanceof Request
          ? requestInfo.url
          : requestInfo instanceof URL
            ? requestInfo.toString()
            : requestInfo;
      try {
        const response = await originalFetch(...args);

        if (!response.ok) {
          this.captureError({
            message: `Network Error: ${response.status} ${response.statusText}`,
            level: 'error',
            category: 'network',
            metadata: {
              url: requestUrl,
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
            url: requestUrl,
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
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              const lcpEntry = entry as PerformanceEntry & {
                element?: Element;
                url?: string;
              };
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
        logger.warn('LCP monitoring not supported', { error });
      }

      // First Input Delay
      try {
        const observer = new PerformanceObserver(list => {
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
        logger.warn('FID monitoring not supported', { error });
      }

      // Cumulative Layout Shift
      try {
        let clsValue = 0;
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as LayoutShiftEntry;
            if (layoutShift.hadRecentInput) continue;
            clsValue += layoutShift.value ?? 0;
          }
          this.capturePerformance({
            name: 'CLS',
            value: clsValue,
          });
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        logger.warn('CLS monitoring not supported', { error });
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
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof originalFetch>) => {
      const startTime = performance.now();
      const [requestInfo, init] = args;
      const requestUrl =
        requestInfo instanceof Request
          ? requestInfo.url
          : requestInfo instanceof URL
            ? requestInfo.toString()
            : requestInfo;
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();

        this.capturePerformance({
          name: 'APIResponse',
          value: endTime - startTime,
          metadata: {
            url: requestUrl,
            status: response.status,
            method:
              init?.method ||
              (requestInfo instanceof Request ? requestInfo.method : 'GET'),
          },
        });

        return response;
      } catch (error) {
        const endTime = performance.now();
        this.capturePerformance({
          name: 'APIError',
          value: endTime - startTime,
          metadata: {
            url: requestUrl,
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
      void this.scheduleErrorFlush();
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

    // Opcjonalne logowanie performance, tylko gdy jawnie włączone envem
    if (process.env.NEXT_PUBLIC_PERF_LOGS === 'true') {
      logger.debug(`[Performance] ${metric.name}: ${metric.value}ms`, {
        metadata: metric.metadata,
      });
    }

    // Flush if queue is full
    if (this.performanceQueue.length >= this.maxQueueSize) {
      void this.schedulePerformanceFlush();
    }
  }

  private logError(error: ErrorReport): void {
    const logFn =
      error.level === 'error'
        ? logger.error.bind(logger)
        : error.level === 'warning'
          ? logger.warn.bind(logger)
          : logger.info.bind(logger);

    logFn('Error captured', {
      message: error.message,
      category: error.category,
      timestamp: error.timestamp,
      url: error.url,
      userAgent: error.userAgent,
      stack: error.stack,
      metadata: error.metadata,
    });
  }

  private scheduleErrorFlush(): Promise<void> {
    if (this.pendingErrorFlush) {
      return this.pendingErrorFlush;
    }

    if (this.errorQueue.length === 0) {
      return Promise.resolve();
    }

    this.pendingErrorFlush = (async () => {
      const errors = [...this.errorQueue];
      this.errorQueue = [];

      const fetchFn =
        typeof window !== 'undefined' && window.fetch
          ? window.fetch
          : globalThis.fetch;

      if (!fetchFn) {
        logger.warn('Fetch API not available, re-queuing errors for retry');
        this.errorQueue.unshift(...errors);
        this.pendingErrorFlush = null;
        return;
      }

      try {
        await fetchFn(this.endpoint, {
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
        logger.warn('Failed to flush errors', { error });
        // Re-add errors to queue for retry
        this.errorQueue.unshift(...errors);
      } finally {
        this.pendingErrorFlush = null;
        if (this.errorQueue.length > 0) {
          void this.scheduleErrorFlush();
        }
      }
    })();

    return this.pendingErrorFlush;
  }

  private schedulePerformanceFlush(): Promise<void> {
    if (this.pendingPerformanceFlush) {
      return this.pendingPerformanceFlush;
    }

    if (this.performanceQueue.length === 0) {
      return Promise.resolve();
    }

    this.pendingPerformanceFlush = (async () => {
      const metrics = [...this.performanceQueue];
      this.performanceQueue = [];

      const fetchFn =
        typeof window !== 'undefined' && window.fetch
          ? window.fetch
          : globalThis.fetch;

      if (!fetchFn) {
        logger.warn(
          'Fetch API not available, re-queuing performance metrics for retry'
        );
        this.performanceQueue.unshift(...metrics);
        this.pendingPerformanceFlush = null;
        return;
      }

      try {
        await fetchFn(this.endpoint, {
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
        logger.warn('Failed to flush performance metrics', { error });
        // Re-add metrics to queue for retry
        this.performanceQueue.unshift(...metrics);
      } finally {
        this.pendingPerformanceFlush = null;
        if (this.performanceQueue.length > 0) {
          void this.schedulePerformanceFlush();
        }
      }
    })();

    return this.pendingPerformanceFlush;
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      void this.scheduleErrorFlush();
      void this.schedulePerformanceFlush();
    }, this.flushInterval);
  }

  // Public API
  public setUserId(userId: string): void {
    // Store user ID for error tracking
    localStorage.setItem('error_tracker_user_id', userId);
  }

  public flushErrorsNow(): Promise<void> {
    return this.scheduleErrorFlush();
  }

  public flushPerformanceNow(): Promise<void> {
    return this.schedulePerformanceFlush();
  }

  public captureCustomEvent(eventName: string, data: ErrorMetadata): void {
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
