'use client';

import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Send } from 'lucide-react';
import { useState } from 'react';
import PageContainer from '@/components/ui/page-container';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    subject: '',
    phone: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    alert('Dziękujemy za wiadomość! Skontaktujemy się z Tobą wkrótce.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const breadcrumbs = [
    { label: 'Strona główna', href: '/' },
    { label: 'Kontakt', href: '/kontakt' }
  ];

  return (
    <div className="bg-white">
      <PageContainer>
        {/* Header with Title and Breadcrumbs */}
        <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-white rounded-3xl mt-4 mx-4 lg:mx-0 px-4 lg:px-8 pt-2 pb-6 sm:pt-4 sm:pb-8">
          <div className="flex items-center justify-between gap-4 lg:gap-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Kontakt
            </h1>
            <div className која="ml-auto">
              <Breadcrumbs items={breadcrumbs} variant="minimal" size="sm" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <section className="py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Left Column - Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gray-50 border border-gray-200 rounded-xl p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-8">
                Informacje kontaktowe
              </h2>
              
              <div className="space-y-6">
                {/* Email */}
                <div className="flex items-center">
                  <Mail className="w-6 h-6 text-gray-600 mr-4" />
                  <div>
                    <p className="text-gray-900 font-medium">Email: kontakt@filler.pl</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center">
                  <Phone className="w-6 h-6 text-gray-600 mr-4" />
                  <div>
                    <p className="text-gray-900 font-medium">Telefon: +48 535 956 932</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center">
                  <MapPin className="w-6 h-6 text-gray-600 mr-4" />
                  <div>
                    <p className="text-gray-900 font-medium">Adres: ul. Partyzantów 8/101, 80-254 Gdańsk</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-gray-50 border border-gray-200 rounded-xl p-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-8">
                Formularz kontaktowy
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-semibold text-gray-900 mb-2">
                      Imię *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="Jan"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold text-gray-900 mb-2">
                      Nazwisko *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="Kowalski"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-gray-900 mb-2">
                    Temat *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Wpisz swój temat"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                    Telefon *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="Wpisz swój numer telefonu"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-900 mb-2">
                    Wiadomość
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                    placeholder="Wpisz swoją wiadomość"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base transition-all duration-300"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Wyślij wiadomość
                </Button>
              </form>
            </motion.div>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
