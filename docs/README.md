# Headless Woo – README

## 1. Przegląd projektu
- Headless storefront oparty na **Next.js 15.5 (App Router + RSC)** i **WooCommerce REST API** (brak GraphQL).
- Backend WordPress rozszerzony MU‑pluginami (`king-shop`, `king-cart`, `king-reviews`, `king-optimized`, `king-email`, `king-webhooks`) z Redisem, rate‑limitem i webhookami HPOS.
- Frontend hostowany na Vercel, wyrenderowany w ISR/SSR z dedykowanymi trasami API (`/api/woocommerce`, `/api/cart-proxy`, `/api/home-feed`, `/api/analytics`, `/api/performance/*`).
- Aplikacja mobilna (Expo/React Native) korzysta z pakietu `@headless-woo/shared` i tych samych endpointów WooCommerce.
- Dokumentacja uzupełniająca: [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`API.md`](./API.md), [`COMPONENTS_BRIEF.md`](./COMPONENTS_BRIEF.md), [`KING_Headless_Enterprise.md`](./KING_Headless_Enterprise.md), [`CHANGELOG.md`](./CHANGELOG.md).

## 2. Stos technologiczny
- **Frontend (web)**: Next.js 15.5 (App Router, Edge/Node runtime), React 18.3, Tailwind CSS + shadcn/ui, Zustand 5, TanStack Query 5.
- **Frontend (mobile)**: Expo SDK 50 / React Native 0.73, współdzielone store’y i typy (`packages/shared`).
- **Backend**: WordPress 6.x + WooCommerce 8.x, MU‑pluginy, Redis (opcjonalnie).
- **Języki/biblioteki**: TypeScript, Zod, Sentry (web/server/edge), Nodemailer, Sendinblue (Brevo), ioredis.
- **Monitoring**: własne endpointy telemetry (`/api/analytics`, `/api/errors`, `/api/performance/*`), Sentry, reCAPTCHA v3.
- **Testy**: Jest/Testing Library, Playwright (E2E), Lighthouse (CI/perf).

## 3. Wymagania wstępne
- Node.js ≥ 20, pnpm (zalecane) lub npm.
- Działająca instancja WordPress + WooCommerce z zainstalowanymi MU‑pluginami z repo (`wp-content/mu-plugins/`).
- Redis (jeśli chcesz korzystać z cache warstwy serwerowej).
- Dostęp administracyjny do WooCommerce (REST API keys, webhooks).

## 4. Konfiguracja lokalna
1. Sklonuj repo: `git clone git@github.com:.../headless-woo.git`.
2. Zainstaluj zależności: `pnpm install` (katalog główny).
3. Skopiuj `vercel.env.example` do `apps/web/.env.local` i uzupełnij wartości (patrz tabelka niżej).
4. Uruchom backend WordPress (lokalnie lub przez tunel VPN/SSH).
5. Start dev: `pnpm dev:web` lub `npm run dev` w `apps/web`.
6. Aplikacja będzie dostępna pod `http://localhost:3000`.

### Zmienne środowiskowe

#### Serwerowe – wymagane
| Nazwa | Opis |
| --- | --- |
| `WC_CONSUMER_KEY` | Klucz REST WooCommerce (uprawnienia *Read/Write*). |
| `WC_CONSUMER_SECRET` | Sekret REST WooCommerce. |
| `REVALIDATE_SECRET` | Token do `/api/revalidate` (ISR + czyszczenie cache). |
| `ADMIN_CACHE_TOKEN` | Token tras administracyjnych (`/api/cache/*`, `/api/admin/auth`). |
| `CSRF_SECRET` | HMAC wykorzystywany przez middleware CSRF. |
| `WOOCOMMERCE_WEBHOOK_SECRET` | Sekret podpisu webhooków WooCommerce (HMAC SHA256). |
| `KING_CART_API_SECRET` | Shared secret dla `king-cart/v1/*` (`X-King-Secret`). |

#### Serwerowe – opcjonalne / integracje
| Nazwa | Opis |
| --- | --- |
| `REDIS_URL` | Redis dla cache, rate limiting oraz telemetry (fallback do pamięci). |
| `SENDINBLUE_API_KEY` / `SENDINBLUE_LIST_ID` | Integracja Brevo (newsletter + kupon rabatowy). |
| `SENTRY_DSN` | DSN Sentry (backend + edge). |
| `DISABLE_SENTRY` | `true` aby wyłączyć Sentry lokalnie (dev). |
| `RECAPTCHA_SECRET_KEY` | Serwerowa weryfikacja tokenów reCAPTCHA v3. |
| `API_KEY` | Opcjonalny klucz dla `validateApiKey` (nagłówek `x-api-key`). |
| `ADMIN_TOKEN` | Alternatywny token dla `/api/admin/auth` (fallback). |
| `API_TOKEN` | Używany w przykładowych zapytaniach universal-filter. |
| `BASE_URL` | Bazowy adres w testach Playwright/perf (`perf-autocannon`). |
| `WP_BASE_URL` | Publiczny URL frontendu do prefetchu w `cache-warming.ts`. |
| `GOOGLE_SITE_VERIFICATION` | Wartość meta dla Search Console. |
| `E2E_EMAIL` / `E2E_PASSWORD` | Dane logowania wykorzystywane w testach E2E. |

