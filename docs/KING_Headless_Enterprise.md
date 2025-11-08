# KING Headless Enterprise – kompendium

## Strategia biznesowo-techniczna
- **Model**: Sklep headless na WooCommerce REST. Front (Next.js 15.5 + RSC) komunikuje się wyłącznie przez REST (standardowe `/wp-json/wc/v3/*` + custom MU‑pluginy). **Brak GraphQL** – wszystkie integracje trzymają się REST.
- **MU‑pluginy**: zapewniają rozszerzone endpointy (m.in. `king-shop/v1/data`, `king-cart/v1/add-item`, `custom/v1/*`) z Redisem, rate‑limitem i agregacją danych. Dzięki temu strona sklepu, PDP i koszyk pobierają zoptymalizowane payloady jednym wywołaniem.
- **Cel biznesowy**: skrócić TTI/TTFB, uprościć merchandising (filtry, wtrącenia contentowe) i zapewnić B2B-friendly flow (rejestracja z weryfikacją, ceny netto/brutto).
- **Kanały**: aplikacja web (Vercel, Edge runtime dla analityki) + aplikacja mobilna Expo/React Native korzystająca z tych samych serwisów `@headless-woo/shared`.

## Onboarding zespołu
1. **Klon repozytorium**: `git clone` → instalacja zależności (preferowane `pnpm install` w katalogu głównym).
2. **Konfiguracja środowiska**:
   - Skopiuj `vercel.env.example` → `.env.local` w `apps/web/`.
   - Uzupełnij obligatoryjnie: `NEXT_PUBLIC_WORDPRESS_URL`, `NEXT_PUBLIC_WC_URL`, `WC_CONSUMER_KEY`, `WC_CONSUMER_SECRET`, `ADMIN_CACHE_TOKEN`, `REVALIDATE_SECRET`, `CSRF_SECRET`, `WOOCOMMERCE_WEBHOOK_SECRET`, `KING_CART_API_SECRET`.
   - Zalecane integracje: `SENDINBLUE_API_KEY`/`SENDINBLUE_LIST_ID`, `REDIS_URL`, `RECAPTCHA_SECRET_KEY` + `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, ewentualnie `NEXT_PUBLIC_FRONTEND_URL` (CTA w mailach).
   - Dane uwierzytelniające WooCommerce pobierzesz z WP Admin → WooCommerce → Ustawienia → Zaawansowane → REST API → Dodaj klucz (uprawnienia „Read/Write”).
3. **Parowanie z WordPressem**:
   - Upewnij się, że MU‑pluginy z katalogu `wp-content/mu-plugins/` są wdrożone na instancji WordPressa.
   - Redis (opcjonalny) konfigurujemy przez `REDIS_URL` (Upstash lub własna instancja).
4. **Uruchomienie dev**: `pnpm dev:web` (lub `npm run dev` w `apps/web`). API wymaga działającego WordPressa → ustaw tunel/SSH jeśli backend jest poza lokalną siecią. Aplikację mobilną odpalisz przez `pnpm dev:mobile` (`Expo start`).
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
- **GA4 / GTM**: sterowane zmiennymi `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GTM_ID`, opcjonalnie `NEXT_PUBLIC_GA_ID`. Debug w `next.config.ts` po ustawieniu `NEXT_PUBLIC_DEBUG=true`.
- **Telemetry + monitoring**: `PerformanceTracker.tsx` oraz `/api/performance`, `/api/performance/metrics`, `/api/analytics`, `/api/errors` (Node) + `/api/edge/analytics`, `/api/edge/geolocation` (Edge). Odczyt administracyjny zabezpieczony `ADMIN_CACHE_TOKEN`.
- **Sentry**: zintegrowane dla klienta, serwera i edge (`sentry.*.config.ts`). Sampling 10 % w produkcji, do wyłączenia przez `DISABLE_SENTRY=true`.
- **E-mail transakcyjny**: MU‑plugin `king-email-system.php` oraz `packages/shared/services/email-service.ts` korzystają z Brevo / SMTP. Payloady nigdy nie opuszczają serwera.

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

