'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { 
  CreditCard, 
  User, 
  Lock,
  CheckCircle,
  ArrowLeft,
  Shield,
  ChevronRight
} from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import { useCartStore } from '@/stores/cart-store';
import { formatPrice, formatPriceWithVAT } from '@/utils/format-price';
import { SHIPPING_CONFIG, ENV } from '@/config/constants';
import Link from 'next/link';
import { PaymentMethod } from '@/services/mock-payment';
import wooCommerceService from '@/services/woocommerce-optimized';
import { useAuthStore } from '@/stores/auth-store';
import RegisterModal from '@/components/ui/auth/register-modal';
import { validateEmail, validatePhone, validatePostalCode, validateName, validateAddress } from '@/utils/validation';
import { Button } from '@/components/ui/button';
import { executeRecaptcha, verifyRecaptchaToken } from '@/utils/recaptcha';

interface CheckoutForm {
  // Billing Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  nip: string;
  invoiceRequest: boolean;
  
  // Billing Address
  billingAddress: string;
  billingCity: string;
  billingPostcode: string;
  billingCountry: string;
  
  // Shipping Information
  shippingSameAsBilling: boolean;
  shippingFirstName: string;
  shippingLastName: string;
  shippingCompany: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostcode: string;
  shippingCountry: string;
  
  // Payment
  paymentMethod: 'google_pay' | 'apple_pay' | 'card' | 'transfer' | 'cash';
  
  // Shipping
  shippingMethod: string;
  
  // Terms
  acceptTerms: boolean;
  acceptNewsletter: boolean;
}

