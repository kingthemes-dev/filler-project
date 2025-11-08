# API – WooCommerce REST + MU‑pluginy

## Przegląd
- Frontend (Next.js) komunikuje się **wyłącznie** przez trasy API w `apps/web/src/app/api/*`. Każda trasa działa w runtime Node.js (wyjątki opisane niżej) i nigdy nie ujawnia tajnych kluczy w odpowiedziach.
- Warstwa proxy (`app/api/woocommerce/route.ts`) tłumaczy parametry `endpoint=*` na właściwe zasoby:
  - WooCommerce REST v3 (`/wp-json/wc/v3/*`)
  - MU‑pluginy (`/wp-json/king-shop/v1/*`, `/wp-json/king-cart/v1/*`, `/wp-json/king-reviews/v1/*`, `/wp-json/king-optimized/v1/*`, `/wp-json/king-email/v1/*`)
  - Custom WP API (`/wp-json/custom/v1/*`) dla resetów hasła, faktur, śledzenia zamówień.
- Rate limiting: globalny limiter w `middleware/security.ts` + per-endpoint limiter w `checkEndpointRateLimit`. Dodatkowe limity w MU‑pluginach (transienty, Redis).
- Caching: deduplikacja 100 ms, `cache.ts` (pamięć + Redis), nagłówki `Cache-Control` z `stale-while-revalidate`. ISR/SSR rewalidacja – zobacz `ARCHITEKTURE.md`.

## Mapowanie tras Next.js → WordPress
| Trasa Next.js | Metoda | Runtime | Upstream | Zastosowanie | Cache |
| --- | --- | --- | --- | --- | --- |
| `/api/woocommerce` | GET/POST | Node.js | `/wp-json/wc/v3/*`, `/wp-json/king-shop/v1/*`, `/wp-json/custom/v1/*`, `/wp-json/king-email/v1/*` | uniwersalny proxy produktów, zamówień, klientów, filtrów, resetów haseł, faktur | `Cache-Control` per endpoint + SWR, deduplikacja 100 ms |
| `/api/home-feed` | GET | Node.js | `/wp-json/king-shop/v1/data` | prefetch danych do głównej strony (nowości, promocje) | `s-maxage=600`, `stale-while-revalidate=86400`, ETag |
| `/api/cart-proxy` | POST/OPTIONS | Node.js | `/wp-json/king-cart/v1/*` | operacje na koszyku (add/remove/update/cart) | brak cache (operacje mutujące) |
| `/api/reviews` | GET/POST | Node.js | `/wp-json/king-reviews/v1/reviews` | pobieranie i tworzenie opinii | `no-store` |
| `/api/reviews/upload` | POST | Node.js | `/wp-json/king-reviews/v1/upload-image` | upload zdjęć w recenzjach | `no-store` |
| `/api/webhooks` | POST | Node.js | webhook WooCommerce → `webhook-handler` | odpowiada JSON/200 po weryfikacji HMAC | brak cache |
| `/api/revalidate` | POST | Node.js | Vercel ISR + MU flush | rewalidacja ścieżek/tagów + `king_flush_all_caches` | n/d |
| `/api/performance/*` | mixed | Node.js | brak (lokalne) | metryki wydajności (admin token) | `no-store` |
| `/api/edge/analytics` | POST | **Edge** | brak (lokalne) | zdarzenia UX (low latency) | `no-store` |

> Pozostałe trasy (`/api/favorites`, `/api/live`, `/api/ready`, etc.) nie komunikują się z WordPressem – służą do health checków lub mocków.

## Uwierzytelnianie
- **WooCommerce REST**: parametry `consumer_key` i `consumer_secret` dołączane tylko na serwerze (Basic Auth lub query string). Reset haseł/login nie trafia do klienta.
- **MU‑pluginy**:
  - `king-cart/v1/*` wymagają nagłówka `X-King-Secret` (`KING_CART_API_SECRET`).
  - `king-shop/v1/*` i `king-optimized/v1/*` są publiczne, ale chronione rate‑limitem (transient/Redis + 120 zapytań/min/IP).
  - `king-reviews/v1/*` – publiczne, walidacja reCAPTCHA odbywa się po stronie WP (MU‑plugin).
  - `king-email/v1/trigger-order-email` – wywoływane tylko z Node (brak autoryzacji, endpoint wewnętrzny).
