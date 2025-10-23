'use client';

import { motion } from 'framer-motion';

const announcements = [
  '🎉 DARMOWA DOSTAWA OD 200ZŁ - SPRAWDŹ SZCZEGÓŁY',
  '🔥 NOWOŚCI W KOSMETYKACH KOREAŃSKICH - DO -30%',
  '💎 MEZOTERAPIA I NIĆ - PROFESJONALNE PRODUKTY'
];

export default function TopBar() {
  return (
    <div className="bg-gradient-to-r from-gray-900 via-black to-gray-800 text-white overflow-hidden relative z-10" data-topbar>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-white/5 to-transparent"></div>
      </div>
      
      <div className="relative h-7 flex items-center z-10">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: ['100vw', '-100vw'],
          }}
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {announcements.map((announcement, index) => (
            <span
              key={index}
              className="inline-block mx-8 text-xs font-medium tracking-wider uppercase"
            >
              {announcement}
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {announcements.map((announcement, index) => (
            <span
              key={`duplicate-${index}`}
              className="inline-block mx-8 text-xs font-medium tracking-wider uppercase"
            >
              {announcement}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
