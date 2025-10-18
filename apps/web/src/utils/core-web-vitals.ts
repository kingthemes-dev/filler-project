/**
 * Core Web Vitals Optimization - Expert Level SEO
 */

// Core Web Vitals thresholds
export const CORE_WEB_VITALS_THRESHOLDS = {
  LCP: 2500, // Largest Contentful Paint (ms)
  FID: 100,  // First Input Delay (ms)
  CLS: 0.1,  // Cumulative Layout Shift
  FCP: 1800, // First Contentful Paint (ms)
  TTFB: 800, // Time to First Byte (ms)
};

// Performance optimization utilities
export class CoreWebVitalsOptimizer {
  private static instance: CoreWebVitalsOptimizer;
  private metrics: Map<string, number> = new Map();

  static getInstance(): CoreWebVitalsOptimizer {
    if (!CoreWebVitalsOptimizer.instance) {
      CoreWebVitalsOptimizer.instance = new CoreWebVitalsOptimizer();
    }
    return CoreWebVitalsOptimizer.instance;
  }

  // Monitor Core Web Vitals
  public monitorCoreWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint
    this.observeLCP();
    
    // First Input Delay
    this.observeFID();
    
    // Cumulative Layout Shift
    this.observeCLS();
    
    // First Contentful Paint
    this.observeFCP();
    
    // Time to First Byte
    this.observeTTFB();
  }

  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.metrics.set('LCP', lastEntry.startTime);
        this.logMetric('LCP', lastEntry.startTime);
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP monitoring not supported:', error);
    }
  }

  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          this.metrics.set('FID', fid);
          this.logMetric('FID', fid);
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
    } catch (error) {
      console.warn('FID monitoring not supported:', error);
    }
  }

  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.set('CLS', clsValue);
            this.logMetric('CLS', clsValue);
          }
        });
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (error) {
      console.warn('CLS monitoring not supported:', error);
    }
  }

  private observeFCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.set('FCP', entry.startTime);
            this.logMetric('FCP', entry.startTime);
          }
        });
      });
      
      observer.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('FCP monitoring not supported:', error);
    }
  }

  private observeTTFB(): void {
    if (!performance.timing) return;

    try {
      const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
      this.metrics.set('TTFB', ttfb);
      this.logMetric('TTFB', ttfb);
    } catch (error) {
      console.warn('TTFB monitoring not supported:', error);
    }
  }

  private logMetric(name: string, value: number): void {
    const threshold = CORE_WEB_VITALS_THRESHOLDS[name as keyof typeof CORE_WEB_VITALS_THRESHOLDS];
    const status = value <= threshold ? '✅ GOOD' : '❌ POOR';
    
    console.log(`[Core Web Vitals] ${name}: ${value.toFixed(2)}ms ${status}`);
    
    // Send to analytics
    if (typeof (window as any).gtag !== 'undefined') {
      (window as any).gtag('event', 'core_web_vitals', {
        metric_name: name,
        metric_value: value,
        metric_rating: value <= threshold ? 'good' : 'poor'
      });
    }
  }

  // Get current metrics
  public getMetrics(): Map<string, number> {
    return new Map(this.metrics);
  }

  // Get performance score
  public getPerformanceScore(): number {
    let score = 100;
    
    this.metrics.forEach((value, key) => {
      const threshold = CORE_WEB_VITALS_THRESHOLDS[key as keyof typeof CORE_WEB_VITALS_THRESHOLDS];
      if (value > threshold) {
        score -= 20; // Deduct 20 points for each failed metric
      }
    });
    
    return Math.max(0, score);
  }

  // Get recommendations
  public getRecommendations(): string[] {
    const recommendations: string[] = [];
    
    this.metrics.forEach((value, key) => {
      const threshold = CORE_WEB_VITALS_THRESHOLDS[key as keyof typeof CORE_WEB_VITALS_THRESHOLDS];
      
      if (value > threshold) {
        switch (key) {
          case 'LCP':
            recommendations.push('Optimize Largest Contentful Paint: compress images, optimize fonts, reduce server response time');
            break;
          case 'FID':
            recommendations.push('Reduce First Input Delay: minimize JavaScript execution, use code splitting');
            break;
          case 'CLS':
            recommendations.push('Fix Cumulative Layout Shift: set image dimensions, avoid dynamic content insertion');
            break;
          case 'FCP':
            recommendations.push('Optimize First Contentful Paint: reduce render-blocking resources');
            break;
          case 'TTFB':
            recommendations.push('Improve Time to First Byte: optimize server response, use CDN');
            break;
        }
      }
    });
    
    return recommendations;
  }
}

// Image optimization utilities
export class ImageOptimizer {
  // Generate responsive image srcset
  static generateSrcSet(baseUrl: string, sizes: number[] = [320, 640, 768, 1024, 1280, 1920]): string {
    return sizes.map(size => `${baseUrl}?w=${size} ${size}w`).join(', ');
  }

  // Generate responsive image sizes
  static generateSizes(): string {
    return '(max-width: 320px) 320px, (max-width: 640px) 640px, (max-width: 768px) 768px, (max-width: 1024px) 1024px, (max-width: 1280px) 1280px, 1920px';
  }

  // Preload critical images
  static preloadCriticalImages(imageUrls: string[]): void {
    if (typeof window === 'undefined') return;

    imageUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  // Lazy load images with intersection observer
  static setupLazyLoading(): void {
    if (typeof window === 'undefined') return;

    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src || '';
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach(img => imageObserver.observe(img));
    } else {
      // Fallback for browsers without IntersectionObserver
      images.forEach(img => {
        const image = img as HTMLImageElement;
        image.src = image.dataset.src || '';
      });
    }
  }
}

// Font optimization utilities
export class FontOptimizer {
  // Preload critical fonts
  static preloadCriticalFonts(fontUrls: string[]): void {
    if (typeof window === 'undefined') return;

    fontUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.href = url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  // Add font display swap
  static addFontDisplaySwap(): void {
    if (typeof window === 'undefined') return;

    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  }
}

// Resource optimization utilities
export class ResourceOptimizer {
  // Preload critical resources
  static preloadCriticalResources(resources: Array<{ href: string; as: string; type?: string }>): void {
    if (typeof window === 'undefined') return;

    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.type) link.type = resource.type;
      document.head.appendChild(link);
    });
  }

  // Prefetch next page resources
  static prefetchNextPageResources(urls: string[]): void {
    if (typeof window === 'undefined') return;

    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  // Preconnect to external domains
  static preconnectExternalDomains(domains: string[]): void {
    if (typeof window === 'undefined') return;

    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      document.head.appendChild(link);
    });
  }
}

// Initialize Core Web Vitals monitoring
export function initializeCoreWebVitalsMonitoring(): void {
  const optimizer = CoreWebVitalsOptimizer.getInstance();
  optimizer.monitorCoreWebVitals();
  
  // Setup image lazy loading
  ImageOptimizer.setupLazyLoading();
  
  // Add font display swap
  FontOptimizer.addFontDisplaySwap();
  
  // Preconnect to external domains
  ResourceOptimizer.preconnectExternalDomains([
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com'
  ]);
}

export default {
  CORE_WEB_VITALS_THRESHOLDS,
  CoreWebVitalsOptimizer,
  ImageOptimizer,
  FontOptimizer,
  ResourceOptimizer,
  initializeCoreWebVitalsMonitoring
};
