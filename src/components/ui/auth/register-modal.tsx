'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, Eye, EyeOff, User, Phone, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const { register, isLoading, error, isAuthenticated } = useAuthStore();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    company: '',
    nip: '',
    invoiceRequest: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        company: '',
        nip: '',
        invoiceRequest: false
      });
      setValidationErrors({});
      setAcceptTerms(false);
      setMarketingConsent(false);
    }
  }, [isOpen]);

  // Close modal only after successful authentication
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      onClose();
    }
  }, [isOpen, isAuthenticated, onClose]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'Imię jest wymagane';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Nazwisko jest wymagane';
    }

    if (!formData.email) {
      errors.email = 'Email jest wymagany';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Nieprawidłowy format email';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Telefon jest wymagany';
    } else {
      // Walidacja numeru telefonu - polskie numery
      const phoneRegex = /^(\+48\s?)?(\d{3}[\s\-]?\d{3}[\s\-]?\d{3}|\d{9})$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errors.phone = 'Proszę wpisać poprawny numer telefonu (np. +48 123 456 789 lub 123 456 789)';
      }
    }

    if (!formData.password) {
      errors.password = 'Hasło jest wymagane';
    } else if (formData.password.length < 6) {
      errors.password = 'Hasło musi mieć co najmniej 6 znaków';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Potwierdzenie hasła jest wymagane';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Hasła nie są identyczne';
    }

    if (!acceptTerms) {
      errors.terms = 'Musisz zaakceptować regulamin';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email,
        phone: formData.phone.trim(),
        password: formData.password,
        marketingConsent: marketingConsent
      });
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
            <h2 className="text-2xl font-bold text-gray-900">
              Zarejestruj się
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Imię
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      validationErrors.firstName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Jan"
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {validationErrors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Nazwisko
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      validationErrors.lastName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Kowalski"
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.lastName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {validationErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email & Phone Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      validationErrors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="twoj@email.com"
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {validationErrors.email}
                  </p>
                )}
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      validationErrors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="+48 123 456 789"
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.phone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {validationErrors.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Company and NIP Fields */}
            <div className="grid grid-cols-1 gap-4">
              {/* Company */}
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Firma (opcjonalnie)
                </label>
                <input
                  id="company"
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Nazwa firmy"
                  disabled={isLoading}
                />
              </div>

              {/* NIP */}
              <div>
                <label htmlFor="nip" className="block text-sm font-medium text-gray-700 mb-2">
                  NIP (dla faktury, opcjonalnie)
                </label>
                <input
                  id="nip"
                  type="text"
                  value={formData.nip}
                  onChange={(e) => handleInputChange('nip', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="1234567890"
                  maxLength={10}
                  disabled={isLoading}
                />
              </div>

              {/* Invoice Request */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.invoiceRequest}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceRequest: e.target.checked }))}
                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-700">
                    Chcę otrzymywać faktury VAT (jeśli podano NIP)
                  </span>
                </label>
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 gap-4">
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Hasło
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      validationErrors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Potwierdź hasło
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      validationErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Marketing Consent - Premium Design */}
            <div className="mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-xl"></div>
              <div className="relative p-4 border border-purple-200/50 rounded-xl bg-white/80 backdrop-blur-sm">
                <label className="flex items-start cursor-pointer space-x-2 group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={marketingConsent}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                      marketingConsent 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-transparent' 
                        : 'border-gray-300 group-hover:border-purple-400'
                    }`}>
                      {marketingConsent && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xl">🎁</span>
                      <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                        Odbierz 10% rabatu!
                      </span>
                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs font-semibold rounded-full">
                        NOWOŚĆ
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Wyrażam zgodę na otrzymywanie ofert marketingowych i odbieram kod rabatowy 10% na pierwsze zakupy.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Terms and Conditions - Premium Design */}
            <div className="mb-6">
              <label className="flex items-start cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                    acceptTerms 
                      ? 'bg-gradient-to-r from-gray-700 to-gray-900 border-transparent' 
                      : 'border-gray-300 group-hover:border-gray-400'
                  }`}>
                    {acceptTerms && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="ml-3 text-sm text-gray-700">
                  <span className="font-medium">Akceptuję</span>{' '}
                  <a 
                    href="/regulamin" 
                    className="text-black underline hover:no-underline font-medium hover:text-gray-800 transition-colors" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    regulamin
                  </a>{' '}
                  <span className="font-medium">oraz</span>{' '}
                  <a 
                    href="/polityka-prywatnosci" 
                    className="text-black underline hover:no-underline font-medium hover:text-gray-800 transition-colors" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    politykę prywatności
                  </a>
                </div>
              </label>
              {validationErrors.terms && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    {validationErrors.terms}
                  </p>
                </div>
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
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Rejestracja...
                </>
              ) : (
                'Zarejestruj się'
              )}
            </button>

            {/* Switch to Login */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Masz już konto?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-black font-medium hover:underline transition-colors"
                >
                  Zaloguj się
                </button>
              </p>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
