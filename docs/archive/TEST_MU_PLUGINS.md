# Testy mu-plugins po wdrożeniu

**Data**: 2025-11-07  
**Status**: ✅ Wszystkie mu-plugins wdrożone

---

## ✅ Wdrożone mu-plugins

1. ✅ `headless-config.php` - Fundament (CORS, helpers)
2. ✅ `king-jwt-authentication.php` - JWT auth (refresh rotation, rate limiting)
3. ✅ `king-email-system.php` - Email system (HPOS-compatible)
4. ✅ `customer-invoices.php` - Faktury klientów
5. ✅ `custom-password-reset.php` - Reset hasła
6. ✅ `king-cart-api.php` - Cart API
7. ✅ `king-reviews-api.php` - Reviews API
8. ✅ `king-optimized-api.php` - Optimized API (homepage, products)
9. ✅ `king-shop-api.php` - Shop API
10. ✅ `king-webhooks.php` - Webhooks
11. ✅ `email-link-redirect.php` - Email link redirect
12. ✅ `woocommerce-custom-fields.php` - Custom fields

---

## 🧪 Checklist testów

### 1. JWT Authentication (`king-jwt-authentication.php`)

#### Test logowania
```bash
# Test login
curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/king-jwt/v1/token" \
  -H "Content-Type: application/json" \
  -d '{"username":"USERNAME","password":"PASSWORD"}'
```

#### Test refresh token rotation
```bash
# Test refresh (max 5/min per IP)
for i in {1..7}; do
  curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/king-jwt/v1/refresh" \
    -H "Content-Type: application/json" \
    -d '{"token":"YOUR_TOKEN"}'
  echo ""
done
# Powinno zwrócić 429 po 5 requestach
```

#### Test validate token
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-jwt/v1/validate?token=YOUR_TOKEN"
```

**Oczekiwany wynik**: 
- ✅ Login zwraca JWT token
- ✅ Refresh token rotation działa (max 5/min)
- ✅ Validate zwraca user data

---

### 2. Email System (`king-email-system.php`)

#### Test trigger email dla pending order
```bash
curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/king-email/v1/trigger-order-email" \
  -H "Content-Type: application/json" \
  -d '{"order_id":ORDER_ID}'
```

#### Test email logs
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-email/v1/hpos-logs" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Oczekiwany wynik**: 
- ✅ Email wysyłany dla pending orders
- ✅ Email wysyłany dla processing orders
- ✅ Logs dostępne (jeśli admin)

---

### 3. Customer Invoices (`customer-invoices.php`)

#### Test invoice PDF
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/custom/v1/invoice/ORDER_ID/pdf" \
  -H "Authorization: Bearer USER_TOKEN"
```

#### Test change password
```bash
curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/custom/v1/customer/change-password" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_password":"OLD","new_password":"NEW"}'
```

**Oczekiwany wynik**: 
- ✅ Invoice PDF generowany poprawnie
- ✅ Change password działa dla zalogowanych użytkowników

---

### 4. Password Reset (`custom-password-reset.php`)

#### Test password reset request
```bash
curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/custom/v1/password-reset" \
  -H "Content-Type: application/json" \
  -d '{"email":"USER_EMAIL"}'
```

**Oczekiwany wynik**: 
- ✅ Email z reset linkiem wysłany

---

### 5. Cart API (`king-cart-api.php`)

#### Test get cart
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart" \
  -H "Authorization: Bearer USER_TOKEN"
```

#### Test add to cart
```bash
curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":123,"quantity":1}'
```

**Oczekiwany wynik**: 
- ✅ Cart działa poprawnie
- ✅ CORS headers obecne

---

### 6. Reviews API (`king-reviews-api.php`)

#### Test get reviews
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-reviews/v1/reviews?product_id=123"
```

#### Test create review
```bash
curl -X POST "https://qvwltjhdjw.cfolks.pl/wp-json/king-reviews/v1/reviews" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"product_id":123,"rating":5,"review":"Great product!"}'
```

**Oczekiwany wynik**: 
- ✅ Reviews pobierane poprawnie
- ✅ Review creation działa

---

### 7. Optimized API (`king-optimized-api.php`)

#### Test homepage
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-optimized/v1/homepage"
```

#### Test product by slug
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-optimized/v1/product/product-slug"
```

#### Test shop data
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-optimized/v1/shop"
```

**Oczekiwany wynik**: 
- ✅ Homepage data zwracana
- ✅ Product data zwracana
- ✅ Shop data zwracana
- ✅ Cache działa (Redis)

---

### 8. Shop API (`king-shop-api.php`)

#### Test shop data
```bash
curl -X GET "https://qvwltjhdjw.cfolks.pl/wp-json/king-shop/v1/data?page=1&per_page=12"
```

**Oczekiwany wynik**: 
- ✅ Shop data zwracana (products, categories, attributes)
- ✅ Cache działa (Redis)

---

### 9. Webhooks (`king-webhooks.php`)

#### Test webhook registration
```bash
# Sprawdź w WooCommerce admin czy webhooks są zarejestrowane
# Settings → Advanced → Webhooks
```

**Oczekiwany wynik**: 
- ✅ Webhooks zarejestrowane w WooCommerce

---

### 10. CORS (wszystkie API endpoints)

#### Test CORS headers
```bash
curl -X OPTIONS "https://qvwltjhdjw.cfolks.pl/wp-json/king-cart/v1/cart" \
  -H "Origin: https://filler.pl" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Oczekiwany wynik**: 
- ✅ CORS headers obecne
- ✅ `Access-Control-Allow-Origin: https://filler.pl`
- ✅ `Access-Control-Allow-Methods: POST, GET, OPTIONS`

---

## 🐛 Sprawdzanie błędów

### Sprawdź logi WordPress
```bash
ssh user@server "tail -f /path/to/wp-content/debug.log"
```

### Sprawdź PHP errors
```bash
ssh user@server "tail -f /var/log/php/error.log"
```

### Sprawdź czy wszystkie mu-plugins są załadowane
```bash
ssh user@server "cd /path/to/wp-content/mu-plugins && ls -1 *.php"
```

---

## ✅ Checklist końcowy

- [ ] Wszystkie mu-plugins wdrożone
- [ ] Test plugins wyłączone (king-mock-reviews.php w delete/)
- [ ] JWT authentication działa
- [ ] Email system działa (pending orders)
- [ ] Customer invoices działa
- [ ] Password reset działa
- [ ] Cart API działa
- [ ] Reviews API działa
- [ ] Optimized API działa
- [ ] Shop API działa
- [ ] CORS headers działają
- [ ] Brak błędów w logach

---

## 📊 Podsumowanie

**Status**: ✅ Wszystkie mu-plugins wdrożone i gotowe do testów

**Następne kroki**:
1. Przeprowadź wszystkie testy z checklist
2. Sprawdź logi pod kątem błędów
3. Testuj end-to-end flow (login → cart → checkout → email)

---

**Data utworzenia**: 2025-11-07

