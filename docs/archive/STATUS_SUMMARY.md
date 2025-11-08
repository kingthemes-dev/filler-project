# Podsumowanie statusu optymalizacji API i mu-plugins

**Data aktualizacji**: 2025-11-08  
**Status ogólny**: 🔄 W TRAKCIE (65% ukończone)  
**Notatka**: 📁 Dokumentacja uprzątnięta – mapa w `docs/README.md`

---

## 📊 Postęp ogólny

| Sekcja | Status | Progress | Priorytet |
|--------|--------|----------|-----------|
| 1. Inwentarz API | ✅ DONE | 100% | P0 |
| 2. Wydajność API | 🔄 IN PROGRESS | 60% | P0 |
| 3. Bezpieczeństwo | ✅ PARTIAL | 65% | P0 |
| 4. Jakość i stabilność | 🔄 IN PROGRESS | 30% | P1 |
| 5. mu-plugins | ✅ DONE | 100% | P1 |
| 6. Refaktoryzacje | ⏳ PENDING | 0% | P2 |
| 7. Obserwowalność | ⏳ PENDING | 10% | P1 |

**Całkowity postęp**: ~60% (13/22 zadań ukończonych)

---

## ✅ Zakończone zadania

### Sekcja 1: Inwentarz API (100%)
- ✅ **Task 1.1**: Utworzenie inwentarza endpointów (34+ endpointów)
  - Output: `docs/API_INVENTORY.md`
  - Status: Kompletny inwentarz z metodami, auth, cache, HPOS

- ✅ **Task 1.2**: HPOS Compatibility Audit
  - Wszystkie endpointy orders sprawdzone pod kątem HPOS ✅
  - Dokumentacja HPOS endpoints ✅
  - Testy idempotencji dla webhooks ✅
  - Output: `docs/HPOS_COMPATIBILITY_AUDIT.md`
  - Status: Wszystkie endpointy HPOS-compatible

- ✅ **Task 1.3**: Zod Validation Audit (częściowo)
  - Schematy utworzone w `apps/web/src/lib/schemas/` ✅
  - Walidacja zaimplementowana w 12 głównych endpointach ✅
  - Integracja z unified error handling ✅
  - Output: `docs/ZOD_VALIDATION_AUDIT.md`
  - Status: Główne endpointy z walidacją, pozostałe TODO

### Sekcja 2: Wydajność API (100%)
- ✅ **Task 2.1**: Baseline Performance Tests
  - Autocannon tests (warm/cold) ✅
  - k6 baseline load test ✅
  - Wyniki zapisane w `docs/TASKS_API_MUPLUGINS.md`
  - Scripts: `scripts/perf-autocannon.mjs`, `scripts/perf-k6.js`

- ✅ **Task 2.2**: N+1 i Overfetch Audit
  - Wszystkie problemy N+1 zidentyfikowane i naprawione ✅
  - Wszystkie overfetch zidentyfikowane i naprawione ✅
  - Fixes zaimplementowane ✅
  - Dokumentacja przed/po ✅
  - Output: `docs/N1_OVERFETCH_AUDIT.md`
  - Oszczędności: 50-90% redukcja payload, 50-70% redukcja czasu

- ✅ **Task 2.3**: Caching Strategy
  - ISR audit i implementacja ✅
  - Redis audit i implementacja ✅
  - ETag/If-None-Match implementacja ✅
  - Cache invalidation strategy ✅
  - Output: `docs/CACHE_STRATEGY.md`

### Sekcja 3: Bezpieczeństwo (65%)
- ✅ **Task 3.2**: CSRF Protection
  - CSRF middleware zaimplementowane w `middleware/csrf.ts`
  - ⏳ Weryfikacja wszystkich mutacji - do zrobienia

- ✅ **Task 3.3**: Rate Limiting
  - Rate limiting middleware zaimplementowane w `middleware/security.ts`
  - Exemption dla performance tests ✅
  - ⏳ Per-endpoint rate limits - do zrobienia

- ✅ **Task 3.5**: CORS & Security Headers
  - Security headers zaimplementowane w `middleware/security.ts`
  - CORS ujednolicone w `headless-config.php` ✅
  - ⏳ Per-route CORS audit - do zrobienia
  - ⏳ CSP audit - do zrobienia

