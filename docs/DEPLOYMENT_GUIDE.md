# Deployment Guide (mu-plugins & helpers)

**Ostatnia aktualizacja:** 2025-11-08  
**Cel:** zachowanie kontrolowanej, powtarzalnej procedury wdrażania mu-plugins oraz powiązanych helperów po ostatnim resecie dokumentacji.

> Poprzednia wersja dokumentu (sprzed 2025-11-07) zawierała historyczne dane. Poniżej znajduje się szablon do wypełnienia przy najbliższym deployu.

---

## 1. High level timeline

| Faza | Co wdrażamy | Dlaczego | Weryfikacja | Status |
| --- | --- | --- | --- | --- |
| 0 | Backup `wp-content/mu-plugins` | Bezpieczeństwo | `cp -r mu-plugins mu-plugins-backup-<YYYYMMDD>` | ☐ |
| 1 | `headless-config.php` | CORS + helper `headless_frontend_url()` | `curl -X OPTIONS …/king-cart/v1/cart` | ☐ |
| 2 | `king-jwt-authentication.php` | Krytyczne security (refresh rotation, limiter) | Testy z sekcji 4.2 | ☐ |
| 3a | Zależne od configu: `custom-password-reset.php`, `king-email-system.php`, `email-link-redirect.php`, `king-cart-api.php`, `king-reviews-api.php` | Korzystają z helperów / CORS | Smoke testy z sekcji 4.3 | ☐ |
| 3b | Core API: `king-optimized-api.php`, `king-shop-api.php`, `king-webhooks.php` | Performance + integracje | Endpointy z sekcji 4.4, panel webhooks | ☐ |
| 3c | Dodatki / legacy (np. `order-confirmation.php`) | Tylko gdy potrzebne | Manualny smoke test w WP | ☐ |

> Rekomendacja: wdrażać fazy 1–3a pojedynczo (z kontrolą logów), a fazę 3b jako jedną paczkę.

---

## 2. Pre-flight checklist

- [ ] Dostęp SSH/SFTP potwierdzony (`ssh user@host -p <port>`).  
- [ ] Backup katalogu `mu-plugins` wykonany i zweryfikowany.  
- [ ] WordPress + WooCommerce online, brak aktualizacji/maintenance.  
- [ ] PHP ≥ 7.4, poprawne prawa (`find . -type f -not -perm 644`).  
- [ ] `headless-config.php` obecny na serwerze (jeśli nie – zaczynamy od niego).  
- [ ] Sekrety spójne: `KING_CART_API_SECRET`, `WOOCOMMERCE_WEBHOOK_SECRET`, `WC_CONSUMER_*`, `ADMIN_CACHE_TOKEN`, `REVALIDATE_SECRET`.  
- [ ] `wp-content/debug.log` ma rotację/wolne miejsce.  
- [ ] Plan rollbacku przygotowany (sekcja 5).

---

## 3. Procedura wdrożenia

### 3.1. Wgranie plików
```bash
scp wp-content/mu-plugins/<plugin>.php user@host:/var/www/html/wp-content/mu-plugins/
```

### 3.2. Sekrety (przykład dla `king-cart-api`)
```php
// wp-config.php
define('KING_CART_API_SECRET', 'wygeneruj-losowy-32-znakowy-sekret');
```
```bash
# .env(.local) Next.js
KING_CART_API_SECRET=wygeneruj-losowy-32-znakowy-sekret
```
> Upewnij się, że wartości są identyczne – w innym razie Next.js dostanie 403/401 na `king-cart/v1/*`.

### 3.3. Logi po każdej fazie
```bash
ssh user@host "tail -n 50 /var/www/html/wp-content/debug.log"
```

### 3.4. Usunięcie testowych/legacy pluginów
```bash
ssh user@host "cd /var/www/html/wp-content/mu-plugins && rm -f hpos-compatibility-test.php king-mock-reviews.php"
```

