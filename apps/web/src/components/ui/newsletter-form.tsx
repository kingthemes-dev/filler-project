'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Mail, AlertCircle, Sparkles } from 'lucide-react';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !consent) return;

    setIsLoading(true);
    setError('');

    try {
      // TODO: Replace with actual newsletter service integration
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          source: 'homepage',
          consent: consent
        }),
      });

      if (response.ok) {
        setIsSubscribed(true);
        setEmail('');
      } else {
        const data = await response.json();
        setError(data.message || 'Wystąpił błąd podczas zapisywania');
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
        <h3 className="text-3xl font-bold text-white mb-3">
          🎉 Dziękujemy!
        </h3>
        <p className="text-white/90 text-lg">
          Sprawdź swoją skrzynkę pocztową - kod rabatowy 10% już czeka!
        </p>
        <div className="mt-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full inline-block">
          <span className="text-white font-semibold">✨ 10% rabatu aktywowane</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex gap-6 items-start">
            {/* Ikona newslettera po lewej stronie */}
            <div className="hidden lg:flex flex-col items-center justify-center min-h-[200px]">
              {/* <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
                <Mail className="w-10 h-10 text-white" />
              </div> */}
            </div>
        
        {/* Formularz po prawej stronie */}
        <div className="flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input + Button - Simple design without animations */}
            <div className="flex h-14 rounded-2xl overflow-hidden border border-white/60">
              {/* Input field - smaller width */}
              <div className="flex-[2] relative bg-gray-800">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Twój adres email"
                  className="w-full h-full pl-4 pr-4 border-0 bg-transparent text-white placeholder:text-white/60 focus:outline-none text-lg font-medium"
                  required
                />
              </div>
              
              {/* Divider line */}
              <div className="w-px bg-white/60"></div>
              
              {/* Button - simple style */}
              <button
                type="submit"
                disabled={isLoading || !consent}
                className="flex-[1] px-6 bg-black text-white border-0 font-semibold text-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Odbierz 10%!"
                )}
              </button>
            </div>
        
        {/* Premium Consent Checkbox */}
        <div className="flex justify-center">
          <label className="flex items-center cursor-pointer group justify-center">
            <div className="relative">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                consent 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-transparent' 
                  : 'border-white/50 group-hover:border-purple-400'
              }`}>
                {consent && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            <div className="ml-3 text-white/90">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold text-base">Otrzymuj oferty i promocje</span>
                <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full">
                  -10%
                </span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                Możesz zrezygnować w każdej chwili. Zgodnie z naszą{' '}
                <a href="/polityka-prywatnosci" className="underline hover:text-white font-medium">
                  Polityką Prywatności
                </a>
              </p>
            </div>
          </label>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="flex items-center justify-center gap-2 p-4 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-red-300" />
            <span className="text-red-200 font-medium">{error}</span>
          </div>
        )}
          </form>
        </div>
      </div>
    </div>
  );
}