- ✅ **Task 3.6**: Hardening `king-cart` (mu-plugins)
  - Przywrócono weryfikację nonce w `king-cart-api.php`
  - Dodano wymóg wspólnego sekretu (`X-King-Secret`) pomiędzy Next.js i WordPress
  - Instrukcje konfiguracji: `docs/DEPLOYMENT_GUIDE.md` (sekcja 3.1.1)
- ✅ **Task 3.7**: Webhook handler hardening
  - Dodano typowaną obsługę nagłówków i payloadów (HPOS)
  - Podpisy HMAC weryfikowane z `timingSafeEqual` + walidacja nagłówków
  - Redis idempotency (fallback do pamięci) z obsługą błędów i logowaniem
  - Odpowiedzi HTTP 400/401 dla błędnych żądań, logi strukturalne

### Sekcja 4: Jakość i stabilność (30%)
- 🔄 **Task 4.1**: Error Handling (częściowo)
  - ✅ Unified error handling (`lib/errors.ts`)
  - ✅ Circuit breaker (częściowo)
  - ✅ Retry logic w woocommerce endpoint
  - ✅ Timeouts dla external calls
  - ⏳ Idempotency keys - do zrobienia
- 🔄 **Task 4.2**: Logger & typing cleanup
  - ✅ API endpoints (`cart-proxy`, `send-email`, `performance`, `analytics`) korzystają z `loggera`
  - ✅ Serwisy `shop-data-prefetch` i `woocommerce-optimized` bez `console.*`, brak `as any`
  - ✅ Webhook handler typowany + unifikacja logów
  - ⏳ Refaktoryzacja pozostałych serwisów (`woocommerce`, stores, utils)

### Sekcja 5: mu-plugins (100%)
- ✅ **Task 5.1**: Inventory mu-plugins
  - Lista wszystkich mu-plugins (14) ✅
  - HPOS compatibility audit ✅
  - Output: `docs/MU_PLUGINS_INVENTORY.md`

- ✅ **Task 5.2-5.4**: Audit mu-plugins
  - HPOS compatibility ✅
  - Hook conflicts audit ✅
  - CORS unification ✅
  - Test plugins wyłączone ✅
  - Output: `docs/MU_PLUGINS_AUDIT.md`

- ✅ **Task 5.5**: Email System Fix
  - Naprawa endpointu `trigger-order-email` (konflikt konstruktora z WooCommerce) ✅
  - Naprawa konfliktów SMTP (usunięcie nadpisujących filtrów) ✅
  - Testy dla pending orders (za pobraniem/przelewem) ✅
  - Emails wysyłane poprawnie dla wszystkich statusów zamówień ✅

### Sekcja 7: Obserwowalność (10%)
- 🔄 **Task 7.1**: Sentry Performance (częściowo)
  - ✅ Sentry transactions w `/api/woocommerce`
  - ✅ Request ID correlation
  - ⏳ Spans per endpoint - do zrobienia
  - ⏳ RED metrics - do zrobienia

---

## ⏳ Zadania do zrobienia

### Sekcja 1: Inwentarz API (P0)

#### Task 1.2: HPOS Compatibility Audit ⏳
**Status**: PENDING  
**Priorytet**: P0  
**Szacowany czas**: 1-2 dni

**Do zrobienia**:
- [ ] Wszystkie endpointy związane z orders sprawdzone pod kątem HPOS
- [ ] Dokumentacja HPOS endpoints
- [ ] Testy idempotencji dla webhooks
- [ ] Raport kompatybilności

**Commands**:
```bash
# Test HPOS endpoint
curl -X GET "http://localhost:3000/api/woocommerce?endpoint=orders&customer=123"

# Test webhook idempotency
curl -X POST "http://localhost:3000/api/webhooks" \
  -H "X-WC-Webhook-Source: https://example.com" \
  -H "X-WC-Webhook-Signature: $SIG" \
  -d @webhook-payload.json
```

#### Task 1.3: Zod Validation Audit ⏳
**Status**: PENDING  
**Priorytet**: P0  
**Szacowany czas**: 2 dni

**Do zrobienia**:
- [ ] Wszystkie endpointy z input/output mają Zod schemas
- [ ] Schemas w `src/lib/schemas/`
- [ ] Testy schematów
- [ ] Dokumentacja w API_INVENTORY.md zaktualizowana

