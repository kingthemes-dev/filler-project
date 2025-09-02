'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Edit, Save, X, Shield, CreditCard, Truck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function MyAccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, updateUser, logout } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    billingAddress: '',
    billingCity: '',
    billingPostcode: '',
    billingCountry: 'PL',
    shippingAddress: '',
    shippingCity: '',
    shippingPostcode: '',
    shippingCountry: 'PL'
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Load user data into form
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.billing?.phone || '',
        billingAddress: user.billing?.address || '',
        billingCity: user.billing?.city || '',
        billingPostcode: user.billing?.postcode || '',
        billingCountry: user.billing?.country || 'PL',
        shippingAddress: user.shipping?.address || '',
        shippingCity: user.shipping?.city || '',
        shippingPostcode: user.shipping?.postcode || '',
        shippingCountry: user.shipping?.country || 'PL'
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (user) {
      updateUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        billing: {
          address: formData.billingAddress,
          city: formData.billingCity,
          postcode: formData.billingPostcode,
          country: formData.billingCountry,
          phone: formData.phone
        },
        shipping: {
          address: formData.shippingAddress,
          city: formData.shippingCity,
          postcode: formData.shippingPostcode,
          country: formData.shippingCountry
        }
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original user data
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.billing?.phone || '',
        billingAddress: user.billing?.address || '',
        billingCity: user.billing?.city || '',
        billingPostcode: user.billing?.postcode || '',
        billingCountry: user.billing?.country || 'PL',
        shippingAddress: user.shipping?.address || '',
        shippingCity: user.shipping?.city || '',
        shippingPostcode: user.shipping?.postcode || '',
        shippingCountry: user.shipping?.country || 'PL'
      });
    }
    setIsEditing(false);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Przekierowywanie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Moje konto
          </h1>
          <p className="text-lg text-gray-600">
            Zarządzaj swoimi danymi i ustawieniami
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Dane osobowe
                </h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edytuj</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imię
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nazwisko
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 bg-gray-50 text-gray-600 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email nie może być zmieniony
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSave}
                    className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Zapisz</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Anuluj</span>
                  </button>
                </div>
              )}
            </motion.div>

            {/* Billing Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Adres rozliczeniowy
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adres
                  </label>
                  <input
                    type="text"
                    value={formData.billingAddress}
                    onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Miasto
                  </label>
                  <input
                    type="text"
                    value={formData.billingCity}
                    onChange={(e) => handleInputChange('billingCity', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kod pocztowy
                  </label>
                  <input
                    type="text"
                    value={formData.billingPostcode}
                    onChange={(e) => handleInputChange('billingPostcode', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kraj
                  </label>
                  <select
                    value={formData.billingCountry}
                    onChange={(e) => handleInputChange('billingCountry', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <option value="PL">Polska</option>
                    <option value="DE">Niemcy</option>
                    <option value="CZ">Czechy</option>
                    <option value="SK">Słowacja</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Shipping Address */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Truck className="w-5 h-5 mr-2" />
                  Adres dostawy
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adres
                  </label>
                  <input
                    type="text"
                    value={formData.shippingAddress}
                    onChange={(e) => handleInputChange('shippingAddress', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Miasto
                  </label>
                  <input
                    type="text"
                    value={formData.shippingCity}
                    onChange={(e) => handleInputChange('shippingCity', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kod pocztowy
                  </label>
                  <input
                    type="text"
                    value={formData.shippingPostcode}
                    onChange={(e) => handleInputChange('shippingPostcode', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kraj
                  </label>
                  <select
                    value={formData.shippingCountry}
                    onChange={(e) => handleInputChange('shippingCountry', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? 'border-gray-300' 
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  >
                    <option value="PL">Polska</option>
                    <option value="DE">Niemcy</option>
                    <option value="CZ">Czechy</option>
                    <option value="SK">Słowacja</option>
                  </select>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Account Summary */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Podsumowanie konta
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600">{user.billing?.phone || 'Nie podano'}</span>
                  </div>
                </div>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Szybkie akcje
                </h3>
                <div className="space-y-3">
                  <Link
                    href="/moje-zamowienia"
                    className="block w-full text-left px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Moje zamówienia
                  </Link>
                  <Link
                    href="/koszyk"
                    className="block w-full text-left px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Koszyk
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Wyloguj się
                  </button>
                </div>
              </motion.div>

              {/* Security Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <Shield className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Bezpieczeństwo
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Twoje dane są bezpieczne i szyfrowane.
                </p>
                <button className="text-sm text-black font-medium hover:underline transition-colors">
                  Zmień hasło
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
