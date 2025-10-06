'use client';

import { Facebook, Instagram, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black text-white py-8 sm:py-12 mt-16 sm:mt-20 rounded-t-2xl sm:rounded-t-3xl">
      <div className="max-w-[95vw] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          
          {/* Logo i opis */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3">
                <span className="text-black font-bold text-xl">F</span>
              </div>
              <h3 className="text-2xl font-bold">Filler</h3>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              Profesjonalne usługi kosmetyczne i medycyny estetycznej. 
              Zapewniamy najwyższą jakość i bezpieczeństwo zabiegów.
            </p>
          </div>

          {/* Kontakt */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Kontakt</h4>
            <div className="space-y-3">
              <div className="flex items-start">
                <MapPin className="w-5 h-5 mt-0.5 mr-3 text-gray-400" />
                <div>
                  <p className="text-gray-300">ul. Partyzantów 8/101</p>
                  <p className="text-gray-300">80-254 Gdańsk</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Phone className="w-5 h-5 mr-3 text-gray-400" />
                <a 
                  href="tel:+48535956932" 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  +48 535 956 932
                </a>
              </div>
              
              <div className="flex items-center">
                <Mail className="w-5 h-5 mr-3 text-gray-400" />
                <a 
                  href="mailto:kontakt@filler.pl" 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  kontakt@filler.pl
                </a>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Śledź nas</h4>
            <div className="flex space-x-4">
              <a 
                href="https://facebook.com/filler" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              
              <a 
                href="https://instagram.com/filler" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom border */}
        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Filler. Wszystkie prawa zastrzeżone.
            </p>
            
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="/polityka-prywatnosci" className="text-gray-400 hover:text-white text-sm transition-colors">
                Polityka prywatności
              </a>
              <a href="/regulamin" className="text-gray-400 hover:text-white text-sm transition-colors">
                Regulamin
              </a>
              <a href="/kontakt" className="text-gray-400 hover:text-white text-sm transition-colors">
                Kontakt
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