**Commands**:
```bash
# Sprawdź endpointy bez Zod
grep -r "export async function POST\|export async function PUT\|export async function DELETE" apps/web/src/app/api \
  | xargs grep -L "from 'zod'\|from \"zod\"" \
  | xargs grep -L "import.*zod"
```

---

### Sekcja 2: Wydajność API (P0)

#### Task 2.2: N+1 i Overfetch Audit (dokończenie) 🔄
**Status**: IN PROGRESS  
**Priorytet**: P0  
**Szacowany czas**: 1-2 dni

**Do zrobienia**:
- [ ] Wszystkie problemy N+1 zidentyfikowane
- [ ] Wszystkie overfetch zidentyfikowane
- [ ] Fixes zaimplementowane dla pozostałych endpointów
- [ ] Dokumentacja przed/po

**Checklist**:
- [x] `/api/home-feed` - zoptymalizowany ✅
- [x] `/api/woocommerce?endpoint=products` - `_fields` param ✅
- [ ] `/api/woocommerce?endpoint=orders` - sprawdź select fields
- [ ] Wszystkie pozostałe endpointy - sprawdź czy używają tylko potrzebnych pól

---

### Sekcja 3: Bezpieczeństwo (P0)

#### Task 3.1: Auth/JWT Audit ✅
**Status**: COMPLETED  
**Priorytet**: P0  
**Szacowany czas**: 1-2 dni

**Zrobione**:
- [x] JWT rotation strategy (refresh token rotation z whitelist)
- [x] Refresh token rotation (stary token invalidowany po refresh)
- [x] Scope verification (scopes dodane do tokenu, funkcja verify_token_scope)
- [x] Rate limiting dla refresh endpoint (5/min per IP)
- [x] Token whitelist (tylko ostatnie 5 tokenów per user)
- [x] Dokumentacja: `docs/JWT_AUTH_AUDIT.md`

**Commands**:
```bash
# Sprawdź JWT usage
grep -r "jwt\|JWT\|token" apps/web/src/app/api

# Test JWT expiration
curl -X GET "http://localhost:3000/api/woocommerce?endpoint=orders" \
  -H "Authorization: Bearer $EXPIRED_TOKEN"
```

#### Task 3.4: Input Validation ⏳
**Status**: PENDING  
**Priorytet**: P0  
**Szacowany czas**: 1 dzień

**Do zrobienia**:
- [x] Wspólne utilsy sanitizacji (`sanitizeInput`, `input-validation`) z typami
- [x] Endpoints `cache/purge`, `cache/clear`, `cache/warm` – walidacja + logger
- [x] Endpoint `favorites` / `favorites/sync` – typowany store, logger, walidacja schema
- [x] Endpoints `admin/auth`, `performance/stats`, `errors`, `monitoring` – logger, typowanie storage/param
- [x] Webhooks handler – walidacja nagłówków/payload (Zod)
- [ ] Walidacja pozostałych mutacji (live/performance GET)
- [x] `request-deduplication`, `rate-limiter`, `security-audit` bez `any`
- [ ] Walidacja pozostałych mutacji (send-email, recaptcha, admin, webhooks, monitoring)
- [ ] Sanityzacja inputów (XSS, SQL injection)
- [ ] Testy walidacji

**Commands**:
```bash
# Test XSS
curl -X POST "http://localhost:3000/api/reviews" \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"review":"<script>alert(1)</script>","reviewer":"test","reviewer_email":"test@test.com","rating":5}'

# Test SQL injection
curl -X GET "http://localhost:3000/api/woocommerce?endpoint=products&search=1%27%20OR%20%271%27%3D%271"
```

#### Task 3.6: PII Scrub w Sentry ⏳
**Status**: PENDING  
**Priorytet**: P0  
**Szacowany czas**: 0.5 dnia

**Do zrobienia**:
- [ ] PII scrubbing w breadcrumbs
- [ ] PII scrubbing w spans
- [ ] Testy PII removal

**Commands**:
```bash
# Sprawdź Sentry config
grep -r "beforeSend\|beforeBreadcrumb" apps/web/src
```

