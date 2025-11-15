'use client';

import { usePathname } from 'next/navigation';
import Footer from '@/components/ui/footer';

export function ConditionalFooter() {
  const pathname = usePathname();

  // Don't show footer on admin pages
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return <Footer />;
}
