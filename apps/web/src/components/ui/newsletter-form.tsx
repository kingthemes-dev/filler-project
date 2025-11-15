'use client';

import { useState } from 'react';
import { Check, AlertCircle, Sparkles } from 'lucide-react';
import { executeRecaptcha, verifyRecaptchaToken } from '@/utils/recaptcha';
import { ENV } from '@/config/constants';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Walidacja emaila
    if (!email) {
      setError('Proszę podać adres email');
      return;
    }

    // Walidacja zgody
    if (!consent) {
      setError('Musisz zaznaczyć zgodę na przetwarzanie danych osobowych');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // FIX: reCAPTCHA verification
      let recaptchaToken = '';
      if (ENV.RECAPTCHA_ENABLED) {
        try {
          recaptchaToken = await executeRecaptcha('newsletter');
          if (recaptchaToken) {
            const isValid = await verifyRecaptchaToken(recaptchaToken);
            if (!isValid) {
              setError(
                'Weryfikacja bezpieczeństwa nie powiodła się. Spróbuj ponownie.'
              );
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error('reCAPTCHA error:', error);
          // Continue if reCAPTCHA fails (graceful degradation)
        }
      }

      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          source: 'homepage',
          consent: consent,
          recaptchaToken: recaptchaToken || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsSubscribed(true);
        setEmail('');
      } else {
        const data = await response.json().catch(() => ({ message: 'Unknown error' }));
        // Handle specific case: email already exists (409 Conflict)
        if (response.status === 409) {
          setError(data.message || 'Ten email jest już zapisany do newslettera');
        } else {
          setError(data.message || 'Wystąpił błąd podczas zapisywania');
        }
      }
    } catch (error) {
      setError('Wystąpił błąd podczas zapisywania');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="text-center">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-lg opacity-75 animate-pulse"></div>
          <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-2xl">
            <Check className="w-10 h-10 text-white" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-bounce" />
        </div>
        <h3 className="text-3xl font-bold text-white mb-3">🎉 Dziękujemy!</h3>
        <p className="text-white/90 text-lg">
          Sprawdź swoją skrzynkę pocztową - kod rabatowy 10% już czeka!
        </p>
        <div className="mt-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full inline-block">
          <span className="text-white font-semibold">
            ✨ 10% rabatu aktywowane
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Senior-level form design with dark gradient background */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Input + Button - In One Line */}
        <div className="flex gap-4">
          {/* Email Input - Monochrome Design */}
          <div className="relative group flex-1">
            <div className="h-16 rounded-2xl overflow-hidden border-2 border-white/20 bg-white/10 backdrop-blur-sm shadow-lg transition-all duration-200 group-hover:border-white/30 group-hover:bg-white/15">
              <div className="relative h-full">
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (e.target.value && error) {
                      setError('');
                    }
                  }}
                  placeholder="Twój adres email"
                  className="w-full h-full pl-6 pr-4 border-0 bg-transparent text-white placeholder:text-white/60 focus:outline-none text-lg font-medium focus:placeholder:text-white/80 transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Monochrome Submit Button - In Line */}
          <div className="relative">
            <button
              type="submit"
              disabled={isLoading}
              className="h-16 px-8 bg-gray-700 text-white border-0 font-bold text-base sm:text-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200 shadow-md hover:shadow-lg rounded-2xl whitespace-nowrap"
            >
              {/* Content */}
              <span className="flex items-center gap-2 whitespace-nowrap">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="font-bold">Zapisz się</span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Premium Consent Checkbox - Enhanced Design */}
        <div className="flex flex-col items-start space-y-4">
          <label className="cursor-pointer group/checkbox">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => {
                setConsent(e.target.checked);
                if (e.target.checked && error) {
                  setError('');
                }
              }}
              className="sr-only"
              disabled={isLoading}
            />
            <div className="flex items-start space-x-3">
              {/* Enhanced Checkbox */}
              <div
                className={`relative w-6 h-6 rounded-md border-2 transition-all duration-300 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  consent
                    ? 'bg-gray-600 border-transparent shadow-lg shadow-gray-500/30'
                    : 'border-white/50 bg-white/5 group-hover/checkbox:border-white/80 group-hover/checkbox:bg-white/10'
                }`}
              >
                {consent && (
                  <svg
                    className="w-4 h-4 text-white animate-in fade-in duration-200"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Text content */}
              <div className="text-white/95 text-left flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-1">
                  <span className="font-bold text-sm sm:text-base">
                    Zapisz się i zyskaj 10% rabatu na następne zamówienie
                  </span>
                  <span className="px-2.5 py-1 bg-gray-600/50 text-white text-xs font-bold rounded-full border border-white/20 backdrop-blur-sm flex-shrink-0">
                    -10%
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed mt-2">
                  Wyrażasz zgodę na przetwarzanie swoich danych osobowych w celu
                  wysyłania informacji marketingowych zgodnie z naszą{' '}
                  <a
                    href="/polityka-prywatnosci"
                    className="underline hover:text-white font-medium transition-colors"
                  >
                    Polityką prywatności
                  </a>
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Enhanced Error Message */}
        {error && (
          <div className="flex items-center justify-center gap-3 p-4 bg-red-500/20 border-2 border-red-400/40 rounded-xl backdrop-blur-sm shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
            <span className="text-red-200 font-medium text-sm sm:text-base text-center">
              {error}
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
