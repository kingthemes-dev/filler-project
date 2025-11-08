# Instrukcja wdrożenia mu-plugins na serwer

**Data**: 2025-01-XX  
**Priorytet**: P0 (Krytyczne poprawki bezpieczeństwa)

---

## ✅ Pliki do wdrożenia

### 1. **king-jwt-authentication.php** ⚠️ KRYTYCZNE
**Zmiany**:
- ✅ Refresh token rotation (P0 security fix)
- ✅ Scope verification (scopes w tokenie)
- ✅ Rate limiting dla refresh endpoint (5/min per IP)
- ✅ Token whitelist (prevent reuse)

**Wpływ**: Wysoki - poprawki bezpieczeństwa

---

### 2. **headless-config.php** ✅
**Zmiany**:
- ✅ Ujednolicone CORS configuration
- ✅ Funkcje: `headless_get_allowed_origins()`, `headless_add_cors_headers()`

**Wpływ**: Średni - refaktoryzacja

---

### 3. **king-cart-api.php**, **king-reviews-api.php**, **custom-password-reset.php** ✅
**Zmiany**:
- ✅ Usunięto duplikaty CORS - używają teraz `headless-config.php`

**Wpływ**: Niski - refaktoryzacja

---

### 4. **king-optimized-api.php**, **king-shop-api.php**, **king-webhooks.php** ✅
**Zmiany**:
- ✅ Różne optymalizacje i poprawki

**Wpływ**: Średni - optymalizacje

---

## 📋 Pliki do usunięcia z serwera

### Test plugins (przeniesione do `delete/`)
- ❌ `hpos-compatibility-test.php` - test plugin, nie jest potrzebny na produkcji
- ❌ `king-mock-reviews.php` - test plugin, nie jest potrzebny na produkcji

**Akcja**: Usuń te pliki z serwera (już są w folderze `delete/` lokalnie)

---

## 🚀 Instrukcja wdrożenia

### Opcja 1: Bezpośrednie skopiowanie (SFTP/SSH)

```bash
# 1. Połącz się z serwerem
ssh user@your-server.com

# 2. Przejdź do katalogu mu-plugins
cd /path/to/wordpress/wp-content/mu-plugins

# 3. Utwórz backup (WAŻNE!)
cp -r . ../mu-plugins-backup-$(date +%Y%m%d)

# 4. Skopiuj pliki z lokalnego repo
# Użyj SFTP lub scp do skopiowania zmienionych plików:

# Krytyczne:
scp king-jwt-authentication.php user@server:/path/to/wp-content/mu-plugins/

# Pozostałe:
scp headless-config.php user@server:/path/to/wp-content/mu-plugins/
scp king-cart-api.php user@server:/path/to/wp-content/mu-plugins/
scp king-reviews-api.php user@server:/path/to/wp-content/mu-plugins/
scp custom-password-reset.php user@server:/path/to/wp-content/mu-plugins/
scp king-optimized-api.php user@server:/path/to/wp-content/mu-plugins/
scp king-shop-api.php user@server:/path/to/wp-content/mu-plugins/
scp king-webhooks.php user@server:/path/to/wp-content/mu-plugins/

# 5. Usuń test plugins (jeśli istnieją na serwerze)
rm hpos-compatibility-test.php
rm king-mock-reviews.php

# 6. Sprawdź, czy wszystko działa
tail -f /path/to/wordpress/wp-content/debug.log
```

---

### Opcja 2: Git deployment (jeśli masz dostęp do repo na serwerze)

```bash
# 1. Na serwerze
cd /path/to/wordpress/wp-content/mu-plugins

# 2. Backup
cp -r . ../mu-plugins-backup-$(date +%Y%m%d)

# 3. Pull zmian
git pull origin main

# 4. Sprawdź logi
tail -f /path/to/wordpress/wp-content/debug.log
```

---

### Opcja 3: WordPress Admin (przez plugin management)

