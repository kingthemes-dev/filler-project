/**
 * Performance optimization utilities
 */

import { memo, useMemo, useCallback, startTransition } from 'react';
import { logger } from './logger';

// Debounce function for search and input
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function for scroll and resize events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
) {
  return useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    return new IntersectionObserver(callback, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
  }, [callback, options]);
}

// Virtual scrolling utilities
export function calculateVirtualScroll(
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  totalItems: number
) {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, totalItems);
  
  return {
    startIndex,
    endIndex,
    visibleCount,
    offsetY: startIndex * itemHeight
  };
}

// Image optimization utilities
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  height?: number,
  quality: number = 80
): string {
  if (!url) return '';
  
  // If it's already a WordPress image, add optimization params
  if (url.includes('wp-content/uploads')) {
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    params.set('q', quality.toString());
    
    return `${url}?${params.toString()}`;
  }
  
  return url;
}

// Bundle analyzer for development
export function analyzeBundleSize() {
  if (process.env.NODE_ENV === 'development') {
    // Log bundle size information
    logger.info('Bundle analysis', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType
    });
  }
}

// Memory usage monitoring
export function monitorMemoryUsage() {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memory = (performance as any).memory;
    logger.info('Memory usage', {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    });
  }
}

// Performance measurement utilities
export function measurePerformance<T>(
  name: string,
  fn: () => T
): T {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  
  logger.performance(name, end - start);
  
  return result;
}

export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  logger.performance(name, end - start);
  
  return result;
}

// Preload utilities
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

export function preloadRoute(route: string) {
  if (typeof window !== 'undefined') {
    // Preload route with low priority
    startTransition(() => {
      import(/* @vite-ignore */ route).catch(() => {
        // Ignore preload errors
      });
    });
  }
}

// Critical resource hints
export function addResourceHints() {
  if (typeof document !== 'undefined') {
    // Preconnect to external domains
    const domains = [
      'https://qvwltjhdjw.cfolks.pl',
      'https://api.brevo.com',
      'https://www.googletagmanager.com'
    ];
    
    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }
}

// Service Worker utilities
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          logger.info('Service Worker registered', { scope: registration.scope });
        })
        .catch(error => {
          logger.error('Service Worker registration failed', { error });
        });
    });
  }
}

// Cache strategies
export const CACHE_STRATEGIES = {
  // Cache first for static assets
  CACHE_FIRST: 'cache-first',
  // Network first for dynamic content
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate for API data
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  // Network only for critical updates
  NETWORK_ONLY: 'network-only'
} as const;

// Performance budgets
export const PERFORMANCE_BUDGETS = {
  FCP: 1800, // First Contentful Paint
  LCP: 2500, // Largest Contentful Paint
  FID: 100,  // First Input Delay
  CLS: 0.1,  // Cumulative Layout Shift
  TTFB: 600  // Time to First Byte
} as const;

// Performance monitoring
export function checkPerformanceBudget() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics = {
      TTFB: navigation.responseStart - navigation.requestStart,
      FCP: 0, // Would need PerformanceObserver
      LCP: 0, // Would need PerformanceObserver
      FID: 0  // Would need PerformanceObserver
    };
    
    // Check against budgets
    Object.entries(metrics).forEach(([metric, value]) => {
      const budget = PERFORMANCE_BUDGETS[metric as keyof typeof PERFORMANCE_BUDGETS];
      if (budget && value > budget) {
        logger.warn(`Performance budget exceeded: ${metric}`, { value, budget });
      }
    });
    
    return metrics;
  }
  
  return null;
}

// Component optimization helpers
export const optimizedComponents = {
  // Memoized product card
  ProductCard: memo,
  // Memoized product grid
  ProductGrid: memo,
  // Memoized filters
  Filters: memo
};

// Export performance utilities
export default {
  debounce,
  throttle,
  useIntersectionObserver,
  calculateVirtualScroll,
  getOptimizedImageUrl,
  analyzeBundleSize,
  monitorMemoryUsage,
  measurePerformance,
  measureAsyncPerformance,
  preloadImage,
  preloadRoute,
  addResourceHints,
  registerServiceWorker,
  checkPerformanceBudget,
  optimizedComponents
};