function CheckoutPageInner() {
  const { items, total, clearCart } = useCartStore();
  
  // Debug total value
  // Checkout total debug removed
  const searchParams = useSearchParams();
  const { user, isAuthenticated, fetchUserProfile } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  
  const [form, setForm] = useState<CheckoutForm>({
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
    shippingSameAsBilling: true,
    shippingFirstName: '',
    shippingLastName: '',
    shippingCompany: '',
    shippingAddress: '',
    shippingCity: '',
    shippingPostcode: '',
    shippingCountry: 'PL',
    paymentMethod: 'google_pay',
    shippingMethod: '',
    acceptTerms: false,
    acceptNewsletter: false
  });

  // Payment state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cardDetails, _setCardDetails] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: ''
  });
  const [_paymentError, setPaymentError] = useState<string | null>(null);
  const [_isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [quickPaymentSelected, setQuickPaymentSelected] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [hasNewUserDiscount, setHasNewUserDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
  } | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  
  // Helper functions
  const getPaymentMethodTitle = (method: string) => {
    const titles: Record<string, string> = {
      'google_pay': 'Google Pay',
      'apple_pay': 'Apple Pay',
      'card': 'Karta płatnicza',
      'transfer': 'Przelew bankowy',
      'cash': 'Płatność przy odbiorze'
    };
    return titles[method] || method;
  };

  const getShippingMethodTitle = (method: string) => {
    const titles: Record<string, string> = {
      'free_shipping': 'Darmowa dostawa',
      'flat_rate': 'Dostawa standardowa',
      'local_pickup': 'Odbiór osobisty'
    };
    return titles[method] || method;
  };

  // removed unused helper getSelectedShippingMethod
  
  // Shipping state
  const [shippingMethods, setShippingMethods] = useState<Array<{
    id: string;
    method_id: string;
    method_title: string;
    method_description: string;
    cost: number;
    free_shipping_threshold: number;
    zone_id: string;
    zone_name: string;
  }>>([]);
  const [, setShippingCost] = useState(0);
  const [_isLoadingShipping, setIsLoadingShipping] = useState(false);

  // Load shipping methods
  const loadShippingMethods = useCallback(async () => {
    // Loading shipping methods debug removed
    setIsLoadingShipping(true);
    try {
      const methods = await wooCommerceService.getShippingMethods(
        form.shippingCountry,
        '', // state
        form.shippingCity,
        form.shippingPostcode
      );
      console.log('🚚 Shipping methods response:', methods);
      // Shipping methods loaded debug removed
      if (methods && methods.success && methods.methods) {
        console.log('✅ Shipping methods loaded:', methods.methods);
        setShippingMethods(methods.methods);
      } else if (Array.isArray(methods)) {
        console.log('✅ Shipping methods loaded (array):', methods);
        setShippingMethods(methods);
      } else {
        console.warn('⚠️ No shipping methods found');
        setShippingMethods([]);
      }
      
      // Auto-select first shipping method for quick payment
      const methodsArray = methods && methods.methods ? methods.methods : (Array.isArray(methods) ? methods : []);
      // Available shipping methods debug removed
      
      // Auto-select first shipping method if available and no method is selected
      if (methodsArray.length > 0 && !form.shippingMethod) {
        const firstMethod = methodsArray[0];
        setForm(prev => ({ ...prev, shippingMethod: firstMethod.method_id }));
        // Auto-selected first shipping method debug removed
      }
    } catch (error) {
      console.error('Error loading shipping methods:', error);
    } finally {
      setIsLoadingShipping(false);
    }
  }, [form.shippingCountry, form.shippingCity, form.shippingPostcode, form.shippingMethod]);

  // Load payment methods and handle URL params
  useEffect(() => {
    // Load real payment gateways from WooCommerce
    (async () => {
      const res = await wooCommerceService.getPaymentGateways();
      if (res.success && res.gateways) {
        const mapped: PaymentMethod[] = res.gateways
          .filter(g => g.enabled)
          .map(g => ({ 
            id: g.id as any, 
            name: g.title, 
            description: g.description || '',
            icon: g.id === 'cod' ? 'truck' : 'credit-card',
            processingTime: g.id === 'cod' ? 0 : 3000,
            successRate: 0.95
          }));
        setPaymentMethods(mapped);
      }
    })();
    
    // Handle payment method from URL
    const paymentMethod = searchParams.get('payment');
    if (paymentMethod && ['google_pay', 'apple_pay', 'card', 'transfer', 'cash', 'cod', 'bacs'].includes(paymentMethod)) {
      setForm(prev => ({ ...prev, paymentMethod: paymentMethod as 'google_pay' | 'apple_pay' | 'card' | 'transfer' | 'cash' }));
      setQuickPaymentSelected(['google_pay', 'apple_pay'].includes(paymentMethod));
      
      // TRUE QUICK PAYMENT - skip to payment step and use defaults
      if (['google_pay', 'apple_pay'].includes(paymentMethod)) {
        setCurrentStep(2); // Go to shipping and payment step
        
        // Set user data for quick payment (or defaults if not logged in)
        const u: any = user;
        const billing = u?.billing || {};
        
        setForm(prev => ({
          ...prev,
          // Use real user data or defaults
          firstName: prev.firstName || u?.firstName || u?.first_name || billing.first_name || '',
          lastName: prev.lastName || u?.lastName || u?.last_name || billing.last_name || '',
          email: prev.email || u?.email || billing.email || '',
          phone: prev.phone || billing.phone || '',
          billingAddress: prev.billingAddress || billing.address || billing.address_1 || '',
          billingCity: prev.billingCity || billing.city || '',
          billingPostcode: prev.billingPostcode || billing.postcode || '',
          billingCountry: billing.country || 'PL',
          
          // Default shipping (same as billing)
          shippingSameAsBilling: true,
          shippingFirstName: prev.firstName || u?.firstName || u?.first_name || billing.first_name || '',
          shippingLastName: prev.lastName || u?.lastName || u?.last_name || billing.last_name || '',
          shippingAddress: prev.billingAddress || billing.address || billing.address_1 || '',
          shippingCity: prev.billingCity || billing.city || '',
          shippingPostcode: prev.billingPostcode || billing.postcode || '',
          shippingCountry: billing.country || 'PL',
          
          // Accept terms for quick payment
          acceptTerms: true,
        }));
        
        // Load shipping methods for quick payment
        setTimeout(() => {
          loadShippingMethods();
        }, 100);
      }
    }
  }, [searchParams, loadShippingMethods, user]);

  // Fetch user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if billing data is empty or missing key fields
      const hasEmptyBilling = !user.billing || 
        !user.billing.address || 
        !user.billing.city || 
        !user.billing.phone ||
        Object.values(user.billing).every(value => !value || value === 'PL');
      
      // Checkout: Checking billing data debug removed
      
      if (hasEmptyBilling) {
        // Checkout: User data incomplete debug removed
        fetchUserProfile();
      }
    }
  }, [isAuthenticated, user, fetchUserProfile]);

  // Prefill from authenticated user profile
  useEffect(() => {
    // Checkout useEffect - auth check debug removed
    
    // Add small delay to ensure auth store is fully loaded
    const timer = setTimeout(() => {
      if (!isAuthenticated || !user) return;
    const u: any = user;
    const billing = u.billing || {};
    const shipping = u.shipping || {};
      // Auto-filling form with user data debug removed

    setForm(prev => ({
      ...prev,
      firstName: prev.firstName || u.firstName || u.first_name || billing.first_name || '',
      lastName: prev.lastName || u.lastName || u.last_name || billing.last_name || '',
      email: prev.email || u.email || billing.email || '',
      phone: prev.phone || u.phone || billing.phone || '',
      company: prev.company || billing.company || '',
      nip: prev.nip || u.nip || u._billing_nip || billing.nip || '',
      // Auto-check invoice request if user has _invoice_request = 'yes' OR has NIP
      // Priority: preserve existing value if set > billing.invoiceRequest > has NIP
      invoiceRequest: prev.invoiceRequest || billing.invoiceRequest === true || billing.invoiceRequest === 'yes' || Boolean(u.nip || u._billing_nip || billing.nip || prev.nip),
      billingAddress: prev.billingAddress || billing.address || billing.address_1 || '',
      billingCity: prev.billingCity || billing.city || '',
      billingPostcode: prev.billingPostcode || billing.postcode || '',
      billingCountry: prev.billingCountry || billing.country || 'PL',
      shippingFirstName: prev.shippingFirstName || shipping.first_name || u.firstName || u.first_name || '',
      shippingLastName: prev.shippingLastName || shipping.last_name || u.lastName || u.last_name || '',
      shippingCompany: prev.shippingCompany || shipping.company || billing.company || '',
      shippingAddress: prev.shippingAddress || shipping.address || shipping.address_1 || billing.address || billing.address_1 || '',
      shippingCity: prev.shippingCity || shipping.city || billing.city || '',
      shippingPostcode: prev.shippingPostcode || shipping.postcode || billing.postcode || '',
      shippingCountry: prev.shippingCountry || shipping.country || billing.country || 'PL'
    }));
    }, 100); // 100ms delay
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, user]);

  // Auto-fill form after successful registration
  const handleRegistrationSuccess = (userData: any) => {
        // Registration successful debug removed
    setForm(prev => ({
      ...prev,
      firstName: userData.first_name || userData.firstName || prev.firstName,
      lastName: userData.last_name || userData.lastName || prev.lastName,
      email: userData.email || prev.email,
      phone: userData.phone || prev.phone,
      company: userData.company || prev.company,
      nip: userData.nip || userData._billing_nip || prev.nip,
      invoiceRequest: Boolean(userData.nip || userData._billing_nip) || prev.invoiceRequest,
      // Auto-fill shipping with billing data
      shippingFirstName: userData.first_name || userData.firstName || prev.shippingFirstName,
      shippingLastName: userData.last_name || userData.lastName || prev.shippingLastName,
      shippingCompany: userData.company || prev.shippingCompany,
      shippingAddress: userData.address || userData.address_1 || prev.shippingAddress,
      shippingCity: userData.city || prev.shippingCity,
      shippingPostcode: userData.postcode || prev.shippingPostcode,
    }));
    
    // Close modal and show success message
    setShowRegisterModal(false);
    
    // Activate new user discount
    setHasNewUserDiscount(true);
    
    // Show success toast notification with discount info
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 5000); // Longer timeout for discount info
  };

  // Apply discount code
  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    
    setDiscountLoading(true);
    try {
      const response = await fetch(`/api/woocommerce?endpoint=coupons&code=${encodeURIComponent(discountCode)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success && result.coupon) {
        const coupon = result.coupon;
        
        // Check minimum amount if specified - compare netto with netto
        const nettoTotal = total / 1.23; // Convert total (with VAT) to netto
        // Debug discount validation removed
        
        if (coupon.minimum_amount && nettoTotal < coupon.minimum_amount) {
          alert(`❌ Minimalna wartość zamówienia dla tego kodu to ${formatPrice(coupon.minimum_amount)} (netto)`);
          return;
        }
        
        setAppliedDiscount({
          code: coupon.code,
          type: coupon.discount_type === 'percent' ? 'percentage' : 'fixed',
          value: coupon.amount
        });
        setDiscountCode(''); // Clear input
      } else {
        // Better error messages
        let errorMessage = 'Nieprawidłowy kod rabatowy';
        if (result.error) {
          if (result.error.includes('wygasł')) {
            errorMessage = 'Kod rabatowy wygasł';
          } else if (result.error.includes('wykorzystany')) {
            errorMessage = 'Kod rabatowy został już wykorzystany';
          } else if (result.error.includes('minimalna')) {
            errorMessage = result.error;
          } else {
            errorMessage = result.error;
          }
        }
        alert(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error applying discount:', error);
      alert('❌ Wystąpił błąd podczas aplikowania kodu rabatowego');
    } finally {
      setDiscountLoading(false);
    }
  };

  // Remove applied discount
  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
  };

  // Load shipping methods when address changes
  useEffect(() => {
    if (form.shippingCountry && form.shippingCity) {
      loadShippingMethods();
    }
  }, [form.shippingCountry, form.shippingCity, form.shippingPostcode, loadShippingMethods]);

  // Load shipping methods when user reaches step 2
  useEffect(() => {
    if (currentStep >= 2) {
      loadShippingMethods();
    }
  }, [currentStep, loadShippingMethods]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !orderComplete) {
      window.location.href = '/koszyk';
    }
  }, [items, orderComplete]);

  const handleInputChange = (field: keyof CheckoutForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Auto-fill shipping if same as billing
    if (field === 'shippingSameAsBilling' && value === true) {
      setForm(prev => ({
        ...prev,
        shippingFirstName: prev.firstName,
        shippingLastName: prev.lastName,
        shippingCompany: prev.company,
        shippingAddress: prev.billingAddress,
        shippingCity: prev.billingCity,
        shippingPostcode: prev.billingPostcode,
        shippingCountry: prev.billingCountry
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate first name
    const firstNameValidation = validateName(form.firstName, 'Imię');
    if (!firstNameValidation.isValid) {
      errors.firstName = firstNameValidation.message || 'Nieprawidłowe imię';
    }
    
    // Validate last name
    const lastNameValidation = validateName(form.lastName, 'Nazwisko');
    if (!lastNameValidation.isValid) {
      errors.lastName = lastNameValidation.message || 'Nieprawidłowe nazwisko';
    }
    
    // Validate email
    const emailValidation = validateEmail(form.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message || 'Nieprawidłowy email';
    }
    
    // Validate phone
    const phoneValidation = validatePhone(form.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.message || 'Nieprawidłowy numer telefonu';
    }
    
    // Validate billing address
    const addressValidation = validateAddress(form.billingAddress, 'Adres');
    if (!addressValidation.isValid) {
      errors.billingAddress = addressValidation.message || 'Nieprawidłowy adres';
    }
    
    // Validate city
    if (!form.billingCity || form.billingCity.trim().length < 2) {
      errors.billingCity = 'Miasto musi mieć co najmniej 2 znaki';
    }
    
    // Validate postal code
    const postalCodeValidation = validatePostalCode(form.billingPostcode);
    if (!postalCodeValidation.isValid) {
      errors.billingPostcode = postalCodeValidation.message || 'Nieprawidłowy kod pocztowy';
    }
    
    setFieldErrors(errors);
    
    // Debug: show errors
    if (Object.keys(errors).length > 0) {
      // Validation errors debug removed
      // Show first error to user
      const firstError = Object.values(errors)[0];
      alert(`❌ ${firstError}`);
    }
    
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // FIX: reCAPTCHA verification
    if (ENV.RECAPTCHA_ENABLED) {
      try {
        const recaptchaToken = await executeRecaptcha('checkout');
        if (recaptchaToken) {
          const isValid = await verifyRecaptchaToken(recaptchaToken);
          if (!isValid) {
            alert('❌ Weryfikacja bezpieczeństwa nie powiodła się. Spróbuj ponownie.');
            return;
          }
        }
      } catch (error) {
        console.error('reCAPTCHA error:', error);
        // Continue if reCAPTCHA fails (graceful degradation)
      }
    }

    // Validate card details if card payment
    if (form.paymentMethod === 'card') {
      if (!cardDetails.cardNumber || !cardDetails.expiryMonth || !cardDetails.expiryYear || !cardDetails.cvv || !cardDetails.cardholderName) {
        setPaymentError('Proszę wypełnić wszystkie dane karty.');
        return;
      }
    }

    // For Google Pay and Apple Pay, show special processing message
    if (['google_pay', 'apple_pay'].includes(form.paymentMethod)) {
      setPaymentError(null);
      setIsProcessingPayment(true);
    }

    setLoading(true);
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      // Create order in WooCommerce
      const orderData = {
        billing: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          company: form.company,
          address: form.billingAddress,
          city: form.billingCity,
          postcode: form.billingPostcode,
          country: form.billingCountry
        },
        shipping: form.shippingSameAsBilling ? null : {
          firstName: form.shippingFirstName,
          lastName: form.shippingLastName,
          company: form.shippingCompany,
          address: form.shippingAddress,
          city: form.shippingCity,
          postcode: form.shippingPostcode,
          country: form.shippingCountry
        },
        line_items: items.map(item => {
          const lineItem: any = {
            product_id: item.id,
            quantity: item.quantity,
            meta_data: item.variant ? [
              { key: 'Wybrany wariant', value: item.variant.name || `Wariant ${item.variant.id}` }
            ] : []
          };
          // Only include variation_id if variant exists and has an ID
          if (item.variant?.id) {
            lineItem.variation_id = item.variant.id;
          }
          return lineItem;
        }),
        payment_method: form.paymentMethod,
        payment_method_title: getPaymentMethodTitle(form.paymentMethod),
        shipping_lines: [{
          method_id: form.shippingMethod,
          method_title: getShippingMethodTitle(form.shippingMethod),
          total: finalShippingCost.toFixed(2)
        }],
        customer_id: user?.id, // Dodaj customer_id dla zalogowanych użytkowników
        coupon_lines: appliedDiscount ? [
          { code: appliedDiscount.code }
        ] : [],
        meta_data: [
          { key: '_billing_nip', value: form.nip },
          { key: '_invoice_request', value: form.invoiceRequest ? 'yes' : 'no' }
        ]
      };

      const orderResponse = await fetch('/api/woocommerce?endpoint=orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      // Check if response is ok
      if (!orderResponse.ok) {
        let errorText = '';
        let errorData: any = {};
        
        try {
          // Try to get response as text first
          errorText = await orderResponse.clone().text();
          console.log('🔍 Raw error response:', errorText);
          
          // Try to parse as JSON
          if (errorText) {
            try {
              errorData = JSON.parse(errorText);
            } catch {
              // If not JSON, use text as error message
              errorData = { error: errorText };
            }
          }
        } catch (e) {
          console.error('❌ Failed to read error response:', e);
          errorData = { error: `HTTP ${orderResponse.status}: Nie udało się odczytać odpowiedzi serwera` };
        }
        
        // Extract error message from different possible formats
        // Handle AppError format: { error: { message: "...", details: [...] } }
        let errorMessage = null;
        
        if (errorData.error) {
          // AppError format
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (typeof errorData.error === 'object') {
            errorMessage = errorData.error.message;
            
            // If there are validation details, format them
            if (errorData.error.details && Array.isArray(errorData.error.details)) {
              const validationMessages = errorData.error.details
                .map((d: any) => {
                  if (typeof d === 'string') return d;
                  if (d.message) return d.message;
                  if (d.path) return `${d.path.join('.')}: ${d.message || 'Invalid'}`;
                  return JSON.stringify(d);
                })
                .filter(Boolean)
                .join(', ');
              if (validationMessages) {
                errorMessage = `${errorMessage}: ${validationMessages}`;
              }
            }
          }
        }
        
        // Fallback to other formats
        if (!errorMessage) {
          errorMessage = 
            errorData.message || 
            errorData.details ||
            (errorData.errors && Array.isArray(errorData.errors) ? errorData.errors.map((e: any) => e.message || e).join(', ') : null) ||
            (typeof errorText === 'string' && errorText.trim() ? errorText : null) ||
            `HTTP ${orderResponse.status}: Nie udało się utworzyć zamówienia`;
        }
        
        console.error('❌ Order creation HTTP error:', {
          status: orderResponse.status,
          statusText: orderResponse.statusText,
          errorData,
          errorText,
          errorMessage
        });
        
        throw new Error(errorMessage);
      }

      const orderResult = await orderResponse.json();
      console.log('📦 Order creation response:', orderResult);
      
      // Handle different response formats
      if (!orderResult || (typeof orderResult === 'object' && Object.keys(orderResult).length === 0)) {
        console.error('❌ Empty order result');
        throw new Error('Nie udało się utworzyć zamówienia - pusta odpowiedź z serwera');
      }

      if (!orderResult.success) {
        // Format error message - handle both string and object errors
        let errorMessage = 'Nie udało się utworzyć zamówienia';
        if (orderResult.error) {
          if (typeof orderResult.error === 'string') {
            errorMessage = orderResult.error;
          } else if (typeof orderResult.error === 'object') {
            errorMessage = orderResult.error.message || orderResult.error.error || JSON.stringify(orderResult.error);
          }
        } else if (orderResult.message) {
          errorMessage = orderResult.message;
        }
        console.error('❌ Order creation failed:', orderResult);
        throw new Error(errorMessage);
      }

      // Ensure order object exists
      if (!orderResult.order) {
        console.error('❌ Order object missing in response:', orderResult);
        throw new Error('Nie udało się utworzyć zamówienia - brak danych zamówienia');
      }

      const newOrderNumber = orderResult.order.number;
      setOrderNumber(newOrderNumber);
      
      // Automatically save billing data to user profile if logged in
      if (isAuthenticated && user?.id) {
        try {
          const profileResponse = await fetch('/api/woocommerce?endpoint=customer/update-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer_id: user.id,
              profile_data: {
                firstName: form.firstName,
                lastName: form.lastName,
                billing: {
                  company: form.company,
                  nip: form.nip,
                  invoiceRequest: form.invoiceRequest,
                  address: form.billingAddress,
                  city: form.billingCity,
                  postcode: form.billingPostcode,
                  country: form.billingCountry,
                  phone: form.phone
                },
                shipping: form.shippingSameAsBilling ? null : {
                  address: form.shippingAddress,
                  city: form.shippingCity,
                  postcode: form.shippingPostcode,
                  country: form.shippingCountry
                }
              }
            }),
          });
          
          if (!profileResponse.ok) {
            const errorData = await profileResponse.json().catch(() => ({}));
            console.warn('⚠️ Failed to update user profile:', errorData);
          } else {
            console.log('✅ User profile updated successfully');
          }
        } catch (error) {
          console.error('⚠️ Failed to update user profile:', error);
          // Don't fail the checkout if profile update fails
        }
      }
      
      // Send order confirmation email
      try {
        const _orderEmailData = {
          orderNumber: newOrderNumber,
          customerName: `${form.firstName} ${form.lastName}`,
          customerEmail: form.email,
          orderDate: new Date().toLocaleDateString('pl-PL'),
          total: finalTotal,
          items: items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.sale_price || item.price,
            total: (item.sale_price || item.price) * item.quantity
          })),
          billingAddress: {
            address: form.billingAddress,
            city: form.billingCity,
            postcode: form.billingPostcode,
            country: form.billingCountry
          },
          shippingAddress: {
            address: form.shippingSameAsBilling ? form.billingAddress : form.shippingAddress,
            city: form.shippingSameAsBilling ? form.billingCity : form.shippingCity,
            postcode: form.shippingSameAsBilling ? form.billingPostcode : form.shippingPostcode,
            country: form.shippingSameAsBilling ? form.billingCountry : form.shippingCountry
          },
          paymentMethod: form.paymentMethod
        };

        // WYŚLIJ EMAIL BEZPOŚREDNIO
        try {
          // Wysyłam email bezpośrednio debug removed
          
          const orderId = orderResult.order.id;
          if (!orderId) {
            // Brak ID zamówienia debug removed
            return;
          }
          
          const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'order_confirmation',
              order_id: orderId,
              customer_email: form.email,
              customer_name: `${form.firstName} ${form.lastName}`,
              order_number: String(orderId),
              total: finalTotal,
              items: items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.sale_price || item.price
              }))
            }),
          });
          
          if (emailResponse.ok) {
            // Email wysłany pomyślnie debug removed
          } else {
            const _errorText = await emailResponse.text();
            // Błąd wysyłania emaila debug removed
          }
        } catch (error) {
          console.error('❌ Błąd email:', error);
        }
      } catch (error) {
        console.error('❌ Błąd email service:', error);
      }
      
      // Clear cart, discount, and show success
      clearCart();
      setAppliedDiscount(null);
      setDiscountCode('');
      setOrderComplete(true);
      setCurrentStep(4);
      
      // Refresh user profile to sync invoice fields (NIP, invoiceRequest) after order creation
      // This ensures that if user checked "Chcę fakturę" in checkout, it's saved to user meta
      if (isAuthenticated && user && fetchUserProfile) {
        try {
          await fetchUserProfile();
          console.log('✅ User profile refreshed after order creation');
        } catch (profileError) {
          console.warn('⚠️ Failed to refresh user profile after order creation:', profileError);
          // Don't fail order completion if profile refresh fails
        }
      }
      
    } catch (error) {
      console.error('Error processing order:', error);
      setPaymentError(error instanceof Error ? error.message : 'Wystąpił błąd podczas przetwarzania zamówienia. Spróbuj ponownie.');
    } finally {
      setLoading(false);
      setIsProcessingPayment(false);
    }
  };

  // Calculate shipping cost based on selected method and cart total
  const calculateShippingCost = () => {
    const selectedMethod = shippingMethods.find(m => m.method_id === form.shippingMethod);
    if (!selectedMethod) return 0;
    
    // Calculating shipping cost debug removed
    
    // Check for free shipping conditions
    if (selectedMethod.free_shipping_threshold > 0) {
      // Convert total (with VAT) to netto for comparison with threshold
      const nettoTotal = total / 1.23;
      const shippingCost = nettoTotal >= selectedMethod.free_shipping_threshold ? 0 : selectedMethod.cost * 1.23;
      // Shipping cost with free shipping check debug removed
      return shippingCost;
    }
    
    const shippingCost = selectedMethod.cost * 1.23; // Add VAT to netto cost
    // Shipping cost (regular) debug removed
    return shippingCost;
  };
  
  const finalShippingCost = calculateShippingCost();
  
  // Calculate discount for new users (10% off first order)
  const newUserDiscountAmount = hasNewUserDiscount ? Math.floor(total * 0.1) : 0;
  
  // Calculate applied discount
  const appliedDiscountAmount = appliedDiscount 
    ? appliedDiscount.type === 'percentage' 
      ? Math.floor(total * (appliedDiscount.value / 100))
      : appliedDiscount.value // Already in PLN
    : 0;
  
  // Total discount (new user + applied code)
  const totalDiscountAmount = newUserDiscountAmount + appliedDiscountAmount;
  const subtotal = total - totalDiscountAmount;
  
  const finalTotal = subtotal + (form.shippingMethod ? finalShippingCost : 0);

  if (orderComplete) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-8 pb-16">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow-lg p-8"
          >
            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Dziękujemy za zamówienie!
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              Twoje zamówienie zostało złożone pomyślnie.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">Numer zamówienia:</p>
              <p className="text-lg font-bold text-gray-900">{orderNumber}</p>
            </div>
            <p className="text-gray-600 mb-8">
              Potwierdzenie zostało wysłane na adres email: <strong>{form.email}</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href="/">
                  Wróć do sklepu
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/moje-zamowienia">
                  Moje zamówienia
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PageContainer className="pb-12">
        
        {/* Quick Payment Banner */}
        {quickPaymentSelected && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg"
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  {form.paymentMethod === 'google_pay' ? (
                    <svg viewBox="0 0 24 24" className="w-6 h-6">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-6 h-6">
                      <path fill="#000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-blue-900">
                  Szybka płatność: {form.paymentMethod === 'google_pay' ? 'Google Pay' : 'Apple Pay'}
                </h3>
              </div>
              <p className="text-sm text-blue-700">
                Pominięto kroki wypełniania danych! Użyto domyślnych wartości. Możesz je zmienić lub od razu zapłacić.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  ✏️ Edytuj dane
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  🚚 Zmień dostawę
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {/* Header */}
        <PageHeader 
          title="Finalizacja zamówienia"
          breadcrumbs={[
            { label: 'Strona główna', href: '/' },
            { label: 'Koszyk', href: '/koszyk' },
            { label: 'Kasa', href: '/checkout' }
          ]}
        />
        
        <div className="mb-6">
          <Link
            href="/koszyk"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Wróć do koszyka
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center">
                  {[
                    { number: 1, label: 'Dane osobowe', icon: User },
                    { number: 2, label: 'Dostawa i Płatność', icon: CreditCard }
                  ].map((step, index) => (
                    <div key={step.number} className="flex items-center">
                      <div className="flex items-center">
                        <div className="flex items-center justify-center">
                          {currentStep > step.number ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          ) : (
                            <step.icon className={`w-6 h-6 ${
                              currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'
                            }`} />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className={`text-lg font-semibold ${
                            currentStep >= step.number ? 'text-gray-900' : 'text-gray-900'
                          }`}>
                            {step.label}
                          </div>
                        </div>
                      </div>
                      {index < 1 && (
                        <div className="ml-8 mr-4">
                          <div className="h-0.5 w-12 bg-gray-300" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="mb-6">
                      {/* Guest Benefits Section */}
                      {!isAuthenticated && (
                        <div className="space-y-4 mb-6">
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">%</span>
                                </div>
                                <h3 className="text-lg font-semibold text-green-900">
                                  Oszczędź 10% na pierwszym zamówieniu!
                                </h3>
                              </div>
                              <p className="text-sm text-green-700 mb-3">
                                Załóż konto i otrzymaj rabat 10% na pierwsze zakupy. 
                                Dodatkowo będziesz mógł śledzić zamówienia i szybciej robić zakupy w przyszłości.
                              </p>
                              <div className="flex items-center space-x-4">
                                <button
                                  type="button"
                                  onClick={() => setShowRegisterModal(true)}
                                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                >
                                  <User className="w-4 h-4 mr-2" />
                                  Załóż konto za darmo
                                </button>
                                <div className="text-xs text-green-600">
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Rabat 10%</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Śledzenie zamówień</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Logged in user info */}
                      {isAuthenticated && user && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-blue-900">
                                Zalogowany jako {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-blue-600">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Billing minimal required fields */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Adres rozliczeniowy *</label>
                        <input
                          type="text"
                          value={form.billingAddress}
                          onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                        />
                        {fieldErrors.billingAddress && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.billingAddress}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Miasto *</label>
                          <input
                            type="text"
                            value={form.billingCity}
                            onChange={(e) => handleInputChange('billingCity', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                            required
                          />
                          {fieldErrors.billingCity && (
                            <p className="text-xs text-red-600 mt-1">{fieldErrors.billingCity}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Kod pocztowy *</label>
                          <input
                            type="text"
                            value={form.billingPostcode}
                            onChange={(e) => handleInputChange('billingPostcode', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                            required
                          />
                          {fieldErrors.billingPostcode && (
                            <p className="text-xs text-red-600 mt-1">{fieldErrors.billingPostcode}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Imię *
                        </label>
                        <input
                          type="text"
                          value={form.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                        />
                        {fieldErrors.firstName && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.firstName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nazwisko *
                        </label>
                        <input
                          type="text"
                          value={form.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                        />
                        {fieldErrors.lastName && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                        />
                        {fieldErrors.email && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Telefon *
                        </label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          required
                        />
                        {fieldErrors.phone && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Firma (opcjonalnie)
                      </label>
                      <input
                        type="text"
                        value={form.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          NIP (dla faktury)
                        </label>
                        <input
                          type="text"
                          value={form.nip}
                          onChange={(e) => handleInputChange('nip', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          placeholder="1234567890"
                          maxLength={10}
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.invoiceRequest}
                            onChange={(e) => handleInputChange('invoiceRequest', e.target.checked)}
                            className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                          />
                          <span className="text-sm text-gray-700">
                            Chcę otrzymać fakturę VAT
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Shipping Address Section */}
                    <div className="border-t pt-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">
                        Adres dostawy
                      </h2>

                      <div className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          id="sameAsBilling"
                          checked={form.shippingSameAsBilling}
                          onChange={(e) => handleInputChange('shippingSameAsBilling', e.target.checked)}
                          className="mr-3"
                        />
                        <label htmlFor="sameAsBilling" className="text-sm text-gray-700">
                          Adres dostawy taki sam jak rozliczeniowy
                        </label>
                      </div>

                      {!form.shippingSameAsBilling && (
                        <div className="space-y-4 border-t pt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Imię *
                              </label>
                              <input
                                type="text"
                                value={form.shippingFirstName}
                                onChange={(e) => handleInputChange('shippingFirstName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nazwisko *
                              </label>
                              <input
                                type="text"
                                value={form.shippingLastName}
                                onChange={(e) => handleInputChange('shippingLastName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Firma (opcjonalnie)
                            </label>
                            <input
                              type="text"
                              value={form.shippingCompany}
                              onChange={(e) => handleInputChange('shippingCompany', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Adres *
                            </label>
                            <input
                              type="text"
                              value={form.shippingAddress}
                              onChange={(e) => handleInputChange('shippingAddress', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Miasto *
                              </label>
                              <input
                                type="text"
                                value={form.shippingCity}
                                onChange={(e) => handleInputChange('shippingCity', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Kod pocztowy *
                              </label>
                              <input
                                type="text"
                                value={form.shippingPostcode}
                                onChange={(e) => handleInputChange('shippingPostcode', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Kraj *
                              </label>
                              <select
                                value={form.shippingCountry}
                                onChange={(e) => handleInputChange('shippingCountry', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                              >
                                <option value="PL">Polska</option>
                                <option value="DE">Niemcy</option>
                                <option value="CZ">Czechy</option>
                                <option value="SK">Słowacja</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4">
                      <Button
                        type="button"
                        onClick={() => {
                          if (validateForm()) {
                            setCurrentStep(2);
                          }
                        }}
                        className="w-full h-12 text-base"
                      >
                        Kontynuuj - dostawa i płatność
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Shipping and Payment */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Shipping Methods */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <ChevronRight className="w-5 h-5 mr-2" />
                        Metoda dostawy
                      </h3>
                      
                      <div className="space-y-3">
                          {shippingMethods.length === 0 ? (
                            <div className="text-sm text-gray-500 p-4 border border-gray-300 rounded-lg">
                              Ładowanie metod dostawy...
                            </div>
                          ) : (
                            shippingMethods.map((method) => (
                            <label key={method.id} className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                              <input
                                type="radio"
                                name="shippingMethod"
                                value={method.method_id}
                                checked={form.shippingMethod === method.method_id}
                                onChange={(e) => {
                                  setForm(prev => ({ ...prev, shippingMethod: e.target.value }));
                                  setShippingCost((method.cost || 0) * 1.23); // Add VAT to netto cost
                                }}
                                className="mr-3"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm text-gray-900">{method.method_title}</div>
                                  </div>
                                  <div className="text-right">
                                  <div className="font-semibold text-gray-900">
                                      {method.free_shipping_threshold > 0 && (total / 1.23) >= method.free_shipping_threshold
                                        ? 'Gratis' 
                                        : method.cost > 0
                                          ? `${formatPrice(method.cost * 1.23)} (z VAT)`
                                          : 'Gratis'
                                      }
                                    </div>
                                    {method.free_shipping_threshold > 0 && (total / 1.23) < method.free_shipping_threshold && (
                                      <div className="text-xs text-green-600">
                                        Darmowa dostawa od {formatPrice(method.free_shipping_threshold)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </label>
                          ))
                          )}
                        </div>
                    </div>

                    {/* Payment Methods Section */}
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                          <ChevronRight className="w-5 h-5 mr-2" />
                          Metoda płatności
                        </h3>
                        {quickPaymentSelected && (
                          <div className="flex items-center space-x-2 text-sm text-blue-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>Wybrana przez szybką płatność</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {paymentMethods.length === 0 ? (
                          <div className="text-sm text-gray-500 p-4 border border-gray-300 rounded-lg">
                            Ładowanie metod płatności...
                          </div>
                        ) : (
                          paymentMethods
                            .filter(method => {
                              // Hide Google Pay and Apple Pay for unauthenticated users
                              if (!isAuthenticated && (method.id === 'google_pay' || method.id === 'apple_pay')) {
                                return false;
                              }
                              return true;
                            })
                            .map((method) => (
                          <label key={method.id} className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={method.id}
                              checked={form.paymentMethod === method.id}
                              onChange={(e) => setForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                              className="mr-3"
                            />
                            <div className="flex-1">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm text-gray-900">
                                    {method.id === 'cod' ? 'Płatność przy odbiorze' : method.name || (method as any).title || method.id}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </label>
                        ))
                        )}
                      </div>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="space-y-4 pt-4 border-t">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          checked={form.acceptTerms}
                          onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                          className="mr-3 mt-1"
                          required
                        />
                        <div className="text-sm text-gray-700">
                          Akceptuję <Link href="/regulamin" className="text-black underline hover:no-underline">regulamin</Link> oraz{' '}
                          <Link href="/polityka-prywatnosci" className="text-black underline hover:no-underline">politykę prywatności</Link> *
                        </div>
                      </label>
                      {fieldErrors.acceptTerms && (
                        <p className="text-xs text-red-600">{fieldErrors.acceptTerms}</p>
                      )}

                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          checked={form.acceptNewsletter}
                          onChange={(e) => handleInputChange('acceptNewsletter', e.target.checked)}
                          className="mr-3 mt-1"
                        />
                        <div className="text-sm text-gray-700">
                          Chcę otrzymywać informacje o nowościach i promocjach (można zrezygnować w każdej chwili)
                        </div>
                      </label>
                    </div>

                    <div className="pt-4 flex gap-4">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Wstecz
                      </button>
                      <Button
                        type="submit"
                        disabled={loading || !form.acceptTerms}
                        className="flex-1 h-12 text-base"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Przetwarzanie...
                          </>
                        ) : (
                          <>
                            <Lock className="w-5 h-5 mr-2" />
                            Złóż zamówienie bezpiecznie
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Podsumowanie zamówienia
              </h3>

              {/* Discount Code Section */}
              <div className="mb-6">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="Wpisz kod rabatowy"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-sm h-10"
                    disabled={discountLoading || !!appliedDiscount}
                  />
                  {!appliedDiscount ? (
                    <Button
                      type="button"
                      onClick={handleApplyDiscount}
                      disabled={!discountCode.trim() || discountLoading}
                      className="h-10 px-4"
                    >
                      {discountLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Zastosuj'
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleRemoveDiscount}
                      variant="destructive"
                      className="h-10 px-4"
                    >
                      Usuń
                    </Button>
                  )}
                </div>
                
                {/* Applied Discount Display */}
                {appliedDiscount && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800 font-medium">
                          Kod {appliedDiscount.code} zastosowany
                        </span>
                      </div>
                      <span className="text-sm text-green-600 font-semibold">
                        {appliedDiscount.type === 'percentage' 
                          ? `-${appliedDiscount.value}%`
                          : `-${formatPrice(appliedDiscount.value)}`
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="space-y-4 mb-6">
                {items.map((item, index) => (
                  <div key={`${item.id}-${item.variant?.id || 'default'}-${index}`} className="flex items-center space-x-3">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 rounded-lg flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </h4>
                      {item.variant && (
                        <p className="text-xs text-gray-500">
                          {item.variant.name}: {item.variant.value}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        Ilość: {item.quantity}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatPriceWithVAT((item.sale_price || item.price) * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                
                {/* Enhanced Total Section */}
                <div className="pt-4">
                  {/* Original Total */}
                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Wartość produktów:</span>
                    <span>{formatPrice(total)} (z VAT)</span>
                  </div>
                  
                  {/* Discount Info */}
                  {(hasNewUserDiscount || appliedDiscount) && (
                    <div className="flex justify-end text-sm text-green-600 mb-3">
                      <span className="font-semibold">-{formatPrice(totalDiscountAmount)}</span>
                    </div>
                  )}
                  
                  {/* Free Shipping Progress */}
                  {(() => {
                    const FREE_SHIPPING_THRESHOLD = SHIPPING_CONFIG.FREE_SHIPPING_THRESHOLD;
                    const nettoTotal = total / SHIPPING_CONFIG.VAT_RATE;
                    const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - nettoTotal);
                    
                    if (remainingForFreeShipping > 0) {
                      return (
                        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs text-green-700">
                            Dodaj produkty za <span className="font-semibold">{formatPrice(remainingForFreeShipping * 1.23)}</span> aby otrzymać darmową dostawę!
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs text-green-700 font-semibold">
                            🎉 Gratulacje! Otrzymujesz darmową dostawę!
                          </p>
                        </div>
                      );
                    }
                  })()}
                  
                  {/* Shipping */}
                  {form.shippingMethod && (
                    <div className="flex justify-between text-sm text-gray-500 mb-3">
                      <span>Dostawa:</span>
                      <span>{finalShippingCost === 0 ? 'Gratis' : `${formatPrice(finalShippingCost)} (z VAT)`}</span>
                    </div>
                  )}
                  
                  {/* Final Total */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Do zapłaty:</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatPrice(finalTotal)}
                        </div>
                        <div className="text-xs text-gray-500">(z VAT)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Info */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="w-4 h-4 mr-2" />
                  Bezpieczne płatności SSL
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Register Modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => {
          // You could add login modal here if needed
          // Switch to login debug removed
        }}
        onRegistrationSuccess={handleRegistrationSuccess}
      />

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-lg">Konto utworzone!</p>
              <p className="text-sm opacity-90 mb-2">
                Formularz został automatycznie wypełniony
              </p>
              <div className="bg-white/20 rounded-md px-2 py-1">
                <p className="text-xs font-medium">
                  🎉 Masz 10% rabat na pierwsze zamówienie!
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <CheckoutPageInner />
    </Suspense>
  );
}
