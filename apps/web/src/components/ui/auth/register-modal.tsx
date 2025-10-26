'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModalCloseButton from '../modal-close-button';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { 
  validateName, 
  validateEmail, 
  validatePhone, 
  validateCompanyName, 
  validateNIP, 
  validatePassword, 
  validateConfirmPassword,
  formatPhone 
} from '@/utils/validation';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onRegistrationSuccess?: (userData: any) => void;
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin, onRegistrationSuccess }: RegisterModalProps) {
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

  // Live validation function
  const validateField = (field: string, value: string) => {
    let error = '';
    
    switch (field) {
      case 'email':
        const emailValidation = validateEmail(value);
        if (!emailValidation.isValid) error = emailValidation.message!;
        break;
      case 'password':
        const passwordValidation = validatePassword(value);
        if (!passwordValidation.isValid) error = passwordValidation.message!;
        break;
      case 'confirmPassword':
        const confirmPasswordValidation = validateConfirmPassword(formData.password, value);
        if (!confirmPasswordValidation.isValid) error = confirmPasswordValidation.message!;
        break;
    }
    
    setValidationErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  // Handle input changes with live validation
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Live validation
    validateField(field, value);
    
    // Special case for confirm password - also validate when password changes
    if (field === 'password') {
      validateField('confirmPassword', formData.confirmPassword);
    }
  };

  // Close modal only after successful authentication
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      onClose();
    }
  }, [isOpen, isAuthenticated, onClose]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Validate only email and password
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) errors.email = emailValidation.message!;

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) errors.password = passwordValidation.message!;

    const confirmPasswordValidation = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (!confirmPasswordValidation.isValid) errors.confirmPassword = confirmPasswordValidation.message!;

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
      const result = await register({
        email: formData.email,
        password: formData.password,
        marketingConsent: marketingConsent
      });
      
      // Call success callback if provided
      if (onRegistrationSuccess && result) {
        onRegistrationSuccess(result);
      }
    } catch (error) {
      console.error('Registration error:', error);
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
            <ModalCloseButton 
              onClick={onClose}
              ariaLabel="Zamknij rejestrację"
              size="sm"
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Info about minimal registration */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Szybka rejestracja
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    Dane osobowe wypełnisz później przy składaniu zamówienia i zostaną zapisane na stałe.
                  </p>
                </div>
              </div>
            </div>

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
                {!validationErrors.password && formData.password && (
                  <p className="mt-1 text-xs text-green-600">
                    ✓ Hasło spełnia wymagania
                  </p>
                )}
                {!formData.password && (
                  <p className="mt-1 text-xs text-gray-500">
                    Minimum 8 znaków, mała i wielka litera, cyfra, znak specjalny
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
                <label className="cursor-pointer group">
                  <div className="flex items-center space-x-2 mb-1">
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
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                      Odbierz 10% rabatu!
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed ml-7">
                    Wyrażam zgodę na otrzymywanie ofert marketingowych i odbieram kod rabatowy 10% na pierwsze zakupy.
                  </p>
                </label>
              </div>
            </div>

            {/* Terms and Conditions - Premium Design */}
            <div className="mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 via-gray-600/10 to-gray-700/10 rounded-xl"></div>
              <div className="relative p-4 border border-gray-200/50 rounded-xl bg-white/80 backdrop-blur-sm">
                <label className="cursor-pointer group">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
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
                    <span className="text-sm text-gray-700">
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
                    </span>
                  </div>
                </label>
              </div>
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
                <p className="text-sm text-red-600 flex items-center mb-3">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </p>
                {error.includes('jest już zarejestrowany') && (
                  <button
                    onClick={onSwitchToLogin}
                    className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    Przejdź do logowania
                  </button>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              Zarejestruj się
            </Button>

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
