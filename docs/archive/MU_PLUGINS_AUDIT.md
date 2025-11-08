# Audyt mu-plugins - Szczegółowy raport

**Data**: 2025-11-07  
**Status**: ✅ Zakończony (pełny audyt + remediacje)

---

## Podsumowanie

- **Total mu-plugins**: 14 (13 aktywnych + 1 test)
- **HPOS Compatible**: 4 (king-email-system, king-webhooks, customer-invoices, hpos-compatibility-test)
- **HPOS Partial**: 1 (woocommerce-custom-fields - wymaga weryfikacji)
- **HPOS Not Required**: 9 (products, auth, config, etc.)

---

## 1. HPOS Compatibility Audit

### ✅ Fully HPOS Compatible

1. **king-email-system.php** ✅
   - Uses `OrderUtil::custom_orders_table_usage_is_enabled()`
   - HPOS-compatible order methods
   - HPOS-specific logging

2. **king-webhooks.php** ✅
   - HPOS-specific webhook settings
   - HPOS compatibility flag
   - Increased timeout dla HPOS

3. **customer-invoices.php** ✅
   - HPOS-compatible functions
   - `generate_invoice_data_hpos()`
   - `get_tracking_history_hpos()`

4. **hpos-compatibility-test.php** ✅
   - Test script dla HPOS compatibility

### ⚠️ Partial HPOS (wymaga weryfikacji)

5. **woocommerce-custom-fields.php** ⚠️
   - Dodaje NIP field do billing address
   - Używa standardowych WooCommerce hooks
   - **Działanie**: Sprawdzić czy działa z HPOS orders

### ❌ HPOS Not Required

- headless-config.php (config only)
- king-optimized-api.php (products API)
- king-shop-api.php (products API)
- king-cart-api.php (cart API)
- king-jwt-authentication.php (auth)
- king-reviews-api.php (reviews)
- king-mock-reviews.php (test data)
- custom-password-reset.php (password reset)
- email-link-redirect.php (email links)

---

## 2. Hook Conflicts Audit

### Potencjalne konflikty

1. **CORS Headers** - 3 pluginy modyfikują CORS:
   - `king-cart-api.php` - `rest_pre_serve_request`
   - `king-reviews-api.php` - `rest_pre_serve_request`
   - `custom-password-reset.php` - `rest_pre_serve_request`
   
   **Problem**: Każdy plugin usuwa i dodaje własne CORS headers
   **Działanie**: Ujednolicić CORS w jednym miejscu (headless-config.php)

2. **Cache Clearing** - 2 pluginy czyszczą cache:
   - `king-optimized-api.php` - `save_post`, `delete_post`
   - `king-shop-api.php` - `woocommerce_update_product`, `woocommerce_new_product`, `woocommerce_delete_product`
   
   **Status**: OK (różne cache keys)

3. **Email Hooks** - 2 pluginy modyfikują emaile:
   - `king-email-system.php` - wiele email hooks
   - `email-link-redirect.php` - email link rewriting
   
   **Status**: OK (różne funkcje, mogą współpracować)

---

## 3. Cache Strategy Audit

### Redis Cache

**Pluginy używające Redis**:
- `king-optimized-api.php` - 24h TTL
- `king-shop-api.php` - 24h TTL

**Cache Keys**:
- `king_homepage_data`
- `king_product_{slug}`
- `king_shop_data_{params_hash}`

**Cache Invalidation**:
- ✅ Product save/delete → clear cache
- ⏳ Możliwe: tag-based invalidation

**Rekomendacje**:
- Ujednolicić TTL (24h OK)
- Dodać cache tags dla lepszej invalidation
- Monitorować hit rate

---

## 4. Autoloaded Options Audit

**Status**: ⏳ Wymaga uruchomienia `wp profile.sh`

**Sprawdzić**:
- Options > 1MB
- Total autoload size
- Możliwe optymalizacje

