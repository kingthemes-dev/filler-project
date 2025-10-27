'use client';

import { Facebook, Instagram, Mail, Phone, MapPin, Clock, Award, Truck, Shield, Building2, User, CreditCard, Info, Download, Smartphone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white py-16 sm:py-20 mt-16 sm:mt-20 rounded-t-3xl">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-transparent to-purple-600/30"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.25),transparent_60%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_75%,rgba(147,51,234,0.25),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.03)_50%,transparent_75%)] bg-[length:20px_20px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-800/50 via-transparent to-gray-900/30"></div>
      </div>
      
         <div className="relative max-w-[95vw] mx-4 lg:mx-8 xl:mx-auto mobile-container">
           {/* Logo i kontakt - Mobile */}
           <div className="lg:hidden mb-8 -mt-4">
             <div className="bg-transparent border-2 border-white/20 rounded-xl px-4 py-4 mb-3 relative">
               <div className="flex items-center mb-4">
                 <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                   <span className="text-white font-bold text-xl">F</span>
                 </div>
                 <h3 className="text-3xl font-bold">FILLER</h3>
               </div>
               
               {/* Social Media Icons - Mobile only - positioned absolutely */}
               <div className="absolute top-1/2 right-4 transform -translate-y-1/2 flex flex-col space-y-2">
                 <a 
                   href="https://facebook.com/filler" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/20  transition-all duration-300 border border-white/20 hover:border-white/40 group"
                   aria-label="Facebook"
                 >
                   <Facebook className="w-6 h-6 text-white group-hover:text-blue-400 transition-colors duration-300" />
                 </a>
                 
                 <a 
                   href="https://instagram.com/filler" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/20  transition-all duration-300 border border-white/20 hover:border-white/40 group"
                   aria-label="Instagram"
                 >
                   <Instagram className="w-6 h-6 text-white group-hover:text-pink-400 transition-colors duration-300" />
                 </a>
               </div>
               
               <div className="flex justify-between items-start">
                 <div className="space-y-2 flex-1">
                   <div className="flex items-start">
                     <MapPin className="w-4 h-4 mt-1 mr-2 text-gray-400" />
                     <div>
                       <p className="text-gray-300 text-sm">ul. Partyzantów 8/101, 80-254</p>
                       <p className="text-gray-300 text-sm">Gdańsk, Polska</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center">
                     <Phone className="w-4 h-4 mr-2 text-gray-400" />
                     <a 
                       href="tel:+48535956932" 
                       className="text-gray-300 hover:text-white transition-colors text-sm"
                     >
                       +48 535 956 932
                     </a>
                   </div>
                   
                   <div className="flex items-center">
                     <Mail className="w-4 h-4 mr-2 text-gray-400" />
                     <a 
                       href="mailto:kontakt@filler.pl" 
                       className="text-gray-300 hover:text-white transition-colors text-sm"
                     >
                       kontakt@filler.pl
                     </a>
                   </div>
                   
                   <div className="flex items-start">
                     <Clock className="w-4 h-4 mt-1 mr-2 text-gray-400" />
                     <div>
                       <p className="text-gray-300 text-sm">Czynne od poniedziałku do piątku,</p>
                       <p className="text-gray-300 font-semibold text-sm">w godzinach 8:00 - 18:00</p>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>

           {/* Mobile Tabs */}
           <div className="lg:hidden mb-8 -mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-transparent border-2 border-white/20 rounded-xl px-4 pt-3 pb-3 text-left hover:border-white/40 transition-colors h-full flex flex-col justify-start">
                <h4 className="text-white font-semibold pb-2 mb-3 border-b border-gray-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-white/80" />O firmie</h4>
                 <div className="space-y-2 text-sm text-gray-300">
                   <a href="/kontakt" className="block hover:text-white transition-colors cursor-pointer">Kontakt</a>
                   <a href="/o-nas" className="block hover:text-white transition-colors cursor-pointer">O nas</a>
                   <a href="/aplikacja-mobilna" className="block hover:text-white transition-colors cursor-pointer">Aplikacja mobilna</a>
                   <a href="/program-lojalnosciowy" className="block hover:text-white transition-colors cursor-pointer">Program lojalnościowy</a>
                 </div>
               </div>
               
              <div className="bg-transparent border-2 border-white/20 rounded-xl px-4 pt-3 pb-3 text-left hover:border-white/40 transition-colors h-full flex flex-col justify-start">
                <h4 className="text-white font-semibold pb-2 mb-3 border-b border-gray-800 flex items-center gap-2"><User className="w-5 h-5 text-white/80" />Moje konto</h4>
                 <div className="space-y-2 text-sm text-gray-300">
                   <a href="/moje-zamowienia" className="block hover:text-white transition-colors cursor-pointer">Twoje zamówienia</a>
                   <a href="/moje-konto" className="block hover:text-white transition-colors cursor-pointer">Ustawienia konta</a>
                   <a href="/lista-zyczen" className="block hover:text-white transition-colors cursor-pointer">Ulubione</a>
                 </div>
               </div>
               
              <div className="bg-transparent border-2 border-white/20 rounded-xl px-4 pt-3 pb-3 text-left hover:border-white/40 transition-colors h-full flex flex-col justify-start">
                <h4 className="text-white font-semibold pb-2 mb-3 border-b border-gray-800 flex items-center gap-2"><CreditCard className="w-5 h-5 text-white/80" />Płatności</h4>
                 <div className="space-y-2 text-sm text-gray-300">
                   <a href="/formy-platnosci" className="block hover:text-white transition-colors cursor-pointer">Formy płatności</a>
                   <a href="/czas-koszty-dostawy" className="block hover:text-white transition-colors cursor-pointer">Czas i koszty dostawy</a>
                 </div>
               </div>
               
              <div className="bg-transparent border-2 border-white/20 rounded-xl px-4 pt-3 pb-3 text-left hover:border-white/40 transition-colors h-full flex flex-col justify-start">
                <h4 className="text-white font-semibold pb-2 mb-3 border-b border-gray-800 flex items-center gap-2"><Info className="w-5 h-5 text-white/80" />Informacje</h4>
                 <div className="space-y-2 text-sm text-gray-300">
                   <a href="/polityka-prywatnosci" className="block hover:text-white transition-colors cursor-pointer">Polityka prywatności</a>
                   <a href="/regulamin" className="block hover:text-white transition-colors cursor-pointer">Regulamin sklepu</a>
                   <a href="/zwroty-reklamacje" className="block hover:text-white transition-colors cursor-pointer">Zwroty i reklamacje</a>
                 </div>
               </div>
               
             </div>
           </div>

           {/* Mobile - Pobierz aplikację - pełna szerokość */}
           <div className="lg:hidden mb-8">
             <div className="bg-transparent border-2 border-white/20 rounded-xl px-4 pt-3 pb-3 text-left">
               <h4 className="text-white font-semibold pb-2 mb-3 border-b border-gray-800 flex items-center gap-2"><Download className="w-5 h-5 text-white/80" />Pobierz aplikację</h4>
               <div className="grid grid-cols-2 gap-3">
                 <a href="#" className="flex items-center bg-gradient-to-r from-black/20 to-black/30 border border-white/20 rounded-lg px-3 py-3 hover:bg-gradient-to-l hover:from-black/30 hover:to-black/20 hover:border-white/40  transition-all duration-300 cursor-pointer">
                   <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3  transition-transform duration-300">
                     <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                     </svg>
                   </div>
                   <div className="text-left">
                     <p className="text-white text-xs">Pobierz z</p>
                     <p className="text-white font-semibold text-sm">App Store</p>
                   </div>
                 </a>
                 
                 <a href="#" className="flex items-center bg-gradient-to-r from-black/20 to-black/30 border border-white/20 rounded-lg px-3 py-3 hover:bg-gradient-to-l hover:from-black/30 hover:to-black/20 hover:border-white/40  transition-all duration-300 cursor-pointer">
                   <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3  transition-transform duration-300">
                     <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.545 8.635-8.847zm0-1.414L12.864 12l1.635-1.635L6.562 2.804l8.937 8.489zM14.918 20.482L17.22 18.18l-8.635-8.847 10.333 11.149z"/>
                     </svg>
                   </div>
                   <div className="text-left">
                     <p className="text-white text-xs">Pobierz z</p>
                     <p className="text-white font-semibold text-sm">Google Play</p>
                   </div>
                 </a>
               </div>
             </div>
           </div>

           {/* Desktop Grid */}
           <div className="hidden lg:grid lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-8 sm:gap-12">
          
          {/* Kontakt - pierwsza kolumna z większym odstępem */}
          <div className="lg:pr-12 lg:ml-4">
            <h4 className="text-lg font-semibold mb-6 text-white">Kontakt</h4>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-start">
                <MapPin className="w-4 h-4 mt-1 mr-2 text-gray-400" />
                <div>
                  <p className="text-gray-300">ul. Partyzantów 8/101, 80-254</p>
                  <p className="text-gray-300">Gdańsk, Polska</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-gray-400" />
                <a 
                  href="tel:+48535956932" 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  +48 535 956 932
                </a>
              </div>
              
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                <a 
                  href="mailto:kontakt@filler.pl" 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  kontakt@filler.pl
                </a>
              </div>
              
              <div className="flex items-start">
                <Clock className="w-4 h-4 mt-1 mr-2 text-gray-400" />
                <div>
                  <p className="text-gray-300">Czynne od poniedziałku do piątku,</p>
                  <p className="text-gray-300 font-semibold">w godzinach 8:00 - 18:00</p>
                </div>
              </div>
            </div>
            
          </div>

             {/* O firmie */}
             <div>
               <h4 className="text-lg font-semibold mb-6 text-white">O firmie</h4>
               <ul className="space-y-3">
                 <li><a href="/kontakt" className="text-gray-300 hover:text-white transition-colors">Kontakt</a></li>
                 <li><a href="/o-nas" className="text-gray-300 hover:text-white transition-colors">O nas</a></li>
                 <li><a href="/aplikacja-mobilna" className="text-gray-300 hover:text-white transition-colors">Aplikacja mobilna</a></li>
                 <li><a href="/program-lojalnosciowy" className="text-gray-300 hover:text-white transition-colors">Program lojalnościowy</a></li>
               </ul>
             </div>

          {/* Moje konto */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">Moje konto</h4>
            <ul className="space-y-3">
              <li><a href="/moje-zamowienia" className="text-gray-300 hover:text-white transition-colors">Twoje zamówienia</a></li>
              <li><a href="/moje-konto" className="text-gray-300 hover:text-white transition-colors">Ustawienia konta</a></li>
              <li><a href="/lista-zyczen" className="text-gray-300 hover:text-white transition-colors">Ulubione</a></li>
            </ul>
          </div>

          {/* Informacje (połączone z płatnościami) */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">Informacje</h4>
            <ul className="space-y-3">
              <li><a href="/formy-platnosci" className="text-gray-300 hover:text-white transition-colors">Formy płatności</a></li>
              <li><a href="/czas-koszty-dostawy" className="text-gray-300 hover:text-white transition-colors">Czas i koszty dostawy</a></li>
              <li><a href="/polityka-prywatnosci" className="text-gray-300 hover:text-white transition-colors">Polityka prywatności</a></li>
              <li><a href="/regulamin" className="text-gray-300 hover:text-white transition-colors">Regulamin sklepu</a></li>
              <li><a href="/zwroty-reklamacje" className="text-gray-300 hover:text-white transition-colors">Zwroty i reklamacje</a></li>
            </ul>
          </div>

          {/* Pobierz aplikację */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">Pobierz aplikację</h4>
            
            <div className="space-y-3">
              <a 
                href="#" 
                className="flex items-center bg-black border border-gray-600 rounded-lg px-4 py-3 hover:bg-gray-900 transition-colors group"
              >
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-white text-xs">Pobierz z</p>
                  <p className="text-white font-semibold text-sm">App Store</p>
                </div>
              </a>
              
              <a 
                href="#" 
                className="flex items-center bg-black border border-gray-600 rounded-lg px-4 py-3 hover:bg-gray-900 transition-colors group"
              >
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.545 8.635-8.847zm0-1.414L12.864 12l1.635-1.635L6.562 2.804l8.937 8.489zM14.918 20.482L17.22 18.18l-8.635-8.847 10.333 11.149z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-white text-xs">Pobierz z</p>
                  <p className="text-white font-semibold text-sm">Google Play</p>
                </div>
              </a>
            </div>
          </div>
           </div>

           {/* Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Filler. Wszystkie prawa zastrzeżone.
            </p>
            
            {/* Social Media Icons - Desktop only */}
            <div className="hidden lg:flex space-x-3 mt-4 md:mt-0">
              <a 
                href="https://facebook.com/filler" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center hover:bg-gray-700/50 transition-colors border border-gray-700/50"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              
              <a 
                href="https://instagram.com/filler" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800/50 rounded-lg flex items-center justify-center hover:bg-gray-700/50 transition-colors border border-gray-700/50"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