- **Webhook**: podpis HMAC SHA256 z `WOOCOMMERCE_WEBHOOK_SECRET` (`x-wc-webhook-signature`). Handler odrzuca brakujący/niepoprawny podpis (timingSafeEqual).
- **CSRF**: mutacje z przeglądarki wymagają tokena `x-csrf-token` (middleware `csrf.ts`), wyjątek dla tras `api/webhooks`, `api/cache`, `api/revalidate`.

## WooCommerce REST – wykorzystywane zasoby

### Produkty
- **GET `/wp-json/wc/v3/products`**
  - Parametry: `page`, `per_page≤24` (zwiększane do 100 dla `search`), `category`, `slug`, `orderby`, `order`, `on_sale`, `featured`, `attribute`, `attribute_term`.
  - Autoryzacja: klucz/sekret w query string (server).
  - **Cache**: public `max-age=60`, `s-maxage=180` (ustawiane w `app/api/woocommerce`); dodatkowo Redis/Etag przez `cache.ts` dla prefetch slugów.
  - **Przykład**:
    ```
    GET /api/woocommerce?endpoint=products&slug=krem-nawilzajacy
    ```
    Odpowiedź (fragment):
    ```12:18:apps/web/src/app/api/woocommerce/route.ts
    {
      "id": 123,
      "name": "Krem nawilżający",
      "slug": "krem-nawilzajacy",
      "price": "89.99",
      "sale_price": "79.99",
      "images": [{ "src": "https://wp/.../image.webp" }],
      "categories": [{ "id": 5, "name": "Kremy", "slug": "kremy" }],
      "attributes": [...]
    }
    ```
  - **Błędy**: 400 (złe parametry), 404 (brak produktu), 429 (rate-limit), 502 (błąd Woo). Front przechwytuje i wyświetla komunikaty fallback.
  - **Paginacja**: nagłówki `X-WP-Total`, `X-WP-TotalPages` (mapowane w proxy) → UI przelicza `totalPages`.

- **GET `/wp-json/wc/v3/products/{id}`** / **`?slug=`**
  - Wykorzystywany przy PDP (`wooCommerceOptimized.getProductById/Slug`).
  - `cache=off` dla świeżości (gdy dynamiczne filtry).
  - Błędy: 404 (przechwytywany, UI pokazuje „Produkt nie znaleziony”).

- **GET `/wp-json/wc/v3/products/categories`**
  - Parametry: `per_page`, `parent`, `slug`.
  - Cache: `public, s-maxage=600`.
  - Używany do filtrów (`shop-filters`, `hierarchical-categories`).

- **GET `/wp-json/wc/v3/products/attributes`** oraz `/attributes/{id}/terms`
  - Proxy `handleProductsAttributesEndpoint` i `handleAttributeTermsEndpoint`.
  - Dodawane `_fields=id,name,slug` aby ograniczyć payload.
  - Cache: `public, s-maxage=1800` dla statycznych słowników.

### Zamówienia
- **POST `/wp-json/wc/v3/orders`**
  - Wywołanie: `POST /api/woocommerce?endpoint=orders`.
  - Body walidowane przez `orderSchema` (Zod) i transformowane (camelCase → snake_case).
  - Meta: `_created_via=headless-api`, `_session_id`, `_hpos_enabled=true`.
  - Rate limit: `orderLimitHandler` (blokada przy zbyt wielu próbach).
  - Odpowiedź:
    ```json
    {
      "success": true,
      "order": {
        "id": 987,
        "status": "processing",
        "total": "199.00",
        "payment_url": "https://.../pay/order=987",
        "line_items": [...]
      }
    }
    ```
  - Błędy: 400 (walidacja), 429 (limit), 500 (HPOS/REST). Zwracany JSON z `success:false`.
  - Po sukcesie wywoływany jest `POST /wp-json/king-email/v1/trigger-order-email` (best-effort).

- **GET `/wp-json/wc/v3/orders` / `/orders/{id}`**
  - Wykorzystywane w panelu klienta (`moje-zamowienia`) i śledzeniu.
  - Cache: `cache=off` (dane wrażliwe). Rate limiter + deduplikacja.
  - Błędy: mapowane na `createErrorResponse` (422/404/502).

