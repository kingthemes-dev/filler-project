# Test Playbook

**Ostatnia aktualizacja**: 2025-11-07  
**Zakres**: ręczne sanity-checki po wdrożeniu backendowych zmian (mu-plugins, API, e‑maile).

> Wszystkie szczegółowe scenariusze z wcześniejszych dokumentów (`TEST_*.md`, `EMAIL_SYSTEM_TEST.md`) zostały scalone tutaj. Oryginały znajdziesz w `docs/archive/`.

---

## 1. Ogólne zasady

1. Testuj środowisko **po każdym etapie wdrożenia** (patrz `DEPLOYMENT_GUIDE.md`).
2. Każdy test zapisuj w krótkim raporcie (data, wynik, ewentualne logi).
3. W razie błędów – snapshot logów (`wp-content/debug.log`, konsola przeglądarki).

---

## 2. API – Koszyk (`king-cart-api.php`)

| Krok | Komenda / akcja | Oczekiwany wynik |
|------|-----------------|------------------|
| 1 | `curl -s https://<domain>/wp-json/king-cart/v1/` | Zwraca listę endpointów (nie 404) |
| 2 | `curl -X GET …/king-cart/v1/nonce` | JSON z polem `nonce` |
| 3 | `curl -X OPTIONS …/king-cart/v1/cart -H "Origin: …"` | Nagłówki CORS obecne (`Allow-Origin`, `Allow-Methods`, `Allow-Headers`) |
| 4 | `curl -X POST …/cart -d '{"product_id":123,"quantity":1}'` | `200/201`, w odpowiedzi koszyk z nowym produktem |
| 5 | `curl -X DELETE …/cart?cart_item_key=…` | `200`, item usunięty |
| 6 | Frontend: dodaj/usuń produkt w aplikacji Next.js | Brak błędów CORS, koszyk aktualizuje się |

---

## 3. API – Opinie (`king-reviews-api.php`)

| Krok | Komenda / akcja | Oczekiwany wynik |
|------|-----------------|------------------|
| 1 | `curl -s https://<domain>/wp-json/king-reviews/v1/` | 200, lista endpointów |
| 2 | `curl -X GET …/reviews?product_id=123` | 200, tablica recenzji (może być pusta) |
| 3 | `curl -X POST …/reviews -d '{ "product_id":123,"rating":5,"review":"Test","reviewer":"QA","reviewer_email":"qa@example.com" }'` | 200/201, zapisany review |
| 4 | `curl -X OPTIONS …/reviews -H "Origin: …"` | Prawidłowe nagłówki CORS |
| 5 | Frontend: dodaj opinię, odśwież listę | Recenzja pojawia się od razu (auto-approve), brak błędów JS |

---

## 4. JWT / Autoryzacja (`king-jwt-authentication.php`)

| Test | Co robimy | Rezultat |
|------|-----------|----------|
| Login | `POST /wp-json/king-jwt/v1/login` z prawidłowymi danymi | 200, token + dane użytkownika |
| Refresh | 5× `POST /refresh` w ciągu minuty | 200 dla żądań 1‑5, 429 dla 6+ |
| Token rotation | Po refresh używamy starego tokenu | 401 „Token został już użyty do odświeżania” |
| Scopes | Dekodujemy payload (`echo <token> | cut -d'.' -f2 | base64 -d`) | Tablica `scopes` zawiera wymagane pozycje |
| Frontend | Logowanie w aplikacji, automatyczny refresh | Tokeny odnawiają się, brak błędów w konsoli |

---

## 5. E-maile (`king-email-system.php`, `email-link-redirect.php`)

1. Dodaj zamówienie testowe (ręcznie lub przez checkout).
2. Zweryfikuj, że:
   - Powstaje wpis w logach pluginu (jeśli logging włączony).
   - Wysłany e‑mail ma poprawne dane firmy/NIP (jeżeli dotyczy).
   - Linki CTA prowadzą na front (`https://frontend...`).
3. (Opcjonalnie) użyj WP-CLI:
   ```bash
   wp cron event run king_email_retry_queue
   ```

---

## 6. Webhooki (`king-webhooks.php`)

| Krok | Akcja | Oczekiwane zachowanie |
|------|-------|-----------------------|
| 1 | WP Admin → WooCommerce → Ustawienia → Zaawansowane → Webhooki | Webhook aktywny, status „Aktywny” |
| 2 | Kliknij „Testuj webhook” (z panelu pluginu) | Wpis w logu (`king_webhook_logs`) z `status=200` |
| 3 | `wp cron event run king_webhook_retry_event` | Retry działa (brak pending retry) |

---

## 7. Mu-plugins: sanity check

| Plugin | Szybki test |
|--------|-------------|
| `woocommerce-custom-fields.php` (jeśli aktywny) | Checkout: pole NIP widoczne, zapis w zamówieniu → `WP Admin → WooCommerce → Orders` |
| `king-optimized-api.php` | `curl -s https://<domain>/wp-json/king-optimized/v1/homepage` – 200, w JSON brak `error` |
| `king-shop-api.php` | `curl -s https://<domain>/wp-json/king-shop/v1/data?page=1&per_page=12` – 200, klucz `products` |
| `king-webhooks.php` | patrz sekcja 6 |

---

## 8. Po testach

- [ ] Zapisz wyniki w raporcie (tick lista powyżej).
- [ ] Zgłoś wszystkie znalezione błędy z timestampem, endpointem i payloadem.
- [ ] Jeśli wszystko ✅ → zamknij wdrożenie w `STATUS_SUMMARY.md`.


