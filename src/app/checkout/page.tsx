'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Truck, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Lock,
  CheckCircle,
  ArrowLeft,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { formatPrice } from '@/utils/format-price';
import Link from 'next/link';
import mockPaymentService, { PaymentMethod } from '@/services/mock-payment';
import emailService from '@/services/email-service';
import wooCommerceService from '@/services/woocommerce-optimized';

interface CheckoutForm {
  // Billing Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  
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
  const { items, total, itemCount, clearCart } = useCartStore();
  const searchParams = useSearchParams();
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
    shippingMethod: 'free_shipping',
    acceptTerms: false,
    acceptNewsletter: false
  });

  // Payment state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: ''
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [quickPaymentSelected, setQuickPaymentSelected] = useState(false);
  
  // Shipping state
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [shippingCost, setShippingCost] = useState(0);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);

  // Load shipping methods
  const loadShippingMethods = async () => {
    console.log('🚚 Loading shipping methods...', { 
      country: form.shippingCountry, 
      city: form.shippingCity 
    });
    setIsLoadingShipping(true);
    try {
      const methods = await wooCommerceService.getShippingMethods(
        form.shippingCountry,
        '', // state
        form.shippingCity,
        form.shippingPostcode
      );
      console.log('🚚 Shipping methods loaded:', methods);
      setShippingMethods(methods);
      
      // Set default shipping method and cost
      if (methods.length > 0) {
        const defaultMethod = methods.find((m: any) => m.method_id === form.shippingMethod) || methods[0];
        console.log('🚚 Default method selected:', defaultMethod);
        setForm(prev => ({ ...prev, shippingMethod: defaultMethod.method_id }));
        setShippingCost((defaultMethod.cost || 0) * 100); // Convert PLN to cents
      }
    } catch (error) {
      console.error('Error loading shipping methods:', error);
    } finally {
      setIsLoadingShipping(false);
    }
  };

  // Load payment methods and handle URL params
  useEffect(() => {
    setPaymentMethods(mockPaymentService.getPaymentMethods());
    
    // Handle payment method from URL
    const paymentMethod = searchParams.get('payment');
    if (paymentMethod && ['google_pay', 'apple_pay', 'card', 'transfer', 'cash'].includes(paymentMethod)) {
      setForm(prev => ({ ...prev, paymentMethod: paymentMethod as any }));
      setQuickPaymentSelected(['google_pay', 'apple_pay'].includes(paymentMethod));
      
      // TRUE QUICK PAYMENT - skip to payment step and use defaults
      if (['google_pay', 'apple_pay'].includes(paymentMethod)) {
        setCurrentStep(3); // Skip to payment step
        
        // Set default values for quick payment
        setForm(prev => ({
          ...prev,
          // Default billing (can be changed later)
          firstName: prev.firstName || 'Jan',
          lastName: prev.lastName || 'Kowalski',
          email: prev.email || 'jan.kowalski@example.com',
          phone: prev.phone || '+48 123 456 789',
          billingAddress: prev.billingAddress || 'ul. Przykładowa 1',
          billingCity: prev.billingCity || 'Warszawa',
          billingPostcode: prev.billingPostcode || '00-001',
          billingCountry: 'PL',
          
          // Default shipping (same as billing)
          shippingSameAsBilling: true,
          shippingFirstName: prev.firstName || 'Jan',
          shippingLastName: prev.lastName || 'Kowalski',
          shippingAddress: prev.billingAddress || 'ul. Przykładowa 1',
          shippingCity: prev.billingCity || 'Warszawa',
          shippingPostcode: prev.billingPostcode || '00-001',
          shippingCountry: 'PL',
          
          // Accept terms for quick payment
          acceptTerms: true,
        }));
      }
    }
  }, [searchParams]);

  // Load shipping methods when address changes
  useEffect(() => {
    if (form.shippingCountry && form.shippingCity) {
      loadShippingMethods();
    }
  }, [form.shippingCountry, form.shippingCity, form.shippingPostcode]);

  // Load shipping methods on initial load
  useEffect(() => {
    loadShippingMethods();
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !orderComplete) {
      window.location.href = '/koszyk';
    }
  }, [items, orderComplete]);

  const handleInputChange = (field: keyof CheckoutForm, value: any) => {
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
    const requiredFields = [
      'firstName', 'lastName', 'email', 'phone',
      'billingAddress', 'billingCity', 'billingPostcode'
    ];
    
    for (const field of requiredFields) {
      if (!form[field as keyof CheckoutForm]) {
        return false;
      }
    }
    
    if (!form.acceptTerms) return false;
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert('Proszę wypełnić wszystkie wymagane pola i zaakceptować regulamin.');
      return;
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
      // Process payment first
      const paymentRequest = {
        amount: finalTotal,
        currency: 'PLN',
        method: form.paymentMethod,
        orderId: `ORDER-${Date.now()}`,
        customerEmail: form.email,
        customerName: `${form.firstName} ${form.lastName}`
      };

      const paymentResponse = await mockPaymentService.processPayment(paymentRequest);
      
      if (!paymentResponse.success) {
        throw new Error(paymentResponse.message);
      }

      // Simulate order processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate order number
      const newOrderNumber = `FILLER-${Date.now()}`;
      setOrderNumber(newOrderNumber);
      
      // Send order confirmation email
      try {
        const orderEmailData = {
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

        const emailResponse = await emailService.sendOrderConfirmation(orderEmailData);
        
        if (emailResponse.success) {
          console.log('📧 Email potwierdzenia wysłany:', emailResponse.messageId);
        } else {
          console.warn('⚠️ Błąd wysyłania email:', emailResponse.message);
        }
      } catch (error) {
        console.error('❌ Błąd email service:', error);
      }
      
      // Clear cart and show success
      clearCart();
      setOrderComplete(true);
      setCurrentStep(4);
      
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
    
    // Check for free shipping conditions
    if (selectedMethod.free_shipping_threshold > 0) {
      const thresholdInCents = selectedMethod.free_shipping_threshold * 100; // Convert PLN to cents
      return total >= thresholdInCents ? 0 : selectedMethod.cost * 100; // Convert PLN to cents
    }
    
    return selectedMethod.cost * 100; // Convert PLN to cents
  };
  
  const finalShippingCost = calculateShippingCost();
  const finalTotal = total + finalShippingCost;

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
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
              <Link
                href="/"
                className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Wróć do sklepu
              </Link>
              <Link
                href="/moje-zamowienia"
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Moje zamówienia
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[95vw] mx-auto px-6 py-8">
        
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
        <div className="mb-8">
          <Link
            href="/koszyk"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Wróć do koszyka
          </Link>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Finalizacja zamówienia
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-8">
                {[
                  { number: 1, label: 'Dane osobowe', icon: User },
                  { number: 2, label: 'Dostawa', icon: Truck },
                  { number: 3, label: 'Płatność', icon: CreditCard }
                ].map((step, index) => (
                  <div key={step.number} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      currentStep >= step.number 
                        ? 'border-black bg-black text-white' 
                        : 'border-gray-300 text-gray-400'
                    }`}>
                      {currentStep > step.number ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <step.icon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                      currentStep >= step.number ? 'text-black' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                    {index < 2 && (
                      <div className={`w-16 h-0.5 mx-4 ${
                        currentStep > step.number ? 'bg-black' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                ))}
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
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Dane osobowe
                    </h2>
                    
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

                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        disabled={!form.firstName || !form.lastName || !form.email || !form.phone}
                        className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Kontynuuj - Dostawa
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Shipping */}
                {currentStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
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

                    {/* Shipping Methods */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Metoda dostawy
                      </h3>
                      
                      {isLoadingShipping ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                          <span className="ml-3 text-gray-600">Ładowanie metod dostawy...</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {shippingMethods.map((method) => (
                            <label key={method.id} className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                              <input
                                type="radio"
                                name="shippingMethod"
                                value={method.method_id}
                                checked={form.shippingMethod === method.method_id}
                                onChange={(e) => {
                                  setForm(prev => ({ ...prev, shippingMethod: e.target.value }));
                                  setShippingCost((method.cost || 0) * 100); // Convert PLN to cents
                                }}
                                className="mr-3"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">{method.method_title}</div>
                                    <div className="text-sm text-gray-500">{method.method_description}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold text-gray-900">
                                      {method.free_shipping_threshold > 0 && total >= (method.free_shipping_threshold * 100)
                                        ? 'Gratis' 
                                        : method.cost > 0
                                          ? formatPrice(method.cost * 100)
                                          : 'Gratis'
                                      }
                                    </div>
                                    {method.free_shipping_threshold > 0 && total < (method.free_shipping_threshold * 100) && (
                                      <div className="text-xs text-green-600">
                                        Darmowa dostawa od {formatPrice(method.free_shipping_threshold * 100)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex gap-4">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Wstecz
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="flex-1 bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                      >
                        Kontynuuj - Płatność
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Payment */}
                {currentStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Metoda płatności
                      </h2>
                      {quickPaymentSelected && (
                        <div className="flex items-center space-x-2 text-sm text-blue-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>Wybrana przez szybką płatność</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {paymentMethods.map((method) => (
                        <label key={method.id} className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={method.id}
                            checked={form.paymentMethod === method.id}
                            onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                            className="mr-3"
                          />
                          <div className="flex items-center">
                            {method.icon === 'google_pay' ? (
                              <div className="w-8 h-8 mr-3 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-6 h-6">
                                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                              </div>
                            ) : method.icon === 'apple_pay' ? (
                              <div className="w-8 h-8 mr-3 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-6 h-6">
                                  <path fill="#000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                                </svg>
                              </div>
                            ) : (
                              <span className="text-2xl mr-3">{method.icon}</span>
                            )}
                            <div>
                              <div className="font-medium">{method.name}</div>
                              <div className="text-sm text-gray-500">{method.description}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                Czas przetwarzania: {method.processingTime / 1000}s | 
                                Sukces: {Math.round(method.successRate * 100)}%
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}

                    </div>

                    {/* Quick Payment Info - for Google Pay and Apple Pay */}
                    {['google_pay', 'apple_pay'].includes(form.paymentMethod) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3 mb-4">
                          {form.paymentMethod === 'google_pay' ? (
                            <div className="w-10 h-10 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-8 h-8">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                            </div>
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-8 h-8">
                                <path fill="#000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                              </svg>
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {form.paymentMethod === 'google_pay' ? 'Google Pay' : 'Apple Pay'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {form.paymentMethod === 'google_pay' 
                                ? 'Szybka i bezpieczna płatność przez Google' 
                                : 'Płatność przez Touch ID lub Face ID'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-3 text-sm text-gray-700">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Automatyczna autoryzacja biometryczna</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Przetwarzanie w czasie rzeczywistym</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Najwyższy poziom bezpieczeństwa</span>
                          </div>
                        </div>

                        {isProcessingPayment && (
                          <div className="mt-4 p-4 bg-blue-100 border border-blue-300 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              <span className="text-blue-800 font-medium">
                                Przetwarzanie płatności {form.paymentMethod === 'google_pay' ? 'Google Pay' : 'Apple Pay'}...
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Quick Payment Button */}
                        {quickPaymentSelected && !isProcessingPayment && (
                          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                            <div className="text-center">
                              <h4 className="text-lg font-semibold text-green-900 mb-2">
                                Gotowy do szybkiej płatności!
                              </h4>
                              <p className="text-sm text-green-700 mb-4">
                                Wszystkie dane są wypełnione. Kliknij poniżej, aby zapłacić jednym kliknięciem.
                              </p>
                              <button
                                onClick={handleSubmit}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center space-x-2"
                              >
                                <span>💳</span>
                                <span>Zapłać {formatPrice(total)} teraz</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Card Details Form - only for card payment */}
                    {form.paymentMethod === 'card' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 p-6 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Dane karty kredytowej
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Numer karty
                            </label>
                            <input
                              type="text"
                              value={cardDetails.cardNumber}
                              onChange={(e) => setCardDetails(prev => ({ ...prev, cardNumber: e.target.value }))}
                              placeholder="1234 5678 9012 3456"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                              maxLength={19}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Imię i nazwisko
                            </label>
                            <input
                              type="text"
                              value={cardDetails.cardholderName}
                              onChange={(e) => setCardDetails(prev => ({ ...prev, cardholderName: e.target.value }))}
                              placeholder="Jan Kowalski"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                            />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Miesiąc
                              </label>
                              <select
                                value={cardDetails.expiryMonth}
                                onChange={(e) => setCardDetails(prev => ({ ...prev, expiryMonth: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                              >
                                <option value="">MM</option>
                                {[...Array(12)].map((_, i) => (
                                  <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                    {String(i + 1).padStart(2, '0')}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rok
                              </label>
                              <select
                                value={cardDetails.expiryYear}
                                onChange={(e) => setCardDetails(prev => ({ ...prev, expiryYear: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                              >
                                <option value="">YYYY</option>
                                {[...Array(10)].map((_, i) => {
                                  const year = new Date().getFullYear() + i;
                                  return (
                                    <option key={year} value={year}>
                                      {year}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                CVV
                              </label>
                              <input
                                type="text"
                                value={cardDetails.cvv}
                                onChange={(e) => setCardDetails(prev => ({ ...prev, cvv: e.target.value }))}
                                placeholder="123"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                                maxLength={4}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 text-xs text-gray-500">
                          💳 To jest symulacja płatności. Nie wprowadzaj prawdziwych danych karty.
                        </div>
                      </motion.div>
                    )}

                    {/* Payment Error Display */}
                    {paymentError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4"
                      >
                        <div className="flex items-center">
                          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                          <p className="text-sm text-red-600">{paymentError}</p>
                        </div>
                      </motion.div>
                    )}

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
                        onClick={() => setCurrentStep(2)}
                        className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Wstecz
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !form.acceptTerms}
                        className="flex-1 bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
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
                      </button>
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

              {/* Order Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={`${item.id}-${item.variant?.id || 'default'}`} className="flex items-center space-x-3">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
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
                      {formatPrice((item.sale_price || item.price) * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Produkty ({itemCount}):</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Dostawa:</span>
                  <span>{finalShippingCost === 0 ? 'Gratis' : formatPrice(finalShippingCost)}</span>
                </div>
                {finalShippingCost > 0 && (
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                    Darmowa dostawa od {formatPrice(20000)}
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Razem:</span>
                    <span>{formatPrice(finalTotal)}</span>
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
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}
