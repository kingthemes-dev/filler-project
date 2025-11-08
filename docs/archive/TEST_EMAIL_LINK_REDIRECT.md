# Testy dla email-link-redirect.php

**Data**: 2025-11-07  
**Plugin**: Email Link Redirect for Headless WooCommerce

---

## 📋 Opis funkcjonalności

Plugin `email-link-redirect.php`:
- ✅ Modyfikuje linki w emailach WooCommerce → przekierowuje do headless frontend
- ✅ Dodaje frontendowe linki do emaili (Moje zamówienia, Moje konto, Kontynuuj zakupy)
- ✅ Przekierowuje payment URLs i order received URLs do frontendu
- ✅ Używa `headless_frontend_url()` z headless-config.php

---

## 🧪 Testy

### TEST 1: Sprawdź czy plugin się załadował

#### 1.1 Sprawdź czy plik jest na serwerze
```bash
ssh user@server "ls -la /path/to/wp-content/mu-plugins/email-link-redirect.php"
```

**Oczekiwany wynik**: 
- ✅ Plik istnieje

---

#### 1.2 Sprawdź czy funkcja headless_frontend_url() działa
```bash
ssh user@server "wp eval 'if (function_exists(\"headless_frontend_url\")) { echo headless_frontend_url(); } else { echo \"FUNKCJA NIE DOSTĘPNA\"; }'"
```

**Oczekiwany wynik**: 
- ✅ Zwraca URL frontendu (np. `https://filler.pl`)
- ❌ Jeśli zwraca "FUNKCJA NIE DOSTĘPNA" → `headless-config.php` nie jest załadowany

---

#### 1.3 Sprawdź logi błędów
```bash
ssh user@server "tail -n 50 /path/to/wp-content/debug.log | grep -i 'email-link-redirect\|fatal\|error'"
```

**Oczekiwany wynik**: 
- ✅ Brak błędów
- ❌ Jeśli są błędy → sprawdź czy `headless-config.php` jest wdrożony

---

### TEST 2: Test funkcjonalności (najlepszy sposób)

#### 2.1 Złóż testowe zamówienie

**Metoda 1: Przez frontend**
1. Zaloguj się na frontendzie
2. Dodaj produkt do koszyka
3. Przejdź do checkout
4. Złóż zamówienie (np. za pobraniem lub przelewem)
5. **Sprawdź email** który przyszedł

**Metoda 2: Przez WooCommerce admin**
1. WooCommerce → Orders → Add New
2. Utwórz testowe zamówienie
3. Zmień status na "Processing" lub "Completed"
4. Kliknij "Resend email" lub użyj endpointu trigger-order-email

---

#### 2.2 Sprawdź email pod kątem linków

**Co sprawdzić w emailu**:

1. **Linki w treści emaila**:
   - ✅ Linki do "Moje konto" powinny wskazywać na `https://filler.pl/moje-konto`
   - ✅ Linki do "Moje zamówienia" powinny wskazywać na `https://filler.pl/moje-zamowienia`
   - ✅ Linki do "Sklep" powinny wskazywać na `https://filler.pl/sklep`
   - ✅ Linki do "Koszyk" powinny wskazywać na `https://filler.pl/koszyk`
   - ❌ **NIE POWINNO BYĆ** linków do WordPress backend (np. `https://qvwltjhdjw.cfolks.pl/moje-konto/`)

2. **Sekcja "Przydatne linki"**:
   - ✅ Powinna być sekcja z linkami:
     - "Moje zamówienia" → `https://filler.pl/moje-zamowienia`
     - "Moje konto" → `https://filler.pl/moje-konto`
     - "Kontynuuj zakupy" → `https://filler.pl/sklep`

3. **Linki do zamówienia**:
   - ✅ Link "Zobacz szczegóły zamówienia" powinien wskazywać na `https://filler.pl/moje-zamowienia/{order_id}`

---

### TEST 3: Test payment URL redirect

#### 3.1 Sprawdź czy payment URL jest przekierowany
```bash
# Pobierz order z WooCommerce
ssh user@server "wp wc order list --limit=1 --format=json | jq '.[0] | {id: .id, status: .status}'"
```

