'use client';

import { usePathname } from 'next/navigation';
import Breadcrumbs from './breadcrumbs';
import { Home, FileText } from 'lucide-react';

// Map slugs to readable labels
const pageLabels: Record<string, string> = {
  'sklep': 'Sklep',
  'o-nas': 'O nas',
  'kontakt': 'Kontakt',
  'koszyk': 'Koszyk',
  'lista-zyczen': 'Lista życzeń',
  'moje-konto': 'Moje konto',
  'moje-zamowienia': 'Moje zamówienia',
  'moje-faktury': 'Moje faktury',
  'produkt': 'Produkt',
  'wyszukiwanie': 'Wyszukiwanie',
  'polityka-prywatnosci': 'Polityka prywatności',
  'regulamin': 'Regulamin',
  'checkout': 'Kasa',
};

export default function GlobalBreadcrumbs() {
  const pathname = usePathname();
  
  // Don't show breadcrumbs on homepage
  if (pathname === '/') {
    return null;
  }
  
  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const breadcrumbs = [
      { label: 'Strona główna', href: '/', icon: Home }
    ];
    
    const segments = pathname.split('/').filter(Boolean);
    
    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label = pageLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({ label, href, icon: FileText });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  
  return (
    <div className="mt-12 pb-4 sm:pb-6 px-4 lg:px-8 bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-2xl p-6 text-white">
      <div className="flex items-center justify-between gap-4 lg:gap-8">
        <h1 className="text-2xl font-bold text-white">
          {breadcrumbs[breadcrumbs.length - 1].label}
        </h1>
        <div className="ml-auto [&_*]:text-white">
          <Breadcrumbs items={breadcrumbs} variant="minimal" size="sm" showHomeIcon={true} />
        </div>
      </div>
    </div>
  );
}

