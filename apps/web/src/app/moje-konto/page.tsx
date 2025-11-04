'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, Edit, Save, X, Shield, CreditCard, Truck, ShoppingCart, Eye, FileText, Package, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

import { useCartStore } from '@/stores/cart-store';
import { WooProduct } from '@/types/woocommerce';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import wooCommerceService from '@/services/woocommerce-optimized';
import { 
  validateNIP, 
  validatePhone, 
  validateName, 
  validateCompanyName, 
  validateAddress, 
  validatePostalCode,
  formatNIP,
  formatPhone 
} from '@/utils/validation';

// Debug helper (no logs in prod unless explicitly enabled)
const __DEBUG__ = process.env.NEXT_PUBLIC_DEBUG === 'true';
const debugLog = (...args: unknown[]) => { if (__DEBUG__) console.log(...args); };

export default function MyAccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile, changePassword, logout, fetchUserProfile } = useAuthStore();

  const { addItem, openCart } = useCartStore();
  const [isEditing, setIsEditing] = useState(false);
  const [openSection, setOpenSection] = useState<{ profile: boolean; billing: boolean; shipping: boolean }>({ profile: true, billing: false, shipping: false });
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: '',
    nip: '',
    invoiceRequest: false,
    billingAddress: '',
    billingCity: '',
    billingPostcode: '',
    billingCountry: 'PL',
    shippingAddress: '',
    shippingCity: '',
    shippingPostcode: '',
    shippingCountry: 'PL'
  });
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Redirect if not authenticated (but wait for auth store to load)
  useEffect(() => {
    // Add a small delay to let Zustand persist middleware load from localStorage
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.push('/');
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  // Fetch user profile when authenticated (same as checkout)
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if billing data is empty or missing key fields
      const hasEmptyBilling = !user.billing || 
        !user.billing.address || 
        !user.billing.city || 
        !user.billing.phone ||
        Object.values(user.billing).every(value => !value || value === 'PL');
      
      // Also check if NIP is missing (even if other fields are filled)
      
      debugLog('🔍 My Account: Checking billing data:', { 
        billing: user.billing, 
        hasEmptyBilling,
        shouldFetch: hasEmptyBilling
      });
      
      if (hasEmptyBilling) {
        debugLog('🔄 My Account: User data incomplete, fetching profile...');
        fetchUserProfile();
      }
    }
  }, [isAuthenticated, user, fetchUserProfile]);

  // Copy billing data to shipping when sameAsBilling is checked
  useEffect(() => {
    if (sameAsBilling) {
      setFormData(prev => ({
        ...prev,
        shippingAddress: prev.billingAddress,
        shippingCity: prev.billingCity,
        shippingPostcode: prev.billingPostcode,
        shippingCountry: prev.billingCountry
      }));
    }
  }, [sameAsBilling, formData.billingAddress, formData.billingCity, formData.billingPostcode, formData.billingCountry]);

  // Load user data into form
  useEffect(() => {
    debugLog('🔍 My Account useEffect - user check:', { user: !!user, billing: user?.billing });
    if (user) {
      const meta = (user as any)?.meta_data as Array<{ key: string; value: any }> | undefined;
      const getMeta = (k: string) => meta?.find((m) => m.key === k)?.value;
      const billing = (user as any)?.billing || {};
      const shipping = (user as any)?.shipping || {};
      const resolvedBillingAddress = billing.address || billing.address_1 || '';
      const resolvedShippingAddress = shipping.address || shipping.address_1 || '';
      const resolvedNip = billing.nip || getMeta?.('_billing_nip') || '';
      const resolvedInvoiceReqRaw = (billing.invoiceRequest !== undefined ? billing.invoiceRequest : getMeta?.('_invoice_request'));
      const resolvedInvoiceReq = resolvedInvoiceReqRaw === true || resolvedInvoiceReqRaw === 'yes' || resolvedInvoiceReqRaw === '1';

      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: billing.phone || '',
        company: billing.company || '',
        nip: String(resolvedNip || ''),
        invoiceRequest: resolvedInvoiceReq,
        billingAddress: resolvedBillingAddress,
        billingCity: billing.city || '',
        billingPostcode: billing.postcode || '',
        billingCountry: billing.country || 'PL',
        shippingAddress: resolvedShippingAddress,
        shippingCity: shipping.city || '',
        shippingPostcode: shipping.postcode || '',
        shippingCountry: shipping.country || 'PL'
      });
      setSameAsBilling(
        !resolvedShippingAddress && !shipping.city && !shipping.postcode
      );
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Format input values
  const handleNIPChange = (value: string) => {
    const formatted = formatNIP(value);
    handleInputChange('nip', formatted);
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    handleInputChange('phone', formatted);
  };

  // Validation function
  const validateForm = () => {
    const errors: Record<string, string> = {};

    debugLog('🔍 Validating form data:', formData);

    // Validate required fields
    const firstNameValidation = validateName(formData.firstName, 'Imię');
    if (!firstNameValidation.isValid) {
      errors.firstName = firstNameValidation.message!;
      debugLog('❌ First name validation failed:', firstNameValidation);
    }

    const lastNameValidation = validateName(formData.lastName, 'Nazwisko');
    if (!lastNameValidation.isValid) {
      errors.lastName = lastNameValidation.message!;
      debugLog('❌ Last name validation failed:', lastNameValidation);
    }

    // Validate optional fields
    const nipValidation = validateNIP(formData.nip);
    if (!nipValidation.isValid) {
      errors.nip = nipValidation.message!;
      debugLog('❌ NIP validation failed:', nipValidation);
    }

    const phoneValidation = validatePhone(formData.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.message!;
      debugLog('❌ Phone validation failed:', phoneValidation);
    }

    const companyValidation = validateCompanyName(formData.company);
    if (!companyValidation.isValid) {
      errors.company = companyValidation.message!;
      debugLog('❌ Company validation failed:', companyValidation);
    }

    const billingAddressValidation = validateAddress(formData.billingAddress, 'Adres rozliczeniowy');
    if (!billingAddressValidation.isValid) {
      errors.billingAddress = billingAddressValidation.message!;
      debugLog('❌ Billing address validation failed:', billingAddressValidation);
    }

    const billingPostcodeValidation = validatePostalCode(formData.billingPostcode);
    if (!billingPostcodeValidation.isValid) {
      errors.billingPostcode = billingPostcodeValidation.message!;
      debugLog('❌ Billing postcode validation failed:', billingPostcodeValidation);
    }

    const shippingAddressValidation = validateAddress(formData.shippingAddress, 'Adres dostawy');
    if (!shippingAddressValidation.isValid) {
      errors.shippingAddress = shippingAddressValidation.message!;
      debugLog('❌ Shipping address validation failed:', shippingAddressValidation);
    }

    const shippingPostcodeValidation = validatePostalCode(formData.shippingPostcode);
    if (!shippingPostcodeValidation.isValid) {
      errors.shippingPostcode = shippingPostcodeValidation.message!;
      debugLog('❌ Shipping postcode validation failed:', shippingPostcodeValidation);
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    // Validate form before saving
    if (!validateForm()) {
      debugLog('❌ Form validation failed:', validationErrors);
      // Errors are now displayed under each field, no need for alert
      return;
    }

    try {
      const profileData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        billing: {
          company: formData.company.trim(),
          nip: formData.nip.trim(),
          invoiceRequest: formData.invoiceRequest ? 'yes' : 'no',
          address: formData.billingAddress.trim(),
          city: formData.billingCity.trim(),
          postcode: formData.billingPostcode.trim(),
          country: formData.billingCountry,
          phone: formData.phone.trim()
        },
        shipping: {
          address: formData.shippingAddress.trim(),
          city: formData.shippingCity.trim(),
          postcode: formData.shippingPostcode.trim(),
          country: formData.shippingCountry
        }
      };

      const result = await updateProfile(profileData);
      
      if (result.success) {
        setIsEditing(false);
        setValidationErrors({});
        alert('Profil został zaktualizowany!');
      } else {
        alert(`Błąd: ${result.message}`);
      }
    } catch (error) {
      debugLog('🚨 Error updating profile:', error);
      alert('Wystąpił błąd podczas aktualizacji profilu');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Nowe hasła nie są identyczne');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert('Nowe hasło musi mieć co najmniej 8 znaków');
      return;
    }

    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      if (result.success) {
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        alert('Hasło zostało zmienione!');
      } else {
        alert(`Błąd: ${result.message}`);
      }
    } catch (error) {
      debugLog('🚨 Error changing password:', error);
      alert('Wystąpił błąd podczas zmiany hasła');
    }
  };

  const handleAddToCart = (product: WooProduct) => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      regular_price: parseFloat(product.regular_price),
      sale_price: parseFloat(product.sale_price),
      image: wooCommerceService.getProductImageUrl(product, 'medium'),
      permalink: `/produkt/${product.slug}`,
    };

    addItem(cartItem);
    openCart();
  };

  const handleCancel = () => {
    // Reset form to original user data
    if (user) {
      const meta = (user as any)?.meta_data as Array<{ key: string; value: any }> | undefined;
      const getMeta = (k: string) => meta?.find((m) => m.key === k)?.value;
      const billing = (user as any)?.billing || {};
      const shipping = (user as any)?.shipping || {};
      const resolvedBillingAddress = billing.address || billing.address_1 || '';
      const resolvedShippingAddress = shipping.address || shipping.address_1 || '';
      const resolvedNip = billing.nip || getMeta?.('_billing_nip') || '';
      const resolvedInvoiceReqRaw = (billing.invoiceRequest !== undefined ? billing.invoiceRequest : getMeta?.('_invoice_request'));
      const resolvedInvoiceReq = resolvedInvoiceReqRaw === true || resolvedInvoiceReqRaw === 'yes' || resolvedInvoiceReqRaw === '1';

      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: billing.phone || '',
        company: billing.company || '',
        nip: String(resolvedNip || ''),
        invoiceRequest: resolvedInvoiceReq,
        billingAddress: resolvedBillingAddress,
        billingCity: billing.city || '',
        billingPostcode: billing.postcode || '',
        billingCountry: billing.country || 'PL',
        shippingAddress: resolvedShippingAddress,
        shippingCity: shipping.city || '',
        shippingPostcode: shipping.postcode || '',
        shippingCountry: shipping.country || 'PL'
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
    <div className="min-h-screen bg-white">
      <PageContainer className="pb-12">
        {/* Header */}
        <PageHeader 
          title="Moje konto"
          subtitle="Zarządzaj swoimi danymi i ustawieniami"
          breadcrumbs={[
            { label: 'Strona główna', href: '/' },
            { label: 'Moje konto', href: '/moje-konto' }
          ]}
        />

        {/* Tabs */}
        <div className="mb-8">
          <div className="w-full">
            <div className="grid grid-cols-3 bg-white border border-gray-300 p-1 rounded-[28px] sm:h-[80px] h-auto relative overflow-hidden shadow-sm">
              {/* Animated background indicator with layoutId for smooth transition */}
              <motion.div 
                layoutId="accountActiveTab"
                className="absolute top-1 bottom-1 bg-gradient-to-r from-black to-[#0f1a26] rounded-[22px] shadow-lg"
                style={{
                  left: `calc(${(['profile', 'orders', 'invoices'].indexOf(activeTab) * 100) / 3}% + 2px)`,
                  width: `calc(${100 / 3}% - 6px)`,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
              />
              <button
                onClick={() => setActiveTab('profile')}
                className="relative z-10 flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs sm:text-[17px] font-semibold transition-all duration-300 ease-out border-0 border-transparent rounded-[22px] group"
              >
                <div className={`transition-all duration-300 ${
                  activeTab === 'profile' ? 'scale-110' : 'group-hover:scale-110 group-active:scale-95'
                } ${
                  activeTab === 'profile' ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  <User className="w-5 h-5 sm:w-5 sm:h-5" />
                </div>
                <span className={`text-center leading-tight transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'profile' ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  Moje konto
                </span>
              </button>
              <button
                onClick={() => router.push('/moje-zamowienia')}
                className="relative z-10 flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs sm:text-[17px] font-semibold transition-all duration-300 ease-out border-0 border-transparent rounded-[22px] group"
              >
                <div className={`transition-all duration-300 ${
                  activeTab === 'orders' ? 'scale-110' : 'group-hover:scale-110 group-active:scale-95'
                } ${
                  activeTab === 'orders' ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  <Package className="w-5 h-5 sm:w-5 sm:h-5" />
                </div>
                <span className={`text-center leading-tight transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'orders' ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  Zamówienia
                </span>
              </button>
              <button
                onClick={() => router.push('/moje-faktury')}
                className="relative z-10 flex flex-col items-center justify-center gap-1 px-2 py-3 text-xs sm:text-[17px] font-semibold transition-all duration-300 ease-out border-0 border-transparent rounded-[22px] group"
              >
                <div className={`transition-all duration-300 ${
                  activeTab === 'invoices' ? 'scale-110' : 'group-hover:scale-110 group-active:scale-95'
                } ${
                  activeTab === 'invoices' ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                  <FileText className="w-5 h-5 sm:w-5 sm:h-5" />
                </div>
                <span className={`text-center leading-tight transition-all duration-300 whitespace-nowrap ${
                  activeTab === 'invoices' ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'
                }`}>
                Faktury
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <>
                {/* Personal Information */}
                <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpenSection(prev => ({ ...prev, profile: !prev.profile }))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpenSection(prev => ({ ...prev, profile: !prev.profile })); }}
                className="w-full flex items-center justify-between p-6 cursor-pointer select-none"
                aria-expanded={openSection.profile}
              >
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Dane osobowe
                </h2>
                {!isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edytuj</span>
                  </button>
                )}
              </div>

              <div className={`${openSection.profile ? 'block' : 'hidden'} lg:block px-6 pb-6`}>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nazwa firmy
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? validationErrors.company 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                    placeholder="np. King Brand Sp. z o.o."
                  />
                  {validationErrors.company && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationErrors.company}
                    </div>
                  )}
                </div>
                {/* NIP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NIP
                  </label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={(e) => handleNIPChange(e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? validationErrors.nip 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                    placeholder="123-456-78-90"
                  />
                  {validationErrors.nip && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationErrors.nip}
                    </div>
                  )}
                </div>
                {/* Invoice Request */}
                <div className="sm:col-span-2">
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formData.invoiceRequest}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoiceRequest: e.target.checked }))}
                      disabled={!isEditing}
                      className="w-4 h-4"
                    />
                    <span>Chcę faktury (na firmę)</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Imię <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? validationErrors.firstName 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                    placeholder="np. Jan"
                  />
                  {validationErrors.firstName && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationErrors.firstName}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nazwisko <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? validationErrors.lastName 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                    placeholder="np. Kowalski"
                  />
                  {validationErrors.lastName && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationErrors.lastName}
                    </div>
                  )}
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
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    disabled={!isEditing}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? validationErrors.phone 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                    placeholder="+48 123 456 789"
                  />
                  {validationErrors.phone && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationErrors.phone}
                    </div>
                  )}
                </div>
              </div>
              </div>

              {isEditing && (
                <div className={`${openSection.profile ? 'flex' : 'hidden'} lg:flex gap-3 px-6 pb-6`}
                >
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
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpenSection(prev => ({ ...prev, billing: !prev.billing }))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpenSection(prev => ({ ...prev, billing: !prev.billing })); }}
                className="w-full flex items-center justify-between p-6 cursor-pointer select-none"
                aria-expanded={openSection.billing}
              >
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Adres rozliczeniowy
                </h2>
                {!isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); setOpenSection(prev => ({ ...prev, billing: true })); }}
                    className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edytuj</span>
                  </button>
                )}
              </div>

              <div className={`${openSection.billing ? 'block' : 'hidden'} lg:block px-6 pb-6`}>
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
                        ? validationErrors.billingAddress 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                  {validationErrors.billingAddress && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationErrors.billingAddress}
                    </div>
                  )}
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
                        ? validationErrors.billingPostcode 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                  {validationErrors.billingPostcode && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationErrors.billingPostcode}
                    </div>
                  )}
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
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpenSection(prev => ({ ...prev, shipping: !prev.shipping }))}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setOpenSection(prev => ({ ...prev, shipping: !prev.shipping })); }}
                className="w-full flex items-center justify-between p-6 cursor-pointer select-none"
                aria-expanded={openSection.shipping}
              >
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Truck className="w-5 h-5 mr-2" />
                  Adres dostawy
                </h2>
                {isEditing && (
                  <label className="flex items-center space-x-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSameAsBilling(checked);
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            shippingAddress: prev.billingAddress,
                            shippingCity: prev.billingCity,
                            shippingPostcode: prev.billingPostcode,
                            shippingCountry: prev.billingCountry
                          }));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span>Adres dostawy taki sam jak rozliczeniowy</span>
                  </label>
                )}
                {!isEditing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); setOpenSection(prev => ({ ...prev, shipping: true })); }}
                    className="flex items-center space-x-2 text-gray-600 hover:text-black transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edytuj</span>
                  </button>
                )}
              </div>

              <div className={`${openSection.shipping ? 'block' : 'hidden'} lg:block px-6 pb-6`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Adres
                  </label>
                  <input
                    type="text"
                    value={formData.shippingAddress}
                    onChange={(e) => handleInputChange('shippingAddress', e.target.value)}
                    disabled={!isEditing || sameAsBilling}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? validationErrors.shippingAddress 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                  {validationErrors.shippingAddress && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationErrors.shippingAddress}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Miasto
                  </label>
                  <input
                    type="text"
                    value={formData.shippingCity}
                    onChange={(e) => handleInputChange('shippingCity', e.target.value)}
                    disabled={!isEditing || sameAsBilling}
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
                    disabled={!isEditing || sameAsBilling}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                      isEditing 
                        ? validationErrors.shippingPostcode 
                          ? 'border-red-500' 
                          : 'border-gray-300'
                        : 'border-gray-200 bg-gray-50 text-gray-600'
                    }`}
                  />
                  {validationErrors.shippingPostcode && (
                    <div className="flex items-center mt-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationErrors.shippingPostcode}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kraj
                  </label>
                  <select
                    value={formData.shippingCountry}
                    onChange={(e) => handleInputChange('shippingCountry', e.target.value)}
                    disabled={!isEditing || sameAsBilling}
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
              </div>
            </motion.div>
              </>
            )}


            </AnimatePresence>
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
                    className="flex items-center gap-2 w-full text-left px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    <span>Moje zamówienia</span>
                  </Link>
                  <Link
                    href="/koszyk"
                    className="flex items-center gap-2 w-full text-left px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Koszyk</span>
                  </Link>
                  <Link
                    href="/moje-faktury"
                    className="flex items-center gap-2 w-full text-left px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Moje faktury</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 w-full text-left px-4 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Wyloguj się</span>
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
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="text-sm text-black font-medium hover:underline transition-colors"
                >
                  Zmień hasło
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Password Change Modal */}
      {showPasswordModal && (
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
            onClick={() => setShowPasswordModal(false)}
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
              <h2 className="text-2xl font-bold text-gray-900">Zmień hasło</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aktualne hasło
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nowe hasło
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Potwierdź nowe hasło
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anuluj
                </button>
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Zmień hasło
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
