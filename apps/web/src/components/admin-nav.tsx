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
  Package,
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
    <nav className="space-y-2">
      {adminNavItems.map(item => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Icon className="h-4 w-4 mr-3" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