#### 3.2 Test funkcji redirect_payment_url
```bash
ssh user@server "wp eval '\$order = wc_get_order(ORDER_ID); \$url = apply_filters(\"woocommerce_get_checkout_payment_url\", \"\", \$order); echo \"Payment URL: \" . \$url . \"\\n\";'"
```

**Oczekiwany wynik**: 
- ✅ URL powinien wskazywać na `https://filler.pl/checkout?order_id={id}&key={key}`
- ❌ Nie powinien wskazywać na WordPress backend

---

### TEST 4: Test order received URL redirect

#### 4.1 Test funkcji redirect_order_received_url
```bash
ssh user@server "wp eval '\$order = wc_get_order(ORDER_ID); \$url = apply_filters(\"woocommerce_get_checkout_order_received_url\", \"\", \$order); echo \"Order received URL: \" . \$url . \"\\n\";'"
```

**Oczekiwany wynik**: 
- ✅ URL powinien wskazywać na `https://filler.pl/moje-zamowienia/{order_id}`
- ❌ Nie powinien wskazywać na WordPress backend

---

### TEST 5: Test w WooCommerce admin (preview email)

#### 5.1 Preview email w WooCommerce
1. WooCommerce → Settings → Emails
2. Wybierz dowolny email (np. "Customer Processing Order")
3. Kliknij "Manage"
4. Kliknij "Preview" (jeśli dostępne)
5. Sprawdź czy linki wskazują na frontend

**Oczekiwany wynik**: 
- ✅ Wszystkie linki wskazują na frontend (`https://filler.pl/...`)
- ❌ Nie ma linków do WordPress backend

---

## 🔍 Debugowanie

### Problem: Funkcja headless_frontend_url() nie działa

**Rozwiązanie**:
1. Sprawdź czy `headless-config.php` jest wdrożony
2. Sprawdź czy `headless-config.php` jest przed `email-link-redirect.php` alfabetycznie (WordPress ładuje mu-plugins alfabetycznie)
3. Sprawdź logi błędów

---

### Problem: Linki w emailach nadal wskazują na backend

**Możliwe przyczyny**:
1. Email został wygenerowany przed wdrożeniem pluginu
2. Plugin nie jest aktywny (sprawdź logi)
3. WooCommerce cache email templates (wyczyść cache)

**Rozwiązanie**:
1. Sprawdź czy plugin jest załadowany: `wp plugin list --mu`
2. Wygeneruj nowy email (złóż nowe zamówienie lub użyj trigger-order-email)
3. Sprawdź czy linki są poprawne w nowym emailu

---

### Problem: Sekcja "Przydatne linki" nie pojawia się

**Możliwe przyczyny**:
1. Email jest plain text (plugin pomija plain text)
2. Hook `woocommerce_email_before_order_table` nie jest wywoływany

**Rozwiązanie**:
1. Sprawdź czy email jest HTML (nie plain text)
2. Sprawdź logi czy hook jest wywoływany
3. Sprawdź czy `add_frontend_links` jest poprawnie zarejestrowany

---

## ✅ Checklist testów

- [ ] Plugin jest na serwerze
- [ ] Funkcja `headless_frontend_url()` działa
- [ ] Brak błędów w logach
- [ ] Złożone testowe zamówienie
- [ ] Email przyszedł
- [ ] Linki w emailu wskazują na frontend (nie backend)
- [ ] Sekcja "Przydatne linki" jest widoczna
- [ ] Payment URL redirect działa
- [ ] Order received URL redirect działa

---

## 📊 Oczekiwane rezultaty

### Przed wdrożeniem:
- ❌ Linki w emailach: `https://qvwltjhdjw.cfolks.pl/moje-konto/`
- ❌ Brak sekcji z frontendowymi linkami

### Po wdrożeniu:
- ✅ Linki w emailach: `https://filler.pl/moje-konto`
- ✅ Sekcja "Przydatne linki" z linkami do frontendu
- ✅ Payment URLs przekierowane do frontendu
- ✅ Order received URLs przekierowane do frontendu

---

## 🚀 Następne kroki

Po pomyślnym teście `email-link-redirect.php`:
1. ✅ Plugin działa poprawnie
2. ➡️ Przejdź do wdrożenia kolejnych pluginów:
   - `king-cart-api.php`
   - `king-reviews-api.php`
   - itd.

---

**Status**: ✅ READY FOR TESTING

