# Testowanie King Email System

**Data**: 2025-01-XX  
**Plugin**: `king-email-system.php`

---

## 🎯 Co robi plugin

1. **Branding emaili** - dodaje branding FILLER do nagłówków emaili
2. **Przekierowania linków** - zamienia linki WordPress → headless frontend
3. **Meta dane** - dodaje NIP, tracking, firma do emaili o zamówieniach
4. **CTA linki** - dodaje linki do frontendu (szczegóły zamówienia, konto)
5. **From name/email** - ustawia "FILLER - Profesjonalne produkty do pielęgnacji"

---

## 🧪 Jak testować

### Test 0: Szybki test przez REST API (opcjonalnie)

**Wymaga:**
- Uprawnienia administratora w WordPress
- Token/autentykacja

**Curl test:**
```bash
# Wyślij testowy email przez REST API
curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/king-email/v1/send-test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "twoj@email.com",
    "template": "order_confirmation"
  }'
```

**Sprawdź logi emaili:**
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-email/v1/logs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Sprawdź status HPOS:**
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-email/v1/hpos-status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Test 1: Email o nowym zamówieniu

**Kroki:**
1. Zaloguj się jako klient (lub użyj testowego konta)
2. Dodaj produkty do koszyka
3. Przejdź do checkout i złóż zamówienie
4. Sprawdź email na adresie używanym w zamówieniu

**Co sprawdzić:**
- ✅ Email został wysłany
- ✅ W nagłówku jest branding "FILLER"
- ✅ Linki prowadzą do frontendu (np. `https://filler.pl/moje-zamowienia/123`)
- ✅ Linki **NIE** prowadzą do WordPress (np. `https://qvwltjhdjw.cfolks.pl/my-account/orders/123`)
- ✅ From name: "FILLER - Profesjonalne produkty do pielęgnacji"
- ✅ From email: `noreply@filler.pl` (lub podobny)

---

### Test 2: Email o zmianie statusu zamówienia

**Kroki:**
1. W WordPress Admin → WooCommerce → Zamówienia
2. Znajdź istniejące zamówienie
3. Zmień status na "W trakcie realizacji" (processing)
4. Sprawdź email klienta

**Co sprawdzić:**
- ✅ Email został wysłany
- ✅ Linki prowadzą do frontendu
- ✅ Branding FILLER w nagłówku

---

### Test 3: Email o zrealizowanym zamówieniu

**Kroki:**
1. W WordPress Admin → WooCommerce → Zamówienia
2. Zmień status zamówienia na "Zrealizowane" (completed)
3. Sprawdź email klienta

**Co sprawdzić:**
- ✅ Email został wysłany
- ✅ Linki prowadzą do frontendu
- ✅ Jeśli zamówienie ma NIP - sprawdź czy jest w emailu
- ✅ Jeśli zamówienie ma tracking - sprawdź czy jest w emailu

---

### Test 4: Przekierowania linków

**Sprawdź w emailu:**
- Link "Zobacz zamówienie" → powinien prowadzić do `https://filler.pl/moje-zamowienia/123`
- Link "Moje konto" → powinien prowadzić do `https://filler.pl/moje-konto`
- Link "Sklep" → powinien prowadzić do `https://filler.pl/sklep`

**Linki NIE powinny prowadzić do:**
- ❌ `https://qvwltjhdjw.cfolks.pl/my-account/orders/123`
- ❌ `https://qvwltjhdjw.cfolks.pl/my-account/`
- ❌ Wszelkie linki WordPress

---

### Test 5: Meta dane w emailu (NIP, Tracking)

**Kroki:**
1. Utwórz zamówienie z NIP i tracking number
2. Sprawdź email o zamówieniu
3. Sprawdź czy w emailu są:
   - NIP (jeśli klient podał)
   - Numer trackingu (jeśli jest)
   - Nazwa firmy (jeśli klient podał)

**Co sprawdzić:**
- ✅ NIP jest widoczny w emailu
- ✅ Tracking number jest widoczny w emailu
- ✅ Nazwa firmy jest widoczna w emailu

---

## 🔍 Debugowanie

### Sprawdź logi WordPress

```bash
# Na serwerze
tail -f /path/to/wp-content/debug.log | grep -i "email\|king"
```

### Sprawdź czy plugin jest aktywny

W WordPress Admin powinien być widoczny komunikat (jeśli HPOS nie jest włączony):
```
⚠️ King Email System: HPOS is not enabled. Some features may use fallback methods.
```

### Sprawdź konfigurację frontendu

Upewnij się, że `headless_frontend_url()` zwraca poprawny URL:
- W `headless-config.php` lub
- W `wp-config.php` jako `HEADLESS_FRONTEND_URL`

---

## ✅ Checklist testów

### Po wdrożeniu `king-email-system.php`:

- [ ] Email o nowym zamówieniu zostaje wysłany
- [ ] Email ma branding FILLER w nagłówku
- [ ] From name: "FILLER - Profesjonalne produkty do pielęgnacji"
- [ ] From email: `noreply@filler.pl`
- [ ] Linki w emailach prowadzą do frontendu (filler.pl)
- [ ] Linki NIE prowadzą do WordPress (qvwltjhdjw.cfolks.pl)
- [ ] NIP jest widoczny w emailach (jeśli podano)
- [ ] Tracking number jest widoczny w emailach (jeśli jest)
- [ ] Email o zmianie statusu działa
- [ ] Email o zrealizowanym zamówieniu działa

---

## 🐛 Rozwiązywanie problemów

### Problem: Email nie jest wysyłany

**Rozwiązanie:**
1. Sprawdź czy WooCommerce emaile są włączone (WooCommerce → Settings → Emails)
2. Sprawdź logi WordPress (`debug.log`)
3. Sprawdź czy serwer może wysyłać emaile (SMTP może być wymagany)

### Problem: Linki prowadzą do WordPress zamiast frontendu

**Rozwiązanie:**
1. Sprawdź czy `headless_frontend_url()` zwraca poprawny URL
2. Sprawdź czy `email-link-redirect.php` jest wdrożony
3. Sprawdź konfigurację `HEADLESS_FRONTEND_URL`

### Problem: Brak brandingu FILLER

**Rozwiązanie:**
1. Sprawdź czy plugin jest aktywny
2. Sprawdź logi WordPress
3. Sprawdź czy funkcja `add_filler_branding` jest wywoływana

---

**Status**: ✅ READY FOR TESTING

