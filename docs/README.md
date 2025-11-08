# Headless Woo – README

## 1. Przegląd projektu
- Headless storefront oparty na **Next.js 14 (App Router)** i **WooCommerce REST API** (brak GraphQL).
- Backend WordPress rozszerzony MU‑pluginami (`king-shop`, `king-cart`, `king-reviews`, `king-optimized`, `king-email`, `king-webhooks`) z Redisem, rate‑limitem i webhookami HPOS.
- Frontend hostowany na Vercel, wyrenderowany w ISR/SSR z dedykowanymi trasami API (`/api/woocommerce`, `/api/cart-proxy`, `/api/home-feed`, itd.).
- Dokumentacja uzupełniająca: [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`API.md`](./API.md), [`COMPONENTS_BRIEF.md`](./COMPONENTS_BRIEF.md), [`KING_Headless_Enterprise.md`](./KING_Headless_Enterprise.md), [`CHANGELOG.md`](./CHANGELOG.md).

## 2. Stos technologiczny
- **Frontend**: Next.js 14, React 19, Tailwind CSS + shadcn/ui, Zustand, TanStack Query.
- **Backend**: WordPress 6.x + WooCommerce 8.x, MU‑pluginy, Redis (opcjonalnie).
- **Języki/biblioteki**: TypeScript, Zod, Sentry, Nodemailer, Sendinblue (Brevo), ioredis.
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
| Nazwa | Zakres | Opis |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_URL` | Client | Publiczny URL frontendu (np. `http://localhost:3000`). |
| `NEXT_PUBLIC_WORDPRESS_URL` | Client | Bazowy URL WordPressa (bez `/wp-json`). |
| `NEXT_PUBLIC_WC_URL` | Client | Pełny URL REST WooCommerce (`https://wp/wp-json/wc/v3`). |
| `WC_CONSUMER_KEY` | Server | Klucz REST WooCommerce (Read/Write). |
| `WC_CONSUMER_SECRET` | Server | Sekret REST WooCommerce. |
| `REVALIDATE_SECRET` | Server | Token `/api/revalidate`. |
| `ADMIN_CACHE_TOKEN` | Server | Token tras `/api/cache/*` i paneli admin. |
| `CSRF_SECRET` | Server | Klucz HMAC do tokenów CSRF. |
| `WOOCOMMERCE_WEBHOOK_SECRET` | Server | Sekret do podpisywania webhooków. |
| `KING_CART_API_SECRET` | Server | Tajny nagłówek `X-King-Secret` dla MU koszyka. |
| `SENDINBLUE_API_KEY` | Server | API key Brevo (newsletter). |
| `SENDINBLUE_LIST_ID` | Server | ID listy mailingowej. |
| `NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_GTM_ID` | Client | Opcjonalne ID Google Analytics / Tag Manager. |
| `REDIS_URL` | Server | Opcjonalny URL Redisa (np. `redis://user:pass@host:6379`). |
| `DISABLE_SENTRY` | Server | `true` aby wyłączyć Sentry lokalnie. |

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

