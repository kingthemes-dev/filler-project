# Security Overview

**Ostatnia aktualizacja:** 2025-11-08  
**Zakres:** bezpieczeństwo JWT, rate limiting, walidacja wejść, webhooki, reCAPTCHA oraz checklisty powdrożeniowe.

> Ten dokument stanowi stan „na dziś” po przeglądzie dokumentacji. Wiele wcześniejszych statusów było historycznych – poniżej wskazano, co jest potwierdzone, a co wymaga walidacji technicznej w kodzie/środowisku.

---

## 1. Podsumowanie obszarów

| Obszar | Stan | Co trzeba zrobić |
| --- | --- | --- |
| JWT / uwierzytelnianie | ✅ Implementacja w MU (`king-jwt-authentication.php`), rotacja refresh tokenów, scopes. | 🔍 Potwierdzić działanie whitelist/blacklist na produkcji (logi, monitoring). |
| Rate limiting | ⚠️ Wymaga przeglądu | Middleware (`middleware/security.ts`) ma limiter globalny i wyjątki dla performance testów – trzeba zweryfikować, czy wszystkie mutacje z niego korzystają. |
| Walidacja danych | ⚠️ Częściowo potwierdzone | Zod + sanitizacja dostępne (`apps/web/src/lib/schemas/internal.ts`). CSRF middleware obsługuje JSON, CSP zaostrzone; trzeba przejść mutacje i reCAPTCHA pod kątem walidacji. |
| Webhooki | ✅ Hardening wdrożony | 🔧 Do zrobienia: metryki RED + alerty (obserwowalność). |
| Sekrety / env | ⚠️ Do potwierdzenia | README/DEPLOYMENT_GUIDE odnotowują wymagane sekrety – warto przejść checklistę przed kolejnym wdrożeniem. |
| reCAPTCHA / antybot | ⚠️ Do walidacji | `/api/recaptcha/verify` istnieje; sprawdzić, czy klucze (`RECAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`) są skonfigurowane w środowiskach i czy endpointy mutujące rzeczywiście go używają. |

---

## 2. JWT Authentication (WordPress MU Plugin)

### 2.1. Co jest wdrożone
- Endpointy: `POST /wp-json/king-jwt/v1/login`, `validate`, `refresh`.
- Payload zawiera `user_id`, `email`, `scopes`, `iat`, `exp`, `iss`.
- Po odświeżeniu stare refresh tokeny są unieważniane (whitelist).
- Rate limiting: transient per IP (`jwt_refresh_rate_limit_<ip>`).

### 2.2. Co należy potwierdzić
- Blacklist/invalidacja przy resetach hasła / banach – w planie (P1).
- Rotacja klucza JWT (multi-secret) – otwarte zadanie (P2).
- Monitorowanie logów `king-jwt` – dodać checklistę w procesie operacyjnym.

### 2.3. Przykładowy test regresyjny
```bash
# Login
TOKEN=$(curl -s -X POST "https://<domain>/wp-json/king-jwt/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Secret123"}' | jq -r '.token')

# Refresh (5x OK, 6x = 429)
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://<domain>/wp-json/king-jwt/v1/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"$TOKEN\"}"
done
```

---

## 3. Rate limiting & abuse protections

| Endpoint / funkcja | Obecny stan | Uwagi / TODO |
| --- | --- | --- |
| `/king-jwt/v1/refresh` | ✅ 5/min/IP (transient) | Monitorować logi błędów 429. |
| `/wp-json/king-webhooks` | ✅ Idempotency + HMAC | Dodać metryki RED (patrz Observability). |
| `/wp-json/king-cart/v1/*` | ✅ Sekret + nonce | Upewnić się, że sekret jest skonfigurowany w WP i Next.js. |
| Next.js `/api/*` | ⚠️ manualne | Middleware security posiada limiter, ale nowe trasy muszą go explicit używać (`validateRateLimit`). |
| Mutacje legacy WP | ⚠️ brak danych | Rozważyć globalny limiter IP (`king_rate_limit_request()`). |

---

## 4. Webhook Security

- ✅ Podpis HMAC (`x-wc-webhook-signature`) weryfikowany `timingSafeEqual`.
- ✅ Walidacja nagłówków (topic, deliveryId, source) – błędne żądania → 400/401.
- ✅ Idempotencja: Redis (`webhook:idempotency:<deliveryId>`) + fallback pamięciowy (24h).
- ✅ Payloady typowane, logi strukturalne (JSON).
- ✅ Cache invalidation (`hposCache.invalidateByTag`) dla orders/products/customers.
- ⏳ **Do wykonania:** metryki RED + alerty (Sentry/Log drain) – przenieść do sekcji Observability.
- ⏳ **Rekomendacja:** rozważyć dashboard/dzienny raport z liczbą webhooków (sukces/duplikat/błąd).