- **GET `/wp-json/wc/v3/orders/{id}/notes|refunds|stats`**
  - Obsługiwane przez `hposApi` (admin panel). Wymagany Basic Auth (klucz/sekret).

### Klienci
- **GET/PATCH `/wp-json/wc/v3/customers/{id}`**
  - Aktualizacja profilu (`customer/update-profile`): najpierw `custom/v1/customer/update-profile`, potem fallback `PATCH /customers/{id}`.
  - Payload `billing`/`shipping` generowany z camelCase.

- **POST `/wp-json/wc/v3/customers`**
  - Tworzenie konta (rejestracja) przez serwis `api-helpers`. Walidacja i maskowanie błędów.

## MU‑pluginy – sklepy i filtry

### `GET /wp-json/king-shop/v1/data`
- Cel: pobrać listę produktów, kategorie i agregowane atrybuty jednym zapytaniem (shop, home-feed).
- Parametry: `page`, `per_page`, `category`, `search`, `orderby`, `order`, `on_sale`, `featured`, `min_price`, `max_price`, `capacities`, `brands`, `pa_*`.
- Rate limit: 120 żądań/min/IP (transient `king_rl_*`).
- Cache: Redis (`king_shop_data_*`, TTL 24h) + WP Object Cache. Można wyłączyć parametrem `cache=off`.
- Odpowiedź (fragment):
  ```12:20:wp-content/mu-plugins/king-shop-api.php
  {
    "success": true,
    "products": [{ "id": 1, "name": "...", "price": "89.99", "attributes": [...] }],
    "total": 120,
    "page": 1,
    "per_page": 12,
    "categories": [{ "id": 10, "name": "Peelingi", "slug": "peelingi" }],
    "attributes": {
      "capacities": [{ "slug": "30ml", "count": 15 }],
      "brands": [{ "slug": "marka-a", "count": 8 }]
    }
  }
  ```
- Błędy: 429 (limit), 500 (WP_Error). Proxy zwraca fallback pustej listy.

### `GET /wp-json/king-shop/v1/attributes`
- Do dynamicznych filtrów (tree recalculation).
- Parametry: `category`, `search`, `min_price`, `max_price`, `attribute_*`.
- Cache: aktualnie wyłączone (komentarz `// TEMPORARY: Skip cache`).
- Odpowiedź: `{ "success": true, "attributes": { "pojemnosc": { ... } }, "total_products": 42 }`.

### `GET /wp-json/king-optimized/v1/homepage|shop|product|product-slug`
- Używane przez starsze helpery (`wooCommerceOptimized`), wciąż dostępne jako fallback dla home feed.
- Cache: Redis 24h + nagłówki `Cache-Control`.
- Struktura podobna do `king-shop`, lecz z odchudzonymi polami (`images`, `short_description`, `variations`).

## MU‑pluginy – koszyk

### `GET /wp-json/king-cart/v1/nonce`
- Formaty: `{ "success": true, "nonce": "xxxx", "expires": 1713456789 }`.
- Wykorzystywany do lokalnego Store API, ale proxy preferuje nagłówek `X-King-Secret`.

### `POST /wp-json/king-cart/v1/add-item`
- Proxy: `POST /api/cart-proxy` z body `{ action: "add", product_id, quantity, variation }`.
- Nagłówki: `X-King-Secret`.
- Odpowiedź: `{ "success": true, "status": 200, "data": { cart: {...} } }`.
- Błędy: 400 (brak ID), 403 (secret/nonce), 500 (WP Error). Proxy czyści HTML/notice z WP przed parsowaniem JSON.
- Dodatkowe endpoints: `/remove-item`, `/update-item`, `/cart` – analogicznie mapowane.

## MU‑pluginy – recenzje

### `GET /wp-json/king-reviews/v1/reviews`
- Parametry: `product_id`.
- Proxy: `/api/reviews?product_id=123`.
- Caching: `no-store` (zawsze świeże).
- Odpowiedź: tablica recenzji `{ id, reviewer, rating, review, date_created }`.

### `POST /wp-json/king-reviews/v1/reviews`
- Body: `{ product_id, reviewer, review, rating, attachments? }`.
- Walidacja Zod (`createReviewSchema`).
- Błędy: 400 (walidacja), 500 (WP). Proxy loguje i zwraca `createErrorResponse`.

