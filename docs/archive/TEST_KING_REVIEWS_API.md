# Testy dla king-reviews-api.php

**Data**: 2025-11-07  
**Plugin**: King Reviews API - Custom reviews API endpoints with auto-approval

---

## 📋 Opis funkcjonalności

Plugin `king-reviews-api.php`:
- ✅ Custom reviews API endpoints (`/wp-json/king-reviews/v1/reviews`)
- ✅ GET reviews dla produktu
- ✅ POST create review (auto-approve)
- ✅ CORS headers (używa headless-config.php)

**Endpoints**:
- `GET /wp-json/king-reviews/v1/reviews?product_id=123` - Get reviews
- `POST /wp-json/king-reviews/v1/reviews` - Create review

---

## 🧪 Testy

### TEST 1: Sprawdź czy plugin się załadował

#### 1.1 Sprawdź czy plik jest na serwerze
```bash
ssh user@server "ls -la /path/to/wp-content/mu-plugins/king-reviews-api.php"
```

**Oczekiwany wynik**: 
- ✅ Plik istnieje

---

#### 1.2 Sprawdź czy klasa KingReviewsAPI jest załadowana
```bash
ssh user@server "wp eval 'if (class_exists(\"KingReviewsAPI\")) { echo \"ZAŁADOWANA\"; } else { echo \"NIE ZAŁADOWANA\"; }'"
```

**Oczekiwany wynik**: 
- ✅ Klasa załadowana

---

### TEST 2: Sprawdź czy endpointy są zarejestrowane

#### 2.1 Test namespace
```bash
curl -s "https://qvwltjhdjw.cfolks.pl/wp-json/king-reviews/v1/"
```

**Oczekiwany wynik**: 
- ✅ Zwraca informacje o endpointach (nie 404)

---

#### 2.2 Test GET /reviews
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-reviews/v1/reviews?product_id=123"
```

**Oczekiwany wynik**: 
- ✅ Status 200
- ✅ Zwraca JSON z reviews (może być pusty array)

**Przykładowa odpowiedź**:
```json
{
  "reviews": [
    {
      "id": 1,
      "rating": 5,
      "review": "Great product!",
      "reviewer": "John Doe",
      "date": "2025-11-07"
    }
  ]
}
```

---

### TEST 3: Test CORS headers

#### 3.1 Test OPTIONS request
```bash
curl -X OPTIONS "https://qvwltjhdjw.cfolks.pl/wp-json/king-reviews/v1/reviews" \
  -H "Origin: https://filler.pl" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Oczekiwane headers**:
- ✅ `Access-Control-Allow-Origin: https://filler.pl`
- ✅ `Access-Control-Allow-Methods: POST, GET, OPTIONS`
- ✅ `Access-Control-Allow-Headers: Content-Type, Authorization`

---

### TEST 4: Test POST /reviews (Create review)

#### 4.1 Test create review
```bash
curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/king-reviews/v1/reviews" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 123,
    "rating": 5,
    "review": "Great product!",
    "reviewer": "John Doe",
    "reviewer_email": "john@example.com"
  }'
```

**Oczekiwany wynik**: 
- ✅ Status 200 lub 201
- ✅ Zwraca created review data
- ✅ Review jest auto-approved (status: approved)

---

#### 4.2 Test create review z validation errors
```bash
curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/king-reviews/v1/reviews" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 123,
    "rating": 10
  }'
```

**Oczekiwany wynik**: 
- ✅ Status 400 (Bad Request)
- ✅ Zwraca error message (brak required fields)

---

### TEST 5: Test przez frontend

#### 5.1 Test w aplikacji Next.js
1. Otwórz produkt na frontendzie
2. Sprawdź czy reviews są wyświetlane
3. Dodaj nowy review
4. Sprawdź czy review pojawił się od razu (auto-approved)

**Oczekiwany wynik**: 
- ✅ Reviews są wyświetlane
- ✅ Można dodać review
- ✅ Review jest auto-approved
- ✅ Brak błędów CORS w konsoli

---

## 🔍 Debugowanie

### Problem: Endpoint zwraca 404

**Możliwe przyczyny**:
1. Plugin nie jest załadowany
2. REST API nie jest włączone

**Rozwiązanie**:
1. Sprawdź czy klasa `KingReviewsAPI` jest załadowana
2. Sprawdź logi błędów
3. Sprawdź czy REST API działa: `curl https://site.com/wp-json/`

---

### Problem: CORS błędy

**Możliwe przyczyny**:
1. `headless-config.php` nie jest wdrożony
2. CORS headers nie są ustawione

**Rozwiązanie**:
1. Sprawdź czy `headless-config.php` jest wdrożony
2. Test OPTIONS request (patrz TEST 3)

---

### Problem: Review nie jest auto-approved

**Możliwe przyczyny**:
1. WooCommerce settings wymaga manual approval
2. Plugin nie działa poprawnie

**Rozwiązanie**:
1. Sprawdź WooCommerce → Settings → Products → Reviews
2. Sprawdź logi błędów
3. Sprawdź kod pluginu (czy auto-approve jest zaimplementowany)

---

## ✅ Checklist testów

- [ ] Plugin jest na serwerze
- [ ] Klasa `KingReviewsAPI` jest załadowana
- [ ] Endpointy są zarejestrowane (`/wp-json/king-reviews/v1/`)
- [ ] CORS headers działają (OPTIONS request)
- [ ] GET /reviews zwraca reviews
- [ ] POST /reviews tworzy review
- [ ] Review jest auto-approved
- [ ] Brak błędów w logach
- [ ] Test przez frontend działa

---

## 📊 Oczekiwane rezultaty

### Przed wdrożeniem:
- ❌ Custom reviews API nie działa
- ❌ CORS błędy przy requestach z frontendu

### Po wdrożeniu:
- ✅ Custom reviews API działa
- ✅ CORS headers obecne
- ✅ Reviews operations działają poprawnie
- ✅ Reviews są auto-approved
- ✅ Frontend może używać reviews API bez błędów

---

## 🚀 Następne kroki

Po pomyślnym teście `king-reviews-api.php`:
1. ✅ Plugin działa poprawnie
2. ➡️ Przejdź do FAZY 2 (niezależne pluginy):
   - `woocommerce-custom-fields.php`
   - `king-optimized-api.php`
   - `king-shop-api.php`
   - `king-webhooks.php`

---

**Status**: ✅ READY FOR TESTING

