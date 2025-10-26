# API Endpoints Documentation

## WooCommerce API Endpoints

### ✅ Working Endpoints

#### Products
- `GET /api/woocommerce?endpoint=products` - Lista produktów
- `GET /api/woocommerce?endpoint=products/{id}` - Szczegóły produktu
- `GET /api/woocommerce?endpoint=products/categories` - Kategorie produktów
- `GET /api/woocommerce?endpoint=products/attributes` - Atrybuty produktów

#### Orders
- `GET /api/woocommerce?endpoint=orders` - Lista zamówień
- `GET /api/woocommerce?endpoint=orders/{id}` - Szczegóły zamówienia
- `POST /api/woocommerce?endpoint=orders` - Tworzenie zamówienia

#### Customers
- `GET /api/woocommerce?endpoint=customers` - Lista klientów
- `GET /api/woocommerce?endpoint=customers/{id}` - Szczegóły klienta
- `POST /api/woocommerce?endpoint=customers` - Tworzenie klienta

#### Shop Data
- `GET /api/woocommerce?endpoint=shop` - Dane sklepu (produkty, kategorie, atrybuty)

### ❌ Broken Endpoints

#### Attribute Terms
- `GET /api/woocommerce?endpoint=products/attributes/pa_marka/terms` - **404 ERROR**
- `GET /api/woocommerce?endpoint=products/attributes/pa_pojemność/terms` - **404 ERROR**

**Problem:** WooCommerce API nie obsługuje endpointów dla termów atrybutów przez slug.

## WordPress Custom Endpoints

### ✅ Working Custom Endpoints

#### King Shop API
- `GET /wp-json/king-shop/v1/attributes` - **WORKING** - Wszystkie atrybuty z termami
- `GET /wp-json/king-shop/v1/shop` - Dane sklepu

#### WordPress REST API
- `GET /wp-json/wp/v2/posts` - Posty
- `GET /wp-json/wp/v2/pages` - Strony
- `GET /wp-json/wp/v2/users` - Użytkownicy

## WooCommerce Store API (Public)

### ✅ Working Store API
- `GET /wp-json/wc/store/v1/products` - Produkty (public)
- `GET /wp-json/wc/store/v1/products/attributes` - Atrybuty (public)
- `GET /wp-json/wc/store/v1/cart` - Koszyk (public)

### ❌ Broken Store API
- `GET /wp-json/wc/store/v1/products/attributes/{slug}/terms` - **404 ERROR**

## WooCommerce Admin API (Private)

### ❌ Requires Authentication
- `GET /wp-json/wc/v3/products/attributes/{id}/terms` - **401 ERROR** (requires auth)
- `GET /wp-json/wc/v3/products/attributes/{slug}/terms` - **404 ERROR**

## Current Working Solution

### For Brands (Marki)
```javascript
// ✅ WORKING - Use King Shop API
const response = await fetch('/wp-json/king-shop/v1/attributes');
const data = await response.json();
const brands = data.attributes.marka.terms; // Array of brand objects
```

### For Capacities (Pojemności)
```javascript
// ✅ WORKING - Use King Shop API
const response = await fetch('/wp-json/king-shop/v1/attributes');
const data = await response.json();
const capacities = data.attributes.pojemnosc.terms; // Array of capacity objects
```

## Fix for Shop Explore Panel

### Current Problem
```javascript
// ❌ BROKEN - These endpoints return 404
const [capacitiesRes, brandsRes] = await Promise.all([
  fetch('/api/woocommerce?endpoint=products/attributes/pa_pojemność/terms&per_page=100'),
  fetch('/api/woocommerce?endpoint=products/attributes/pa_marka/terms&per_page=100')
]);
```

### Solution
```javascript
// ✅ WORKING - Use King Shop API directly
const response = await fetch('/wp-json/king-shop/v1/attributes');
const data = await response.json();
const brands = data.attributes.marka.terms;
const capacities = data.attributes.pojemnosc.terms;
```

## Environment Variables Required

```bash
NEXT_PUBLIC_WORDPRESS_URL=https://qvwltjhdjw.cfolks.pl
WC_CONSUMER_KEY=ck_1234567890abcdef
WC_CONSUMER_SECRET=cs_1234567890abcdef
```

## Notes

1. **King Shop API** - Custom WordPress plugin endpoint that works perfectly
2. **WooCommerce API** - Has limitations with attribute terms
3. **Store API** - Public API but doesn't support attribute terms by slug
4. **Admin API** - Requires authentication and doesn't work with slugs

## Recommendation

**Use King Shop API for all attribute-related data:**
- ✅ Reliable
- ✅ No authentication required
- ✅ Returns all data in one call
- ✅ Already implemented and working
