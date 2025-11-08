# Kolejność wdrażania mu-plugins

**Data**: 2025-01-XX  
**Priorytet**: P0

---

## 📋 Analiza zależności

### Zależności między pluginami:

```
headless-config.php
  ├─> custom-password-reset.php (require_once)
  ├─> king-email-system.php (require_once)
  ├─> customer-invoices.php (require_once)
  ├─> email-link-redirect.php (używa headless_frontend_url())
  ├─> king-cart-api.php (CORS z headless-config)
  └─> king-reviews-api.php (CORS z headless-config)

king-jwt-authentication.php (NIEZALEŻNY - P0 security)
```

---

## 🚀 Zalecana kolejność wdrożenia

### FAZA 1: Fundament (PIERWSZY - zawsze najpierw!)

#### 1. `headless-config.php` ⚠️ KRYTYCZNY
**Dlaczego pierwszy**: 
- Inne pluginy z niego korzystają (`require_once`)
- Definiuje funkcje CORS używane przez inne pluginy
- Bez niego inne pluginy mogą nie działać poprawnie

**Zmiany**:
- ✅ Ujednolicone CORS configuration
- ✅ Funkcje: `headless_get_allowed_origins()`, `headless_add_cors_headers()`

**Test po wdrożeniu**:
```bash
# Sprawdź czy funkcje są dostępne
curl -X OPTIONS "https://your-site.com/wp-json/king-cart/v1/cart" \
  -H "Origin: https://filler.pl" \
  -H "Access-Control-Request-Method: POST"
# Powinno zwrócić CORS headers
```

---

### FAZA 2: Security (P0 - krytyczne poprawki bezpieczeństwa)

#### 2. `king-jwt-authentication.php` 🔒 NAJWAŻNIEJSZY
**Dlaczego drugi**: 
- Niezależny od innych pluginów
- P0 security fixes (refresh token rotation, rate limiting)
- Może być wdrożony równolegle z Faza 3

**Zmiany**:
- ✅ Refresh token rotation (P0 security fix)
- ✅ Scope verification
- ✅ Rate limiting (5/min per IP)
- ✅ Token whitelist

**Test po wdrożeniu**:
```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST "https://your-site.com/wp-json/king-jwt/v1/refresh" \
    -H "Content-Type: application/json" \
    -d '{"token":"YOUR_TOKEN"}'
done
# Powinno zwrócić 429 po 5 requestach
```

---

### FAZA 3: Plugins używające headless-config (można razem)

#### 3. `custom-password-reset.php`
**Dlaczego trzeci**: 
- Używa `require_once headless-config.php`
- Musi być po headless-config.php

**Zmiany**:
- ✅ Usunięto duplikaty CORS
- ✅ Używa headless-config.php

---

#### 4. `king-cart-api.php`
**Dlaczego czwarty**: 
- Używa CORS z headless-config.php
- Komentarz wskazuje na zależność

**Zmiany**:
- ✅ CORS z headless-config.php

---

#### 5. `king-reviews-api.php`
**Dlaczego piąty**: 
- Używa CORS z headless-config.php
- Komentarz wskazuje na zależność

**Zmiany**:
- ✅ CORS z headless-config.php

---

#### 6. `king-optimized-api.php`
**Dlaczego szósty**: 
- Różne optymalizacje
- Może używać headless-config (sprawdź)

**Zmiany**:
- ✅ Optymalizacje

---

#### 7. `king-shop-api.php`
**Dlaczego siódmy**: 
- Różne optymalizacje
- Może używać headless-config (sprawdź)

**Zmiany**:
- ✅ Optymalizacje

---

#### 8. `king-webhooks.php`
**Dlaczego ósmy**: 
- Webhooks - najmniej krytyczny
- Może być wdrożony jako ostatni

**Zmiany**:
- ✅ Optymalizacje

---

## ⚡ Szybka kolejność (3 fazy)

### FAZA 1: Fundament
```bash
# 1. headless-config.php (PIERWSZY!)
scp wp-content/mu-plugins/headless-config.php user@server:/path/to/wp-content/mu-plugins/
```

**Poczekaj 30 sekund, sprawdź logi, potem kontynuuj**

---

