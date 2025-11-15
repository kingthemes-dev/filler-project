/**
 * reCAPTCHA v3 Utilities
 * FIX: Dodano implementację reCAPTCHA v3 dla ochrony przed botami
 */

import { env } from '@/config/env';
import { logger } from '@/utils/logger';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string }
      ) => Promise<string>;
    };
  }
}

/**
 * Load reCAPTCHA script
 */
export function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.grecaptcha) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.grecaptcha.ready(() => {
        resolve();
      });
    };

    script.onerror = () => {
      reject(new Error('Failed to load reCAPTCHA script'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Execute reCAPTCHA v3 and get token
 * @param action - Action name (e.g., 'checkout', 'newsletter', 'registration')
 * @returns Promise<string> - reCAPTCHA token
 */
export async function executeRecaptcha(action: string): Promise<string> {
  const siteKey = env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    logger.warn('reCAPTCHA: Site key not configured');
    return '';
  }

  try {
    // Load script if not already loaded
    await loadRecaptchaScript();

    // Wait for grecaptcha to be ready
    await new Promise<void>(resolve => {
      window.grecaptcha.ready(() => {
        resolve();
      });
    });

    // Execute reCAPTCHA
    const token = await window.grecaptcha.execute(siteKey, { action });
    return token;
  } catch (error) {
    logger.error('reCAPTCHA: Failed to execute', { error, action });
    return '';
  }
}

/**
 * Verify reCAPTCHA token on server
 */
export async function verifyRecaptchaToken(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const response = await fetch('/api/recaptcha/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    return data.success === true && data.score >= 0.5; // Score threshold: 0.5 (0.0 = bot, 1.0 = human)
  } catch (error) {
    logger.error('reCAPTCHA: Failed to verify token', { error });
    return false;
  }
}