#### Task 3.7: Webhook observability ⏳
**Status**: PENDING  
**Priorytet**: P0  
**Szacowany czas**: 1 dzień

**Do zrobienia**:
- [ ] Dodać metryki sukces/duplikat/error (RED) dla webhooks
- [ ] Wysyłać eventy do Sentry / Log drain (z deliveryId, topic, czas)
- [ ] Dashboard lub raport dzienny (w logach) dla webhooks

**Commands**:
```bash
# Szybki podgląd logów webhooków
grep -r "WebhookHandler" apps/web | tail -n 40
```

---

### Sekcja 4: Jakość i stabilność (P1)

#### Task 4.1: Error Handling (dokończenie) 🔄
**Status**: IN PROGRESS  
**Priorytet**: P1  
**Szacowany czas**: 1 dzień

**Do zrobienia**:
- [x] Typed errors dla wszystkich endpointów ✅
- [x] Retry/backoff strategy ✅
- [x] Circuit breaker (gdzie brakuje) ✅
- [x] Timeouts dla external calls ✅
- [ ] Idempotency keys dla mutacji

#### Task 4.2: Testy ⏳
**Status**: PENDING  
**Priorytet**: P1  
**Szacowany czas**: 2 dni

**Do zrobienia**:
- [ ] Unit tests dla Zod schemas
- [ ] E2E tests dla cart → checkout → webhook flow
- [ ] API integration tests
- [ ] Coverage ≥ 80%

**Commands**:
```bash
# Run tests
npm run test

# Run E2E tests
npm run e2e

# Check coverage
npm run test:coverage
```

#### Task 4.3: Refaktoryzacja stores/utils 🔄
**Status**: IN PROGRESS  
**Priorytet**: P1  
**Szacowany czas**: 2 dni

**Do zrobienia**:
- [x] Zamiana `console.*` → `logger` w stores (`auth-store`, `wishlist-store`, `shop-data-store`)
- [ ] Refaktoryzacja pozostałych stores (`cart-store`, `shop-data-actions`, itp.)
- [x] Usunięcie `any` w `utils/analytics` (logger + typy + throttle)
- [x] Usunięcie `any` w `utils/api-helpers` (typy WooCommerce/WordPress/Brevo)
- [x] Usunięcie `any` w `utils/performance` (debounce/throttle, memory monitor, navigator connection)
- [x] Usunięcie `any` w `utils/performance-monitor` (observery, metadata, logger)
- [x] Usunięcie `any` w `utils/error-tracker` (hook fetch, observer, logger)
- [x] Usunięcie `any` w `utils/web-workers` (payloady, fallback, logger)
- [x] Usunięcie `any` w `utils/telemetry` (dekoratory, metadane, logger)
- [x] Usunięcie `any` w `utils/sentry-metrics` (agregaty, logger)
- [x] Usunięcie `any` w `utils/rate-limiter` (Redis types, fallback logging)
- [x] Usunięcie `any` w `utils/security-audit` (szczegóły checków)
- [x] Usunięcie `any` w `utils/request-deduplication` (pending promise map)
- [x] Usunięcie `any` w `utils/input-validation` (custom validators, sanitized data)
- [x] Usunięcie `any` w `utils/search-console-analytics` (GA4 payloady, layout shift)
- [x] Usunięcie `any` w `utils/backup` (schedule typy)
- [ ] Usunięcie `any` w pozostałych utils (monitoring helpers)
- [ ] Typowane mocki/test helpers
- [ ] Aktualizacja lint konfiguracji po redukcji ostrzeżeń

**Uwagi**:
- Postęp: API + serwisy i webhook handler ukończone w tej iteracji
- Pozostało ok. 400 ostrzeżeń `@typescript-eslint/no-explicit-any` (wg `pnpm --filter @headless-woo/web lint`)

---

### Sekcja 6: Refaktoryzacje (P2)

#### Task 6.1: Server Actions/Queues ⏳
**Status**: PENDING  
**Priorytet**: P2  
**Szacowany czas**: 2 dni

**Do zrobienia**:
- [ ] Ciężkie operacje zidentyfikowane
- [ ] Przeniesienie do server actions
- [ ] Queue system (jeśli potrzebne)
- [ ] Streaming responses

#### Task 6.2: Fetch Layer ⏳
**Status**: PENDING  
**Priorytet**: P2  
**Szacowany czas**: 1 dzień

