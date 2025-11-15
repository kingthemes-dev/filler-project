/**
 * Cookie Manager - GDPR Compliant Cookie Consent Management
 */

import type {
  CookieConsent,
  CookiePreferences,
  CookieInfo,
  CookieManagerConfig,
} from '@/types/gdpr';

const DEFAULT_VERSION = '1.0.0';
const DEFAULT_CONSENT_KEY = 'cookie_preferences';

// Lista wszystkich cookies używanych w aplikacji
export const COOKIE_LIST: CookieInfo[] = [
  // Niezbędne cookies
  {
    name: 'session',
    category: 'necessary',
    purpose: 'Przechowywanie identyfikatora sesji użytkownika',
    expiration: 'Session',
    provider: 'Filler.pl',
  },
  {
    name: 'auth_token',
    category: 'necessary',
    purpose: 'Przechowywanie tokenu uwierzytelniania',
    expiration: '1 rok',
    provider: 'Filler.pl',
  },
  {
    name: 'cart',
    category: 'necessary',
    purpose: 'Przechowywanie zawartości koszyka',
    expiration: '30 dni',
    provider: 'Filler.pl',
  },
  {
    name: 'csrf_token',
    category: 'necessary',
    purpose: 'Zabezpieczenie przed atakami CSRF',
    expiration: 'Session',
    provider: 'Filler.pl',
  },
  // Analityczne cookies
  {
    name: '_ga',
    category: 'analytics',
    purpose: 'Google Analytics - identyfikacja użytkownika',
    expiration: '2 lata',
    provider: 'Google',
  },
  {
    name: '_ga_*',
    category: 'analytics',
    purpose: 'Google Analytics - identyfikacja sesji',
    expiration: '2 lata',
    provider: 'Google',
  },
  {
    name: '_gid',
    category: 'analytics',
    purpose: 'Google Analytics - identyfikacja użytkownika',
    expiration: '24 godziny',
    provider: 'Google',
  },
  {
    name: '_gat',
    category: 'analytics',
    purpose: 'Google Analytics - ograniczenie żądań',
    expiration: '1 minuta',
    provider: 'Google',
  },
  {
    name: '_gtm_*',
    category: 'analytics',
    purpose: 'Google Tag Manager - identyfikacja kontenera',
    expiration: '2 lata',
    provider: 'Google',
  },
  // Marketingowe cookies
  {
    name: '_fbp',
    category: 'marketing',
    purpose: 'Facebook Pixel - identyfikacja przeglądarki',
    expiration: '90 dni',
    provider: 'Facebook',
  },
  {
    name: '_fbc',
    category: 'marketing',
    purpose: 'Facebook Pixel - identyfikacja kampanii',
    expiration: '90 dni',
    provider: 'Facebook',
  },
  {
    name: 'fr',
    category: 'marketing',
    purpose: 'Facebook Pixel - identyfikacja użytkownika',
    expiration: '90 dni',
    provider: 'Facebook',
  },
  {
    name: 'IDE',
    category: 'marketing',
    purpose: 'Google Ads - identyfikacja użytkownika',
    expiration: '2 lata',
    provider: 'Google',
  },
  {
    name: 'test_cookie',
    category: 'marketing',
    purpose: 'Google Ads - testowanie wsparcia cookies',
    expiration: '15 minut',
    provider: 'Google',
  },
  // Cookies preferencji
  {
    name: 'cookie_preferences',
    category: 'preferences',
    purpose: 'Przechowywanie preferencji zgody na cookies',
    expiration: '1 rok',
    provider: 'Filler.pl',
  },
  {
    name: 'theme',
    category: 'preferences',
    purpose: 'Przechowywanie preferencji motywu',
    expiration: '1 rok',
    provider: 'Filler.pl',
  },
  {
    name: 'language',
    category: 'preferences',
    purpose: 'Przechowywanie preferencji języka',
    expiration: '1 rok',
    provider: 'Filler.pl',
  },
];

export class CookieManager {
  private config: CookieManagerConfig;
  private consentKey: string;

  constructor(config?: Partial<CookieManagerConfig>) {
    this.config = {
      consent_key: config?.consent_key || DEFAULT_CONSENT_KEY,
      version: config?.version || DEFAULT_VERSION,
      cookie_list: config?.cookie_list || COOKIE_LIST,
    };
    this.consentKey = this.config.consent_key;
  }

