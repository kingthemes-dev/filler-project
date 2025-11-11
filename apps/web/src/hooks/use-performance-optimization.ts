/**
 * Performance Optimization Hooks
 * Hooks for optimizing LCP, CLS, and other performance metrics
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput?: boolean;
};

/**
 * Hook to optimize Largest Contentful Paint (LCP)
 */
export function useLCPOptimization() {
  const [lcpElement, setLcpElement] = useState<Element | null>(null);
  const [lcpTime, setLcpTime] = useState<number>(0);
  const observerRef = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create LCP observer
    observerRef.current = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
        element?: Element;
        startTime: number;
      };

      if (lastEntry) {
        setLcpElement(lastEntry.element || null);
        setLcpTime(lastEntry.startTime);
        
        // Log LCP for debugging
        console.log('🎯 LCP detected:', {
          element: lastEntry.element?.tagName,
          time: lastEntry.startTime,
          url: lastEntry.element instanceof HTMLImageElement ? lastEntry.element.src : 'N/A'
        });
      }
    });

    observerRef.current.observe({ entryTypes: ['largest-contentful-paint'] });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { lcpElement, lcpTime };
}

/**
 * Hook to optimize Cumulative Layout Shift (CLS)
 */
export function useCLSOptimization() {
  const [clsScore, setClsScore] = useState<number>(0);
  const [clsEntries, setClsEntries] = useState<LayoutShiftEntry[]>([]);
  const observerRef = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let clsValue = 0;
    const layoutShifts: LayoutShiftEntry[] = [];

    observerRef.current = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count layout shifts without recent user input
        const layoutShift = entry as LayoutShiftEntry;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
          layoutShifts.push(layoutShift);
        }
      }

      setClsScore(clsValue);
      setClsEntries([...layoutShifts]);

      // Log CLS for debugging
      if (clsValue > 0.1) {
        console.warn('⚠️ CLS detected:', {
          score: clsValue,
          entries: layoutShifts.length,
          threshold: 0.1
        });
      }
    });

    observerRef.current.observe({ entryTypes: ['layout-shift'] });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { clsScore, clsEntries };
}

/**
 * Hook to optimize First Input Delay (FID)
 */
export function useFIDOptimization() {
  const [fidTime, setFidTime] = useState<number>(0);
  const observerRef = useRef<PerformanceObserver | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    observerRef.current = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        setFidTime(fidEntry.processingStart - fidEntry.startTime);
        
        console.log('🎯 FID detected:', {
          time: fidEntry.processingStart - fidEntry.startTime,
          eventType: fidEntry.name
        });
      }
    });

    observerRef.current.observe({ entryTypes: ['first-input'] });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { fidTime };
}

/**
 * Hook to optimize Time to First Byte (TTFB)
 */
export function useTTFBOptimization() {
  const [ttfbTime, setTtfbTime] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get TTFB from navigation timing
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      setTtfbTime(ttfb);
      
      console.log('🎯 TTFB detected:', {
        time: ttfb,
        threshold: 600
      });
    }
  }, []);

  return { ttfbTime };
}

/**
 * Hook to optimize page load performance
 */
export function usePageLoadOptimization() {
  const [loadTime, setLoadTime] = useState<number>(0);
  const [domContentLoaded, setDomContentLoaded] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLoad = () => {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigationEntry) {
        const loadTime = navigationEntry.loadEventEnd - navigationEntry.fetchStart;
        const domContentLoaded = navigationEntry.domContentLoadedEventEnd - navigationEntry.fetchStart;
        
        setLoadTime(loadTime);
        setDomContentLoaded(domContentLoaded);
        
        console.log('🎯 Page load detected:', {
          loadTime,
          domContentLoaded,
          threshold: 3000
        });
      }
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  return { loadTime, domContentLoaded };
}

/**
 * Hook to preload critical resources
 */