### 3.5. Rollback awaryjny
```bash
ssh user@host "cd /var/www/html/wp-content && rm -rf mu-plugins && mv mu-plugins-backup-<data> mu-plugins"
```

---

## 4. Testy po wdrożeniu

### 4.1. CORS / `headless-config.php`
```bash
curl -X OPTIONS "https://<domain>/wp-json/king-cart/v1/cart" \
  -H "Origin: https://frontend.example" \
  -H "Access-Control-Request-Method: POST" -v
```
Oczekiwane nagłówki: `Access-Control-Allow-Origin`, `Allow-Methods`, `Allow-Headers`, `Allow-Credentials`.

### 4.2. JWT (po fazie 2)
- `POST /wp-json/king-jwt/v1/login` → token.  
- `POST /wp-json/king-jwt/v1/refresh` – 5 żądań OK, 6. = 429.  
- Po refresh stary token odrzucony (401).  
- Payload zawiera scopes (`["read:profile", …]`).

### 4.3. API zależne od configu
| Plugin | Endpoint | Co sprawdzamy |
| --- | --- | --- |
| `king-cart-api` | `GET /wp-json/king-cart/v1/cart` | 200 + poprawny JSON |
|  | `POST /…/add-item` | Dodanie produktu, brak błędów CORS |
| `king-reviews-api` | `GET /wp-json/king-reviews/v1/reviews?product_id=ID` | Lista recenzji |
|  | `POST /…/reviews` | Dodanie recenzji, auto-approve |
| `king-email-system` + `email-link-redirect` | Zamówienie testowe | Linki w mailu kierują na frontend |

### 4.4. Endpointy optymalizacyjne
- `GET /wp-json/king-optimized/v1/homepage` – 200 + nagłówki cache.  
- `GET /wp-json/king-shop/v1/data?page=1&per_page=12` – 200, brak błędów Redis.  
- WooCommerce → Ustawienia → Webhooki → „Testuj” → 200 w `/api/webhooks`.

---

## 5. Po wdrożeniu

- [ ] Monitoruj `debug.log` + logi HTTP min. 15 min.  
- [ ] Smoke testy (logowanie, koszyk, checkout, e-mail).  
- [ ] Zapisz notatkę z wdrożenia (data, commit, wynik testów).  
- [ ] Backup przechowuj min. 24 h.  
- [ ] Zaktualizuj `STATUS_SUMMARY.md` / `SECURITY_OVERVIEW.md`, jeśli zmienił się stan.

---

## 6. Najczęstsze problemy

| Objaw | Przyczyna | Rozwiązanie |
| --- | --- | --- |
| Błąd CORS na froncie | `headless-config.php` nie wdrożony / brak flush cache | Wdróż config, wyczyść cache. |
| `Token został już użyty` | Rotacja refresh tokenów | Poinformuj użytkownika o ponownym logowaniu. |
| 403/401 na API | Brak scopes / błędny sekret / rate limit | Zweryfikuj env, logi JWT, limiter. |
| Webhook „Pending” | Cron nie działa / zły sekret | `wp cron event run --due-now`, sprawdź `WOOCOMMERCE_WEBHOOK_SECRET`. |

---

## 7. Referencje i właściciele

- `MU_PLUGINS_INVENTORY.md`, `MU_PLUGINS_AUDIT.md` – opis pluginów.  
- `SECURITY_OVERVIEW.md` – stan zabezpieczeń.  
- `TEST_PLAYBOOK.md` – szczegółowe scenariusze testowe.  
- `STATUS_SUMMARY.md` – bieżący stan projektu.

**Właściciele procesu:**  
- Backend/API: `@backend-lead`  
- Security/DevOps: `@devops`  
- Observability: `@sre`

---

**Ostatnia aktualizacja:** 2025-11-08 (reset checklist) – uzupełnij kolumny „Status” i przypisz właścicieli przed kolejnym wdrożeniem.**


