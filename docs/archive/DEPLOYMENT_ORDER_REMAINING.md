# Kolejność wdrożenia pozostałych mu-plugins

**Data**: 2025-11-07  
**Status**: ✅ headless-config.php już wdrożony

---

## 📋 Pliki do wdrożenia (8 plików)

### FAZA 1: Pluginy używające headless-config (3 pliki)
**Uwaga**: `headless-config.php` jest już wdrożony, więc można wrzucać te pliki.

#### 1. `email-link-redirect.php` ⚠️ PIERWSZY w tej fazie
**Dlaczego pierwszy**: 
- Używa `headless_frontend_url()` z headless-config
- Ważny dla email redirects

**Zależności**: 
- ✅ `headless-config.php` (już wdrożony)

**Test po wdrożeniu**:
```bash
# Sprawdź czy funkcja headless_frontend_url() jest dostępna
# (można przetestować przez sprawdzenie emaili)
```

---

#### 2. `king-cart-api.php`
**Dlaczego drugi**: 
- Używa CORS z headless-config
- Ważny dla cart operations

**Zależności**: 
- ✅ `headless-config.php` (już wdrożony)

**Test po wdrożeniu**:
```bash
curl -X OPTIONS "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart" \
  -H "Origin: https://filler.pl" \
  -H "Access-Control-Request-Method: POST" \
  -v
# Powinno zwrócić CORS headers
```

---

#### 3. `king-reviews-api.php`
**Dlaczego trzeci**: 
- Używa CORS z headless-config
- Ważny dla reviews

**Zależności**: 
- ✅ `headless-config.php` (już wdrożony)

**Test po wdrożeniu**:
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-reviews/v1/reviews?product_id=123"
```

---

### FAZA 2: Pluginy niezależne (4 pliki)
**Uwaga**: Te pluginy nie mają zależności, można je wrzucać w dowolnej kolejności lub razem.

#### 4. `woocommerce-custom-fields.php`
**Dlaczego**: 
- Dodaje NIP field do WooCommerce
- Niezależny od innych pluginów

**Zależności**: Brak

**Test po wdrożeniu**:
- Sprawdź czy pole NIP pojawia się w checkout
- Sprawdź czy NIP jest zapisywany w zamówieniu

---

#### 5. `king-optimized-api.php`
**Dlaczego**: 
- Optimized API endpoints (homepage, products)
- Ważny dla performance

**Zależności**: Brak

**Test po wdrożeniu**:
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-optimized/v1/homepage"
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-optimized/v1/product/product-slug"
```

---

#### 6. `king-shop-api.php`
**Dlaczego**: 
- Shop API (products, categories, attributes)
- Ważny dla shop page

**Zależności**: Brak

**Test po wdrożeniu**:
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-shop/v1/data?page=1&per_page=12"
```

---

#### 7. `king-webhooks.php`
**Dlaczego**: 
- Webhooks configuration
- Najmniej krytyczny

**Zależności**: Brak

**Test po wdrożeniu**:
- Sprawdź w WooCommerce admin → Settings → Advanced → Webhooks
- Sprawdź czy webhooks są zarejestrowane

---

### FAZA 3: Template (1 plik)
**Uwaga**: To jest HTML template, nie mu-plugin.

#### 8. `order-confirmation.php`
**Dlaczego ostatni**: 
- To jest HTML template (nie mu-plugin)
- Używa `headless_frontend_url()` ale nie jest mu-plugin
- Może być wrzucony na końcu lub pominięty (jeśli nie jest używany)

**Zależności**: 
- ✅ `headless-config.php` (już wdrożony - dla funkcji headless_frontend_url)

**Test po wdrożeniu**:
- Sprawdź czy template jest dostępny (jeśli jest używany)

---

## ⚡ Zalecana kolejność wdrożenia

### Opcja A: Wrzucanie pojedynczo (zalecane dla bezpieczeństwa)

```bash
# FAZA 1: Pluginy z zależnościami (po kolei)
1. email-link-redirect.php
   # Poczekaj 30 sekund, sprawdź logi

2. king-cart-api.php
   # Poczekaj 30 sekund, sprawdź logi

