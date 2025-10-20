'use client';

import { motion } from 'framer-motion';
import PageContainer from '@/components/ui/page-container';
import Breadcrumbs from '@/components/ui/breadcrumbs';

export default function AboutPage() {
  const breadcrumbs = [
    { label: 'Strona główna', href: '/' },
    { label: 'O nas', href: '/o-nas' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageContainer>
        {/* Breadcrumbs */}
        <div className="py-6">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        {/* Main Content */}
        <section className="py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Left Column - Image */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              <div className="relative">
                {/* Mock Image */}
                <div className="aspect-[4/5] bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <span className="text-4xl font-bold text-gray-800">F</span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">Filler.pl</h3>
                      <p className="text-gray-600">Hurtownia medycyny estetycznej</p>
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
              className="order-1 lg:order-2"
            >
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-8">
                Hurtownia medycyny estetycznej Filler.pl
              </h1>
              
              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  Filler.pl to firma, która powstała z pasji do medycyny estetycznej i chęci dostarczania najlepszych produktów na dynamicznie rozwijający się rynek. Naszą misją jest wspieranie profesjonalistów w branży, oferując im szeroki wybór sprawdzonych, wysokiej jakości materiałów i narzędzi, które spełniają najwyższe standardy.
                </p>

                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  Dokładamy wszelkich starań, aby nasza oferta była zawsze aktualna i odpowiadała na potrzeby rynku, regularnie analizując pojawiające się nowinki oraz trendy. Nasz zespół jest zawsze gotowy, by dostosować asortyment do indywidualnych oczekiwań klientów, a także by wprowadzać innowacje, które pomogą w rozwoju gabinetów i klinik medycyny estetycznej.
                </p>

                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  Wszystkie produkty dostępne w Filler.pl są w pełni oryginalne i pochodzą od certyfikowanych producentów i dystrybutorów, którzy są uznanymi liderami na rynku medycyny estetycznej. Dzięki bliskiej współpracy z najlepszymi markami, możemy zapewnić Państwu konkurencyjne ceny oraz dostęp do produktów, które wyróżniają się na tle innych.
                </p>

                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  Naszym celem jest nie tylko sprzedaż, ale także budowanie długoterminowych relacji z naszymi klientami. Zależy nam na stałym doskonaleniu jakości obsługi, dlatego czekamy na Wasze sugestie, które pozwolą nam rozwijać się i jeszcze lepiej odpowiadać na potrzeby rynku.
                </p>

                <p className="text-lg text-gray-700 mb-8 leading-relaxed font-medium">
                  Zapraszamy do współpracy i zaufania profesjonalistom z Filler.pl!
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}