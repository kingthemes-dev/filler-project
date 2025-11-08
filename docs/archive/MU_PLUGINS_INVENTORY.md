# Inwentarz mu-plugins WordPress

**Data utworzenia**: 2025-11-06  
**Status**: W trakcie audytu  
**Wersja**: 1.0

## Legenda

- **HPOS**: `yes` | `no` | `partial` | `required`
- **Cache**: `redis` | `transients` | `object-cache` | `none`
- **Priority**: `P0` (krytyczne) | `P1` (wysokie) | `P2` (średnie)
- **Status**: `active` | `deprecated` | `needs-review`

---

## 1. headless-config.php

**Wersja**: 1.0.0  
**HPOS**: `no` (nie dotyczy)  
**Cache**: `none`  
**Priority**: `P1`  
**Status**: `active`

**Opis**: Shared helpers dla headless frontend integration

**Funkcje**:
- `headless_frontend_url()` - zwraca canonical frontend URL
- `headless_rewrite_to_frontend()` - zamienia WordPress URLs na frontend URLs

**Hooks**: Brak  
**Zależności**: Brak  
**Koszt**: Minimalny (tylko funkcje pomocnicze)

---

## 2. king-optimized-api.php

**Wersja**: 1.0.0  
**HPOS**: `no` (nie dotyczy - products API)  
**Cache**: `redis` (24h TTL)  
**Priority**: `P0`  
**Status**: `active`

**Opis**: Custom optimized API endpoints z Redis caching

**Endpoints**:
- `GET /wp-json/king-optimized/v1/homepage` - Homepage data (all tabs)
- `GET /wp-json/king-optimized/v1/product/{slug}` - Single product optimized
- `GET /wp-json/king-optimized/v1/shop` - Shop data
- `GET /wp-json/king-optimized/v1/product/{id}` - Product by ID
- `GET /wp-json/king-optimized/v1/product-slug/{slug}` - Product by slug

**Hooks**:
- `rest_api_init` - register routes
- `save_post` - clear cache
- `delete_post` - clear cache

**Cache Strategy**:
- Redis: 24h TTL
- Cache keys: `king_homepage_data`, `king_product_{slug}`, `king_shop_data`
- Cache invalidation: on product save/delete

**Koszt**: Średni (Redis queries, product queries)

**Optymalizacje**:
- ✅ Redis caching
- ⏳ Możliwe: batch queries, select fields

---

## 3. king-shop-api.php

**Wersja**: 1.0.0  
**HPOS**: `no` (nie dotyczy - products API)  
**Cache**: `redis` (24h TTL)  
**Priority**: `P0`  
**Status**: `active`

**Opis**: Optimized shop page API - products, categories, attributes w jednym requeście

**Endpoints**:
- `GET /wp-json/king-shop/v1/data` - Shop data (products, categories, attributes)

**Query Params**:
- `page`, `per_page`, `category`, `search`, `orderby`, `order`
- `on_sale`, `featured`, `min_price`, `max_price`, `attributes`

**Hooks**:
- `rest_api_init` - register routes
- `woocommerce_update_product` - clear cache
- `woocommerce_new_product` - clear cache
- `woocommerce_delete_product` - clear cache

**Cache Strategy**:
- Redis: 24h TTL
- Cache key: `king_shop_data_{params_hash}`
- Cache invalidation: on product create/update/delete

**Koszt**: Średni-wysoki (products + categories + attributes queries)

**Optymalizacje**:
- ✅ Redis caching
- ✅ Batch queries (products + categories + attributes)
- ⏳ Możliwe: select fields, limit queries

---

## 4. king-email-system.php

**Wersja**: 2.0.0  
**HPOS**: `required` (wymaga HPOS)  
**Cache**: `none`  
**Priority**: `P0`  
**Status**: `active`

**Opis**: HPOS-Compatible email system - system powiadomień email

**HPOS Compatibility**:
- ✅ Uses `OrderUtil::custom_orders_table_usage_is_enabled()`
- ✅ HPOS-compatible order methods
- ✅ HPOS-specific logging

**Hooks**:
- `woocommerce_order_status_changed` - handle status changes
- `woocommerce_email_order_meta` - inject order meta
- `woocommerce_mail_content` - rewrite email content domain
- `woocommerce_email_after_order_table` - inject frontend CTA links
- `woocommerce_email_header` - add branding
- `woocommerce_new_order` - debug order creation
- `woocommerce_rest_insert_shop_order_object` - debug REST order creation
- `rest_api_init` - register REST routes
- `wp_mail_from_name` - set from name
- `wp_mail_from` - set from email
- `phpmailer_init` - configure SMTP

**REST Endpoints**:
- `GET /wp-json/king-email/v1/hpos-logs` - HPOS logs
- `GET /wp-json/king-email/v1/hpos-status` - HPOS status

