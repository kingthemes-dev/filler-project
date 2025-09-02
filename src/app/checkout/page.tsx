'use client';

import { useState, useEffect } from 'react';
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
  paymentMethod: 'card' | 'transfer' | 'cash';
  
  // Terms
  acceptTerms: boolean;
  acceptNewsletter: boolean;
}

export default function CheckoutPage() {
  const { items, total, itemCount, clearCart } = useCartStore();
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
    paymentMethod: 'card',
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

  // Load payment methods
  useEffect(() => {
    setPaymentMethods(mockPaymentService.getPaymentMethods());
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

  const shippingCost = total >= 20000 ? 0 : 1500; // Free shipping over 200 zł
  const finalTotal = total + shippingCost;

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
      <div className="container mx-auto px-4 py-8">
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
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      Metoda płatności
                    </h2>

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
                            <span className="text-2xl mr-3">{method.icon}</span>
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
                                    {String(i + 1).padStart(2, 0)}
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
                  <span>{shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}</span>
                </div>
                {shippingCost > 0 && (
                  <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                    Darmowa dostawa od 200 zł
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
