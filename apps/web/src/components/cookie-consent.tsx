'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { X, Cookie, Settings, Check, X as XIcon } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, can't be disabled
    analytics: false,
    marketing: false,
    preferences: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      const savedPreferences = JSON.parse(consent);
      setPreferences(savedPreferences);
      loadScripts(savedPreferences);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    
    setPreferences(allAccepted);
    localStorage.setItem('cookie-consent', JSON.stringify(allAccepted));
    setShowBanner(false);
    setShowSettings(false);
    loadScripts(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyNecessary = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    
    setPreferences(onlyNecessary);
    localStorage.setItem('cookie-consent', JSON.stringify(onlyNecessary));
    setShowBanner(false);
    setShowSettings(false);
    loadScripts(onlyNecessary);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    setShowBanner(false);
    setShowSettings(false);
    loadScripts(preferences);
  };

  const loadScripts = (prefs: CookiePreferences) => {
    // Google Analytics
    if (prefs.analytics && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`;
      script.async = true;
      document.head.appendChild(script);

      // Declare dataLayer on window object
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
      }
      gtag('js', new Date());
      gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
        anonymize_ip: true,
        cookie_flags: 'SameSite=None;Secure',
      });
    }

    // Google Ads (if marketing is accepted)
    if (prefs.marketing && typeof window !== 'undefined') {
      // Load Google Ads scripts here
      console.log('Loading Google Ads scripts...');
    }

    // Facebook Pixel (if marketing is accepted)
    if (prefs.marketing && typeof window !== 'undefined') {
      // Load Facebook Pixel here
      console.log('Loading Facebook Pixel...');
    }
  };

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {/* Cookie Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-start gap-4">
              <Cookie className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Używamy plików cookies
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Używamy plików cookies, aby zapewnić najlepszą jakość usług i dostosować treści do Twoich preferencji. 
                  Możesz zarządzać ustawieniami cookies w dowolnym momencie.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={handleAcceptAll}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Akceptuj wszystkie
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleRejectAll}
                  >
                    <XIcon className="w-4 h-4 mr-2" />
                    Odrzuć wszystkie
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Ustawienia
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cookie className="w-6 h-6 text-blue-600" />
                  <CardTitle>Ustawienia plików cookies</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowSettings(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>
                Wybierz, które pliki cookies chcesz akceptować. Niezbędne cookies są zawsze włączone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Necessary Cookies */}
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox"
                  checked={preferences.necessary} 
                  disabled
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <Label className="font-medium">Niezbędne cookies</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Te pliki cookies są niezbędne do podstawowego funkcjonowania strony internetowej. 
                    Nie można ich wyłączyć.
                  </p>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => 
                    setPreferences(prev => ({ ...prev, analytics: e.target.checked }))
                  }
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <Label className="font-medium">Analityczne cookies</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Pomagają nam zrozumieć, jak użytkownicy korzystają z naszej strony, 
                    dzięki czemu możemy ją ulepszać. (Google Analytics)
                  </p>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => 
                    setPreferences(prev => ({ ...prev, marketing: e.target.checked }))
                  }
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <Label className="font-medium">Marketingowe cookies</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Używane do wyświetlania reklam dostosowanych do Twoich zainteresowań. 
                    (Google Ads, Facebook Pixel)
                  </p>
                </div>
              </div>

              {/* Preferences Cookies */}
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox"
                  checked={preferences.preferences}
                  onChange={(e) => 
                    setPreferences(prev => ({ ...prev, preferences: e.target.checked }))
                  }
                  className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div className="flex-1">
                  <Label className="font-medium">Cookies preferencji</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Zapamiętują Twoje wybory i ustawienia, aby strona działała zgodnie z Twoimi preferencjami.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSavePreferences}
                  className="bg-black text-white hover:bg-gray-800"
                >
                  Zapisz ustawienia
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                >
                  Anuluj
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
