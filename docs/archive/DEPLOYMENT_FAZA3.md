# FAZA 3: Wdrożenie pluginów używających headless-config

**Status**: ✅ READY FOR DEPLOYMENT  
**Data**: 2025-01-XX

---

## 📋 Pliki do wdrożenia (można razem)

### Priorytet 1: Pluginy z `require_once headless-config.php`

1. **`custom-password-reset.php`** ✅
   - Używa: `require_once headless-config.php`
   - Zmiany: Usunięto duplikaty CORS

2. **`king-email-system.php`** ✅
   - Używa: `require_once headless-config.php`
   - Zmiany: Używa headless-config dla URL frontendu

3. **`customer-invoices.php`** ✅
   - Używa: `require_once headless-config.php`
   - Zmiany: Używa headless-config

4. **`email-link-redirect.php`** ✅
   - Używa: `headless_frontend_url()`
   - Zmiany: Redirect email links do frontendu

---

### Priorytet 2: Pluginy używające CORS z headless-config

5. **`king-cart-api.php`** ✅
   - Używa: CORS z headless-config.php
   - Zmiany: Usunięto duplikaty CORS

6. **`king-reviews-api.php`** ✅
   - Używa: CORS z headless-config.php
   - Zmiany: Usunięto duplikaty CORS

---

### Priorytet 3: Pozostałe pluginy (opcjonalne)

7. **`king-optimized-api.php`** ✅
   - Optymalizacje API

8. **`king-shop-api.php`** ✅
   - Optymalizacje shop API

9. **`king-webhooks.php`** ✅
   - Webhooks

---

## 🚀 Szybkie wdrożenie (wszystkie razem)

```bash
# Wszystkie pliki z Fazy 3 można wdrożyć razem
scp wp-content/mu-plugins/custom-password-reset.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-email-system.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/customer-invoices.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/email-link-redirect.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-cart-api.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-reviews-api.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-optimized-api.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-shop-api.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-webhooks.php user@server:/path/to/wp-content/mu-plugins/
```

---

## ⚠️ Ważne

- **Wszystkie pliki można wdrożyć razem** (headless-config.php już jest na serwerze)
- **Poczekaj 30 sekund** po wdrożeniu i sprawdź logi
- **Test**: Sprawdź czy strony działają, czy nie ma błędów CORS

---

## ✅ Minimalne wdrożenie (tylko najważniejsze)

Jeśli chcesz wdrożyć tylko najważniejsze:

```bash
# Priorytet 1: Pluginy z require_once
scp wp-content/mu-plugins/custom-password-reset.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-email-system.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/customer-invoices.php user@server:/path/to/wp-content/mu-plugins/

# Priorytet 2: API z CORS
scp wp-content/mu-plugins/king-cart-api.php user@server:/path/to/wp-content/mu-plugins/
scp wp-content/mu-plugins/king-reviews-api.php user@server:/path/to/wp-content/mu-plugins/
```

---

**Status**: ✅ READY FOR DEPLOYMENT

