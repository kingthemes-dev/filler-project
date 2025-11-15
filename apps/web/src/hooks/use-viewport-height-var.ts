'use client';

import { useEffect } from 'react';

/**
 * Hook that sets the --vh CSS variable to the actual viewport height
 * This fixes the vh unit issues on mobile browsers, especially iOS
 */
export function useViewportHeightVar() {
  useEffect(() => {
    const setVH = () => {
      // Use visualViewport if available (for mobile zoom), otherwise use window.innerHeight
      const vh = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty('--vh', `${vh * 0.01}px`);
    };

    // Set initial value
    setVH();

    // Update on resize
    window.addEventListener('resize', setVH);

    // Update on orientation change
    window.addEventListener('orientationchange', setVH);

    // Update on visual viewport change (mobile zoom)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH);
      window.visualViewport.addEventListener('scroll', setVH);
    }

    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setVH);
        window.visualViewport.removeEventListener('scroll', setVH);
      }
    };
  }, []);
}