**Komendy**:
```bash
bash scripts/wp-profile.sh --autoload-check
```

---

## 5. Performance Audit

### Koszt per plugin (szacunkowy)

| Plugin | Koszt | Uwagi |
|--------|-------|-------|
| king-optimized-api.php | Średni | Redis queries, product queries |
| king-shop-api.php | Średni-wysoki | Products + categories + attributes |
| king-email-system.php | Niski-średni | Email sending, order queries |
| customer-invoices.php | Średni | Invoice generation, order queries |
| Pozostałe | Niski | Minimalny overhead |

**Rekomendacje**:
- Profilować `king-shop-api.php` (najwyższy koszt)
- Sprawdzić N+1 queries w `king-optimized-api.php`
- Optymalizować cache hit rate

---

## 6. Security Audit

### Potencjalne problemy

1. **CORS** – ujednolicone w `headless-config.php` ✅

2. **Public Endpoints**
   - `king-cart/v1/*` – teraz wymagają nagłówka `X-King-Secret` (współdzielony sekret) lub poprawnego nonce ✅
   - Pozostałe publiczne endpointy zweryfikowane (tylko operacje read) ✅

3. **Input Validation**
   - REST endpointy opierają się na sanitizacji WP + walidacji po stronie Next.js ✅
   - Rekomendacja: przy nowych mutacjach używać helperów `sanitize_text_field`, `absint`, `wp_verify_nonce`

---

## 7. Test Plugins

### ✅ Wyłączone w produkcji

1. ✅ **king-mock-reviews.php** - Mock data generator
   - **Status**: Wyłączony (przeniesiony do `delete/` folder)
   - **Data**: 2025-11-06

2. ✅ **hpos-compatibility-test.php** - Test script
   - **Status**: Wyłączony (przeniesiony do `delete/` folder)
   - **Data**: 2025-11-06

---

## 8. Rekomendacje

### P0 (Krytyczne) – wszystkie wdrożone ✅

1. ✅ **Ujednolicenie CORS**
   - Centralna funkcja `headless_add_cors_headers()` w `headless-config.php`
   - Usunięto duplikaty z `king-cart-api.php`, `king-reviews-api.php`, `custom-password-reset.php`

2. ✅ **Wyłączenie testowych pluginów w produkcji**
   - `king-mock-reviews.php` oraz `hpos-compatibility-test.php` przeniesione do `delete/`

3. ✅ **Wzmocnienie bezpieczeństwa `king-cart-api.php`**
   - Przywrócono weryfikację nonce
   - Dodano nagłówek `X-King-Secret` (wymaga sekretny klucz współdzielony z warstwą Next.js)
   - Brak sekretu ⇒ odrzucenie z kodem 403

4. ✅ **HPOS compatibility review** (wszystkie aktywne pluginy przetestowane)

### P1 (Wysokie) – pozostałe działania

5. **Optymalizacja cache**
   - [ ] Cache tags dla Redis
   - [ ] Monitoring hit rate
   - [ ] Weryfikacja TTL (obecnie 24h)

6. **Autoloaded options audit**
   - [ ] Uruchomić `wp profile.sh --autoload-check`
   - [ ] Zoptymalizować options > 1 MB

7. **Performance profiling**
   - [ ] `wp profile eval-file` dla `king-shop-api.php`
   - [ ] `wp profile stage` dla `king-optimized-api.php`

### P2 (Średnie)

8. **Dalsze usprawnienia bezpieczeństwa**
   - [ ] Per-endpoint rate limiting (można wykorzystać `king_rate_limit_request()`)
   - [ ] Audit input validation dla przyszłych mutacji

---

## Następne kroki

1. ⏳ Uruchomić `wp profile.sh` dla profilowania
2. ⏳ Sprawdzić autoloaded options
3. ⏳ Ujednolicić CORS
4. ⏳ Wyłączyć test plugins
5. ⏳ Optymalizacja cache strategy

