'use client';

import { motion } from 'framer-motion';
import { Metadata } from 'next';
import { Shield, Award, Users, Heart, Star, CheckCircle } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-20 mx-6 rounded-3xl">
        <div className="max-w-[95vw] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              O nas
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Profesjonalne usługi kosmetyczne i medycyny estetycznej. 
              Zapewniamy najwyższą jakość i bezpieczeństwo zabiegów.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 mx-6 rounded-3xl">
        <div className="max-w-[95vw] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Column - Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Nasza misja
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                W Filler wierzymy, że każdy zasługuje na to, aby czuć się pewnie i pięknie. 
                Nasza misja to dostarczanie najwyższej jakości produktów i usług w dziedzinie 
                medycyny estetycznej, które pomagają naszym klientom osiągnąć ich cele.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                Jako hurtownia medycyny estetycznej, współpracujemy z najlepszymi producentami 
                i dostarczamy certyfikowane preparaty do profesjonalistów w całej Polsce.
              </p>

              {/* Values */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  <span className="text-gray-700">Certyfikowane produkty</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  <span className="text-gray-700">Profesjonalne doradztwo</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  <span className="text-gray-700">Bezpieczeństwo i jakość</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  <span className="text-gray-700">Szybka dostawa</span>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Image/Visual */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-12 text-center">
                <div className="w-32 h-32 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                  <span className="text-6xl font-bold text-gray-800">F</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Filler</h3>
                <p className="text-gray-600">Hurtownia medycyny estetycznej</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-20 mx-6 rounded-3xl">
        <div className="max-w-[95vw] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Dlaczego wybierają nas profesjonaliści?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Oferujemy kompleksowe rozwiązania dla specjalistów medycyny estetycznej
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Shield,
                title: "Bezpieczeństwo",
                description: "Wszystkie produkty przechodzą rygorystyczną kontrolę jakości i są certyfikowane"
              },
              {
                icon: Award,
                title: "Jakość",
                description: "Współpracujemy tylko z renomowanymi producentami i dostawcami"
              },
              {
                icon: Users,
                title: "Ekspertyza",
                description: "Nasz zespół składa się z doświadczonych specjalistów medycyny estetycznej"
              },
              {
                icon: Heart,
                title: "Pasja",
                description: "Kochamy to, co robimy i pomagamy naszym klientom osiągnąć ich cele"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Gotowy na współpracę?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Skontaktuj się z nami, aby dowiedzieć się więcej o naszych produktach i usługach
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/kontakt"
                className="bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Skontaktuj się z nami
              </a>
              <a
                href="/sklep"
                className="border border-black text-black px-8 py-3 rounded-lg hover:bg-black hover:text-white transition-colors font-medium"
              >
                Zobacz produkty
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