#### Publiczne (klient) – wymagane
| Nazwa | Opis |
| --- | --- |
| `NEXT_PUBLIC_BASE_URL` | Publiczny URL frontendu (np. `http://localhost:3000`). |
| `NEXT_PUBLIC_WORDPRESS_URL` | Bazowy URL WordPress (bez `/wp-json`). |
| `NEXT_PUBLIC_WC_URL` | Publiczny URL WooCommerce REST (`.../wp-json/wc/v3`). |

#### Publiczne (klient) – opcjonalne
| Nazwa | Opis |
| --- | --- |
| `NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_GA_ID` | Integracje analityczne Google. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Klucz publiczny reCAPTCHA v3. |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN klienta Sentry. |
| `NEXT_PUBLIC_FRONTEND_URL` | Bazowy URL używany w szablonach maili i CTA. |
| `NEXT_PUBLIC_DEBUG` | `true` – logi debugowe i verbose mode. |
| `NEXT_PUBLIC_PERF_LOGS` | `true` – dodatkowe logi metryk w konsoli. |
| `NEXT_PUBLIC_AUTH_TOKEN_SS_KEY` / `NEXT_PUBLIC_REFRESH_TOKEN_LS_KEY` / `NEXT_PUBLIC_SESSION_TOKEN_LS_KEY` | Klucze storage (session/local) dla modułu auth. |
| `NEXT_PUBLIC_AUTH_KEY_TIMEOUT` | Timeout tokenu auth (ms), domyślnie `300000`. |
| `NEXT_PUBLIC_APP_VERSION` | Wersja aplikacji w telemetry/logach. |
| `NEXT_PUBLIC_EXPERT_MONITORING` | `true` – odsłania widoki diagnostyczne. |
| `NEXT_PUBLIC_API_URL` | Fallback URL w przykładach universal-filter. |
| `NEXT_PUBLIC_WC_API_URL` / `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_KEY` / `NEXT_PUBLIC_WOOCOMMERCE_CONSUMER_SECRET` | Zmienne do testów jednostkowych / środowisk mock. |

> Pełna walidacja i domyślne wartości znajdują się w `apps/web/src/config/env.ts`.

### Jak wygenerować klucze WooCommerce
1. Zaloguj się do WP Admin → WooCommerce → Ustawienia → Zaawansowane → **REST API**.
2. Kliknij „Dodaj klucz”. Nazwa dowolna, uprawnienia „Read/Write”.
3. Zapisz wygenerowany `Consumer key` i `Consumer secret` do `.env.local` (`WC_CONSUMER_*`).
4. W razie rotacji usuń stare klucze w panelu i odśwież środowisko Vercel.

### Ustawienie sekretu webhooka
1. WP Admin → WooCommerce → Ustawienia → Zaawansowane → **Webhooki** → „Dodaj webhook”.
2. Temat: np. `order.updated`, status „Aktywny”.
3. URL: `https://<twoja-domena-vercel>/api/webhooks`.
4. Sekret: wpisz nowy losowy ciąg i skopiuj go do `.env` (`WOOCOMMERCE_WEBHOOK_SECRET`).
5. WooCommerce podpisze każde payload HMAC SHA256 → Next.js go weryfikuje.

## 5. Skrypty
| Komenda | Opis |
| --- | --- |
| `pnpm dev:web` | Next.js dev server z HMR. |
| `pnpm build:web` | Budowa produkcyjna (Next + lint + typy). |
| `pnpm start:web` | Uruchomienie produkcyjnego buildu. |
| `pnpm lint` | ESLint (konfiguracja w `apps/web/eslint.config.mjs`). |
| `pnpm test` | Testy jednostkowe (Jest). |
| `pnpm test:e2e` | Playwright (testy E2E). |
| `pnpm lighthouse` | Raport Lighthouse lokalnie. |
| `pnpm format` / `pnpm format:check` | Prettier (formatowanie / weryfikacja). |

