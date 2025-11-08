# Architektura systemu

## Przegląd wysokopoziomowy
- **Backend**: WordPress + WooCommerce hostowany po stronie klienta. Customowe MU‑pluginy (`wp-content/mu-plugins/`) rozszerzają standardowe REST API o zoptymalizowane zasoby (np. `king-shop/v1/data`, `king-cart/v1/*`, `custom/v1/*`), cache Redis oraz obsługę webhooków HPOS.
- **Frontend**: Next.js 14 (App Router) w projekcie `apps/web/`, wdrażany na Vercel. Różnicuje komponenty serwerowe i klienckie, korzysta z Tailwind CSS, shadcn/ui oraz Zustand.
- **Komunikacja**: Frontend korzysta z własnych tras API (`app/api/*`) uruchamianych **wyłącznie w środowisku serwerowym**. Trasy te pośredniczą w wywołaniach do WordPressa (WooCommerce REST i MU‑pluginy) oraz obsługują webhooki, mailingi, raportowanie błędów i cache.
- **Środowiska uruchomieniowe**: domyślnie Node.js. Wybrane API działają na Edge (`app/api/edge/*`) dla niskich opóźnień analityki.
- **Hosting**: Frontend na Vercel. WordPress + MU‑pluginy pozostają na infrastrukturze klienta (np. cPanel/VM z Redisem).

## Przepływy danych
- **Interakcje użytkownika → dane katalogowe**
  1. Klient odwiedza stronę (ISR/SSG).
  2. RSC pobierają dane przez serwerowe helpery (`home-feed`, `sklep`) lub delegują do komponentów klienckich, które wywołują `/api/woocommerce`.
  3. Trasa `app/api/woocommerce/route.ts` mapuje parametry `endpoint=*` na odpowiednie zasoby WooCommerce (`/wp-json/wc/v3/*`, `/wp-json/king-shop/v1/*`, `/wp-json/custom/v1/*`), dodając nagłówki autoryzacji i cache (Redis + SWR).
  4. Odpowiedź zostaje zwrócona do klienta z nagłówkami `Cache-Control` oraz etagami memorowanymi w `cache.ts`.

- **Koszyk i checkout**
  1. Akcje UI trafiają do `zustand` (`cart-store.ts`) oraz opcjonalnie do API.
  2. Trasa `app/api/cart-proxy/route.ts` przekazuje żądania (dodanie/usunięcie/aktualizacja) do MU‑pluginu `king-cart/v1/...`, podpisując je nagłówkiem `X-King-Secret` (token serwerowy).

- **Webhooks**
  1. WooCommerce wysyła webhook na `app/api/webhooks`.
  2. `webhook-handler.ts` weryfikuje podpis HMAC (`WOOCOMMERCE_WEBHOOK_SECRET`), kontroluje idempotencję (Redis / pamięć) i odświeża cache (tagi HPOS) oraz limity zamówień.
  3. W razie potrzeby uruchamiane są serwerowe procesy (np. `order-limit-handler`, `hposCache.invalidateByTag`).

- **Rewalidacja ISR**
  1. Administrator wywołuje `POST /api/revalidate` z tokenem `REVALIDATE_SECRET`.
  2. Trasa używa `revalidatePath`/`revalidateTag`, czyszcząc cache Next.js oraz MU‑pluginów (hook `king_flush_all_caches`).

## Uwierzytelnianie i tajne dane
- **WC_CONSUMER_KEY / WC_CONSUMER_SECRET**: używane tylko w `app/api/woocommerce`. Przechowywane jako zmienne serwerowe, nigdy nie wyciekają do przeglądarki. Wysyłane jako Basic Auth do `/wp-json/wc/v3/*`.
- **ADMIN_CACHE_TOKEN**: nagłówek dla tras administracyjnych czyszczących cache (`/api/cache/*`).
- **REVALIDATE_SECRET**: zabezpiecza `POST /api/revalidate`.
- **WOOCOMMERCE_WEBHOOK_SECRET**: HMAC dla webhooków (nagłówek `x-wc-webhook-signature`).
- **KING_CART_API_SECRET**: współdzielony sekret dla MU‑pluginu koszyka, przekazywany jako `X-King-Secret`.
- **CSRF_SECRET**: generowanie/walidowanie tokenów CSRF w middleware (`middleware/csrf.ts`) i nagłówkach `x-csrf-token`.
- **Sendinblue (Brevo)**: `SENDINBLUE_API_KEY` oraz `SENDINBLUE_LIST_ID` używane przez `app/api/newsletter/subscribe`.
- **Weryfikacja dostępu**:
  - Tajne zmienne walidowane w `src/config/env.ts`.
  - Zastosowana polityka: żadna zmienna krytyczna nie jest eksportowana jako `NEXT_PUBLIC_*`.
  - Middleware `security.ts` i `csrf.ts` filtrują żądania, dodając rate‑limiting i nagłówki CSP.

## Cache i rewalidacja
- **ISR / SSG / SSR**:
  - `app/page.tsx`, `app/sklep/page.tsx`, `app/produkt/[slug]/page.tsx` eksportują `revalidate` (zwykle 300 s).
  - Serwerowe komponenty wykorzystują `next: { revalidate, tags }`.
