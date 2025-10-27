'use client';

import { motion } from 'framer-motion';
import PageContainer from '@/components/ui/page-container';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { Award, Truck, Headphones, Shield } from 'lucide-react';

export default function AboutPage() {
  const breadcrumbs = [
    { label: 'Strona główna', href: '/' },
    { label: 'O nas', href: '/o-nas' }
  ];

  return (
    <div className="bg-white">
      <PageContainer>
        {/* Header with Title and Breadcrumbs */}
        <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-white rounded-3xl mt-4 mx-4 lg:mx-0 px-4 lg:px-8 pt-2 pb-6 sm:pt-4 sm:pb-8">
          <div className="flex items-center justify-between gap-4 lg:gap-8">
            <h1 className="text-2xl font-bold text-gray-900">
              O nas
            </h1>
            <div className="ml-auto">
              <Breadcrumbs items={breadcrumbs} variant="minimal" size="sm" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <section className="py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Column - Image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              <div className="relative">
                {/* Mock Image - Full Height */}
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden p-8">
                  <div className="w-full h-full flex items-center justify-center min-h-[500px]">
                    <div className="text-center">
                      <div className="w-32 h-32 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                        <span className="text-5xl font-bold text-gray-800">F</span>
                      </div>
                      <h3 className="text-3xl font-bold text-gray-800 mb-3">Filler.pl</h3>
                      <p className="text-gray-600 text-lg">Hurtownia medycyny estetycznej</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Text Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="order-1 lg:order-2 flex flex-col justify-center"
            >
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-8">
                Hurtownia medycyny estetycznej Filler.pl
              </h2>
              
              <div className="prose max-w-none">
                <p className="text-base text-gray-700 mb-6 leading-relaxed">
                  Filler.pl to firma, która powstała z pasji do medycyny estetycznej i chęci dostarczania najlepszych produktów na dynamicznie rozwijający się rynek. Naszą misją jest wspieranie profesjonalistów w branży, oferując im szeroki wybór sprawdzonych, wysokiej jakości materiałów i narzędzi, które spełniają najwyższe standardy.
                </p>

                <p className="text-base text-gray-700 mb-6 leading-relaxed">
                  Dokładamy wszelkich starań, aby nasza oferta była zawsze aktualna i odpowiadała na potrzeby rynku, regularnie analizując pojawiające się nowinki oraz trendy. Nasz zespół jest zawsze gotowy, by dostosować asortyment do indywidualnych oczekiwań klientów, a także by wprowadzać innowacje, które pomogą w rozwoju gabinetów i klinik medycyny estetycznej.
                </p>

                <p className="text-base text-gray-700 mb-6 leading-relaxed">
                  Wszystkie produkty dostępne w Filler.pl są w pełni oryginalne i pochodzą od certyfikowanych producentów i dystrybutorów, którzy są uznanymi liderami na rynku medycyny estetycznej. Dzięki bliskiej współpracy z najlepszymi markami, możemy zapewnić Państwu konkurencyjne ceny oraz dostęp do produktów, które wyróżniają się na tle innych.
                </p>

                <p className="text-base text-gray-700 mb-6 leading-relaxed">
                  Naszym celem jest nie tylko sprzedaż, ale także budowanie długoterminowych relacji z naszymi klientami. Zależy nam na stałym doskonaleniu jakości obsługi, dlatego czekamy na Wasze sugestie, które pozwolą nam rozwijać się i jeszcze lepiej odpowiadać na potrzeby rynku.
                </p>

                <p className="text-base text-gray-700 mb-8 leading-relaxed font-medium">
                  Zapraszamy do współpracy i zaufania profesjonalistom z Filler.pl!
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="pt-8 pb-4 lg:pb-2 xl:pb-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Konkurencyjne ceny */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg bg-white"
              >
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                  <Award className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Konkurencyjne ceny
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Atrakcyjne ceny dzięki bezpośredniej współpracy z producentami. Częste promocje i specjalne oferty dla stałych klientów.
                </p>
              </motion.div>

              {/* Szybka realizacja */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg bg-white"
              >
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                  <Truck className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Szybka realizacja
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Realizacja zamówień w ciągu 24h. Specjalistyczny transport dla produktów wymagających kontroli temperatury.
                </p>
              </motion.div>

              {/* Eksperckie doradztwo */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg bg-white"
              >
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                  <Headphones className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Eksperckie doradztwo
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Zespół specjalistów gotowy do udzielenia fachowej pomocy w wyborze produktów dostosowanych do potrzeb Twojego gabinetu.
                </p>
              </motion.div>

              {/* Certyfikowane produkty */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-center group p-6 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg bg-white"
              >
                <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-xl border border-gray-200 group-hover:border-gray-300 transition-colors duration-300">
                  <Shield className="w-8 h-8 text-gray-700 group-hover:text-black transition-colors duration-300" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Certyfikowane produkty
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Wszystkie preparaty posiadają odpowiednie certyfikaty i pochodzą wyłącznie od autoryzowanych dystrybutorów.
                </p>
              </motion.div>
            </div>
        </section>
      </PageContainer>
    </div>
  );
}