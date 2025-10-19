'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Activity, 
  Settings, 
  Home, 
  ShoppingCart,
  Users,
  Package
} from 'lucide-react';

const adminNavItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: Home,
  },
  {
    title: 'Performance',
    href: '/admin/performance',
    icon: Activity,
  },
  {
    title: 'API Status',
    href: '/admin/api-status',
    icon: BarChart3,
  },
  {
    title: 'Cache Status',
    href: '/admin/cache',
    icon: Package,
  },
  {
    title: 'WooCommerce',
    href: '/admin/woocommerce',
    icon: ShoppingCart,
  },
  {
    title: 'Logs',
    href: '/admin/logs',
    icon: Users,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Admin Panel
              </h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
