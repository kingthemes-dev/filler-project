import { AdminNav } from '@/components/admin-nav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="py-6">
        {children}
      </main>
    </div>
  );
}