- **Serwerowe API cache**:
  - `lib/cache.ts` zapewnia pamięć podręczną z opcjonalnym Redisem (`REDIS_URL`), generuje ETag i udostępnia `Cache-Control`.
  - Trasa `home-feed` oznacza odpowiedzi `s-maxage`, `stale-while-revalidate` oraz obsługę warunkową (`If-None-Match`).
  - `app/api/woocommerce` implementuje anty-stampede poprzez 100 ms deduplikację (`requestCache`) i retry z backoffem.
  - Wiele tras ustawia `Cache-Control` z `s-maxage`, `stale-while-revalidate`, `must-revalidate`.
- **Edge cache**:
  - `middleware/cdn-cache.ts` kształtuje nagłówki CDN (m.in. `stale-while-revalidate`, `must-revalidate`, segmenty mobilne/desktop).
  - Konfiguracja `config/security.headers.json` synchronizowana z Vercel Edge.
- **Rewalidacja ręczna**:
  - `POST /api/cache/*` (clear/purge/warm) wymaga `ADMIN_CACHE_TOKEN`.
  - MU‑pluginy (`king-shop`, `king-optimized`) czyszczą własny Redis/WP Object Cache przy aktualizacji produktów i przez hook `king_flush_all_caches`.

## Struktura repozytorium

<!-- AUTO:FOLDERS-START -->

<!-- AUTO:FOLDERS-END -->

| Ścieżka | Zakres |
| --- | --- |
| `apps/web/src/app/` | Strony Next.js (App Router), trasy API (`app/api/*`), konfiguracja ISR i runtime. |
| `apps/web/src/components/` | Komponenty UI (Tailwind + shadcn), modale auth, filtry sklepu, kartoteki produktów. |
| `apps/web/src/hooks/` | Hooki React (np. `use-favorites-sync`, `use-performance-optimization`). |
| `apps/web/src/stores/` | Zustand (koszyk, ulubione, quick view, auth modal, sklep). |
| `apps/web/src/services/` | Warstwy integracji (WooCommerce, HPOS, webhooks, limit zamówień, recaptcha). |
| `apps/web/src/lib/` | Narzędzia systemowe: cache, rate-limiter, logowanie, walidacje Zod. |
| `apps/web/src/middleware/` | Middleware Vercela (CSP, CSRF, CDN cache, admin auth). |
| `packages/shared/` | Pakiet współdzielony (typy, serwisy, store'y) dla web + mobile. |
| `wp-content/mu-plugins/` | Customowe MU‑pluginy WordPress (koszyk, warianty sklepu, webhooks, optymalizacje API, reset hasła, faktury). |
| `docs/` | Dokumentacja (bieżąca + archiwum). |

## Warstwa wydajnościowa
- **Next/Image**: `next.config.ts` definiuje `remotePatterns` dla hostów WordPress, AVIF/WEBP, `minimumCacheTTL=3600`, `dangerouslyAllowSVG`.
- **Segmentacja runtime’u**:
  - `runtime = 'edge'`: analityka (`app/api/edge/analytics`, `app/api/edge/geolocation`) – minimalne opóźnienia.
  - `runtime = 'nodejs'`: główne trasy (WooCommerce, cart, webhooki, newsletter) z dostępem do tajnych danych i bibliotek (Redis, Nodemailer, Sentry).
- **Optymalizacje bundla**: `next.config.ts` usuwa console.log w produkcji, dzieli paczki (`splitChunks`) i aliasuje `lodash` → `lodash-es`.
- **Cel Lighthouse**: 90+ dla Performance/Accessibility/Best Practices/SSEO (wyniki w `performance-results-autocannon.json`, `performance-results-k6.json`). Monitoring TTI/CLS/BFF latency w `PerformanceTracker.tsx` oraz `app/api/performance/*`.
- **Anti-stampede**: deduplikacja 100 ms w `app/api/woocommerce`, fallbacki dla płatności/dostaw, `AbortSignal.timeout` w fetchach, `stale-while-revalidate`.
- **CLS**: Komponenty `CLSOptimizer`/`ImageCLSOptimizer` stabilizują wysokości obrazów w PDP.
- **Prefetch**: `shop-data-prefetcher.tsx` oraz dynamiczne importy (np. `product-client` ładuje podobne produkty/haki w tle).

## Monitoring i logowanie
- **Sentry** (`sentry.server.config.ts`, `sentry.client.config.ts`, `sentry.edge.config.ts`): backend/trasy API wysyłają telemetrię, próbkują transakcje 10 % w produkcji. Możliwość wyłączenia w dev przez `DISABLE_SENTRY`.
- **OpenTelemetry**: instrumentacje `@opentelemetry/instrumentation` dopuszczone w bundle (zob. `serverExternalPackages`).
- **Logowanie niestandardowe**: `utils/logger.ts` (nie tylko console). Middleware loguje podejrzane wzorce żądań, rate limit, request ID set w odpowiedziach.
- **Zmienne środowiskowe monitoringu**:
  - `SENTRY_DSN`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA_ID`.
  - `NEXT_PUBLIC_DEBUG` aktywuje dodatkowe logi (kontrolowane w `next.config.ts`).
- **Web performance telemetry**: `app/api/performance/*` obsługuje POST z metrykami (TTFB, LCP, CLS) i weryfikuje `ADMIN_CACHE_TOKEN` przy odczycie.

---

➡ Dla szczegółów API zobacz `API.md`. Onboarding i proces biznesowy opisuje `KING_Headless_Enterprise.md`, a skrót komponentów znajdziesz w `COMPONENTS_BRIEF.md`.