3. king-reviews-api.php
   # Poczekaj 30 sekund, sprawdź logi

# FAZA 2: Pluginy niezależne (można razem)
4. woocommerce-custom-fields.php
5. king-optimized-api.php
6. king-shop-api.php
7. king-webhooks.php
   # Można wrzucić razem lub po kolei

# FAZA 3: Template
8. order-confirmation.php (opcjonalnie)
```

---

### Opcja B: Wrzucanie grupami (szybsze)

```bash
# FAZA 1: Pluginy z zależnościami (po kolei)
1. email-link-redirect.php
2. king-cart-api.php
3. king-reviews-api.php

# FAZA 2: Pluginy niezależne (razem)
4-7. woocommerce-custom-fields.php + king-optimized-api.php + king-shop-api.php + king-webhooks.php

# FAZA 3: Template
8. order-confirmation.php (opcjonalnie)
```

---

## ✅ Checklist wdrożenia

### Przed wdrożeniem
- [ ] Backup mu-plugins (jeśli potrzeba)
- [ ] Sprawdź czy `headless-config.php` jest na serwerze ✅

### FAZA 1: Pluginy z zależnościami
- [ ] Wrzuć `email-link-redirect.php`
- [ ] Sprawdź logi (30 sekund)
- [ ] Wrzuć `king-cart-api.php`
- [ ] Sprawdź logi (30 sekund)
- [ ] Test CORS headers
- [ ] Wrzuć `king-reviews-api.php`
- [ ] Sprawdź logi (30 sekund)
- [ ] Test reviews endpoint

### FAZA 2: Pluginy niezależne
- [ ] Wrzuć `woocommerce-custom-fields.php`
- [ ] Wrzuć `king-optimized-api.php`
- [ ] Wrzuć `king-shop-api.php`
- [ ] Wrzuć `king-webhooks.php`
- [ ] Sprawdź logi (30 sekund)
- [ ] Test wszystkich endpointów

### FAZA 3: Template
- [ ] Wrzuć `order-confirmation.php` (jeśli potrzeba)

---

## 🧪 Testy po wdrożeniu

### 1. Test CORS (dla king-cart-api, king-reviews-api)
```bash
curl -X OPTIONS "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart" \
  -H "Origin: https://filler.pl" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

### 2. Test Cart API
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart"
```

### 3. Test Reviews API
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-reviews/v1/reviews?product_id=123"
```

### 4. Test Optimized API
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-optimized/v1/homepage"
```

### 5. Test Shop API
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-shop/v1/data?page=1&per_page=12"
```

### 6. Test Custom Fields
- Sprawdź w checkout czy pole NIP się pojawia

### 7. Test Webhooks
- Sprawdź w WooCommerce admin → Settings → Advanced → Webhooks

---

## 📊 Priorytety

| Plugin | Priorytet | Powód |
|--------|-----------|-------|
| `email-link-redirect.php` | P1 | Ważny dla email redirects |
| `king-cart-api.php` | P0 | Krytyczny dla cart operations |
| `king-reviews-api.php` | P1 | Ważny dla reviews |
| `woocommerce-custom-fields.php` | P1 | Ważny dla NIP field |
| `king-optimized-api.php` | P0 | Krytyczny dla performance |
| `king-shop-api.php` | P0 | Krytyczny dla shop page |
| `king-webhooks.php` | P2 | Mniej krytyczny |
| `order-confirmation.php` | P2 | Template (opcjonalny) |

---

## ⚠️ Ważne uwagi

1. **headless-config.php jest już wdrożony** - więc wszystkie pluginy używające go powinny działać od razu
2. **Wrzucaj po kolei** - lepiej wrzucać pojedynczo i sprawdzać logi
3. **Sprawdzaj logi** - po każdym wrzuceniu sprawdź `wp-content/debug.log`
4. **Testuj endpointy** - po wdrożeniu przetestuj każdy endpoint

---

**Status**: ✅ READY FOR DEPLOYMENT  
**Rekomendacja**: Wrzuć w 2 fazach (pierwsza faza po kolei, druga faza razem)