### FAZA 2: Security (P0)
```bash
# 2. king-jwt-authentication.php (P0 security fix)
scp wp-content/mu-plugins/king-jwt-authentication.php user@server:/path/to/wp-content/mu-plugins/
```

**Poczekaj 30 sekund, sprawdź logi, potem kontynuuj**

---

### FAZA 3: Pozostałe (można razem)
```bash
# 3-8. Pozostałe pluginy (można skopiować razem)
scp wp-content/mu-plugins/custom-password-reset.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-cart-api.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-reviews-api.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-optimized-api.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-shop-api.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-webhooks.php user@server:/path/to/wp-content/mu-plugins/
```

---

## 📊 Priorytety bezpieczeństwa

| Plugin | Priorytet | Powód |
|--------|-----------|-------|
| `headless-config.php` | P0 | Fundament - inne z niego korzystają |
| `king-jwt-authentication.php` | P0 | Security fixes (token rotation, rate limiting) |
| `custom-password-reset.php` | P1 | Używa headless-config |
| `king-cart-api.php` | P1 | Używa headless-config |
| `king-reviews-api.php` | P1 | Używa headless-config |
| `king-optimized-api.php` | P2 | Optymalizacje |
| `king-shop-api.php` | P2 | Optymalizacje |
| `king-webhooks.php` | P2 | Webhooks |

---

## ✅ Minimalne wdrożenie (tylko P0)

Jeśli chcesz wdrożyć tylko najważniejsze:

```bash
# 1. Fundament
scp wp-content/mu-plugins/headless-config.php user@server:/path/to/wp-content/mu-plugins/

# 2. Security (P0)
scp wp-content/mu-plugins/king-jwt-authentication.php user@server:/path/to/wp-content/mu-plugins/
```

**Pozostałe można wdrożyć później.**

---

## ⚠️ Ważne uwagi

### 1. Zawsze backup przed wdrożeniem
```bash
ssh user@server "cd /path/to/wp-content/mu-plugins && cp -r . ../mu-plugins-backup-$(date +%Y%m%d)"
```

### 2. Sprawdź logi po każdej fazie
```bash
ssh user@server "tail -f /path/to/wp-content/debug.log"
```

### 3. Test po każdej fazie
- Faza 1: Sprawdź CORS headers
- Faza 2: Sprawdź JWT refresh rate limiting
- Faza 3: Sprawdź czy strony działają

---

## 🔧 Jeśli coś pójdzie nie tak

### Problem: Błędy PHP po wdrożeniu headless-config.php

**Rozwiązanie**:
1. Sprawdź logi błędów
2. Sprawdź czy funkcje są dostępne: `headless_get_allowed_origins()`, `headless_add_cors_headers()`
3. Przywróć backup jeśli potrzeba

### Problem: Błędy CORS po wdrożeniu

**Rozwiązanie**:
1. Upewnij się, że `headless-config.php` został wdrożony pierwszy
2. Sprawdź czy funkcje CORS są wywoływane
3. Sprawdź logi błędów

### Problem: JWT refresh nie działa

**Rozwiązanie**:
1. Sprawdź czy rate limiting nie blokuje (max 5/min)
2. Sprawdź czy token jest w whitelist
3. Sprawdź logi błędów

---

## 📋 Checklist wdrożenia

### Przed wdrożeniem
- [ ] Backup całego katalogu mu-plugins
- [ ] Sprawdź wersję PHP (min 7.4)
- [ ] Sprawdź uprawnienia plików (644)

### Faza 1: Fundament
- [ ] Wdroż `headless-config.php`
- [ ] Sprawdź logi (30 sekund)
- [ ] Test CORS headers

### Faza 2: Security
- [ ] Wdroż `king-jwt-authentication.php`
- [ ] Sprawdź logi (30 sekund)
- [ ] Test JWT refresh rate limiting

### Faza 3: Pozostałe
- [ ] Wdroż pozostałe pluginy
- [ ] Sprawdź logi (30 sekund)
- [ ] Test wszystkich funkcji

### Po wdrożeniu
- [ ] Test logowania użytkownika
- [ ] Test koszyka
- [ ] Test checkout
- [ ] Test API endpoints

---

**Data utworzenia**: 2025-01-XX  
**Status**: ✅ READY FOR DEPLOYMENT  
**Rekomendacja**: Wdroż w 3 fazach z przerwami na sprawdzenie logów

