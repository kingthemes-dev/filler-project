'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Cookie, Settings, Check, X as XIcon } from 'lucide-react';
import Link from 'next/link';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

const COOKIE_CONSENT_KEY = 'cookie_preferences';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (storedConsent) {
        const parsedPreferences: CookiePreferences = JSON.parse(storedConsent);
        setPreferences(parsedPreferences);
        loadScripts(parsedPreferences);
      } else {
        setShowBanner(true);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const newPreferences = { necessary: true, analytics: true, marketing: true, preferences: true };
    setPreferences(newPreferences);
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newPreferences));
    setShowBanner(false);
    loadScripts(newPreferences);
  };

  const handleRejectAll = () => {
    const newPreferences = { necessary: true, analytics: false, marketing: false, preferences: false };
    setPreferences(newPreferences);
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newPreferences));
    setShowBanner(false);
    loadScripts(newPreferences);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(preferences));
    setShowBanner(false);
    setShowSettings(false);
    loadScripts(preferences);
  };

  const loadScripts = (prefs: CookiePreferences) => {
    // Google Analytics
    if (prefs.analytics && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}`;
      script.async = true;
      document.head.appendChild(script);

      // Declare dataLayer on window object
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
      }
      gtag('js', new Date());
      gtag('config', process.env.NEXT_PUBLIC_GA4_ID || '', {
        anonymize_ip: true,
        cookie_flags: 'SameSite=None;Secure',
      });
    }

    // Google Ads (if marketing is accepted)
    if (prefs.marketing && typeof window !== 'undefined') {
      console.log('Loading Google Ads scripts...');
    }

    // Facebook Pixel (if marketing is accepted)
    if (prefs.marketing && typeof window !== 'undefined') {
      console.log('Loading Facebook Pixel scripts...');
    }
  };

  // Show cookie settings button in bottom left when not showing modals
  if (!showBanner && !showSettings) {
    return (
      <button
        onClick={() => setShowSettings(true)}
        className="fixed bottom-4 left-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 hover:shadow-xl transition-all duration-300 group"
        title="Ustawienia cookies"
      >
        <Cookie className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors" />
      </button>
    );
  }

  return (
    <>
      {/* Cookie Modal - Bottom Left Popup */}
      {(showBanner || showSettings) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 w-full">
          <div className="bg-white border-t border-gray-200 mx-4 mb-4 rounded-3xl shadow-2xl max-w-[95vw] lg:max-w-7xl xl:mx-auto">
            <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Cookie className="w-5 h-5 text-blue-600" />
                {showSettings ? 'Ustawienia cookies' : 'Cookies'}
              </h2>
              <button 
                onClick={showSettings ? () => setShowSettings(false) : handleRejectAll}
                className="flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            {!showSettings ? (
              <>
                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  Używamy plików cookies, aby zapewnić najlepszą jakość usług. 
                  Możesz zaakceptować wszystkie lub dostosować preferencje.
                  {' '}
                  <Link href="/polityka-prywatnosci" className="text-blue-600 hover:text-blue-800 underline">
                    Dowiedz się więcej w polityce prywatności
                  </Link>
                  .
                </p>

                {/* Buttons */}
                <div className="space-y-2">
                  <Button 
                    onClick={handleAcceptAll}
                    className="w-full bg-gradient-to-r from-gray-800 to-black text-white hover:from-gray-700 hover:to-gray-900 transition-all duration-300 py-2 rounded-lg font-medium text-sm"
                  >
                    <Check className="w-4 h-4 mr-2" /> Akceptuj wszystkie
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleRejectAll}
                      variant="outline"
                      className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors py-2 rounded-lg text-sm"
                    >
                      <XIcon className="w-4 h-4 mr-1" /> Odrzuć
                    </Button>
                    <Button 
                      onClick={() => setShowSettings(true)}
                      variant="outline"
                      className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors py-2 rounded-lg text-sm"
                    >
                      <Settings className="w-4 h-4 mr-1" /> Dostosuj
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Settings Description */}
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  Wybierz, które pliki cookies chcesz akceptować. Niezbędne cookies są zawsze włączone.
                  {' '}
                  <Link href="/polityka-prywatnosci" className="text-blue-600 hover:text-blue-800 underline">
                    Dowiedz się więcej w polityce prywatności
                  </Link>
                  .
                </p>

                {/* Cookie Options */}
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {/* Necessary Cookies */}
                  <div className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                    <input 
                      type="checkbox"
                      checked={preferences.necessary} 
                      disabled
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <label className="font-medium text-gray-900 block mb-1 text-sm">Niezbędne cookies</label>
                      <p className="text-xs text-gray-600">
                        Niezbędne do podstawowego funkcjonowania strony.
                      </p>
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                    <input 
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => 
                        setPreferences(prev => ({ ...prev, analytics: e.target.checked }))
                      }
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <label className="font-medium text-gray-900 block mb-1 text-sm">Analityczne cookies</label>
                      <p className="text-xs text-gray-600">
                        Pomagają zrozumieć, jak użytkownicy korzystają z strony.
                      </p>
                    </div>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                    <input 
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => 
                        setPreferences(prev => ({ ...prev, marketing: e.target.checked }))
                      }
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <label className="font-medium text-gray-900 block mb-1 text-sm">Marketingowe cookies</label>
                      <p className="text-xs text-gray-600">
                        Używane do wyświetlania reklam dostosowanych do Twoich zainteresowań.
                      </p>
                    </div>
                  </div>

                  {/* Preferences Cookies */}
                  <div className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                    <input 
                      type="checkbox"
                      checked={preferences.preferences}
                      onChange={(e) => 
                        setPreferences(prev => ({ ...prev, preferences: e.target.checked }))
                      }
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <label className="font-medium text-gray-900 block mb-1 text-sm">Cookies preferencji</label>
                      <p className="text-xs text-gray-600">
                        Zapamiętują Twoje wybory i ustawienia strony.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSavePreferences}
                    className="flex-1 bg-gradient-to-r from-gray-800 to-black text-white hover:from-gray-700 hover:to-gray-900 transition-all duration-300 py-2 rounded-lg font-medium text-sm"
                  >
                    <Check className="w-4 h-4 mr-2" /> Zapisz
                  </Button>
                  <Button 
                    onClick={() => setShowSettings(false)}
                    variant="outline"
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors py-2 rounded-lg text-sm"
                  >
                    <XIcon className="w-4 h-4 mr-2" /> Anuluj
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}