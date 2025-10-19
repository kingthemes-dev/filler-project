import { AdminNav } from '@/components/admin-nav';
import { LogoutButton } from '@/components/logout-button';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 bg-white shadow-sm min-h-screen flex flex-col">
          <div className="p-4 border-b">
            <h1 className="text-xl font-semibold">Admin Panel</h1>
          </div>
          <div className="flex-1 p-4">
            <AdminNav />
          </div>
          <div className="p-4 border-t">
            <LogoutButton />
          </div>
        </aside>
        <main className="flex-1 py-6 px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
