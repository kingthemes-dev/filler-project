'use client';

import { Facebook, Instagram, Mail, Phone, MapPin, Clock, Award, Truck, Shield } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative bg-black text-white py-16 sm:py-20 mt-16 sm:mt-20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.15),transparent_50%)]"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_75%_75%,rgba(147,51,234,0.15),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%)] bg-[length:20px_20px]"></div>
      </div>
      
         <div className="relative max-w-[95vw] mx-auto px-4 sm:px-6">
           {/* Logo i kontakt - Mobile */}
           <div className="lg:hidden mb-8 -mt-4">
             <div className="bg-transparent border-2 border-white/20 rounded-xl px-4 py-4 mb-3">
               <div className="flex items-center mb-4">
                 <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                   <span className="text-white font-bold text-xl">F</span>
                 </div>
                 <h3 className="text-3xl font-bold">FILLER</h3>
               </div>
               
               <div className="flex justify-between items-start">
                 <div className="space-y-3 flex-1">
                   <div className="flex items-start">
                     <MapPin className="w-5 h-5 mt-0.5 mr-3 text-gray-400" />
                     <div>
                       <p className="text-gray-300 text-sm">ul. Partyzantów 8/101</p>
                       <p className="text-gray-300 text-sm">80-254 Gdańsk</p>
                     </div>
                   </div>
                   
                   <div className="flex items-center">
                     <Phone className="w-5 h-5 mr-3 text-gray-400" />
                     <a 
                       href="tel:+48535956932" 
                       className="text-gray-300 hover:text-white transition-colors text-sm"
                     >
                       +48 535 956 932
                     </a>
                   </div>
                   
                   <div className="flex items-center">
                     <Mail className="w-5 h-5 mr-3 text-gray-400" />
                     <a 
                       href="mailto:kontakt@filler.pl" 
                       className="text-gray-300 hover:text-white transition-colors text-sm"
                     >
                       kontakt@filler.pl
                     </a>
                   </div>
                   
                   <div className="flex items-start">
                     <Clock className="w-5 h-5 mt-0.5 mr-3 text-gray-400" />
                     <div>
                       <p className="text-gray-300 text-sm">Poniedziałek - Piątek</p>
                       <p className="text-gray-300 font-semibold text-sm">8:00 - 18:00</p>
                     </div>
                   </div>
                 </div>
                 
                 {/* Social Media - po prawej */}
                 <div className="flex flex-col space-y-3 ml-6">
                   <a 
                     href="https://facebook.com/filler" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all duration-300 border border-white/20 hover:border-white/40 group"
                     aria-label="Facebook"
                   >
                     <Facebook className="w-6 h-6 text-white group-hover:text-blue-400 transition-colors duration-300" />
                   </a>
                   
                   <a 
                     href="https://instagram.com/filler" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all duration-300 border border-white/20 hover:border-white/40 group"
                     aria-label="Instagram"
                   >
                     <Instagram className="w-6 h-6 text-white group-hover:text-pink-400 transition-colors duration-300" />
                   </a>
                 </div>
               </div>
             </div>
           </div>

           {/* Mobile Tabs */}
           <div className="lg:hidden mb-8 -mt-4">
             <div className="grid grid-cols-2 gap-3">
               <div className="bg-transparent border-2 border-white/20 rounded-xl px-4 pt-3 pb-3 text-left hover:border-white/40 transition-colors h-full flex flex-col justify-start">
                 <h4 className="text-white font-semibold pb-2 mb-3 border-b border-white/20">O firmie</h4>
                 <div className="space-y-2 text-sm text-gray-300">
                   <a href="/kontakt" className="block hover:text-white transition-colors cursor-pointer">Kontakt</a>
                   <a href="/o-nas" className="block hover:text-white transition-colors cursor-pointer">O nas</a>
                   <a href="/aplikacja-mobilna" className="block hover:text-white transition-colors cursor-pointer">Aplikacja mobilna</a>
                   <a href="/program-lojalnosciowy" className="block hover:text-white transition-colors cursor-pointer">Program lojalnościowy</a>
                 </div>
               </div>
               
               <div className="bg-transparent border-2 border-white/20 rounded-xl px-4 pt-3 pb-3 text-left hover:border-white/40 transition-colors h-full flex flex-col justify-start">
                 <h4 className="text-white font-semibold pb-2 mb-3 border-b border-white/20">Moje konto</h4>
                 <div className="space-y-2 text-sm text-gray-300">
                   <a href="/moje-zamowienia" className="block hover:text-white transition-colors cursor-pointer">Twoje zamówienia</a>
                   <a href="/moje-konto" className="block hover:text-white transition-colors cursor-pointer">Ustawienia konta</a>
                   <a href="/lista-zyczen" className="block hover:text-white transition-colors cursor-pointer">Ulubione</a>
                 </div>
               </div>
               
               <div className="bg-transparent border-2 border-white/20 rounded-xl px-4 pt-3 pb-3 text-left hover:border-white/40 transition-colors h-full flex flex-col justify-start">
                 <h4 className="text-white font-semibold pb-2 mb-3 border-b border-white/20">Płatności</h4>
                 <div className="space-y-2 text-sm text-gray-300">
                   <a href="/formy-platnosci" className="block hover:text-white transition-colors cursor-pointer">Formy płatności</a>
                   <a href="/czas-koszty-dostawy" className="block hover:text-white transition-colors cursor-pointer">Czas i koszty dostawy</a>
                 </div>
               </div>
               
               <div className="bg-transparent border-2 border-white/20 rounded-xl px-4 pt-3 pb-3 text-left hover:border-white/40 transition-colors h-full flex flex-col justify-start">
                 <h4 className="text-white font-semibold pb-2 mb-3 border-b border-white/20">Informacje</h4>
                 <div className="space-y-2 text-sm text-gray-300">
                   <a href="/polityka-prywatnosci" className="block hover:text-white transition-colors cursor-pointer">Polityka prywatności</a>
                   <a href="/regulamin" className="block hover:text-white transition-colors cursor-pointer">Regulamin sklepu</a>
                   <a href="/zwroty-reklamacje" className="block hover:text-white transition-colors cursor-pointer">Zwroty i reklamacje</a>
                 </div>
               </div>
             </div>
           </div>

           {/* Desktop Grid */}
           <div className="hidden lg:grid lg:grid-cols-5 gap-8 sm:gap-12">
          
          {/* Logo i kontakt */}
          <div>
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold text-xl">F</span>
              </div>
              <h3 className="text-3xl font-bold">FILLER</h3>
            </div>
            
            <div className="space-y-4 mb-8">
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
              
              <div className="flex items-start">
                <Clock className="w-5 h-5 mt-0.5 mr-3 text-gray-400" />
                <div>
                  <p className="text-gray-300">Poniedziałek - Piątek</p>
                  <p className="text-gray-300 font-semibold">8:00 - 18:00</p>
                </div>
              </div>
            </div>
            
            {/* Social Media */}
            <div className="flex space-x-3">
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

          {/* Płatności */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">Płatności</h4>
            <ul className="space-y-3">
              <li><a href="/formy-platnosci" className="text-gray-300 hover:text-white transition-colors">Formy płatności</a></li>
              <li><a href="/czas-koszty-dostawy" className="text-gray-300 hover:text-white transition-colors">Czas i koszty dostawy</a></li>
            </ul>
          </div>

          {/* Informacje */}
          <div>
            <h4 className="text-lg font-semibold mb-6 text-white">Informacje</h4>
            <ul className="space-y-3">
              <li><a href="/polityka-prywatnosci" className="text-gray-300 hover:text-white transition-colors">Polityka prywatności</a></li>
              <li><a href="/regulamin" className="text-gray-300 hover:text-white transition-colors">Regulamin sklepu</a></li>
              <li><a href="/zwroty-reklamacje" className="text-gray-300 hover:text-white transition-colors">Zwroty i reklamacje</a></li>
            </ul>
          </div>
           </div>

           {/* Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Filler. Wszystkie prawa zastrzeżone.
            </p>
            
            {/* Social Media Icons */}
            <div className="flex space-x-3 mt-4 md:mt-0">
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
