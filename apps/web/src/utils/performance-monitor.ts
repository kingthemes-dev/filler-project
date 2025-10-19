/**
 * Advanced Performance Monitoring System (Free Implementation)
 * Comprehensive performance tracking and optimization
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  url: string;
  metadata?: Record<string, any>;
}

interface PerformanceBudget {
  metric: string;
  threshold: number;
  severity: 'warning' | 'error';
  description: string;
}

interface PerformanceReport {
  timestamp: string;
  url: string;
  metrics: PerformanceMetric[];
  budgets: Array<{
    budget: PerformanceBudget;
    status: 'pass' | 'warning' | 'fail';
    actual: number;
  }>;
  summary: {
    total_metrics: number;
    passed_budgets: number;
    failed_budgets: number;
    warning_budgets: number;
  };
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private budgets: PerformanceBudget[] = [];
  private maxMetrics = 100;
  private flushInterval = 30000; // 30 seconds
  private endpoint = '/api/performance';

  constructor() {
    this.setupPerformanceBudgets();
    this.setupMonitoring();
    this.startPeriodicFlush();
  }

  private setupPerformanceBudgets(): void {
    // Core Web Vitals budgets
    this.budgets.push({
      metric: 'LCP',
      threshold: 2500,
      severity: 'error',
      description: 'Largest Contentful Paint should be under 2.5s',
    });

    this.budgets.push({
      metric: 'FID',
      threshold: 100,
      severity: 'error',
      description: 'First Input Delay should be under 100ms',
    });

    this.budgets.push({
      metric: 'CLS',
      threshold: 0.1,
      severity: 'error',
      description: 'Cumulative Layout Shift should be under 0.1',
    });

    // Page load budgets
    this.budgets.push({
      metric: 'PageLoad',
      threshold: 3000,
      severity: 'warning',
      description: 'Page load time should be under 3s',
    });

    // API response budgets
    this.budgets.push({
      metric: 'APIResponse',
      threshold: 2000,
      severity: 'warning',
      description: 'API response time should be under 2s',
    });

    // Bundle size budgets
    this.budgets.push({
      metric: 'BundleSize',
      threshold: 250000, // 250KB
      severity: 'warning',
      description: 'JavaScript bundle size should be under 250KB',
    });
  }

  private setupMonitoring(): void {
    // Web Vitals monitoring
    this.setupWebVitalsMonitoring();
    
    // Page load monitoring
    this.setupPageLoadMonitoring();
    
    // API monitoring
    this.setupApiMonitoring();
    
    // Bundle size monitoring
    this.setupBundleSizeMonitoring();
    
    // Memory usage monitoring
    this.setupMemoryMonitoring();
    
    // Network monitoring
    this.setupNetworkMonitoring();
  }

  private setupWebVitalsMonitoring(): void {
    if (!('PerformanceObserver' in window)) return;

    // Largest Contentful Paint
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const lcpEntry = entry as PerformanceEntry & { element?: Element; url?: string; size?: number };
          this.recordMetric({
            name: 'LCP',
            value: entry.startTime,
            timestamp: Date.now().toString(),
            url: window.location.href,
            metadata: {
              element: lcpEntry.element?.tagName,
              url: lcpEntry.url,
              size: lcpEntry.size,
            },
          });
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
          const fid = fidEntry.processingStart - fidEntry.startTime;
          this.recordMetric({
            name: 'FID',
            value: fid,
            timestamp: Date.now().toString(),
            url: window.location.href,
            metadata: {
              eventType: entry.name,
              target: (fidEntry.target as Element)?.tagName,
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
            this.recordMetric({
              name: 'CLS',
              value: clsValue,
              timestamp: Date.now().toString(),
              url: window.location.href,
              metadata: {
                sources: (entry as any).sources,
              },
            });
          }
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS monitoring not supported:', error);
    }
  }

  private setupPageLoadMonitoring(): void {
    // Page load time
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.recordMetric({
        name: 'PageLoad',
        value: loadTime,
        timestamp: Date.now().toString(),
        url: window.location.href,
        metadata: {
          domContentLoaded: performance.timing?.domContentLoadedEventEnd - performance.timing?.domContentLoadedEventStart,
          loadComplete: performance.timing?.loadEventEnd - performance.timing?.loadEventStart,
        },
      });
    });

    // DOM Content Loaded
    document.addEventListener('DOMContentLoaded', () => {
      const domTime = performance.now();
      this.recordMetric({
        name: 'DOMContentLoaded',
        value: domTime,
        timestamp: Date.now().toString(),
        url: window.location.href,
      });
    });

    // Time to First Byte (TTFB)
    if (performance.timing) {
      const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
      this.recordMetric({
        name: 'TTFB',
        value: ttfb,
        timestamp: Date.now().toString(),
        url: window.location.href,
      });
    }
  }

  private setupApiMonitoring(): void {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        this.recordMetric({
          name: 'APIResponse',
          value: endTime - startTime,
          timestamp: Date.now().toString(),
          url: window.location.href,
          metadata: {
            url: args[0],
            status: response.status,
            method: args[1]?.method || 'GET',
            size: response.headers.get('content-length'),
          },
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        this.recordMetric({
          name: 'APIError',
          value: endTime - startTime,
          timestamp: Date.now().toString(),
          url: window.location.href,
          metadata: {
            url: args[0],
            error: error instanceof Error ? error.message : String(error),
          },
        });
        throw error;
      }
    };
  }

  private setupBundleSizeMonitoring(): void {
    // Monitor JavaScript bundle sizes
    if (performance.getEntriesByType) {
      const scripts = performance.getEntriesByType('resource').filter(
        entry => entry.name.includes('.js') && !entry.name.includes('node_modules')
      );
      
      scripts.forEach(script => {
        this.recordMetric({
          name: 'BundleSize',
          value: (script as any).transferSize || 0,
          timestamp: Date.now().toString(),
          url: window.location.href,
          metadata: {
            url: script.name,
            type: 'javascript',
          },
        });
      });
    }
  }

  private setupMemoryMonitoring(): void {
    // Memory usage monitoring (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      setInterval(() => {
        this.recordMetric({
          name: 'MemoryUsage',
          value: memory.usedJSHeapSize,
          timestamp: Date.now().toString(),
          url: window.location.href,
          metadata: {
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
          },
        });
      }, 10000); // Every 10 seconds
    }
  }

  private setupNetworkMonitoring(): void {
    // Network connection monitoring
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.recordMetric({
        name: 'NetworkConnection',
        value: connection.effectiveType === '4g' ? 1 : connection.effectiveType === '3g' ? 2 : 3,
        timestamp: Date.now().toString(),
        url: window.location.href,
        metadata: {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        },
      });
    }

    // Monitor resource loading times
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              this.recordMetric({
                name: 'ResourceLoad',
                value: entry.duration,
                timestamp: Date.now().toString(),
                url: window.location.href,
                metadata: {
                  name: entry.name,
                  type: (entry as any).initiatorType,
                  size: (entry as any).transferSize,
                },
              });
            }
          }
        });
        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Resource monitoring not supported:', error);
      }
    }
  }

  private recordMetric(metric: PerformanceMetric): void {
    // Add URL and timestamp if not provided
    metric.url = metric.url || window.location.href;
    metric.timestamp = metric.timestamp || new Date().toISOString();

    // Add to metrics array
    this.metrics.push(metric);

    // Check against budgets
    this.checkBudget(metric);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const status = this.getBudgetStatus(metric.name, metric.value);
      const statusEmoji = status === 'pass' ? '✅' : status === 'warning' ? '⚠️' : '❌';
      console.log(`${statusEmoji} [Performance] ${metric.name}: ${metric.value}ms`, metric.metadata);
    }

    // Remove old metrics if we have too many
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private checkBudget(metric: PerformanceMetric): void {
    const budget = this.budgets.find(b => b.metric === metric.name);
    if (!budget) return;

    const status = this.getBudgetStatus(metric.name, metric.value);
    
    if (status === 'fail') {
      console.error(`🚨 Performance Budget Failed: ${budget.description}`, {
        metric: metric.name,
        threshold: budget.threshold,
        actual: metric.value,
        severity: budget.severity,
      });
    } else if (status === 'warning') {
      console.warn(`⚠️ Performance Budget Warning: ${budget.description}`, {
        metric: metric.name,
        threshold: budget.threshold,
        actual: metric.value,
      });
    }
  }

  private getBudgetStatus(metricName: string, value: number): 'pass' | 'warning' | 'fail' {
    const budget = this.budgets.find(b => b.metric === metricName);
    if (!budget) return 'pass';

    if (value > budget.threshold) {
      return budget.severity === 'error' ? 'fail' : 'warning';
    }
    return 'pass';
  }

  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    const metrics = [...this.metrics];
    this.metrics = [];

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
      // Re-add metrics to array for retry
      this.metrics.unshift(...metrics);
    }
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }

  public generateReport(): PerformanceReport {
    const timestamp = new Date().toISOString();
    const url = window.location.href;
    
    // Check budgets against recent metrics
    const budgetResults = this.budgets.map(budget => {
      const recentMetric = this.metrics
        .filter(m => m.name === budget.metric && m.url === url)
        .slice(-1)[0];
      
      const actual = recentMetric?.value || 0;
      const status = this.getBudgetStatus(budget.metric, actual);
      
      return {
        budget,
        status,
        actual,
      };
    });

    const summary = {
      total_metrics: this.metrics.length,
      passed_budgets: budgetResults.filter(r => r.status === 'pass').length,
      failed_budgets: budgetResults.filter(r => r.status === 'fail').length,
      warning_budgets: budgetResults.filter(r => r.status === 'warning').length,
    };

    return {
      timestamp,
      url,
      metrics: this.metrics.filter(m => m.url === url),
      budgets: budgetResults,
      summary,
    };
  }

  public getPerformanceScore(): number {
    const report = this.generateReport();
    const { passed_budgets, total_metrics } = report.summary;
    const totalBudgets = report.budgets.length;
    
    if (totalBudgets === 0) return 100;
    
    const budgetScore = (passed_budgets / totalBudgets) * 70; // 70% weight for budgets
    const metricScore = Math.min(total_metrics, 10) * 3; // 30% weight for metrics (max 30 points)
    
    return Math.round(budgetScore + metricScore);
  }

  public getRecommendations(): string[] {
    const recommendations: string[] = [];
    const report = this.generateReport();
    
    report.budgets.forEach(budgetResult => {
      if (budgetResult.status === 'fail' || budgetResult.status === 'warning') {
        switch (budgetResult.budget.metric) {
          case 'LCP':
            recommendations.push('Optimize Largest Contentful Paint: compress images, use WebP format, implement lazy loading');
            break;
          case 'FID':
            recommendations.push('Reduce First Input Delay: minimize JavaScript execution, use code splitting');
            break;
          case 'CLS':
            recommendations.push('Fix Cumulative Layout Shift: set image dimensions, avoid dynamic content insertion');
            break;
          case 'PageLoad':
            recommendations.push('Improve page load time: enable compression, optimize resources, use CDN');
            break;
          case 'APIResponse':
            recommendations.push('Optimize API responses: implement caching, optimize database queries');
            break;
          case 'BundleSize':
            recommendations.push('Reduce bundle size: implement tree shaking, remove unused code, use dynamic imports');
            break;
        }
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  public getStats(): {
    totalMetrics: number;
    performanceScore: number;
    failedBudgets: number;
    recommendations: string[];
  } {
    const report = this.generateReport();
    return {
      totalMetrics: report.summary.total_metrics,
      performanceScore: this.getPerformanceScore(),
      failedBudgets: report.summary.failed_budgets,
      recommendations: this.getRecommendations(),
    };
  }
}

// Create global instance
export const performanceMonitor = new PerformanceMonitor();

// Export for manual usage
export { PerformanceMonitor };
