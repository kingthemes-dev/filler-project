import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Regulamin - King Beauty Store',
  description:
    'Regulamin sklepu internetowego King Beauty Store. Przeczytaj nasze warunki korzystania ze sklepu.',
};

export default function RegulaminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Regulamin</h1>
          <p className="text-lg text-gray-600">
            Warunki korzystania ze sklepu internetowego King Beauty Store
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
              1. Postanowienia ogólne
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed mb-4">
                Niniejszy regulamin określa zasady korzystania ze sklepu
                internetowego
                <strong> King Beauty Store</strong> (dalej: &quot;Sklep&quot;)
                dostępnego pod adresem
                <code className="bg-gray-100 px-2 py-1 rounded">
                  kingbeautystore.pl
                </code>
                .
              </p>
              <p className="text-gray-700 leading-relaxed">
                Sklep prowadzony jest przez{' '}
                <strong>King Beauty Sp. z o.o.</strong> z siedzibą w Warszawie,
                ul. Przykładowa 123, 00-001 Warszawa, NIP: 1234567890, REGON:
                123456789, wpisaną do rejestru przedsiębiorców KRS pod numerem
                0000123456.
              </p>
            </div>
          </section>

          {/* Definicje */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Definicje
            </h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Sklep</h3>
                <p className="text-gray-700">
                  Serwis internetowy dostępny pod adresem kingbeautystore.pl
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Konsument</h3>
                <p className="text-gray-700">
                  Osoba fizyczna dokonująca zakupu w Sklepie w celach
                  niezwiązanych z działalnością gospodarczą
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Produkty</h3>
                <p className="text-gray-700">
                  Kosmetyki profesjonalne, preparaty do mezoterapii oraz
                  akcesoria dostępne w Sklepie
                </p>
              </div>
            </div>
          </section>

          {/* Rejestracja */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Rejestracja i konto użytkownika
            </h2>
            <div className="prose prose-gray max-w-none">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Aby dokonać zakupu, należy założyć konto w Sklepie lub dokonać
                  zakupu jako gość
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Podczas rejestracji należy podać prawdziwe i aktualne dane
                  osobowe
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Użytkownik zobowiązany jest do zachowania poufności danych
                  logowania
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Sklep zastrzega sobie prawo do weryfikacji podanych danych
                </li>
              </ul>
            </div>
          </section>

          {/* Produkty */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Produkty i ceny
            </h2>
            <div className="prose prose-gray max-w-none">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Wszystkie produkty są oryginalne i pochodzą od autoryzowanych
                  dystrybutorów
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Ceny produktów podane są w złotych polskich (zł) i zawierają
                  podatek VAT
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Sklep zastrzega sobie prawo do zmiany cen produktów bez
                  wcześniejszego powiadomienia
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Produkty przeznaczone są wyłącznie dla profesjonalistów w
                  branży beauty
                </li>
              </ul>
            </div>
          </section>

          {/* Zamówienia */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Składanie zamówień
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 mb-4">
                Proces składania zamówienia składa się z następujących etapów:
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-medium text-blue-900 mb-2">
                    1. Wybór produktów
                  </h4>
                  <p className="text-blue-800 text-sm">
                    Dodaj wybrane produkty do koszyka
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-medium text-blue-900 mb-2">
                    2. Dane dostawy
                  </h4>
                  <p className="text-blue-800 text-sm">
                    Podaj adres dostawy i dane kontaktowe
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-medium text-blue-900 mb-2">
                    3. Płatność
                  </h4>
                  <p className="text-blue-800 text-sm">
                    Wybierz metodę płatności
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-medium text-blue-900 mb-2">
                    4. Potwierdzenie
                  </h4>
                  <p className="text-blue-800 text-sm">
                    Sprawdź i potwierdź zamówienie
                  </p>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Uwaga:</strong> Zamówienie zostanie przyjęte dopiero
                  po otrzymaniu potwierdzenia przez Sklep drogą elektroniczną.
                </p>
              </div>
            </div>
          </section>

          {/* Płatności */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Płatności i faktury
            </h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Dostępne metody płatności:
              </h3>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    💳
                  </div>
                  <span className="text-gray-700">
                    Karta płatnicza (Visa, Mastercard)
                  </span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    📱
                  </div>
                  <span className="text-gray-700">BLIK</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    🏦
                  </div>
                  <span className="text-gray-700">Przelew bankowy</span>
                </div>
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                    📦
                  </div>
                  <span className="text-gray-700">Płatność przy odbiorze</span>
                </div>
              </div>
              <p className="text-gray-700">
                Faktury VAT wystawiane są automatycznie po realizacji zamówienia
                i wysyłane na adres email.
              </p>
            </div>
          </section>

          {/* Dostawa */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Dostawa
            </h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Opcje dostawy:
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">Kurier DPD</h4>
                    <p className="text-sm text-gray-600">
                      Dostawa w ciągu 1-2 dni roboczych
                    </p>
                  </div>
                  <span className="font-semibold text-gray-900">15,00 zł</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      InPost Paczkomat
                    </h4>
                    <p className="text-sm text-gray-600">
                      Dostawa do paczkomatu w ciągu 1-2 dni
                    </p>
                  </div>
                  <span className="font-semibold text-gray-900">12,00 zł</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">Poczta Polska</h4>
                    <p className="text-sm text-gray-600">
                      Dostawa standardowa w ciągu 2-3 dni
                    </p>
                  </div>
                  <span className="font-semibold text-gray-900">10,00 zł</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Darmowa dostawa
                    </h4>
                    <p className="text-sm text-gray-600">
                      Przy zamówieniach powyżej 200 zł
                    </p>
                  </div>
                  <span className="font-semibold text-green-600">0,00 zł</span>
                </div>
              </div>
            </div>
          </section>

          {/* Zwroty */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Prawo odstąpienia od umowy
            </h2>
            <div className="prose prose-gray max-w-none">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-green-900 mb-3">
                  Masz prawo odstąpić od umowy w ciągu 14 dni
                </h3>
                <p className="text-green-800 mb-4">
                  Jako konsument masz prawo odstąpić od umowy kupna-sprzedaży
                  bez podania przyczyny w terminie 14 dni od otrzymania
                  produktu.
                </p>
                <div className="space-y-2 text-green-800 text-sm">
                  <p>• Zwróć produkt w oryginalnym opakowaniu</p>
                  <p>• Wypełnij formularz odstąpienia od umowy</p>
                  <p>• Wyślij produkt na nasz adres</p>
                  <p>• Zwrócimy koszty zakupu w ciągu 14 dni</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">
                  <strong>Uwaga:</strong> Prawo odstąpienia nie przysługuje w
                  przypadku produktów przygotowanych na specjalne zamówienie
                  konsumenta lub produktów, które ze względu na swój charakter
                  nie mogą zostać zwrócone.
                </p>
              </div>
            </div>
          </section>

          {/* Reklamacje */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Reklamacje i gwarancja
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 mb-4">
                W przypadku wad produktów przysługuje Ci prawo do reklamacji
                zgodnie z przepisami ustawy o prawach konsumenta.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-3">
                  Jak złożyć reklamację?
                </h3>
                <div className="space-y-3 text-blue-800">
                  <div className="flex items-start">
                    <span className="inline-block w-6 h-6 bg-blue-200 text-blue-900 rounded-full text-center text-sm font-medium mr-3 mt-0.5">
                      1
                    </span>
                    <p>
                      Skontaktuj się z nami:{' '}
                      <strong>reklamacje@kingbeautystore.pl</strong>
                    </p>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-block w-6 h-6 bg-blue-200 text-blue-900 rounded-full text-center text-sm font-medium mr-3 mt-0.5">
                      2
                    </span>
                    <p>Opisz problem i dołącz zdjęcia produktu</p>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-block w-6 h-6 bg-blue-200 text-blue-900 rounded-full text-center text-sm font-medium mr-3 mt-0.5">
                      3
                    </span>
                    <p>Wyślemy Ci instrukcje dalszego postępowania</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Ochrona danych */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Ochrona danych osobowych
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 mb-4">
                Administratorem Twoich danych osobowych jest King Beauty Sp. z
                o.o. Szczegółowe informacje o przetwarzaniu danych znajdziesz w
                <a
                  href="/polityka-prywatnosci"
                  className="text-black underline hover:no-underline"
                >
                  Polityce Prywatności
                </a>
                .
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Twoje prawa:</h3>
                <ul className="space-y-1 text-gray-700 text-sm">
                  <li>• Dostęp do danych osobowych</li>
                  <li>• Sprostowanie danych</li>
                  <li>• Usunięcie danych</li>
                  <li>• Ograniczenie przetwarzania</li>
                  <li>• Przenoszenie danych</li>
                  <li>• Sprzeciw wobec przetwarzania</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Postanowienia końcowe */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Postanowienia końcowe
            </h2>
            <div className="prose prose-gray max-w-none">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Sklep zastrzega sobie prawo do zmiany regulaminu w każdym
                  czasie
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  W sprawach nieuregulowanych niniejszym regulaminem
                  zastosowanie mają przepisy prawa polskiego
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-black rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Ewentualne spory rozstrzygane będą przez sąd właściwy dla
                  siedziby Sklepu
                </li>
              </ul>
            </div>
          </section>

          {/* Kontakt */}
          <section className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Kontakt
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Dane firmy</h3>
                <div className="space-y-1 text-gray-700 text-sm">
                  <p>
                    <strong>King Beauty Sp. z o.o.</strong>
                  </p>
                  <p>ul. Przykładowa 123</p>
                  <p>00-001 Warszawa</p>
                  <p>NIP: 1234567890</p>
                  <p>REGON: 123456789</p>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 mb-2">
                  Dane kontaktowe
                </h3>
                <div className="space-y-1 text-gray-700 text-sm">
                  <p>
                    <strong>Email:</strong> kontakt@kingbeautystore.pl
                  </p>
                  <p>
                    <strong>Telefon:</strong> +48 123 456 789
                  </p>
                  <p>
                    <strong>Godziny:</strong> Pn-Pt 9:00-17:00
                  </p>
                  <p>
                    <strong>Reklamacje:</strong> reklamacje@kingbeautystore.pl
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