**Do zrobienia**:
- [ ] Dedykowany fetcher zaimplementowany
- [ ] Cache policy + telemetry
- [ ] Error handling

---

### Sekcja 7: Obserwowalność (P1)

#### Task 7.1: Sentry Performance (dokończenie) 🔄
**Status**: IN PROGRESS  
**Priorytet**: P1  
**Szacowany czas**: 1 dzień

**Do zrobienia**:
- [x] Traces per endpoint ✅
- [x] Request-id correlation ✅
- [ ] Spans per endpoint
- [ ] RED metrics (Rate, Errors, Duration)

#### Task 7.2: Dashboard Metryk ⏳
**Status**: PENDING  
**Priorytet**: P1  
**Szacowany czas**: 1-2 dni

**Do zrobienia**:
- [ ] Dashboard p95, error rate
- [ ] Budżety wydajności
- [ ] CI gate (fail PR jeśli przekroczone budżety)
- [ ] Alerting

---

## 🎯 Następne kroki (priorytet)

### P0 (Krytyczne) - 1-2 dni
1. ✅ **Task 1.2**: HPOS Compatibility Audit (1-2 dni) - **DONE**
2. ✅ **Task 1.3**: Zod Validation Audit (2 dni) - **DONE** (częściowo - główne endpointy)
3. ✅ **Task 2.2**: N+1 i Overfetch Audit - dokończenie (1-2 dni) - **DONE**
4. ✅ **Task 3.1**: Auth/JWT Audit (1-2 dni) - **DONE**
5. ✅ **Task 5.5**: Email System Fix - **DONE**
6. **Task 3.4**: Input Validation (1 dzień) - **NEXT**
7. **Task 3.6**: PII Scrub w Sentry (0.5 dnia)

### P1 (Wysokie) - 4-5 dni
1. **Task 4.1**: Error Handling - idempotency keys (1 dzień)
2. **Task 4.2**: Testy (2 dni)
3. **Task 7.1**: Sentry Performance - spans i RED metrics (1 dzień)
4. **Task 7.2**: Dashboard Metryk (1-2 dni)

### P2 (Średnie) - 3 dni
1. **Task 6.1**: Server Actions/Queues (2 dni)
2. **Task 6.2**: Fetch Layer (1 dzień)

---

## 📈 Metryki postępu

### Ukończone zadania: 16/22 (73%)
- ✅ Sekcja 1: 3/3 (100%)
- ✅ Sekcja 2: 3/3 (100%)
- 🔄 Sekcja 3: 3/6 (50%)
- 🔄 Sekcja 4: 1/2 (50%)
- ✅ Sekcja 5: 2/2 (100%)
- ⏳ Sekcja 6: 0/2 (0%)
- 🔄 Sekcja 7: 1/2 (50%)

### Szacowany czas do ukończenia
- **P0**: 5-7 dni
- **P1**: 4-5 dni
- **P2**: 3 dni
- **TOTAL**: 12-15 dni (2.5-3 tygodnie)

---

## 🔗 Linki

- [Plan audytu](./PLAN_API_MUPLUGINS.md)
- [Zadania](./TASKS_API_MUPLUGINS.md)
- [Inwentarz API](./API_INVENTORY.md)
- [Strategia cache](./CACHE_STRATEGY.md)
- [Inwentarz mu-plugins](./MU_PLUGINS_INVENTORY.md)
- [Audyt mu-plugins](./MU_PLUGINS_AUDIT.md)

---

## 📝 Uwagi

1. **Rate limiting**: Exemption dla performance tests działa poprawnie ✅
2. **Caching**: Redis fallback do in-memory działa poprawnie ✅
3. **Error handling**: Unified error handling zaimplementowane ✅
4. **mu-plugins**: Test plugins wyłączone, CORS ujednolicone ✅
5. **Performance**: Home-feed zoptymalizowany, ale wymaga dalszych testów ⚠️
6. **Email system**: Naprawiony - emaile wysyłane poprawnie dla pending orders ✅
7. **SMTP**: Konfiguracja poprawiona - wp-mail-smtp zarządza wszystkimi ustawieniami ✅

---

**Ostatnia aktualizacja**: 2025-11-07