**Koszt**: Niski-średni (email sending, order queries)

**Optymalizacje**:
- ✅ HPOS-compatible
- ⏳ Możliwe: queue system dla emaili

---

## 5. king-webhooks.php

**Wersja**: 1.0.0  
**HPOS**: `yes` (HPOS-compatible)  
**Cache**: `none`  
**Priority**: `P0`  
**Status**: `active`

**Opis**: WooCommerce webhooks configuration dla headless integration

**HPOS Compatibility**:
- ✅ HPOS-specific webhooks
- ✅ HPOS compatibility flag w webhook settings
- ✅ Increased timeout dla HPOS (30s)

**Webhooks**:
- Product: `product.created`, `product.updated`, `product.deleted`
- Order: `order.created`, `order.updated`, `order.deleted`, `order.status_changed`, `order.payment_complete`
- Customer: `customer.created`, `customer.updated`, `customer.deleted`
- Category: `product_cat.created`, `product_cat.updated`, `product_cat.deleted`

**Hooks**:
- `init` - register webhooks
- `admin_menu` - add admin menu
- `admin_init` - register settings
- `wp_ajax_test_king_webhook` - test webhook

**Koszt**: Niski (tylko webhook registration)

**Optymalizacje**:
- ✅ HPOS-compatible
- ✅ Increased timeout

---

## 6. king-cart-api.php

**Wersja**: 1.0.0  
**HPOS**: `no` (nie dotyczy - cart API)  
**Cache**: `none`  
**Priority**: `P1`  
**Status**: `active`

**Opis**: Custom cart API endpoint

**Endpoints**:
- `GET /wp-json/king-cart/v1/cart` - Get cart
- `POST /wp-json/king-cart/v1/cart` - Add to cart
- `DELETE /wp-json/king-cart/v1/cart` - Remove from cart

**Hooks**:
- `rest_api_init` - register routes

**Koszt**: Niski (cart operations)

---

## 7. king-jwt-authentication.php

**Wersja**: 1.0.0  
**HPOS**: `no` (nie dotyczy - auth)  
**Cache**: `none`  
**Priority**: `P0`  
**Status**: `active`

**Opis**: JWT authentication dla headless frontend

**Hooks**:
- `rest_api_init` - register routes
- `determine_current_user` - JWT authentication
- `rest_authentication_errors` - JWT validation

**Endpoints**:
- `POST /wp-json/king-jwt/v1/token` - Generate JWT token
- `POST /wp-json/king-jwt/v1/refresh` - Refresh JWT token
- `GET /wp-json/king-jwt/v1/validate` - Validate JWT token

**Koszt**: Niski (JWT operations)

**Optymalizacje**:
- ⏳ Możliwe: token rotation, refresh token strategy

---

## 8. king-reviews-api.php

**Wersja**: 1.0.0  
**HPOS**: `no` (nie dotyczy - reviews)  
**Cache**: `none`  
**Priority**: `P1`  
**Status**: `active`

**Opis**: Custom reviews API endpoint

**Endpoints**:
- `GET /wp-json/king-reviews/v1/reviews` - Get reviews
- `POST /wp-json/king-reviews/v1/reviews` - Create review

**Hooks**:
- `rest_api_init` - register routes

**Koszt**: Niski (review queries)

---

## 9. king-mock-reviews.php

**Wersja**: 1.0.0  
**HPOS**: `no` (nie dotyczy)  
**Cache**: `none`  
**Priority**: `P2`  
**Status**: `disabled` (przeniesiony do `delete/` folder)

**Opis**: Dodaje mock opinie do produktów dla testów frontend

**Hooks**:
- `init` - init
- `wp_ajax_king_generate_mock_reviews` - generate mock reviews
- `wp_ajax_nopriv_king_generate_mock_reviews` - generate mock reviews (public)
- `admin_menu` - add admin menu
- `woocommerce_new_product` - maybe add mock reviews

**Koszt**: Niski (tylko w dev/test)

**Uwaga**: Do usunięcia w produkcji lub wyłączenia

---

## 10. customer-invoices.php

**Wersja**: 1.0.0  
**HPOS**: `yes` (HPOS-compatible)  
**Cache**: `none`  
**Priority**: `P1`  
**Status**: `active`

**Opis**: Customer invoices generation

**HPOS Compatibility**:
- ✅ HPOS-compatible functions
- ✅ `generate_invoice_data_hpos()`
- ✅ `get_tracking_history_hpos()`

**Hooks**: (sprawdzić w pliku)

**Koszt**: Średni (invoice generation, order queries)

---

## 11. order-confirmation.php

**Wersja**: 1.0.0  
**HPOS**: `no` (nie dotyczy - HTML template)  
**Cache**: `none`  
**Priority**: `P2`  
**Status**: `active`