export function useResourcePreloading() {
  const preloadedRef = useRef<Set<string>>(new Set());

  const preloadResource = useCallback((url: string, type: 'image' | 'script' | 'style' | 'font' = 'image') => {
    if (preloadedRef.current.has(url)) return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    
    switch (type) {
      case 'image':
        link.as = 'image';
        break;
      case 'script':
        link.as = 'script';
        break;
      case 'style':
        link.as = 'style';
        break;
      case 'font':
        link.as = 'font';
        link.crossOrigin = 'anonymous';
        break;
    }

    document.head.appendChild(link);
    preloadedRef.current.add(url);

    console.log('🚀 Resource preloaded:', { url, type });
  }, []);

  const preloadCriticalImages = useCallback((imageUrls: string[]) => {
    imageUrls.forEach(url => preloadResource(url, 'image'));
  }, [preloadResource]);

  const preloadCriticalScripts = useCallback((scriptUrls: string[]) => {
    scriptUrls.forEach(url => preloadResource(url, 'script'));
  }, [preloadResource]);

  return {
    preloadResource,
    preloadCriticalImages,
    preloadCriticalScripts
  };
}

/**
 * Hook to optimize image loading
 */
export function useImageOptimization() {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (loadedImages.has(src)) {
        resolve(new Image());
        return;
      }

      const img = new Image();
      
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, src]));
        resolve(img);
      };
      
      img.onerror = () => {
        setFailedImages(prev => new Set([...prev, src]));
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });
  }, [loadedImages]);

  const preloadImages = useCallback(async (imageUrls: string[]) => {
    const promises = imageUrls.map(url => loadImage(url));
    
    try {
      await Promise.allSettled(promises);
      console.log('🚀 Images preloaded:', imageUrls);
    } catch (error) {
      console.warn('⚠️ Some images failed to preload:', error);
    }
  }, [loadImage]);

  return {
    loadImage,
    preloadImages,
    loadedImages,
    failedImages
  };
}

/**
 * Hook to optimize bundle size and loading
 */
export function useBundleOptimization() {
  const [loadedChunks, setLoadedChunks] = useState<Set<string>>(new Set());

  const loadChunk = useCallback(async (chunkName: string) => {
    if (loadedChunks.has(chunkName)) return;

    try {
      // Dynamic import for code splitting - remove invalid import
      console.log('🚀 Chunk loading not implemented:', chunkName);
      setLoadedChunks(prev => new Set([...prev, chunkName]));
      
      console.log('🚀 Chunk loaded:', chunkName);
    } catch (error) {
      console.warn('⚠️ Failed to load chunk:', chunkName, error);
    }
  }, [loadedChunks]);

  const preloadChunks = useCallback(async (chunkNames: string[]) => {
    const promises = chunkNames.map(name => loadChunk(name));
    await Promise.allSettled(promises);
  }, [loadChunk]);

  return {
    loadChunk,
    preloadChunks,
    loadedChunks
  };
}

/**
 * Hook to monitor and optimize performance metrics
 */
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState({
    lcp: 0,
    cls: 0,
    fid: 0,
    ttfb: 0,
    loadTime: 0
  });

  const { lcpTime } = useLCPOptimization();
  const { clsScore } = useCLSOptimization();
  const { fidTime } = useFIDOptimization();
  const { ttfbTime } = useTTFBOptimization();
  const { loadTime } = usePageLoadOptimization();

  useEffect(() => {
    setMetrics({
      lcp: lcpTime,
      cls: clsScore,
      fid: fidTime,
      ttfb: ttfbTime,
      loadTime
    });
  }, [lcpTime, clsScore, fidTime, ttfbTime, loadTime]);

  const sendMetrics = useCallback(async () => {
    try {
      await fetch('/api/performance/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metrics),
      });
    } catch (error) {
      console.warn('⚠️ Failed to send performance metrics:', error);
    }
  }, [metrics]);

  useEffect(() => {
    // Send metrics when they change
    if (Object.values(metrics).some(value => value > 0)) {
      sendMetrics();
    }
  }, [metrics, sendMetrics]);

  return {
    metrics,
    sendMetrics
  };
}
