import { Metadata } from 'next';
import { CookieSettingsButton } from './cookie-settings-button';

export const metadata: Metadata = {
  title: 'Polityka Prywatności - King Beauty Store',
  description:
    'Polityka prywatności sklepu internetowego King Beauty Store. Dowiedz się jak chronimy Twoje dane osobowe.',
};

export default function PolitykaPrywatnosciPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Polityka Prywatności
          </h1>
          <p className="text-lg text-gray-600">
            Dowiedz się jak chronimy i przetwarzamy Twoje dane osobowe
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-8">
          {/* Wprowadzenie */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Wprowadzenie
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed mb-4">
                Niniejsza Polityka Prywatności określa zasady przetwarzania i
                ochrony danych osobowych przekazanych przez Użytkowników w
                związku z korzystaniem ze sklepu internetowego
                <strong> King Beauty Store</strong>.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <strong>Administratorem</strong> Twoich danych osobowych jest
                  <strong> King Beauty Sp. z o.o.</strong> z siedzibą w
                  Warszawie, ul. Przykładowa 123, 00-001 Warszawa, NIP:
                  1234567890, REGON: 123456789.
                </p>
              </div>
            </div>
          </section>

          {/* Podstawa prawna */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Podstawa prawna przetwarzania danych
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Przetwarzamy Twoje dane na podstawie:
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-green-100 text-green-800 rounded-full text-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Wykonanie umowy (art. 6 ust. 1 lit. b RODO)
                      </h4>
                      <p className="text-gray-700 text-sm mt-1">
                        Realizacja zamówień, obsługa klienta, dostawa produktów
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Prawnie uzasadniony interes (art. 6 ust. 1 lit. f RODO)
                      </h4>
                      <p className="text-gray-700 text-sm mt-1">
                        Marketing bezpośredni, analiza statystyk, bezpieczeństwo
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-purple-100 text-purple-800 rounded-full text-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Zgoda (art. 6 ust. 1 lit. a RODO)
                      </h4>
                      <p className="text-gray-700 text-sm mt-1">
                        Newsletter, komunikaty marketingowe, cookies
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-orange-100 text-orange-800 rounded-full text-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Obowiązek prawny (art. 6 ust. 1 lit. c RODO)
                      </h4>
                      <p className="text-gray-700 text-sm mt-1">
                        Wystawianie faktur, rozliczenia podatkowe
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Jakie dane zbieramy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Jakie dane osobowe zbieramy
            </h2>
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-green-900 mb-3">
                  📋 Dane podawane dobrowolnie
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-green-800 mb-2">
                      Dane osobowe:
                    </h4>
                    <ul className="space-y-1 text-green-700 text-sm">
                      <li>• Imię i nazwisko</li>
                      <li>• Adres email</li>
                      <li>• Numer telefonu</li>
                      <li>• Adres dostawy/rozliczeniowy</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-800 mb-2">
                      Dane biznesowe:
                    </h4>
                    <ul className="space-y-1 text-green-700 text-sm">
                      <li>• Nazwa firmy</li>
                      <li>• NIP (dla faktury)</li>
                      <li>• Adres firmy</li>
                      <li>• Preferencje zakupowe</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-3">
                  🔍 Dane zbierane automatycznie
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">
                      Dane techniczne:
                    </h4>
                    <ul className="space-y-1 text-blue-700 text-sm">
                      <li>• Adres IP</li>
                      <li>• Typ przeglądarki</li>
                      <li>• System operacyjny</li>
                      <li>• Strona wejściowa/wyjściowa</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">
                      Dane behawioralne:
                    </h4>
                    <ul className="space-y-1 text-blue-700 text-sm">
                      <li>• Historia zakupów</li>
                      <li>• Preferencje produktowe</li>
                      <li>• Czas spędzony na stronie</li>
                      <li>• Źródło ruchu</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Cele przetwarzania */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Cele przetwarzania danych
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      🛒
                    </div>
                    <h3 className="font-medium text-gray-900">
                      Realizacja zamówień
                    </h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Przetwarzanie zamówień, obsługa płatności, organizacja
                    dostawy produktów
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      💬
                    </div>
                    <h3 className="font-medium text-gray-900">
                      Obsługa klienta
                    </h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Odpowiadanie na zapytania, rozwiązywanie problemów, obsługa
                    reklamacji
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      📊
                    </div>
                    <h3 className="font-medium text-gray-900">
                      Analiza i statystyki
                    </h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Analiza zachowań użytkowników, optymalizacja strony, raporty
                    biznesowe
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                      📧
                    </div>
                    <h3 className="font-medium text-gray-900">Marketing</h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Newsletter, promocje, rekomendacje produktów, kampanie
                    reklamowe
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      🔒
                    </div>
                    <h3 className="font-medium text-gray-900">
                      Bezpieczeństwo
                    </h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Ochrona przed oszustwami, wykrywanie nieprawidłowości,
                    backup danych
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                      📄
                    </div>
                    <h3 className="font-medium text-gray-900">
                      Obowiązki prawne
                    </h3>
                  </div>
                  <p className="text-gray-700 text-sm">
                    Wystawianie faktur, rozliczenia podatkowe, archiwizacja
                    dokumentów
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Udostępnianie danych */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Komu udostępniamy dane
            </h2>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-yellow-900 mb-3">
                  ⚠️ Zasada ograniczenia dostępu
                </h3>
                <p className="text-yellow-800 text-sm">
                  Twoje dane osobowe są udostępniane wyłącznie podmiotom, które
                  potrzebują ich do realizacji określonych celów i tylko w
                  niezbędnym zakresie.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Podmioty wewnętrzne:
                  </h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                      Pracownicy obsługi klienta
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                      Dział księgowości
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                      Dział IT i bezpieczeństwa
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                      Zespół marketingu
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Podmioty zewnętrzne:
                  </h3>
                  <ul className="space-y-2 text-gray-700 text-sm">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      Firmy kurierskie (DPD, InPost)
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      Dostawcy płatności (PayU, Przelewy24)
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      Dostawcy usług IT (hosting, email)
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      Firmy księgowe i prawne
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-900 mb-2">
                  Organy publiczne
                </h3>
                <p className="text-red-800 text-sm">
                  Dane mogą być udostępnione organom publicznym (np. Urzędowi
                  Skarbowemu, organom ścigania) wyłącznie na podstawie przepisów
                  prawa.
                </p>
              </div>
            </div>
          </section>

          {/* Okres przechowywania */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Okres przechowywania danych
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  📅 Zasady przechowywania danych
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Dane konta użytkownika
                      </h4>
                      <p className="text-sm text-gray-600">
                        Do momentu usunięcia konta lub cofnięcia zgody
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      Do 3 lat
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Dane zamówień
                      </h4>
                      <p className="text-sm text-gray-600">
                        Faktury, dane dostawy, historia zakupów
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      5 lat
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Dane marketingowe
                      </h4>
                      <p className="text-sm text-gray-600">
                        Newsletter, preferencje, analizy
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      Do cofnięcia zgody
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Dane techniczne
                      </h4>
                      <p className="text-sm text-gray-600">
                        Logi serwera, adresy IP, cookies
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      2 lata
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Dane księgowe
                      </h4>
                      <p className="text-sm text-gray-600">
                        Faktury, dokumenty księgowe
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-600">
                      5 lat
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Prawa użytkownika */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Twoje prawa
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">
                    ✅ Prawo dostępu
                  </h3>
                  <p className="text-green-800 text-sm">
                    Możesz żądać informacji o tym, jakie dane przetwarzamy i w
                    jakim celu.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">
                    ✏️ Prawo sprostowania
                  </h3>
                  <p className="text-blue-800 text-sm">
                    Możesz żądać poprawienia nieprawidłowych lub uzupełnienia
                    niekompletnych danych.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-900 mb-2">
                    🗑️ Prawo usunięcia
                  </h3>
                  <p className="text-red-800 text-sm">
                    Możesz żądać usunięcia danych w określonych przypadkach
                    (&quot;prawo do bycia zapomnianym&quot;).
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-900 mb-2">
                    ⏸️ Prawo ograniczenia
                  </h3>
                  <p className="text-yellow-800 text-sm">
                    Możesz żądać ograniczenia przetwarzania danych w określonych
                    sytuacjach.
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-medium text-purple-900 mb-2">
                    📤 Prawo przenoszenia
                  </h3>
                  <p className="text-purple-800 text-sm">
                    Możesz otrzymać swoje dane w formacie ustrukturyzowanym i
                    przenieść je do innego administratora.
                  </p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-medium text-orange-900 mb-2">
                    🚫 Prawo sprzeciwu
                  </h3>
                  <p className="text-orange-800 text-sm">
                    Możesz sprzeciwić się przetwarzaniu danych w celach
                    marketingowych lub z innych powodów.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mt-6">
              <h3 className="font-medium text-gray-900 mb-3">
                Jak skorzystać ze swoich praw?
              </h3>
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start">
                  <span className="inline-block w-6 h-6 bg-gray-200 text-gray-700 rounded-full text-center text-sm font-medium mr-3 mt-0.5">
                    1
                  </span>
                  <p>
                    Wyślij email na adres:{' '}
                    <strong>rodo@kingbeautystore.pl</strong>
                  </p>
                </div>
                <div className="flex items-start">
                  <span className="inline-block w-6 h-6 bg-gray-200 text-gray-700 rounded-full text-center text-sm font-medium mr-3 mt-0.5">
                    2
                  </span>
                  <p>Opisz dokładnie, jakie prawo chcesz wykonać</p>
                </div>
                <div className="flex items-start">
                  <span className="inline-block w-6 h-6 bg-gray-200 text-gray-700 rounded-full text-center text-sm font-medium mr-3 mt-0.5">
                    3
                  </span>
                  <p>
                    Dołącz dokument potwierdzający tożsamość (skan dowodu
                    osobistego)
                  </p>
                </div>
                <div className="flex items-start">
                  <span className="inline-block w-6 h-6 bg-gray-200 text-gray-700 rounded-full text-center text-sm font-medium mr-3 mt-0.5">
                    4
                  </span>
                  <p>Odpowiemy w ciągu 30 dni roboczych</p>
                </div>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Pliki cookies
            </h2>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-3">
                  🍪 Co to są cookies?
                </h3>
                <p className="text-blue-800 text-sm mb-4">
                  Cookies to małe pliki tekstowe zapisywane na Twoim urządzeniu,
                  które pomagają nam poprawiać funkcjonalność strony i
                  dostarczać lepsze doświadczenia użytkownika.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">
                    🔧 Niezbędne
                  </h4>
                  <p className="text-green-800 text-sm mb-3">
                    Cookies wymagane do podstawowego działania strony (koszyk,
                    logowanie).
                  </p>
                  <p className="text-green-700 text-xs">
                    Brak możliwości wyłączenia
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    📊 Analityczne
                  </h4>
                  <p className="text-yellow-800 text-sm mb-3">
                    Cookies pomagające analizować ruch na stronie (Google
                    Analytics).
                  </p>
                  <p className="text-yellow-700 text-xs">
                    Można wyłączyć w ustawieniach
                  </p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-2">
                    🎯 Marketingowe
                  </h4>
                  <p className="text-purple-800 text-sm mb-3">
                    Cookies do personalizacji reklam i treści marketingowych.
                  </p>
                  <p className="text-purple-700 text-xs">Wymagają zgody</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  Zarządzanie cookies
                </h3>
                <p className="text-gray-700 text-sm mb-4">
                  Możesz zarządzać cookies w ustawieniach swojej przeglądarki
                  lub skorzystać z naszego panelu zarządzania cookies dostępnego
                  w stopce strony lub na stronie{' '}
                  <a
                    href="/moje-dane"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Moje dane
                  </a>
                  .
                </p>
                <CookieSettingsButton />
              </div>

              {/* Szczegółowa lista cookies */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Szczegółowa lista cookies
                </h3>
                <div className="space-y-6">
                  {/* Niezbędne cookies */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Niezbędne cookies
                    </h4>
                    <div className="space-y-2">
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">session</p>
                        <p className="text-sm text-gray-600">
                          Przechowywanie identyfikatora sesji użytkownika
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: Session | Dostawca: Filler.pl
                        </p>
                      </div>
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">auth_token</p>
                        <p className="text-sm text-gray-600">
                          Przechowywanie tokenu uwierzytelniania
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 1 rok | Dostawca: Filler.pl
                        </p>
                      </div>
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">cart</p>
                        <p className="text-sm text-gray-600">
                          Przechowywanie zawartości koszyka
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 30 dni | Dostawca: Filler.pl
                        </p>
                      </div>
                      <div className="pb-2">
                        <p className="font-medium text-gray-900">csrf_token</p>
                        <p className="text-sm text-gray-600">
                          Zabezpieczenie przed atakami CSRF
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: Session | Dostawca: Filler.pl
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Analityczne cookies */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Analityczne cookies
                    </h4>
                    <div className="space-y-2">
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">_ga</p>
                        <p className="text-sm text-gray-600">
                          Google Analytics - identyfikacja użytkownika
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 2 lata | Dostawca: Google
                        </p>
                      </div>
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">_ga_*</p>
                        <p className="text-sm text-gray-600">
                          Google Analytics - identyfikacja sesji
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 2 lata | Dostawca: Google
                        </p>
                      </div>
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">_gid</p>
                        <p className="text-sm text-gray-600">
                          Google Analytics - identyfikacja użytkownika
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 24 godziny | Dostawca: Google
                        </p>
                      </div>
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">_gat</p>
                        <p className="text-sm text-gray-600">
                          Google Analytics - ograniczenie żądań
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 1 minuta | Dostawca: Google
                        </p>
                      </div>
                      <div className="pb-2">
                        <p className="font-medium text-gray-900">_gtm_*</p>
                        <p className="text-sm text-gray-600">
                          Google Tag Manager - identyfikacja kontenera
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 2 lata | Dostawca: Google
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Marketingowe cookies */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Marketingowe cookies
                    </h4>
                    <div className="space-y-2">
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">_fbp</p>
                        <p className="text-sm text-gray-600">
                          Facebook Pixel - identyfikacja przeglądarki
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 90 dni | Dostawca: Facebook
                        </p>
                      </div>
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">_fbc</p>
                        <p className="text-sm text-gray-600">
                          Facebook Pixel - identyfikacja kampanii
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 90 dni | Dostawca: Facebook
                        </p>
                      </div>
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">fr</p>
                        <p className="text-sm text-gray-600">
                          Facebook Pixel - identyfikacja użytkownika
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 90 dni | Dostawca: Facebook
                        </p>
                      </div>
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">IDE</p>
                        <p className="text-sm text-gray-600">
                          Google Ads - identyfikacja użytkownika
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 2 lata | Dostawca: Google
                        </p>
                      </div>
                      <div className="pb-2">
                        <p className="font-medium text-gray-900">test_cookie</p>
                        <p className="text-sm text-gray-600">
                          Google Ads - testowanie wsparcia cookies
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 15 minut | Dostawca: Google
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cookies preferencji */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Cookies preferencji
                    </h4>
                    <div className="space-y-2">
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">
                          cookie_preferences
                        </p>
                        <p className="text-sm text-gray-600">
                          Przechowywanie preferencji zgody na cookies
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 1 rok | Dostawca: Filler.pl
                        </p>
                      </div>
                      <div className="border-b border-gray-200 pb-2">
                        <p className="font-medium text-gray-900">theme</p>
                        <p className="text-sm text-gray-600">
                          Przechowywanie preferencji motywu
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 1 rok | Dostawca: Filler.pl
                        </p>
                      </div>
                      <div className="pb-2">
                        <p className="font-medium text-gray-900">language</p>
                        <p className="text-sm text-gray-600">
                          Przechowywanie preferencji języka
                        </p>
                        <p className="text-xs text-gray-500">
                          Wygaśnięcie: 1 rok | Dostawca: Filler.pl
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Żądania RODO */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Twoje prawa RODO
            </h2>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-3">
                  📋 Zarządzanie danymi osobowymi
                </h3>
                <p className="text-blue-800 text-sm mb-4">
                  Masz prawo do zarządzania swoimi danymi osobowymi zgodnie z
                  RODO. Możesz wykonać następujące żądania:
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center">
                      📥
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">
                        Eksport danych
                      </h4>
                      <p className="text-blue-800 text-sm">
                        Pobierz kopię wszystkich swoich danych w formacie JSON
                        lub CSV. Dane zawierają informacje o koncie, zamówieniach,
                        recenzjach i ulubionych produktach.
                      </p>
                      <a
                        href="/moje-dane"
                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        Przejdź do strony Moje dane
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-100 text-red-800 rounded-full text-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center">
                      🗑️
                    </div>
                    <div>
                      <h4 className="font-medium text-red-900">
                        Usunięcie danych
                      </h4>
                      <p className="text-red-800 text-sm">
                        Usuń swoje dane osobowe (prawo do bycia zapomnianym).
                        Po usunięciu danych Twoje konto zostanie anonimizowane.
                        Niektóre dane mogą być zachowane zgodnie z obowiązującymi
                        przepisami prawnymi (np. faktury).
                      </p>
                      <a
                        href="/moje-dane"
                        className="text-red-600 hover:text-red-800 underline text-sm"
                      >
                        Przejdź do strony Moje dane
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 text-purple-800 rounded-full text-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center">
                      📤
                    </div>
                    <div>
                      <h4 className="font-medium text-purple-900">
                        Przenoszenie danych
                      </h4>
                      <p className="text-purple-800 text-sm">
                        Pobierz swoje dane w formacie umożliwiającym przeniesienie
                        do innego serwisu (prawo do przenoszenia danych).
                      </p>
                      <a
                        href="/moje-dane"
                        className="text-purple-600 hover:text-purple-800 underline text-sm"
                      >
                        Przejdź do strony Moje dane
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full text-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center">
                      ⏸️
                    </div>
                    <div>
                      <h4 className="font-medium text-yellow-900">
                        Ograniczenie przetwarzania
                      </h4>
                      <p className="text-yellow-800 text-sm">
                        Ogranicz przetwarzanie swoich danych w określonych
                        kategoriach (np. marketing, analityka).
                      </p>
                      <a
                        href="/moje-dane"
                        className="text-yellow-600 hover:text-yellow-800 underline text-sm"
                      >
                        Przejdź do strony Moje dane
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full text-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center">
                      ✏️
                    </div>
                    <div>
                      <h4 className="font-medium text-green-900">
                        Sprostowanie danych
                      </h4>
                      <p className="text-green-800 text-sm">
                        Popraw nieprawidłowe lub uzupełnij niekompletne dane.
                      </p>
                      <a
                        href="/moje-konto"
                        className="text-green-600 hover:text-green-800 underline text-sm"
                      >
                        Przejdź do strony Moje konto
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  Jak skorzystać ze swoich praw?
                </h3>
                <p className="text-gray-700 text-sm mb-3">
                  Możesz wykonać żądania RODO poprzez:
                </p>
                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                  <li>
                    Stronę{' '}
                    <a
                      href="/moje-dane"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Moje dane
                    </a>{' '}
                    (wymaga logowania)
                  </li>
                  <li>
                    Email na adres:{' '}
                    <a
                      href="mailto:rodo@filler.pl"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      rodo@filler.pl
                    </a>
                  </li>
                  <li>
                    Telefon:{' '}
                    <a
                      href="tel:+48535956932"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      +48 535 956 932
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Bezpieczeństwo */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Bezpieczeństwo danych
            </h2>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-green-900 mb-3">
                  🔒 Środki bezpieczeństwa
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-green-800 mb-2">
                      Ochrona techniczna:
                    </h4>
                    <ul className="space-y-1 text-green-700 text-sm">
                      <li>• Szyfrowanie SSL/TLS</li>
                      <li>• Regularne kopie zapasowe</li>
                      <li>• Monitoring bezpieczeństwa</li>
                      <li>• Kontrola dostępu</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-800 mb-2">
                      Ochrona organizacyjna:
                    </h4>
                    <ul className="space-y-1 text-green-700 text-sm">
                      <li>• Szkolenia pracowników</li>
                      <li>• Procedury bezpieczeństwa</li>
                      <li>• Audyty bezpieczeństwa</li>
                      <li>• Polityki dostępu</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-medium text-red-900 mb-2">
                  ⚠️ W przypadku naruszenia danych
                </h3>
                <p className="text-red-800 text-sm">
                  W przypadku naruszenia bezpieczeństwa danych osobowych,
                  zostaniesz powiadomiony w ciągu 72 godzin, jeśli istnieje
                  wysokie ryzyko naruszenia Twoich praw i wolności.
                </p>
              </div>
            </div>
          </section>

          {/* Kontakt i skargi */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Kontakt i skargi
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-3">
                  Dane kontaktowe do spraw RODO
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Inspektor Ochrony Danych:
                    </h4>
                    <div className="space-y-1 text-gray-700 text-sm">
                      <p>
                        <strong>Email:</strong> iod@kingbeautystore.pl
                      </p>
                      <p>
                        <strong>Telefon:</strong> +48 123 456 789
                      </p>
                      <p>
                        <strong>Godziny:</strong> Pn-Pt 9:00-17:00
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Administrator danych:
                    </h4>
                    <div className="space-y-1 text-gray-700 text-sm">
                      <p>
                        <strong>Email:</strong> rodo@kingbeautystore.pl
                      </p>
                      <p>
                        <strong>Adres:</strong> ul. Przykładowa 123, 00-001
                        Warszawa
                      </p>
                      <p>
                        <strong>NIP:</strong> 1234567890
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">
                  📞 Prawo do złożenia skargi
                </h3>
                <p className="text-blue-800 text-sm">
                  Masz prawo złożyć skargę do organu nadzorczego -
                  <strong> Prezesa Urzędu Ochrony Danych Osobowych</strong>{' '}
                  (PUODO), jeśli uważasz, że Twoje dane są przetwarzane
                  niezgodnie z prawem.
                </p>
                <div className="mt-3 text-blue-700 text-sm">
                  <p>
                    <strong>Adres:</strong> ul. Stawki 2, 00-193 Warszawa
                  </p>
                  <p>
                    <strong>Telefon:</strong> 22 531 77 77
                  </p>
                  <p>
                    <strong>Email:</strong> kancelaria@uodo.gov.pl
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Postanowienia końcowe */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Postanowienia końcowe
            </h2>
            <div className="prose prose-gray max-w-none">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Niniejsza Polityka Prywatności może być aktualizowana w każdym
                  czasie
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  O wszelkich zmianach poinformujemy Cię za pomocą emaila lub
                  ogłoszenia na stronie
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Kontynuowanie korzystania ze Sklepu oznacza akceptację zmian
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  W sprawach nieuregulowanych zastosowanie mają przepisy RODO i
                  polskiego prawa
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