**Opis**: HTML template dla potwierdzenia zamówienia (nie jest mu-plugin)

**Uwaga**: To jest HTML template, nie mu-plugin. Może być używany przez email system.

**Koszt**: Minimalny (tylko template rendering)

---

## 12. custom-password-reset.php

**Wersja**: 1.0.0  
**HPOS**: `no` (nie dotyczy - password reset)  
**Cache**: `none`  
**Priority**: `P1`  
**Status**: `active`

**Opis**: Custom password reset dla headless frontend

**Endpoints**:
- `POST /wp-json/custom/v1/password-reset` - Password reset

**Hooks**: (sprawdzić w pliku)

**Koszt**: Niski

---

## 13. email-link-redirect.php

**Wersja**: 1.0.0  
**HPOS**: `no` (nie dotyczy)  
**Cache**: `none`  
**Priority**: `P2`  
**Status**: `active`

**Opis**: Redirect email links do headless frontend

**Hooks**: (sprawdzić w pliku)

**Koszt**: Minimalny

---

## 14. woocommerce-custom-fields.php

**Wersja**: 1.0.0  
**HPOS**: `partial` (może wymagać sprawdzenia)  
**Cache**: `none`  
**Priority**: `P1`  
**Status**: `active`

**Opis**: Custom fields dla WooCommerce

**Hooks**: (sprawdzić w pliku)

**Koszt**: Niski

---

## 15. hpos-compatibility-test.php

**Wersja**: 1.0.0  
**HPOS**: `required` (test script)  
**Cache**: `none`  
**Priority**: `P2`  
**Status**: `disabled` (przeniesiony do `delete/` folder)

**Opis**: HPOS Compatibility Test Script

**Funkcje**:
- Test HPOS status
- Test customer invoices HPOS compatibility
- Test email system HPOS compatibility
- Test order creation with HPOS

**Koszt**: Niski (tylko testy)

**Uwaga**: Do usunięcia w produkcji lub wyłączenia

---

## Podsumowanie

| Plugin | HPOS | Cache | Priority | Status | Koszt |
|--------|------|-------|----------|--------|-------|
| headless-config.php | no | none | P1 | active | Minimalny |
| king-optimized-api.php | no | redis | P0 | active | Średni |
| king-shop-api.php | no | redis | P0 | active | Średni-wysoki |
| king-email-system.php | required | none | P0 | active | Niski-średni |
| king-webhooks.php | yes | none | P0 | active | Niski |
| king-cart-api.php | no | none | P1 | active | Niski |
| king-jwt-authentication.php | no | none | P0 | active | Niski |
| king-reviews-api.php | no | none | P1 | active | Niski |
| king-mock-reviews.php | no | none | P2 | disabled | Niski |
| customer-invoices.php | yes | none | P1 | active | Średni |
| order-confirmation.php | no | none | P2 | active | Minimalny (template) |
| custom-password-reset.php | no | none | P1 | active | Niski |
| email-link-redirect.php | no | none | P2 | active | Minimalny |
| woocommerce-custom-fields.php | partial | none | P1 | active | Niski |
| hpos-compatibility-test.php | required | none | P2 | disabled | Niski |

**Total**: 14 mu-plugins (12 aktywnych + 2 wyłączone) + 1 HTML template

---

## Problemy i rekomendacje

### P0 (Krytyczne)

1. ✅ **king-mock-reviews.php** - Wyłączony
   - Status: Przeniesiony do `delete/` folder
   - Data: 2025-11-06

2. ✅ **hpos-compatibility-test.php** - Wyłączony
   - Status: Przeniesiony do `delete/` folder
   - Data: 2025-11-06

3. **woocommerce-custom-fields.php** - Sprawdzić HPOS compatibility
   - Status: Partial HPOS
   - Działanie: Zweryfikować pełną kompatybilność HPOS

### P1 (Wysokie)

4. **king-optimized-api.php** - Optymalizacja cache
   - Cache: Redis 24h TTL
   - Działanie: Sprawdzić hit rate, zoptymalizować TTL

5. **king-shop-api.php** - Optymalizacja queries
   - Koszt: Średni-wysoki
   - Działanie: Batch queries, select fields

6. **Autoloaded options audit**
   - Działanie: Sprawdzić autoloaded options >1MB

### P2 (Średnie)

7. **Hook conflicts audit**
   - Działanie: Sprawdzić duplikaty hooków

8. **Cache strategy audit**
   - Działanie: Ujednolicić cache keys i TTL

---

## Następne kroki

1. ⏳ Uruchomić `wp profile` dla każdego mu-plugin
2. ⏳ Sprawdzić autoloaded options
3. ⏳ Audit hook conflicts
4. ⏳ Optymalizacja cache strategy
5. ⏳ Usunąć/wyłączyć test plugins przed produkcją

