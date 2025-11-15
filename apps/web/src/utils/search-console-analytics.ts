/**
 * Google Search Console + GA4 Integration
 * Tracks organic search traffic and SEO metrics
 */

// removed unused SearchConsoleEvent interface

// removed unused SEOEvent interface

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type GA4Parameters = Record<
  string,
  string | number | boolean | null | undefined
>;
type LayoutShiftEntry = PerformanceEntry & {
  value?: number;
  hadRecentInput?: boolean;
};

class SearchConsoleAnalytics {
  private ga4Id: string;
  private isInitialized: boolean = false;

  constructor(ga4Id: string) {
    this.ga4Id = ga4Id;
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined') return;

    // Wait for gtag to be available
    const checkGtag = () => {
      if (typeof window !== 'undefined' && 'gtag' in window) {
        this.isInitialized = true;
        this.setupSearchTracking();
        this.setupSEOTracking();
      } else {
        setTimeout(checkGtag, 100);
      }
    };

    checkGtag();
  }

  /**
   * Track search queries from internal site search
   */
  public trackSiteSearch(query: string, resultsCount: number = 0): void {
    if (!this.isInitialized) return;

    this.sendToGA4('search', {
      search_term: query,
      search_engine: 'site_search',
      results_count: resultsCount,
      page_location: window.location.href,
    });
  }

  /**
   * Track organic search traffic (from Google, Bing, etc.)
   */
  public trackOrganicSearch(searchTerm: string, searchEngine: string): void {
    if (!this.isInitialized) return;

    this.sendToGA4('search', {
      search_term: searchTerm,
      search_engine: searchEngine,
      page_location: window.location.href,
      page_title: document.title,
    });
  }

  /**
   * Track SEO-related events
   */
  public trackSEOEvent(eventName: string, parameters: GA4Parameters): void {
    if (!this.isInitialized) return;

    this.sendToGA4(eventName, {
      ...parameters,
      page_location: window.location.href,
      page_title: document.title,
    });
  }

  /**
   * Track page performance for SEO
   */
  public trackPagePerformance(): void {
    if (!this.isInitialized) return;

    // Track Core Web Vitals
    this.trackCoreWebVitals();

    // Track page load metrics
    this.trackPageLoadMetrics();
  }

  /**
   * Track Core Web Vitals for SEO
   */
  private trackCoreWebVitals(): void {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              this.sendToGA4('web_vitals', {
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
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            const fidEntry = entry as PerformanceEventTiming;
            this.sendToGA4('web_vitals', {
              metric_name: 'FID',
              metric_value: Math.round(
                fidEntry.processingStart - fidEntry.startTime
              ),
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
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            const layoutShift = entry as LayoutShiftEntry;
            if (!layoutShift.hadRecentInput) {
              clsValue += layoutShift.value ?? 0;
              this.sendToGA4('web_vitals', {
                metric_name: 'CLS',
                metric_value: Math.round(clsValue * 1000) / 1000,
                page_location: window.location.href,
              });
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS tracking not supported:', error);
      }
    }
  }

  /**
   * Track page load metrics
   */
  private trackPageLoadMetrics(): void {
    window.addEventListener('load', () => {
      const loadTime = performance.now();

      this.sendToGA4('page_load', {
        load_time: Math.round(loadTime),
        page_location: window.location.href,
        page_title: document.title,
      });

      // Track TTFB if available
      if (performance.timing) {
        const ttfb =
          performance.timing.responseStart - performance.timing.navigationStart;
        this.sendToGA4('page_load', {
          ttfb: ttfb,
          page_location: window.location.href,
        });
      }
    });
  }

  /**
   * Setup automatic search tracking
   */
  private setupSearchTracking(): void {
    // Track URL search parameters
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery =
      urlParams.get('q') || urlParams.get('search') || urlParams.get('s');

    if (searchQuery) {
      this.trackSiteSearch(searchQuery);
    }

    // Track form submissions
    document.addEventListener('submit', event => {
      const form = event.target as HTMLFormElement;
      if (
        form.querySelector('input[type="search"]') ||
        form.action.includes('search')
      ) {
        const searchInput = form.querySelector(
          'input[type="search"]'
        ) as HTMLInputElement;
        if (searchInput && searchInput.value) {
          this.trackSiteSearch(searchInput.value);
        }
      }
    });
  }

  /**
   * Setup SEO tracking
   */
  private setupSEOTracking(): void {
    // Track outbound links
    document.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href) {
        const url = new URL(link.href);
        const currentDomain = window.location.hostname;

        if (url.hostname !== currentDomain) {
          this.sendToGA4('click', {
            link_url: link.href,
            link_text: link.textContent?.trim() || '',
            outbound: true,
            page_location: window.location.href,
          });
        }
      }
    });

    // Track file downloads
    document.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href) {
        const url = new URL(link.href);
        const fileExtensions = [
          '.pdf',
          '.doc',
          '.docx',
          '.xls',
          '.xlsx',
          '.ppt',
          '.pptx',
          '.zip',
          '.rar',
        ];
        const isDownload = fileExtensions.some(ext =>
          url.pathname.toLowerCase().endsWith(ext)
        );

        if (isDownload) {
          this.sendToGA4('file_download', {
            file_name: url.pathname.split('/').pop() || '',
            file_extension: url.pathname.split('.').pop() || '',
            link_url: link.href,
            page_location: window.location.href,
          });
        }
      }
    });
  }

  /**
   * Send event to GA4
   */
  private sendToGA4(eventName: string, parameters: GA4Parameters): void {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, parameters);
    }
  }

  /**
   * Track scroll depth for SEO insights
   */
  public trackScrollDepth(): void {
    if (!this.isInitialized) return;

    let maxScroll = 0;
    const scrollThresholds = [25, 50, 75, 90, 100];

    const trackScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY /
          (document.documentElement.scrollHeight - window.innerHeight)) *
          100
      );

      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;

        // Track milestone scroll depths
        scrollThresholds.forEach(threshold => {
          if (scrollPercent >= threshold && maxScroll < threshold + 10) {
            this.sendToGA4('scroll', {
              scroll_depth: threshold,
              page_location: window.location.href,
            });
          }
        });
      }
    };

    window.addEventListener('scroll', trackScroll, { passive: true });
  }
}

// Export singleton instance
let searchConsoleAnalytics: SearchConsoleAnalytics | null = null;

export function initializeSearchConsoleAnalytics(
  ga4Id: string
): SearchConsoleAnalytics {
  if (!searchConsoleAnalytics) {
    searchConsoleAnalytics = new SearchConsoleAnalytics(ga4Id);
  }
  return searchConsoleAnalytics;
}

export function getSearchConsoleAnalytics(): SearchConsoleAnalytics | null {
  return searchConsoleAnalytics;
}

export default SearchConsoleAnalytics;
