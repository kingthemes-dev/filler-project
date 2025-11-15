'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Trash2,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
  Cookie,
  Database,
  Lock,
  Eye,
  Edit,
} from 'lucide-react';
import {
  useAuthUser,
  useAuthIsAuthenticated,
  useAuthToken,
} from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '@/components/cookie-consent';
import type {
  GDPRExportResponse,
  GDPRDeleteResponse,
  GDPRPortabilityResponse,
} from '@/types/gdpr';

export default function MyDataPage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAuthenticated = useAuthIsAuthenticated();
  const token = useAuthToken();
  const { consent, preferences, updateConsent, cookieManager } =
    useCookieConsent();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [exportData, setExportData] = useState<unknown>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [activeTab, setActiveTab] = useState<'export' | 'delete' | 'cookies'>(
    'export'
  );

  // Redirect if not authenticated
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.push('/');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return null;
  }

  // Export data
  const handleExportData = async (format: 'json' | 'csv' = 'json') => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const authToken = token || localStorage.getItem('auth_token');

      if (!authToken) {
        setError('Brak tokenu autoryzacji. Zaloguj się ponownie.');
        setLoading(false);
        return;
      }

      let response: Response;
      if (format === 'json') {
        response = await fetch('/api/gdpr/export?format=json', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });
      } else {
        response = await fetch('/api/gdpr/portability', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ format: 'csv' }),
        });
      }

      if (!response.ok) {
        const errorData = (await response.json()) as {
          error?: string;
          message?: string;
        };
        throw new Error(errorData.message || errorData.error || 'Błąd eksportu danych');
      }

      if (format === 'csv') {
        // Download CSV file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moje-dane-${user.id}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setSuccess('Dane zostały wyeksportowane w formacie CSV');
      } else {
        // Download JSON file
        const data = (await response.json()) as GDPRExportResponse;
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moje-dane-${user.id}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setExportData(data.data);
        setSuccess('Dane zostały wyeksportowane w formacie JSON');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Wystąpił błąd podczas eksportu danych'
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete data
  const handleDeleteData = async () => {
    if (!deleteEmail || deleteEmail !== user.email) {
      setError('Email musi odpowiadać adresowi konta');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const authToken = token || localStorage.getItem('auth_token');

      if (!authToken) {
        setError('Brak tokenu autoryzacji. Zaloguj się ponownie.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/gdpr/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: deleteEmail,
          confirmation: true,
          reason: deleteReason,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as {
          error?: string;
          message?: string;
        };
        throw new Error(errorData.message || errorData.error || 'Błąd usuwania danych');
      }

      const data = (await response.json()) as GDPRDeleteResponse;
      setSuccess(data.message || 'Twoje dane zostały usunięte');
      setShowDeleteConfirm(false);

      // Logout user after data deletion
      setTimeout(() => {
        router.push('/');
        window.location.reload();
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Wystąpił błąd podczas usuwania danych'
      );
    } finally {
      setLoading(false);
    }
  };

  // Portability
  const handlePortability = async (format: 'json' | 'csv' = 'json') => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const authToken = token || localStorage.getItem('auth_token');

      if (!authToken) {
        setError('Brak tokenu autoryzacji. Zaloguj się ponownie.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/gdpr/portability', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as {
          error?: string;
          message?: string;
        };
        throw new Error(errorData.message || errorData.error || 'Błąd przenoszenia danych');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moje-dane-przenoszenie-${user.id}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const data = (await response.json()) as GDPRPortabilityResponse;
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: 'application/json',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moje-dane-przenoszenie-${user.id}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      setSuccess('Dane zostały wyeksportowane do przeniesienia');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Wystąpił błąd podczas przenoszenia danych'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Moje dane"
        subtitle="Zarządzaj swoimi danymi osobowymi zgodnie z RODO"
      />

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'export'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Eksport danych
            </div>
          </button>
          <button
            onClick={() => setActiveTab('delete')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'delete'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Usunięcie danych
            </div>
          </button>
          <button
            onClick={() => setActiveTab('cookies')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'cookies'
                ? 'border-b-2 border-gray-900 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Cookie className="w-4 h-4" />
              Zgoda na cookies
            </div>
          </button>
        </div>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="w-5 h-5" />
              <p className="font-medium">{error}</p>
            </div>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <p className="font-medium">{success}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Eksport danych
                </h3>
                <p className="text-gray-600 text-sm">
                  Pobierz kopię wszystkich swoich danych w formacie JSON lub CSV.
                  Dane zawierają informacje o koncie, zamówieniach, recenzjach i
                  ulubionych produktach.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => handleExportData('json')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Pobierz JSON
              </Button>
              <Button
                onClick={() => handleExportData('csv')}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Pobierz CSV
              </Button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Przenoszenie danych
                </h3>
                <p className="text-gray-600 text-sm">
                  Pobierz swoje dane w formacie umożliwiającym przeniesienie do
                  innego serwisu (prawo do przenoszenia danych).
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => handlePortability('json')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Pobierz JSON
              </Button>
              <Button
                onClick={() => handlePortability('csv')}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Pobierz CSV
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Delete Tab */}
      {activeTab === 'delete' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Usunięcie danych (Prawo do bycia zapomnianym)
                </h3>
                <p className="text-red-800 text-sm mb-4">
                  Usunięcie danych jest nieodwracalne. Po usunięciu danych:
                </p>
                <ul className="list-disc list-inside text-red-800 text-sm space-y-2 mb-4">
                  <li>Twoje konto zostanie anonimizowane</li>
                  <li>Dane osobowe zostaną usunięte lub anonimizowane</li>
                  <li>Niektóre dane mogą być zachowane zgodnie z obowiązującymi przepisami prawnymi (np. faktury)</li>
                </ul>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Usuń moje dane
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Potwierdź swój email
                  </label>
                  <input
                    type="email"
                    value={deleteEmail}
                    onChange={e => setDeleteEmail(e.target.value)}
                    placeholder={user.email}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Powód (opcjonalnie)
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                    placeholder="Powód usunięcia danych..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={handleDeleteData}
                    disabled={loading || deleteEmail !== user.email}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Potwierdź usunięcie
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteEmail('');
                      setDeleteReason('');
                    }}
                    variant="outline"
                  >
                    Anuluj
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Cookies Tab */}
      {activeTab === 'cookies' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Cookie className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Zarządzanie zgodą na cookies
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Zarządzaj swoją zgodą na cookies. Możesz zmienić swoje
                  preferencje w dowolnym momencie.
                </p>

                {consent && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Zgoda z dnia:{' '}
                      {new Date(consent.created_at).toLocaleDateString('pl-PL')}
                    </p>
                    {consent.updated_at !== consent.created_at && (
                      <p className="text-sm text-gray-600">
                        Ostatnia aktualizacja:{' '}
                        {new Date(consent.updated_at).toLocaleDateString('pl-PL')}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        Niezbędne cookies
                      </p>
                      <p className="text-sm text-gray-600">
                        Zawsze włączone
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Aktywne
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        Analityczne cookies
                      </p>
                      <p className="text-sm text-gray-600">
                        Google Analytics, Google Tag Manager
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        preferences?.analytics
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preferences?.analytics ? 'Aktywne' : 'Nieaktywne'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        Marketingowe cookies
                      </p>
                      <p className="text-sm text-gray-600">
                        Facebook Pixel, Google Ads
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        preferences?.marketing
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preferences?.marketing ? 'Aktywne' : 'Nieaktywne'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        Cookies preferencji
                      </p>
                      <p className="text-sm text-gray-600">
                        Ustawienia użytkownika
                      </p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        preferences?.preferences
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {preferences?.preferences ? 'Aktywne' : 'Nieaktywne'}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    onClick={() => {
                      // Trigger cookie consent modal
                      window.dispatchEvent(new CustomEvent('openCookieConsent'));
                    }}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Zmień ustawienia cookies
                  </Button>
                </div>

                <div className="mt-4">
                  <Link
                    href="/polityka-prywatnosci"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Dowiedz się więcej o cookies w polityce prywatności
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </PageContainer>
  );
}

