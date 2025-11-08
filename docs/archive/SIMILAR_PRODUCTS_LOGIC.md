# Similar Products - Logika Fetchowania

## Przegląd

Komponent `SimilarProducts` pobiera produkty podobne do aktualnie wyświetlanego produktu, używając wielopoziomowej strategii fallback.

## Strategia Fetchowania (w kolejności priorytetów)

### 1. Batch Fetch przez ID (crossSellIds / relatedIds)

**Endpoint**: `/api/woocommerce?endpoint=products&include={ids}&per_page={count}&_fields=...`

**Fallback 1**: Store API batch
- **Endpoint**: `{WORDPRESS_URL}/wp-json/wc/store/v1/products?include={ids}`
- **Normalizacja**: Automatyczna normalizacja odpowiedzi Store API do formatu `WooProduct`

**Fallback 2**: Indywidualne wywołania
- **Endpoint**: `/api/woocommerce?endpoint=products/{id}`
- **Używa**: `wooCommerceService.getProduct(id)`
- **Retry**: 2 próby z timeout 5s/8s

### 2. Kategoria (categoryId)

**Endpoint**: `/api/woocommerce?endpoint=products&category={categoryId}&per_page={limit}&orderby=date&order=desc&_fields=...`

**Fallback**: Store API z filtrowaniem po stronie klienta
- **Endpoint**: `{WORDPRESS_URL}/wp-json/wc/store/v1/products?per_page={limit*2}`
- **Filtrowanie**: Po stronie klienta - `p.categories.some(cat => cat.id === categoryId)`
- **Normalizacja**: Automatyczna normalizacja odpowiedzi Store API do formatu `WooProduct`

**Warunek uruchomienia**: Tylko gdy `categoryResponse.status === 502 || 503 || 504`

### 3. Najnowsze produkty (final fallback)

**Endpoint**: `/api/woocommerce?endpoint=products&per_page={limit}&orderby=date&order=desc&_fields=...`

**Fallback**: Store API
- **Endpoint**: `{WORDPRESS_URL}/wp-json/wc/store/v1/products?per_page={limit}`
- **Normalizacja**: Automatyczna normalizacja odpowiedzi Store API do formatu `WooProduct`

**Warunek uruchomienia**: Tylko gdy `latestResponse.status === 502 || 503 || 504`

## Format Danych

### WooCommerce API Response
```typescript
Array<WooProduct> | { products: WooProduct[] } | { data: WooProduct[] }
```

### Store API Response (wymaga normalizacji)
```typescript
Array<{
  id: number;
  name: string;
  slug: string;
  prices: { price: string; regular_price: string; sale_price: string };
  images: Array<{ src: string; alt: string }>;
  categories: Array<{ id: number; name: string; slug: string }>;
  // ... inne pola
}>
```

### Znormalizowany WooProduct
```typescript
{
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price: string;
  sale_price: string;
  images: Array<{ src: string; alt: string }>;
  stock_status: string;
  attributes: Array<any>;
  categories: Array<{ id: number; name: string; slug: string }>;
  average_rating: number;
  rating_count: number;
  related_ids: number[];
  cross_sell_ids: number[];
  sku: string | null;
  on_sale: boolean;
  description: string | null;
  short_description: string | null;
  featured: boolean;
}
```

## Walidacja Produktów

Produkt jest uznawany za ważny, jeśli:
- `p.id` istnieje
- `p.price` istnieje i nie jest pustym stringiem
- `p.name` istnieje, nie jest pustym stringiem i nie jest równy "Produkt"

## Timeouty

- **Batch fetch (WooCommerce API)**: Brak timeoutu (używa domyślnego fetch)
- **Store API batch**: 5s timeout
- **Indywidualne wywołania**: 5s (pierwsza próba), 8s (retry)
- **Kategoria (Store API)**: 5s timeout
- **Najnowsze produkty (Store API)**: 5s timeout

## Cache

- **WooCommerce API**: `cache: 'no-store'` (zawsze świeże dane)
- **Store API**: `cache: 'no-store'` (zawsze świeże dane)
- **Session Storage**: Cache produktów po slug (tylko dla głównego produktu)

## Obsługa Błędów

1. **502/503/504**: Automatyczny fallback do Store API
2. **404**: Zwraca pustą tablicę (produkt nie istnieje)
3. **Timeout**: Przechodzi do następnego fallbacku
4. **Inne błędy**: Loguje błąd i kontynuuje z następnym fallbackiem

## Przykładowy Flow

```
1. Sprawdź crossSellIds/relatedIds
   ├─ Batch fetch przez WooCommerce API
   │  ├─ Sukces → użyj produktów
   │  └─ 502/503/504 → Store API batch
   │     ├─ Sukces → normalizuj i użyj
   │     └─ Błąd → indywidualne wywołania
   │        └─ Użyj wszystkich dostępnych produktów

2. Jeśli < limit produktów, sprawdź kategorię
   ├─ WooCommerce API z category={categoryId}
   │  ├─ Sukces → użyj produktów
   │  └─ 502/503/504 → Store API
   │     ├─ Pobierz wszystkie produkty
   │     ├─ Filtruj po categoryId po stronie klienta
   │     └─ Normalizuj i użyj

3. Jeśli < limit produktów, pobierz najnowsze
   ├─ WooCommerce API
   │  ├─ Sukces → użyj produktów
   │  └─ 502/503/504 → Store API
   │     └─ Normalizuj i użyj

4. Usuń duplikaty i zwróć max {limit} produktów
```

## Pliki

- **Komponent**: `apps/web/src/components/ui/similar-products.tsx`
- **Service**: `apps/web/src/services/woocommerce-optimized.ts`
- **API Route**: `apps/web/src/app/api/woocommerce/route.ts`

## Data Aktualizacji

2025-11-06 - Dodano fallback do Store API dla wszystkich poziomów fetchowania

