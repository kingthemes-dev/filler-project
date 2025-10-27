'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Mail, AlertCircle } from 'lucide-react';
import ModalCloseButton from '../modal-close-button';
import { Button } from '@/components/ui/button';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose, onBackToLogin }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const validateEmail = (email: string) => {
    if (!email) {
      setValidationError('Email jest wymagany');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setValidationError('Nieprawidłowy format email');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) return;

    setIsLoading(true);
    setError('');

    try {
      // Wywołanie API do resetowania hasła
      const response = await fetch('/api/woocommerce?endpoint=customers/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        // Zawsze pokazujemy success, nawet jeśli API zwróciło błąd
        // To zapobiega wyliczaniu emaili i zapewnia spójne UX
        setIsSuccess(true);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      // Zawsze pokazujemy success, nawet w przypadku błędu
      // To zapewnia spójne UX i bezpieczeństwo
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (validationError) {
      setValidationError('');
    }
  };

  const handleClose = () => {
    setEmail('');
    setIsSuccess(false);
    setError('');
    setValidationError('');
    onClose();
  };

  const handleBackToLogin = () => {
    handleClose();
    onBackToLogin();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
                    className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-auto"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            {!isSuccess && (
              <button
                onClick={handleBackToLogin}
                className="mr-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-2xl font-bold text-gray-900">
              {isSuccess ? 'Email wysłany' : 'Zapomniałeś hasła?'}
            </h2>
          </div>
          <ModalCloseButton 
            onClick={handleClose}
            ariaLabel="Zamknij reset hasła"
            size="sm"
          />
        </div>

        <div className="p-6">
          {isSuccess ? (
            /* Success State */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-gray-900">
                        Sprawdź swoją skrzynkę
                      </h3>
                      <div className="space-y-2">
                        <p className="text-gray-600 leading-relaxed">
                          Wysłaliśmy link do resetowania hasła na adres:
                        </p>
                        <p className="font-semibold text-gray-900 text-lg bg-gray-50 px-3 py-2 rounded-lg border">
                          {email}
                        </p>
                      </div>
                    </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Mail className="w-6 h-6 text-blue-600 mt-0.5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-blue-900 mb-3">
                      Co dalej?
                    </h4>
                    <div className="text-sm text-blue-800 space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-600 font-bold">1.</span>
                        <span>Sprawdź folder spam/niechciane</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-600 font-bold">2.</span>
                        <span>Kliknij link w emailu</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-600 font-bold">3.</span>
                        <span>Ustaw nowe hasło</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-600 font-bold">4.</span>
                        <span>Zaloguj się ponownie</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={handleClose}
                  className="w-full"
                >
                  Rozumiem
                </Button>
                
                <button
                  onClick={handleBackToLogin}
                  className="w-full text-gray-600 hover:text-black transition-colors text-sm font-medium"
                >
                  Wróć do logowania
                </button>
              </div>
            </motion.div>
          ) : (
            /* Form State */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Resetowanie hasła
                </h3>
                <p className="text-gray-600">
                  Podaj swój adres email, a wyślemy Ci link do resetowania hasła.
                </p>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adres email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      validationError ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="twoj@email.com"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {validationError && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {validationError}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                Wyślij link resetujący
              </Button>

              {/* Back to Login */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-sm text-gray-600 hover:text-black transition-colors flex items-center justify-center mx-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Wróć do logowania
                </button>
              </div>

              {/* Help Text */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-600 text-center">
                  <strong>Nie otrzymałeś emaila?</strong><br />
                  Sprawdź folder spam lub skontaktuj się z obsługą klienta.
                </p>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
