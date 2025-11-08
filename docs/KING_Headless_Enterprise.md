# KING Headless Enterprise – kompendium

## Strategia biznesowo-techniczna
- **Model**: Sklep headless na WooCommerce REST. Front (Next.js 14) komunikuje się wyłącznie przez REST (standardowe `/wp-json/wc/v3/*` + custom MU‑pluginy). **Brak GraphQL** – wszystkie integracje trzymają się REST.
- **MU‑pluginy**: zapewniają rozszerzone endpointy (m.in. `king-shop/v1/data`, `king-cart/v1/add-item`, `custom/v1/*`) z Redisem, rate‑limitem i agregacją danych. Dzięki temu strona sklepu, PDP i koszyk pobierają zoptymalizowane payloady jednym wywołaniem.
- **Cel biznesowy**: skrócić TTI/TTFB, uprościć merchandising (filtry, wtrącenia contentowe) i zapewnić B2B-friendly flow (rejestracja z weryfikacją, ceny netto/brutto).

## Onboarding zespołu
1. **Klon repozytorium**: `git clone` → instalacja zależności (preferowane `pnpm install` w katalogu głównym).
2. **Konfiguracja środowiska**:
   - Skopiuj `vercel.env.example` → `.env.local` w `apps/web/`.
   - Uzupełnij: `NEXT_PUBLIC_WORDPRESS_URL`, `NEXT_PUBLIC_WC_URL`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`, `ADMIN_CACHE_TOKEN`, `REVALIDATE_SECRET`, `CSRF_SECRET`, `WOOCOMMERCE_WEBHOOK_SECRET`, `KING_CART_API_SECRET`.
   - Dane uwierzytelniające WooCommerce pobierzesz z WP Admin → WooCommerce → Ustawienia → Zaawansowane → REST API → Dodaj klucz (uprawnienia „Read/Write”).
3. **Parowanie z WordPressem**:
   - Upewnij się, że MU‑pluginy z katalogu `wp-content/mu-plugins/` są wdrożone na instancji WordPressa.
   - Redis (opcjonalny) wymaga stałych `REDIS_HOST/PORT/PASSWORD` lub zdefiniowanego `REDIS_URL`.
4. **Uruchomienie dev**: `pnpm dev:web` (lub `npm run dev` w `apps/web`). API wymaga działającego WordPressa → ustaw tunel/SSH jeśli backend jest poza lokalną siecią.
5. **Build / Deploy**:
   - Budowanie: `pnpm build:web`.
   - Vercel: ustaw wszystkie zmienne serwerowe jako „Encrypted (Server)”. Nie publikuj `WC_CONSUMER_*` ani innych sekretów jako `NEXT_PUBLIC_*`.
   - Po wdrożeniu ustaw webhook `WooCommerce -> Ustawienia -> Zaawansowane -> Webhooki` z URL `https://<vercel-domain>/api/webhooks` i podpisem `WOOCOMMERCE_WEBHOOK_SECRET`.

## Newsletter (Brevo / Sendinblue)
- Endpoint: `POST /api/newsletter/subscribe` (Node runtime). Oczekuje `email` + `consent`.
- Wymaga `SENDINBLUE_API_KEY` oraz `SENDINBLUE_LIST_ID` (ID listy marketingowej).
- Backend wykorzystuje SDK Sendinblue (Brevo) przez customowy helper `utils/api-helpers.ts`, obsługując idempotencję (sprawdza czy kontakt już istnieje).
- W UI formularz `newsletter-form` (polskie etykiety, walidacja patternem email). Statusy operacji wyświetlane toastami.

## Płatności
- Frontend korzysta z danych zwracanych przez WooCommerce REST (`GET /wp-json/wc/v3/payment_gateways`). Brak bezpośredniej integracji frontowej ze Stripe – obsługa dzieje się po stronie WooCommerce.
- `app/api/woocommerce` transformuje odpowiedź na prostą listę gatewayów (id, tytuł, opis, `enabled`). Fallback w razie awarii dostarcza: przelew bankowy, pobranie.
- Jeśli w WooCommerce aktywny jest Stripe (lub inna bramka), zostanie zwrócony w polu `id` (np. `stripe`). Front mapuje go na etykiety w `app/moje-zamowienia/page.tsx`.
- Szyfrowanie/PCI leży w WooCommerce; Next.js nie przechowuje żadnych danych kart.

## Analityka i marketing
- **GA4 / GTM**: sterowane zmiennymi `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GTM_ID`. W pliku `next.config.ts` debuguje się stan ID po ustawieniu `NEXT_PUBLIC_DEBUG=true`.
- **Performance telemetry**: `PerformanceTracker.tsx` (klient) i `app/api/performance/*` (serwer) zbierają Web Vitals oraz metryki własne (TTFB, FID, CLS). Odczyt wymaga nagłówka `X-Admin-Token` (`ADMIN_CACHE_TOKEN`).
- **Sentry**: zintegrowane dla klienta, serwera i edge (`sentry.*.config.ts`). W produkcji sampling 10 %. Można wyłączyć lokalnie przez `DISABLE_SENTRY=true`.
- **E-mail transakcyjny**: MU‑plugin `king-email-system.php` oraz `packages/shared/services/email-service.ts` używają SMTP/Sendinblue (zależnie od środowiska). Sekrety pozostają na serwerze.

## Aktualne KPI
- **TTI / TTFB**: monitorowane na poziomie Component Perf Tracker oraz w `performance-results-*`.
- **CLS**: optymalizowane przez `CLSOptimizer` + `ImageCLSOptimizer`. Utrzymujemy < 0.1.
- **Konwersja koszyk → checkout**: trackowana przez GA4/GTM eventy (konwersja w zdarzeniach e-commerce). Koszyk ma telemetry w `useCartStore`.
- **Latencja API**: logowana (Sentry + logger) w `app/api/woocommerce` wraz z request ID.
- **Hit rate cache**: `cache.ts` raportuje `X-Cache-Status` (`HIT/MISS/DEDUP`). Webhooki czyszczą tagi, a `/api/cache/stats` (jeśli dostępne) pokazuje wielkość pamięci podręcznej.

---

- Architektura i tajne dane → `ARCHITECTURE.md`
- Mapowanie API (Woo + MU) → `API.md`
- Komponenty UI / Zustand → `COMPONENTS_BRIEF.md`