  /**
   * Pobierz zgodę na cookies z localStorage
   */
  getConsent(): CookieConsent | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(this.consentKey);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as CookieConsent;
      return parsed;
    } catch (error) {
      console.error('Error reading cookie consent:', error);
      return null;
    }
  }

  /**
   * Zapisz zgodę na cookies w localStorage
   */
  setConsent(preferences: CookiePreferences): void {
    if (typeof window === 'undefined') return;

    try {
      const existing = this.getConsent();
      const now = new Date().toISOString();

      const consent: CookieConsent = {
        preferences,
        created_at: existing?.created_at || now,
        updated_at: now,
        version: this.config.version,
        ip_address: undefined, // Nie przechowujemy IP po stronie klienta
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      };

      localStorage.setItem(this.consentKey, JSON.stringify(consent));

      // Wyślij event o zmianie zgody
      this.dispatchConsentChangeEvent(consent);
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }
  }

  /**
   * Sprawdź czy użytkownik wyraził zgodę
   */
  hasConsent(): boolean {
    return this.getConsent() !== null;
  }

  /**
   * Pobierz listę wszystkich cookies
   */
  getCookieList(): CookieInfo[] {
    return this.config.cookie_list;
  }

  /**
   * Pobierz listę cookies dla określonej kategorii
   */
  getCookiesByCategory(category: CookieInfo['category']): CookieInfo[] {
    return this.config.cookie_list.filter(cookie => cookie.category === category);
  }

  /**
   * Wyczyść cookies dla określonych kategorii
   */
  clearCookies(categories?: Array<'analytics' | 'marketing' | 'preferences'>): void {
    if (typeof document === 'undefined') return;

    const cookiesToClear = categories
      ? this.config.cookie_list.filter(cookie => 
          cookie.category !== 'necessary' && categories.includes(cookie.category as 'analytics' | 'marketing' | 'preferences')
        )
      : this.config.cookie_list.filter(cookie => cookie.category !== 'necessary');

    cookiesToClear.forEach(cookie => {
      // Usuń cookie z głównej domeny
      document.cookie = `${cookie.name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      // Usuń cookie z subdomeny
      document.cookie = `${cookie.name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
    });

    // Wyczyść localStorage dla cookies preferencji (jeśli nie są akceptowane)
    if (!categories || categories.includes('preferences')) {
      const consent = this.getConsent();
      if (consent && !consent.preferences.preferences) {
        try {
          localStorage.removeItem('theme');
          localStorage.removeItem('language');
        } catch (error) {
          console.error('Error clearing preference cookies:', error);
        }
      }
    }
  }

  /**
   * Załaduj skrypty analityczne/marketingowe zgodnie z zgodą
   */
  loadScripts(preferences: CookiePreferences): void {
    if (typeof window === 'undefined') return;

    // Analityczne skrypty (GA4/GTM)
    if (preferences.analytics) {
      this.loadAnalyticsScripts();
    } else {
      this.unloadAnalyticsScripts();
    }

    // Marketingowe skrypty (Facebook Pixel, Google Ads)
    if (preferences.marketing) {
      this.loadMarketingScripts();
    } else {
      this.unloadMarketingScripts();
    }
  }

  /**
   * Odładuj skrypty dla określonych kategorii
   */
  unloadScripts(categories?: Array<'analytics' | 'marketing' | 'preferences'>): void {
    if (!categories || categories.includes('analytics')) {
      this.unloadAnalyticsScripts();
    }
    if (!categories || categories.includes('marketing')) {
      this.unloadMarketingScripts();
    }
  }

  /**
   * Załaduj skrypty analityczne
   */
  private loadAnalyticsScripts(): void {
    // Skrypty są ładowane w layout.tsx (consent-gated)
    // Ta funkcja tylko wywołuje event o zmianie zgody
    // Layout.tsx automatycznie przeładuje skrypty po zmianie localStorage
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
        detail: { category: 'analytics', enabled: true },
      }));
    }
  }

  /**
   * Odładuj skrypty analityczne
   */
  private unloadAnalyticsScripts(): void {
    // Wyczyść cookies analityczne
    this.clearCookies(['analytics']);

    // Wyczyść dataLayer
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer = [];
    }

    // Wyczyść gtag
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: () => void }).gtag) {
      delete (window as unknown as { gtag?: () => void }).gtag;
    }

    // Wyślij event o zmianie zgody
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
        detail: { category: 'analytics', enabled: false },
      }));
    }
  }

  /**
   * Załaduj skrypty marketingowe
   */
  private loadMarketingScripts(): void {
    // Placeholder dla skryptów marketingowych
    // W przyszłości można dodać Facebook Pixel, Google Ads, etc.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
        detail: { category: 'marketing', enabled: true },
      }));
    }
  }

  /**
   * Odładuj skrypty marketingowe
   */
  private unloadMarketingScripts(): void {
    // Wyczyść cookies marketingowe
    this.clearCookies(['marketing']);

    // Wyślij event o zmianie zgody
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentChanged', {
        detail: { category: 'marketing', enabled: false },
      }));
    }
  }

  /**
   * Wyślij event o zmianie zgody
   */
  private dispatchConsentChangeEvent(consent: CookieConsent): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookieConsentUpdated', {
        detail: consent,
      }));
    }
  }

  /**
   * Zresetuj zgodę (usuń z localStorage)
   */
  resetConsent(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(this.consentKey);
      this.clearCookies();
    } catch (error) {
      console.error('Error resetting cookie consent:', error);
    }
  }
}

// Singleton instance
let cookieManagerInstance: CookieManager | null = null;

/**
 * Pobierz instancję CookieManager (singleton)
 */
export function getCookieManager(config?: Partial<CookieManagerConfig>): CookieManager {
  if (!cookieManagerInstance) {
    cookieManagerInstance = new CookieManager(config);
  }
  return cookieManagerInstance;
}

/**
 * Utwórz nową instancję CookieManager
 */
export function createCookieManager(config?: Partial<CookieManagerConfig>): CookieManager {
  return new CookieManager(config);
}