### `POST /wp-json/king-reviews/v1/upload-image`
- Wysyłane jako `multipart/form-data` z plikiem `image`.
- Proxy ogranicza typy (jpeg/png/gif/webp) oraz rozmiar (≤5 MB).
- Odpowiedź: `{ success: true, attachment_id, url }`.

## Customowe endpointy WordPress (`/wp-json/custom/v1/*`)

| Endpoint | Metoda | Zastosowanie | Uwagi bezpieczeństwa |
| --- | --- | --- | --- |
| `/password-reset` | POST | inicjuje reset hasła WooCommerce | Bez auth; body `{ email }`. Proxy maskuje odpowiedzi (zawsze success). |
| `/reset-password` | POST | finalizacja resetu (`key`, `login`, `password`) | Walidacja Zod, fuzzy success w razie błędu. |
| `/invoices` | GET | lista faktur `{ invoices: [...] }` | Tylko server; UI pobiera PDF. |
| `/invoice/{orderId}/pdf` | GET | generowanie faktury PDF (TCPDF) | Proxy ma fallback lokalnej generacji; `cache: no-store`. |
| `/tracking/{orderId}` | GET | dane śledzenia wysyłki | Zwraca `{ tracking: {...} }`. |
| `/customer/update-profile` | POST | uaktualnienie profilu (B2B) | Best-effort; brak tokenu → rely on Woo patch. |
| `/customer/change-password` | POST | zmiana hasła po zalogowaniu | Wymaga `customer_id`, `current_password`, `new_password`. |

## MU‑pluginy – e-mail i webhooki
- **`POST /wp-json/king-email/v1/trigger-order-email`** – awaryjne wyzwolenie maili Woo po create order. Brak auth, endpoint wywoływany tylko z API Node.
- **`/wp-json/king-webhooks/v1/*`** – wewnętrzny panel MU. Webhooki Woo trafiają do `/api/webhooks` (Next) i stamtąd do `webhook-handler`. Handler weryfikuje sygnaturę, sprawdza idempotencję (Redis/pamięć), odświeża cache poprzez `hposCache.invalidateByTag`.

## Caching i nagłówki
- Proxy ustawia w zależności od endpointu:
  - Produkty/listy: `public, max-age=60, s-maxage=180, stale-while-revalidate=300`.
  - Kategorie/atrybuty: `public, max-age=300, s-maxage=600, stale-while-revalidate=900`.
  - Home feed: `public, s-maxage=600, stale-while-revalidate=86400`, `ETag`.
  - Dane poufne (zamówienia, faktury): `no-store`.
  - Koszyk/recenzje/mutacje: `no-store` + CORS `Access-Control-Allow-*`.
- Redis (jeśli `REDIS_URL`): `cache.ts` oraz MU‑pluginy. W braku Redisa fallback do pamięci.

## Bezpieczeństwo
- Tajne zmienne dostępne tylko w runtime serwerowym. Nie ma `NEXT_PUBLIC_*` dla kluczy Woo.
- Trasy Node ustawiają `User-Agent: HeadlessWoo/1.0` aby identyfikować ruch.
- `middleware/security.ts` dodaje nagłówki CSP, HSTS (prod), rate limit (limity `DEFAULT_RATE_LIMITS.API`: 120/min).
- CSRF: token HMAC SHA256. Ominięcie tylko dla API systemowych (webhook, cache).
- Webhooky: obowiązkowe nagłówki `x-wc-webhook-signature`, `x-wc-webhook-topic`; brak sygnatury → 401.

## Rewalidacja i czyszczenie cache
- **`POST /api/revalidate`** (server): body `{ secret, paths?:[], tags?:[] }`. Wymaga `REVALIDATE_SECRET`.
- **`POST /api/cache/clear|purge|warm`**: token `ADMIN_CACHE_TOKEN` (nagłówek `x-admin-token`). `warm` wykonuje równoległe fetch’e (`/king-shop`, `/products`, `/categories`).
- MU‑pluginy wywołują `king_flush_all_caches` (czyszczenie WP Object Cache + Redis).

---

📌 Dalsze lektury:
- `ARCHITECTURE.md` – architektura, cache, runtime’y
- `KING_Headless_Enterprise.md` – onboarding i KPI
- `COMPONENTS_BRIEF.md` – komponenty, hooki i patterny UI

