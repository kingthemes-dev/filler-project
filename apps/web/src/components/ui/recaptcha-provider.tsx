'use client';

/**
 * reCAPTCHA Provider Component
 * FIX: Loads reCAPTCHA script globally for all forms
 */

import { useEffect } from 'react';
import { loadRecaptchaScript } from '@/utils/recaptcha';
import { env } from '@/config/env';

export default function RecaptchaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Load reCAPTCHA script on mount
    if (env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      loadRecaptchaScript().catch((error) => {
        console.warn('Failed to load reCAPTCHA:', error);
      });
    }
  }, []);

  return <>{children}</>;
}

