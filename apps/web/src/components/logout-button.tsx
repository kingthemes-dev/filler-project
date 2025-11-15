'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = () => {
    // Clear admin token cookie
    document.cookie =
      'admin-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    // Redirect to login page
    router.push('/admin/king');
  };

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      className="w-full justify-start"
    >
      <LogOut className="h-4 w-4 mr-2" />
      Wyloguj się
    </Button>
  );
}
