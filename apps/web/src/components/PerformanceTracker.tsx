'use client';

import { useEffect } from 'react';
import { performanceMonitor } from '@/utils/performance-monitor';

/**
 * Client-side Performance Tracker Component
 * Automatically tracks Web Vitals and sends to server
 */
export default function PerformanceTracker() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Initialize client-side performance monitoring
    const initializeClientMetrics = () => {
      // Track page load performance
      const trackPageLoad = () => {
        const loadTime = performance.now();
        performanceMonitor.recordMetric({
          name: 'PageLoad',
          value: loadTime,
          timestamp: Date.now().toString(),
          url: window.location.href,
          metadata: {
            domContentLoaded: performance.timing?.domContentLoadedEventEnd - performance.timing?.domContentLoadedEventStart,
            loadComplete: performance.timing?.loadEventEnd - performance.timing?.loadEventStart,
          },
        });
      };

      // Track First Contentful Paint
      const trackFCP = () => {
        if ('PerformanceObserver' in window) {
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                  performanceMonitor.recordMetric({
                    name: 'FCP',
                    value: entry.startTime,
                    timestamp: Date.now().toString(),
                    url: window.location.href,
                    metadata: {
                      entryType: entry.entryType,
                    },
                  });
                }
              }
            });
            observer.observe({ entryTypes: ['paint'] });
          } catch (error) {
            console.warn('FCP monitoring not supported:', error);
          }
        }
      };

      // Track Largest Contentful Paint
      const trackLCP = () => {
        if ('PerformanceObserver' in window) {
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                const lcpEntry = entry as PerformanceEntry & { element?: Element; url?: string; size?: number };
                performanceMonitor.recordMetric({
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
        }
      };

      // Track First Input Delay
      const trackFID = () => {
        if ('PerformanceObserver' in window) {
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                const fidEntry = entry as PerformanceEventTiming;
                const fid = fidEntry.processingStart - fidEntry.startTime;
                performanceMonitor.recordMetric({
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
        }
      };

      // Track Cumulative Layout Shift
      const trackCLS = () => {
        if ('PerformanceObserver' in window) {
          try {
            let clsValue = 0;
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                  clsValue += (entry as any).value;
                  performanceMonitor.recordMetric({
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
      };

      // Track Time to First Byte
      const trackTTFB = () => {
        if (performance.timing) {
          const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
          performanceMonitor.recordMetric({
            name: 'TTFB',
            value: ttfb,
            timestamp: Date.now().toString(),
            url: window.location.href,
          });
        }
      };

      // Initialize all tracking
      trackPageLoad();
      trackFCP();
      trackLCP();
      trackFID();
      trackCLS();
      trackTTFB();

      // Track page load when complete
      if (document.readyState === 'complete') {
        trackPageLoad();
      } else {
        window.addEventListener('load', trackPageLoad);
      }
    };

    // Initialize after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(initializeClientMetrics, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
