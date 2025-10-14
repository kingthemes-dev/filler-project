'use client';

import { motion } from 'framer-motion';

const announcements = [
  '🎉 DARMOWA DOSTAWA OD 200ZŁ - SPRAWDŹ SZCZEGÓŁY',
  '🔥 NOWOŚCI W KOSMETYKACH KOREAŃSKICH - DO -30%',
  '💎 MEZOTERAPIA I NIĆ - PROFESJONALNE PRODUKTY'
];

export default function TopBar() {
  return (
    <div className="bg-black text-white overflow-hidden" data-topbar>
      <div className="relative h-12 flex items-center">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: ['100vw', '-100vw'],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {announcements.map((announcement, index) => (
            <span
              key={index}
              className="inline-block mx-8 text-sm font-medium tracking-wider uppercase"
            >
              {announcement}
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {announcements.map((announcement, index) => (
            <span
              key={`duplicate-${index}`}
              className="inline-block mx-8 text-sm font-medium tracking-wider uppercase"
            >
              {announcement}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
