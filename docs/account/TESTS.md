# TESTS – Moduł Konto (Headless Woo)

## Zakres testów
- Unit (Jest):
  - Walidacje (NIP, telefon, email, imię, adres, kod pocztowy, hasła)
  - Mapowania statusów/metod płatności, funkcje pomocnicze (httpErrorMessage, format-price, request-dedup)
- E2E (Playwright):
  - Redirect/guard dla /moje-konto, skeleton na /lista-zyczen
  - (happy-path, za pomocą zmiennych środowiskowych) logowanie → /moje-zamowienia, lista zamówień, (opcjonalnie) podgląd faktury

## Uruchamianie testów
- Unit (w katalogu `apps/web`):
  ```bash
  npm run test
  ```
- E2E (wymaga zainstalowanych przeglądarek Playwright):
  ```bash
  # jednorazowo
  npm run e2e:init
  # ustaw dane testowe, np. w .env.local lub eksporcie
  export E2E_EMAIL="test@example.com"
  export E2E_PASSWORD="***"
  npm run e2e
  ```
  Uwaga: Scenariusze oznaczone warunkiem `hasCreds` zostaną pominięte, jeśli brak `Eelingen`.

## Lighthouse (mobile)
- Uruchom lokalny serwer: `npm run dev` (w `apps/web`), następnie:
  ```bash
  npm run lighthouse
  ```
- Wygenerowany raport: `apps/web/lighthouse-report.html`. Kluczowe metryki (LCP/CLS/INP) zanotuj w `account_optimization/AUDIT.md`.

## Metryki i raporty
- Coverage raport dla unit
- Playwright trace i screenshoty dla błędów

