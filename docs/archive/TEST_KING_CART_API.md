# Testy dla king-cart-api.php

**Data**: 2025-11-07  
**Plugin**: King Cart API - Custom cart API endpoints with nonce support

---

## 📋 Opis funkcjonalności

Plugin `king-cart-api.php`:
- ✅ Custom cart API endpoints (`/wp-json/king-cart/v1/cart`)
- ✅ Nonce support dla cart operations
- ✅ CORS headers (używa headless-config.php)
- ✅ GET, POST, DELETE metody dla cart

**Endpoints**:
- `GET /wp-json/king-cart/v1/nonce` - Get nonce for cart operations
- `GET /wp-json/king-cart/v1/cart` - Get cart
- `POST /wp-json/king-cart/v1/cart` - Add to cart
- `DELETE /wp-json/king-cart/v1/cart` - Remove from cart

---

## 🧪 Testy

### TEST 1: Sprawdź czy plugin się załadował

#### 1.1 Sprawdź czy plik jest na serwerze
```bash
ssh user@server "ls -la /path/to/wp-content/mu-plugins/king-cart-api.php"
```

**Oczekiwany wynik**: 
- ✅ Plik istnieje

---

#### 1.2 Sprawdź czy klasa KingCartAPI jest załadowana
```bash
ssh user@server "wp eval 'if (class_exists(\"KingCartAPI\")) { echo \"ZAŁADOWANA\"; } else { echo \"NIE ZAŁADOWANA\"; }'"
```

**Oczekiwany wynik**: 
- ✅ Klasa załadowana

---

### TEST 2: Sprawdź czy endpointy są zarejestrowane

#### 2.1 Test namespace
```bash
curl -s "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/"
```

**Oczekiwany wynik**: 
- ✅ Zwraca informacje o endpointach (nie 404)

---

#### 2.2 Test GET /nonce
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/nonce"
```

**Oczekiwany wynik**: 
- ✅ Zwraca JSON z `nonce` field
- ✅ Status 200

**Przykładowa odpowiedź**:
```json
{
  "nonce": "abc123def456..."
}
```

---

### TEST 3: Test CORS headers (NAJWAŻNIEJSZY!)

#### 3.1 Test OPTIONS request
```bash
curl -X OPTIONS "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart" \
  -H "Origin: https://filler.pl" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Oczekiwane headers**:
- ✅ `Access-Control-Allow-Origin: https://filler.pl`
- ✅ `Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE`
- ✅ `Access-Control-Allow-Headers: Content-Type, Authorization`
- ✅ `Access-Control-Allow-Credentials: true` (jeśli używasz cookies)

---

#### 3.2 Test CORS w przeglądarce
1. Otwórz konsolę przeglądarki (F12)
2. Wykonaj request z frontendu:
```javascript
fetch('https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include'
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
```

**Oczekiwany wynik**: 
- ✅ Request wykonany bez błędów CORS
- ✅ Dane zwrócone poprawnie

---

### TEST 4: Test GET /cart

#### 4.1 Test bez autoryzacji (pusty cart)
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart"
```

**Oczekiwany wynik**: 
- ✅ Status 200
- ✅ Zwraca pusty cart lub błąd autoryzacji (w zależności od implementacji)

---

#### 4.2 Test z autoryzacją (JWT token)
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Oczekiwany wynik**: 
- ✅ Status 200
- ✅ Zwraca cart data w formacie JSON

---

### TEST 5: Test POST /cart (Add to cart)

#### 5.1 Test add to cart
```bash
curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 123,
    "quantity": 1
  }'
```

**Oczekiwany wynik**: 
- ✅ Status 200 lub 201
- ✅ Zwraca updated cart data
- ✅ Produkt dodany do koszyka

---

#### 5.2 Test add to cart z variation
```bash
curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 123,
    "quantity": 1,
    "variation_id": 456
  }'
```

**Oczekiwany wynik**: 
- ✅ Status 200 lub 201
- ✅ Variation dodana do koszyka

---

### TEST 6: Test DELETE /cart (Remove from cart)

#### 6.1 Test remove from cart
```bash
curl -X DELETE "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart?cart_item_key=ITEM_KEY" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Oczekiwany wynik**: 
- ✅ Status 200
- ✅ Item usunięty z koszyka
- ✅ Zwraca updated cart data

---

### TEST 7: Test przez frontend

#### 7.1 Test w aplikacji Next.js
1. Zaloguj się na frontendzie
2. Dodaj produkt do koszyka
3. Sprawdź czy produkt pojawił się w koszyku
4. Usuń produkt z koszyka
5. Sprawdź czy koszyk jest pusty

**Oczekiwany wynik**: 
- ✅ Wszystkie operacje działają poprawnie
- ✅ Brak błędów CORS w konsoli
- ✅ Cart synchronizuje się z backendem

---

## 🔍 Debugowanie

### Problem: Endpoint zwraca 404

**Możliwe przyczyny**:
1. Plugin nie jest załadowany
2. REST API nie jest włączone
3. Permalink structure nie jest ustawiony

**Rozwiązanie**:
1. Sprawdź czy klasa `KingCartAPI` jest załadowana
2. Sprawdź logi błędów
3. Sprawdź czy REST API działa: `curl https://site.com/wp-json/`
4. Ustaw permalink structure w WordPress admin (Settings → Permalinks)

---

### Problem: CORS błędy

**Możliwe przyczyny**:
1. `headless-config.php` nie jest wdrożony
2. CORS headers nie są ustawione
3. Origin nie jest w allowed origins

**Rozwiązanie**:
1. Sprawdź czy `headless-config.php` jest wdrożony
2. Sprawdź czy funkcja `headless_get_allowed_origins()` działa
3. Sprawdź logi błędów
4. Test OPTIONS request (patrz TEST 3)

---

### Problem: Cart operations nie działają

**Możliwe przyczyny**:
1. JWT token nie jest poprawny
2. Nonce nie jest poprawny
3. WooCommerce session nie jest dostępna

**Rozwiązanie**:
1. Sprawdź czy JWT token jest ważny
2. Pobierz nowy nonce: `GET /king-cart/v1/nonce`
3. Sprawdź logi błędów
4. Sprawdź czy WooCommerce jest aktywne

---

## ✅ Checklist testów

- [ ] Plugin jest na serwerze
- [ ] Klasa `KingCartAPI` jest załadowana
- [ ] Endpointy są zarejestrowane (`/wp-json/king-cart/v1/`)
- [ ] CORS headers działają (OPTIONS request)
- [ ] GET /nonce zwraca nonce
- [ ] GET /cart zwraca cart data
- [ ] POST /cart dodaje produkt do koszyka
- [ ] DELETE /cart usuwa produkt z koszyka
- [ ] Brak błędów w logach
- [ ] Test przez frontend działa

---

## 📊 Oczekiwane rezultaty

### Przed wdrożeniem:
- ❌ Custom cart API nie działa
- ❌ CORS błędy przy requestach z frontendu

### Po wdrożeniu:
- ✅ Custom cart API działa
- ✅ CORS headers obecne
- ✅ Cart operations działają poprawnie
- ✅ Frontend może używać cart API bez błędów

---

## 🚀 Następne kroki

Po pomyślnym teście `king-cart-api.php`:
1. ✅ Plugin działa poprawnie
2. ➡️ Przejdź do wdrożenia kolejnych pluginów:
   - `king-reviews-api.php`
   - `king-optimized-api.php`
   - itd.

---

**Status**: ✅ READY FOR TESTING