---

## 5. Walidacja danych & sanitizacja

- Zod + helper `validateApiInput` dostępne w `apps/web/src/lib/schemas/internal.ts`.
- Sanitizacja: `sanitizeString`, `sanitizeEmail`, `sanitizePhone`.
- Wiele endpointów już korzysta (np. `cache/*`, `favorites`, `admin/auth`, `newsletter/subscribe`).

**Otwarte punkty do potwierdzenia:**
- [ ] Sprawdzić mutacje (np. `send-email`, `recaptcha`, `performance`), czy przechodzą przez Zod + sanitizację.
- [ ] Dodać testy walidacji (unit) do najczęściej używanych schematów.
- [ ] Jeśli pojawi się HTML (np. rich text) – ustalić whitelistę / sanitizację kontekstową.

---

## 6. Sekrety i konfiguracja środowiskowa

| Zmienna | Status | Uwagi |
| --- | --- | --- |
| `WC_CONSUMER_KEY` / `WC_CONSUMER_SECRET` | ✅ wymagane | Spójne między WP a Next.js. |
| `ADMIN_CACHE_TOKEN` / `REVALIDATE_SECRET` | ✅ wymagane | Potwierdzić wartości w środowiskach prod/stage. |
| `WOOCOMMERCE_WEBHOOK_SECRET` | ✅ wymagane | Weryfikacja HMAC w `/api/webhooks`. |
| `KING_CART_API_SECRET` | ✅ wymagane | Upewnić się, że jest ustawiony także w WordPress (`wp-config.php`). |
| `SENDINBLUE_API_KEY` / `SENDINBLUE_LIST_ID` | ⚠️ zależne od środowiska | Jeśli brak – endpoint `newsletter/subscribe` działa w trybie „no-op” (loguje). |
| `RECAPTCHA_SECRET_KEY` / `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | ⚠️ do weryfikacji | Endpoint `/api/recaptcha/verify` gotowy – sprawdzić, czy jest włączony w produkcji. |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | ⚠️ do weryfikacji | Sprawdzić, czy PII scrubbing skonfigurowany (patrz TODO). |
| `CSRF_FORCE_ENABLE` / `CSRF_FORCE_DISABLE` | ⚠️ opcjonalne | Flagi awaryjne: włącz CSRF na stagingu (`true`) lub wyłącz całkowicie (`true`) – należy je kontrolować operacyjnie. |

---

## 7. Agenda do zamknięcia (security backlog)

| Priorytet | Zadanie | Właściciel | Status |
| --- | --- | --- | --- |
| P0 | Rebaseline rate limiting dla wszystkich mutacji (`validateRateLimit`) | Backend | ☐ |
| P0 | Audyt env (prod/stage) – komplet sekretów vs README | DevOps | ☐ |
| P1 | Blacklist/invalidacja tokenów przy resetach/banach | Backend | ☐ |
| P1 | PII scrub w Sentry (breadcrumbs, spans) | DevOps/SRE | ☐ |
| P1 | Test scenariuszy reCAPTCHA (rejestracja, recenzje) | QA | ☐ |
| P2 | Rotacja JWT secret (multi-key) | Backend | ☐ |

> Wypełnij powyższą tabelę podczas uzgadniania planu z zespołem – dzięki temu dokument pozostanie praktycznym dashboardem bezpieczeństwa.

---

## 8. Narzędzia i referencje

- `TEST_PLAYBOOK.md` – manualne testy bezpieczeństwa.  
- `DEPLOYMENT_GUIDE.md` – kolejność wdrożeń wrażliwych modułów (JWT, cart, email).  
- `ZOD_VALIDATION_AUDIT.md` – pokrycie walidacji (historyczne, wymaga aktualizacji po rebaseline).  
- Archiwum: `docs/archive/JWT_AUTH_AUDIT.md`, `docs/archive/JWT_TEST_CHECKLIST.md`.

**Dokumenty zewnętrzne:**
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)  
- [Auth0 – Refresh Token Rotation](https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/)  
- [OWASP Rate Limiting Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Rate_Limiting_Cheat_Sheet.html)

---

- 2025-11-08 – CSRF middleware obsługuje JSON, CSP bez `unsafe-inline`; ESLint ponownie blokuje build (łatwiej wychwycić regresje).  

**Ostatnia aktualizacja:** 2025-11-08 (reset statusu, wymagane potwierdzenie z zespołem)  
**Kontakt:** wpisz właścicieli po ustaleniach (np. `@security-lead`, `@backend-lead`, `@devops`).**