/**
 * Search Tracking Component
 * Automatically tracks search queries and SEO events
 */

'use client';

import { useEffect } from 'react';
import { getSearchConsoleAnalytics, type GA4Parameters } from '@/utils/search-console-analytics';

interface SearchTrackingProps {
  searchQuery?: string;
  resultsCount?: number;
  searchEngine?: 'site_search' | 'google' | 'bing' | 'yahoo';
}

export default function SearchTracking({ 
  searchQuery, 
  resultsCount = 0, 
  searchEngine = 'site_search' 
}: SearchTrackingProps) {
  useEffect(() => {
    const analytics = getSearchConsoleAnalytics();
    
    if (analytics && searchQuery) {
      if (searchEngine === 'site_search') {
        analytics.trackSiteSearch(searchQuery, resultsCount);
      } else {
        analytics.trackOrganicSearch(searchQuery, searchEngine);
      }
    }
  }, [searchQuery, resultsCount, searchEngine]);

  return null; // This component doesn't render anything
}

/**
 * Hook for tracking search events
 */
export function useSearchTracking() {
  const trackSearch = (query: string, resultsCount: number = 0) => {
    const analytics = getSearchConsoleAnalytics();
    if (analytics) {
      analytics.trackSiteSearch(query, resultsCount);
    }
  };

  const trackOrganicSearch = (query: string, engine: string) => {
    const analytics = getSearchConsoleAnalytics();
    if (analytics) {
      analytics.trackOrganicSearch(query, engine);
    }
  };

  const trackSEOEvent = (eventName: string, parameters: GA4Parameters) => {
    const analytics = getSearchConsoleAnalytics();
    if (analytics) {
      analytics.trackSEOEvent(eventName, parameters);
    }
  };

  return {
    trackSearch,
    trackOrganicSearch,
    trackSEOEvent,
  };
}