## 6. Build i wdrożenie (Vercel)
1. Połącz repo z Vercel (monorepo – wybierz `apps/web` jako root).
2. W zakładce **Environment Variables** ustaw wszystkie sekrety jako *Server only*. Nigdy nie publikuj `WC_CONSUMER_*`, `ADMIN_CACHE_TOKEN`, `KING_CART_API_SECRET` jako publicznych.
3. W razie korzystania z Edge funkcji (analytics) – Vercel automatycznie wykryje w runtime `edge`.
4. Po wdrożeniu ustaw webhook WooCommerce (sekcja wyżej) i sprawdź logi `api/webhooks`.
5. Redis zarządzany (np. Upstash): ustaw `REDIS_URL`. Brak Redisa → fallback do pamięci.

## 7. Standardy kodowania
- **ESLint** + **TypeScript strict**: uruchamiaj `pnpm lint` przed pushem.
- **Prettier**: formatowanie automatyczne (konfiguracja `prettier.config.cjs`).
- **EditorConfig**: egzekwuje wcięcia, znaki końca linii (w repo).
- **Commit convention**: *Conventional Commits* (`feat:`, `fix:`, `chore:`, `docs:` itd.). Wdrożenie: `feat(docs): ...`.
- **Style**: preferuj Tailwind + shadcn, komponenty słownikowe w `components/ui`, wszystkie etykiety w UI po polsku.

## 8. Rozwiązywanie problemów
- **401 / 403 w `/api/woocommerce`** – sprawdź `WC_CONSUMER_*`, IP serwera (czy WordPress nie blokuje), token `ADMIN_CACHE_TOKEN` gdy używasz tras admin.
- **429 (Too Many Requests)** – przekroczony rate limit (middleware lub MU‑plugin). Odczekaj 60 s. W dev możesz ustawić `NEXT_PUBLIC_DEBUG=true` aby zobaczyć szczegóły.
- **Brak danych w home feed** – upewnij się, że endpoint `king-shop/v1/data` działa i Redis (opcjonalnie) jest dostępny. Sprawdź logi WordPressa.
- **CORS błędy koszyka** – brak/niepoprawny `KING_CART_API_SECRET` lub plugin `king-cart` nie jest zdeployowany.
- **Webhook zwraca 401** – zły `WOOCOMMERCE_WEBHOOK_SECRET` lub Woo nie wysyła nagłówka `x-wc-webhook-signature`.
- **Sentry spam XHR** – ustaw `DISABLE_SENTRY=true` w `.env.local` podczas developmentu.
- **Brak grafik** – dodaj hosta do `next.config.ts -> images.remotePatterns`.

---

📎 Powiązane materiały:
- Architektura i cache: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- API i mapowanie endpointów: [`API.md`](./API.md)
- Komponenty, hooki, Zustand: [`COMPONENTS_BRIEF.md`](./COMPONENTS_BRIEF.md)
- Kontekst biznesowy i onboarding: [`KING_Headless_Enterprise.md`](./KING_Headless_Enterprise.md)
- Historia zmian: [`CHANGELOG.md`](./CHANGELOG.md)
# Dokumentacja projektu

## 1. Mapowanie najważniejszych plików

| Temat | Dokument |
|-------|----------|
| 📌 Status ogólny | `STATUS_SUMMARY.md`, `OPTIMIZATION_PROGRESS.md` |
| 🚀 Wdrożenia | `DEPLOYMENT_GUIDE.md` |
| 🧪 Testy manualne | `TEST_PLAYBOOK.md` |
| 🔒 Bezpieczeństwo | `SECURITY_OVERVIEW.md`, `RATE_LIMITING.md` |
| 🧱 Mu-plugins | `MU_PLUGINS_AUDIT.md`, `MU_PLUGINS_INVENTORY.md`, `INVOICE_SYSTEM_ARCHITECTURE.md` |
| 🧾 Walidacja / błędy | `ZOD_VALIDATION_AUDIT.md`, `ERROR_HANDLING.md` |
| ⚙️ Infrastruktura | `CACHE_STRATEGY.md`, `BASELINE_RESULTS.md`, `HPOS_COMPATIBILITY_AUDIT.md` |
| 🚀 Onboarding | `QUICK_START.md` |

## 2. Archiwum

- Szczegółowe, historyczne dokumenty (np. stare checklisty wdrożeń, testów, raport N+1) zostały przeniesione do `docs/archive/`.
- Historia Git przechowuje poprzednie wersje – nic nie zginęło, ale katalog główny pozostaje czytelny.

## 3. Konwencje

- Nowe dokumenty dodawaj w katalogu głównym `docs/`, jeśli są aktywnie utrzymywane.
- Gdy dokument traci aktualność, przenieś go do `docs/archive/` zamiast usuwać.
- Uaktualnij tę mapę, jeżeli pojawią się nowe sekcje lub zmiany w strukturze.

