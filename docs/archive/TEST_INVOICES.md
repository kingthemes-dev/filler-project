# Testowanie King Invoices Plugin

## ✅ Checklist przed testowaniem:

### 1. Sprawdź, czy plugin jest na serwerze:
```bash
ls -la /wp-content/mu-plugins/king-invoices.php
```

### 2. Sprawdź, czy stare pluginy są usunięte/wyłączone:
```bash
# Te pliki NIE powinny istnieć lub powinny być wyłączone:
- woocommerce-custom-fields.php
- customer-invoices.php  
- king-invoice-fields.php
```

### 3. Sprawdź logi błędów:
```bash
tail -100 /wp-content/debug.log | grep -i "king.*invoice\|invoice.*error"
```

### 4. Sprawdź składnię PHP:
```bash
php -l /wp-content/mu-plugins/king-invoices.php
```

## 🧪 Testy funkcjonalności:

### Test 1: Pola NIP w checkout
1. Przejdź do `/kasa` (checkout)
2. Sprawdź, czy są widoczne pola:
   - ✅ Pole "NIP"
   - ✅ Checkbox "Chcę fakturę (na firmę)"

### Test 2: Zapisanie danych faktury
1. W checkout wypełnij:
   - NIP: `1234567890`
   - Zaznacz checkbox "Chcę fakturę"
2. Złóż zamówienie
3. W WordPress admin → Zamówienia → Otwórz zamówienie
4. Sprawdź, czy widać:
   - ✅ NIP w sekcji "Dane faktury"
   - ✅ Status faktury: "Tak"

### Test 3: Synchronizacja z "Moje konto"
1. Przejdź do `/moje-konto`
2. Sprawdź sekcję "Dane osobowe"
3. Powinny być widoczne:
   - ✅ Pole NIP (wypełnione)
   - ✅ Checkbox "Chcę fakturę" (zaznaczony)
4. Jeśli NIP jest wypełniony, checkbox powinien być automatycznie zaznaczony

### Test 4: REST API - Lista faktur
```bash
curl -X GET "https://twoja-domena.pl/wp-json/custom/v1/invoices?customer_id=1" \
  -H "Content-Type: application/json"
```
**Oczekiwany wynik:** Lista faktur w formacie JSON

### Test 5: REST API - Dane faktury
```bash
curl -X GET "https://twoja-domena.pl/wp-json/custom/v1/invoice/123" \
  -H "Content-Type: application/json"
```
**Oczekiwany wynik:** Dane faktury w formacie JSON

### Test 6: REST API - Profil klienta (NIP i invoiceRequest)
```bash
curl -X GET "https://twoja-domena.pl/wp-json/wc/v3/customers/1" \
  -u "ck_xxx:cs_xxx" \
  -H "Content-Type: application/json"
```
**Oczekiwany wynik:** W `billing.nip` i `billing.invoiceRequest` powinny być widoczne dane

### Test 7: Generowanie faktury
1. W WordPress admin zmień status zamówienia na "Zrealizowane"
2. Sprawdź w logach:
   ```bash
   tail -f /wp-content/debug.log | grep "King Invoices"
   ```
3. Powinien pojawić się log:
   ```
   King Invoices: Auto-generated invoice for order XXX - Invoice #FV/YYYY/XXXXXX
   ```

### Test 8: Wyświetlanie NIP w emailach
1. Złóż zamówienie z NIP
2. Sprawdź email z zamówieniem
3. W emailu powinien być widoczny NIP

### Test 9: WordPress Admin - User Profile
1. WordPress Admin → Użytkownicy → Edytuj użytkownika
2. Sprawdź, czy są widoczne pola:
   - ✅ Sekcja "Dane rozliczeniowe (Faktura)"
   - ✅ Pole NIP
   - ✅ Checkbox "Chcę fakturę"

### Test 10: WooCommerce Admin - Customer Panel
1. WooCommerce → Klienci → Otwórz klienta
2. Sprawdź, czy są widoczne pola:
   - ✅ Pole NIP
   - ✅ Checkbox "Chcę fakturę"

## 🔍 Sprawdzenie konfliktów:

### Sprawdź, czy nie ma duplikatów hooków:
```bash
# W logach nie powinno być błędów o duplikatach endpointów
grep -i "already registered\|duplicate\|conflict" /wp-content/debug.log
```

### Sprawdź, czy wszystkie funkcje są zdefiniowane:
```bash
php -r "
require_once '/wp-content/mu-plugins/king-invoices.php';
echo function_exists('king_auto_generate_invoice_for_order') ? 'OK' : 'MISSING';
"
```

## 🐛 Typowe problemy i rozwiązania:

### Problem: Błędy 500 w REST API
**Rozwiązanie:** Sprawdź logi PHP i upewnij się, że wszystkie funkcje są zdefiniowane

### Problem: Pola NIP nie są widoczne w checkout
**Rozwiązanie:** Sprawdź, czy `woocommerce_checkout_fields` hook działa (może być konflikt z innym pluginem)

### Problem: Faktury nie są generowane
**Rozwiązanie:** Sprawdź, czy status zamówienia to "completed" lub "processing" i czy NIP/faktura jest zaznaczona

### Problem: Dane nie synchronizują się między checkout a "Moje konto"
**Rozwiązanie:** Sprawdź, czy `woocommerce_customer_save_address` hook działa i czy user meta są zapisywane

## 📋 Checklist końcowy:

- [ ] Plugin jest aktywny (mu-plugin, więc zawsze aktywny)
- [ ] Stare pluginy są usunięte/wyłączone
- [ ] Brak błędów w logach
- [ ] Pola NIP widoczne w checkout
- [ ] Pola NIP widoczne w "Moje konto"
- [ ] Pola NIP widoczne w WordPress admin
- [ ] REST API działa
- [ ] Faktury są generowane
- [ ] NIP jest widoczny w emailach
- [ ] Synchronizacja checkout ↔ "Moje konto" działa

