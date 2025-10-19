'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function AdminLogin() {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        // Set admin token cookie
        document.cookie = `admin-token=${token}; path=/; max-age=86400; secure; samesite=strict`;
        router.push('/admin');
      } else {
        setError('Nieprawidłowy token administratora');
      }
    } catch (err) {
      setError('Błąd połączenia. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-purple-600 rounded-full flex items-center justify-center">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Admin Panel
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Wprowadź token administratora aby kontynuować
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Logowanie</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="admin-token">Token Administratora</Label>
                <div className="relative mt-1">
                  <Input
                    id="admin-token"
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Wprowadź token administratora"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Token jest wymagany do dostępu do panelu administracyjnego
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !token.trim()}
              >
                {loading ? 'Logowanie...' : 'Zaloguj się'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Informacje dla deweloperów:
              </h4>
              <p className="text-xs text-gray-600">
                Domyślny token: <code className="bg-gray-200 px-1 rounded">admin-2024-secure-token</code>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Można go zmienić w zmiennej środowiskowej <code className="bg-gray-200 px-1 rounded">ADMIN_TOKEN</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
