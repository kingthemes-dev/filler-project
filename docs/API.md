# API Documentation - Headless WooCommerce

## 🎯 **INSTRUKCJA DLA DEWELOPERÓW**

### **Jak to działa:**

1. **Next.js API Routes** (`apps/web/src/app/api/`) → Proxy/middleware
2. **WordPress REST API** → Faktyczne źródło danych
3. **king-optimized Plugin** → Custom endpointy z cache

### **Endpoint Flow:**

```
User → Next.js API Route → WordPress REST API → WooCommerce
```

### **Przykład użycia:**

```typescript
// W Next.js komponencie
const response = await fetch('/api/woocommerce?endpoint=products');
const data = await response.json();
```

---

## 📍 **WSZYSTKIE ENDPOINTY**

### 🏠 **Homepage**

#### GET `/wp-json/king-optimized/v1/homepage?page=1`

**Description:** Pobiera wszystkie dane homepage w jednym requestcie (wszystkie tabs)

**Response:**
```json
{
  "success": true,
  "data": {
    "bestsellers": [...],
    "new_arrivals": [...],
    "on_sale": [...],
    "featured": [...]
  }
}
```

---

### 🛍️ **Shop / Products**

#### GET `/wp-json/king-optimized/v1/shop?page=1&per_page=12&category=slug`

**Description:** Pobiera produkty z filtrowaniem

**Params:**
- `page` - numer strony (default: 1)
- `per_page` - produkty na stronę (default: 12)
- `category` - slug kategorii

**Response:**
```json
{
  "products": [...],
  "total": 100,
  "categories": [...],
  "attributes": {...}
}
```

**Next.js:** `GET /api/woocommerce?endpoint=shop&page=1&per_page=12`

---

### 🔍 **Single Product**

#### GET `/wp-json/king-optimized/v1/product/{slug}`

**Description:** Pobiera pojedynczy produkt z całymi danymi

**Response:**
```json
{
  "success": true,
  "product": {
    "id": 123,
    "name": "Product Name",
    "slug": "product-name",
    "price": "99.00",
    "variations": [...],
    "related": [...]
  }
}
```

**Next.js:** `GET /api/woocommerce?endpoint=products/{id}`

---

### 📦 **Categories**

#### GET `/wp-json/king-shop/v1/attributes`

**Description:** Pobiera kategorie i atrybuty (filterable)

**Response:**
```json
{
  "categories": [...],
  "attributes": {...}
}
```

**Next.js:** `GET /api/woocommerce?endpoint=categories`

---

### 🛒 **Cart Operations**

#### POST `/wp-json/king-cart/v1/add`

**Description:** Dodaj produkt do koszyka

**Request:**
```json
{
  "product_id": 123,
  "quantity": 1,
  "variation_id": 456
}
```

---

### 👤 **Customer / Orders**

#### GET `/wp-json/king-optimized/v1/customer/{id}/orders`

**Description:** Pobiera zamówienia użytkownika

**Next.js:** `GET /api/woocommerce?endpoint=orders&customer={id}`

---

### 📧 **Email**

#### POST `/wp-json/king-email/v1/send`

**Description:** Wysyła email (order confirmation, etc.)

**Next.js:** `POST /api/send-email`

---

### 💳 **Payments**

#### POST `/wp-json/wc/v3/payments`

**Description:** Przetwarzanie płatności

**Next.js:** `POST /api/payments/{method}`

---

### 🎁 **Newsletter**

#### POST `/wp-json/king-email/v1/newsletter`

**Description:** Zapisz do newslettera

**Next.js:** `POST /api/newsletter/subscribe`

---

## 🚨 **WAŻNE - CO NIE UŻYWAĆ**

### ❌ **NIE UŻYWAJ:**
- `king-shop/v1/data` - TO NIE ISTNIEJE!
- `king-shop/v1/shop` - TO NIE ISTNIEJE!

### ✅ **UŻYWAJ:**
- `king-optimized/v1/shop` - ✅ POPRAWNE
- `king-optimized/v1/homepage` - ✅ POPRAWNE
- `king-optimized/v1/product/{slug}` - ✅ POPRAWNE

---

## 🔧 **NEXT.JS API ROUTES**

### `/api/woocommerce`

Universal proxy dla WooCommerce API:

```typescript
// Przykłady:
GET /api/woocommerce?endpoint=products
GET /api/woocommerce?endpoint=shop&page=1&per_page=12
GET /api/woocommerce?endpoint=categories
GET /api/woocommerce?endpoint=orders&customer=123

POST /api/woocommerce?endpoint=orders
POST /api/woocommerce?endpoint=cart/add
```

**Lokalizacja:** `apps/web/src/app/api/woocommerce/route.ts`

---

## 🎯 **CACHE STRATEGY**

1. **Redis Cache** - WordPress level (24h)
2. **Next.js ISR** - Edge caching (60s)
3. **Browser Cache** - Client level (5min)

---

## 📊 **PERFORMANCE**

- **API Response Time:** < 200ms
- **Cache Hit Rate:** 95%+
- **Lighthouse Score:** 98-99/100

---

## 🔐 **AUTHENTICATION**

### JWT Token

```typescript
const token = localStorage.getItem('auth-token');

fetch('/api/woocommerce', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 📝 **ERROR HANDLING**

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Errors:
- `UNAUTHORIZED` - Brak autoryzacji
- `NOT_FOUND` - Resource nie istnieje
- `VALIDATION_ERROR` - Błędne dane
- `API_ERROR` - Błąd WordPress API

---

## 🧪 **TESTING**

### Test endpointów:

```bash
# Homepage
curl "http://localhost:3001/wp-json/king-optimized/v1/homepage"

# Shop
curl "http://localhost:3001/wp-json/king-optimized/v1/shop?page=1&per_page=12"

# Product
curl "http://localhost:3001/wp-json/king-optimized/v1/product/product-slug"

# Przez Next.js
curl "http://localhost:3001/api/woocommerce?endpoint=shop"
```

---

## 📚 **DODATKOWE RESOURCES**

- **WordPress REST API:** `/wp-json/`
- **WooCommerce API:** `/wp-json/wc/v3/`
- **Custom Endpoints:** `/wp-json/king-optimized/v1/`

---

## 🚀 **QUICK START**

1. **Pobierz produkty:**
```typescript
const products = await fetch('/api/woocommerce?endpoint=shop').then(r => r.json());
```

2. **Pobierz pojedynczy produkt:**
```typescript
const product = await fetch('/api/woocommerce?endpoint=products/123').then(r => r.json());
```

3. **Pobierz kategorie:**
```typescript
const categories = await fetch('/api/woocommerce?endpoint=categories').then(r => r.json());
```

---

## ⚡ **PERFORMANCE TIPS**

1. **Używaj ISR** dla statycznych stron
2. **Cache'uj w Next.js** - redukuje load na WordPress
3. **Batch requests** - pobieraj wszystko w jednym requestcie
4. **Lazy load** - ładowj zdjęcia dynamicznie
5. **Edge Functions** - dla global performance

---

**Ostatnia aktualizacja:** 2025-01-30  
**Version:** 2.0.0  
**Status:** ✅ Production Ready
