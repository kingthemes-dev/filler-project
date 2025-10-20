'use client';

import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { useState } from 'react';
import PageContainer from '@/components/ui/page-container';
import Breadcrumbs from '@/components/ui/breadcrumbs';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Tutaj można dodać logikę wysyłania formularza
    console.log('Form submitted:', formData);
    alert('Dziękujemy za wiadomość! Skontaktujemy się z Tobą wkrótce.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
    <div className="min-h-screen bg-white">
      <PageContainer>
        {/* Header with Title and Breadcrumbs */}
        <div className="py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-gray-900">
              Kontakt
            </h1>
            <Breadcrumbs items={breadcrumbs} variant="minimal" size="sm" />
          </div>
        </div>
      </PageContainer>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-20">
        <div className="max-w-[95vw] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Skontaktuj się z nami, aby uzyskać profesjonalne doradztwo 
              i dowiedzieć się więcej o naszych produktach.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-[95vw] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Left Column - Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Skontaktuj się z nami
              </h2>
              
              <div className="space-y-8">
                {/* Address */}
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Adres
                    </h3>
                    <p className="text-gray-600">
                      ul. Partyzantów 8/101<br />
                      80-254 Gdańsk
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Telefon
                    </h3>
                    <a 
                      href="tel:+48535956932" 
                      className="text-gray-600 hover:text-black transition-colors"
                    >
                      +48 535 956 932
                    </a>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Email
                    </h3>
                    <a 
                      href="mailto:kontakt@filler.pl" 
                      className="text-gray-600 hover:text-black transition-colors"
                    >
                      kontakt@filler.pl
                    </a>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Godziny pracy
                    </h3>
                    <div className="text-gray-600 space-y-1">
                      <p>Poniedziałek - Piątek: 9:00 - 18:00</p>
                      <p>Sobota: 10:00 - 16:00</p>
                      <p>Niedziela: Zamknięte</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Placeholder */}
              <div className="mt-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Lokalizacja
                </h3>
                <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Mapa lokalizacji</p>
                    <p className="text-sm text-gray-400">ul. Partyzantów 8/101, Gdańsk</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="bg-gray-50 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Wyślij wiadomość
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Imię i nazwisko *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="Jan Kowalski"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="jan@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                        placeholder="+48 123 456 789"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                        Temat *
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        required
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        <option value="">Wybierz temat</option>
                        <option value="zapytanie-o-produkty">Zapytanie o produkty</option>
                        <option value="wspolpraca">Współpraca</option>
                        <option value="reklamacja">Reklamacja</option>
                        <option value="inne">Inne</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Wiadomość *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent resize-none"
                      placeholder="Opisz szczegółowo swoje zapytanie..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Wyślij wiadomość
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Najczęściej zadawane pytania
            </h2>
            <p className="text-lg text-gray-600">
              Odpowiedzi na najpopularniejsze pytania naszych klientów
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                question: "Jakie produkty oferujecie?",
                answer: "Oferujemy szeroką gamę produktów do medycyny estetycznej, w tym preparaty do mezoterapii, nici liftingujące, kwas hialuronowy i wiele innych certyfikowanych produktów."
              },
              {
                question: "Czy produkty są certyfikowane?",
                answer: "Tak, wszystkie nasze produkty posiadają odpowiednie certyfikaty i przechodzą rygorystyczną kontrolę jakości. Współpracujemy tylko z renomowanymi producentami."
              },
              {
                question: "Jak długo trwa dostawa?",
                answer: "Standardowa dostawa trwa 1-2 dni robocze. W przypadku pilnych zamówień oferujemy dostawę w tym samym dniu (dla Gdańska i okolic)."
              },
              {
                question: "Czy oferujecie doradztwo?",
                answer: "Tak, nasz zespół ekspertów chętnie pomoże w doborze odpowiednich produktów i udzieli profesjonalnego doradztwa."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                className="bg-white rounded-lg p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-600">
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