**UWAGA**: mu-plugins nie można zarządzać przez WordPress Admin. Musisz użyć SSH/SFTP.

---

## ⚠️ Przed wdrożeniem

### Checklist:

- [ ] **Backup**: Utwórz backup całego katalogu `mu-plugins/`
- [ ] **Test**: Przetestuj zmiany na staging environment (jeśli masz)
- [ ] **WordPress**: Upewnij się, że WordPress jest zaktualizowany
- [ ] **PHP**: Sprawdź wersję PHP (minimum PHP 7.4)
- [ ] **Permissions**: Sprawdź uprawnienia plików (644 dla plików, 755 dla katalogów)

---

## ✅ Po wdrożeniu

### 1. Sprawdź logi błędów

```bash
# WordPress debug log
tail -f /path/to/wordpress/wp-content/debug.log

# Apache/Nginx error log
tail -f /var/log/apache2/error.log
# lub
tail -f /var/log/nginx/error.log
```

### 2. Przetestuj JWT endpoints

```bash
# Test login
curl -X POST "https://your-site.com/wp-json/king-jwt/v1/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Test refresh (sprawdź rate limiting)
for i in {1..10}; do
  curl -X POST "https://your-site.com/wp-json/king-jwt/v1/refresh" \
    -H "Content-Type: application/json" \
    -d '{"token":"YOUR_TOKEN"}'
done
# Powinno zwrócić 429 po 5 requestach
```

### 3. Sprawdź czy strony działają

- [ ] Strona główna
- [ ] Logowanie użytkownika
- [ ] Koszyk
- [ ] Checkout
- [ ] API endpoints

---

## 🔧 Rozwiązywanie problemów

### Problem: "Token został już użyty do odświeżania"

**Przyczyna**: Token rotation działa poprawnie - stary token został już użyty.

**Rozwiązanie**: To jest zamierzone zachowanie. Użytkownik musi zalogować się ponownie.

---

### Problem: "Zbyt wiele żądań odświeżania tokenu"

**Przyczyna**: Rate limiting działa poprawnie - przekroczono limit 5 refresh/min.

**Rozwiązanie**: Poczekaj 1 minutę i spróbuj ponownie. To jest zamierzone zabezpieczenie.

---

### Problem: Błędy PHP po wdrożeniu

**Przyczyna**: Możliwe błędy składni lub brakujące zależności.

**Rozwiązanie**:
1. Sprawdź logi błędów
2. Porównaj wersje PHP (lokalna vs serwer)
3. Przywróć backup jeśli potrzeba

---

## 📊 Co zostało zmienione - podsumowanie

### Security (P0)
- ✅ Refresh token rotation - stary token jest invalidowany po refresh
- ✅ Rate limiting - max 5 refresh/min per IP
- ✅ Scope verification - scopes w tokenie JWT
- ✅ Token whitelist - tylko ostatnie 5 tokenów per user

### Refaktoryzacja
- ✅ CORS unification - wszystkie plugins używają `headless-config.php`
- ✅ Usunięto test plugins

---

## 🔗 Linki

- [JWT Auth Audit](./JWT_AUTH_AUDIT.md) - szczegóły zmian bezpieczeństwa
- [Mu-plugins Inventory](./MU_PLUGINS_INVENTORY.md) - lista wszystkich plugins
- [Mu-plugins Audit](./MU_PLUGINS_AUDIT.md) - raport audytu

---

## ⚡ Szybkie wdrożenie (jedna linia)

```bash
# Backup + Deploy (dostosuj ścieżki!)
ssh user@server "cd /path/to/wp-content/mu-plugins && cp -r . ../mu-plugins-backup-$(date +%Y%m%d) && git pull origin main"
```

---

**Data utworzenia**: 2025-01-XX  
**Status**: ✅ READY FOR DEPLOYMENT  
**Priorytet**: P0 (Krytyczne poprawki bezpieczeństwa)

