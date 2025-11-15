# Performance Best Practices

> Przewodnik po najlepszych praktykach wydajnościowych dla King™ Headless WooCommerce

---

## 1. Backend API Optimization

### HTTP Connection Pooling

**Zawsze używaj `httpAgent.fetch()` zamiast natywnego `fetch()`:**

```typescript
import { httpAgent } from '@/utils/http-agent';

// ✅ DOBRZE - używa connection pooling
const response = await httpAgent.fetch(url, options);

// ❌ ŹLE - nie używa connection pooling
const response = await fetch(url, options);
```

**Korzyści:**
- Connection reuse (keep-alive)
- Maksymalnie 100 równoległych połączeń (maxSockets: 100)
- Automatyczna kompresja (gzip, br, deflate)

### Request Deduplication

**Używaj `requestDeduplicator` dla identycznych requestów:**

```typescript
import { requestDeduplicator } from '@/utils/request-deduplicator';

// ✅ DOBRZE - deduplikuje identyczne requesty w oknie 200ms
const response = await requestDeduplicator.deduplicate(
  url,
  options,
  async (url, options) => {
    return await httpAgent.fetch(url, options);
  }
);
```

**Korzyści:**
- Eliminuje redundantne requesty w oknie 200ms
- Redis support dla distributed systems
- Automatyczne metryki

### Cache Strategy

**Zawsze używaj cache z odpowiednimi tagami:**

```typescript
import { cache } from '@/lib/cache';

// ✅ DOBRZE - cache z tagami dla invalidation
await cache.set(
  cacheKey,
  responseBody,
  ttlMs,
  headers,
  ['products', 'shop'] // Tagi dla invalidation
);

// Sprawdzaj cache przed fetch
const cached = await cache.get(cacheKey);
if (cached) {
  return NextResponse.json(JSON.parse(cached.body), {
    headers: { ...cached.headers, ETag: cached.etag },
  });
}
```

**TTL Guidelines:**
- **Static data** (categories, attributes): 1h (3600s)
- **Dynamic data** (products): 5min (300s)
- **User-specific** (orders, customers): 1min (60s)

### Adaptive Timeouts

**Używaj `getTimeoutConfig()` dla adaptacyjnych timeoutów:**

```typescript
import { getTimeoutConfig, createTimeoutSignal } from '@/utils/timeout-config';

const timeoutConfig = getTimeoutConfig(endpoint, 'GET');
const signal = createTimeoutSignal(timeoutConfig.timeout);

const response = await httpAgent.fetch(url, {
  ...options,
  signal,
});
```

**Korzyści:**
- Automatyczne dostosowanie na podstawie metryk p95
- Różne timeouty dla różnych endpointów
- Exponential backoff dla retries

### Circuit Breaker

**Zawsze używaj circuit breaker dla zewnętrznych API:**

```typescript
import { withCircuitBreaker } from '@/utils/circuit-breaker';

const response = await withCircuitBreaker('wordpress', async () => {
  return await httpAgent.fetch(url, options);
});
```

**Korzyści:**
- Ochrona przed cascading failures
- Automatyczne recovery
- Metryki failure rate

---

## 2. Frontend Optimization

### Bundle Size

**Optymalizacje w `next.config.ts`:**
- `maxSize: 200KB` dla chunków
- Separate cacheGroups dla framer-motion, radix-ui
- `optimizePackageImports` dla tree-shaking

### Lazy Loading

**Używaj dynamic imports dla heavy components:**

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./heavy-component'), {
  ssr: false,
  loading: () => <Skeleton />,
});
```

### Image Optimization

**Zawsze używaj `next/image` z odpowiednimi atrybutami:**

```typescript
import Image from 'next/image';

<Image
  src={imageUrl}
  alt={product.name}
  width={300}
  height={300}
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
  loading={priority ? 'eager' : 'lazy'}
  priority={priority} // true dla LCP images
  quality={85}
/>
```

**Guidelines:**
- `priority={true}` dla pierwszych 4 produktów (above-the-fold)
- `sizes` attribute dla responsive images
- `quality={85}` dla balansu jakość/rozmiar

---

## 3. Cache Invalidation

### Tag-based Invalidation

**Używaj tagów przy cache.set():**

```typescript
await cache.set(key, body, ttlMs, headers, [
  'products',
  'shop',
  `product:${productId}`, // Specific product tag
]);
```

**Invalidacja przez webhook:**

```bash
curl -X POST http://localhost:3000/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"tags": ["products", "product:123"]}'
```

**Automatyczna invalidation:**
- Po aktualizacji produktu: `['products', 'product:123']`
- Po aktualizacji kategorii: `['categories', 'category:5']`
- Po aktualizacji zamówienia: `['orders', 'customer:1']`

---

## 4. Monitoring & Metrics

### Performance Dashboard

**Endpoint:** `GET /api/performance/dashboard`

**Zwraca:**
- Cache hit rate (hits, misses, hitRate)
- HTTP agent stats (maxSockets, activeDispatchers)
- Request deduplication stats
- Circuit breaker states
- API response times (p50, p95, p99 per endpoint)

### Circuit Breaker Dashboard

**Endpoint:** `GET /api/health/circuit-breakers`

**Zwraca:**
- Health status (healthy/warning/degraded)
- Circuit breaker states (CLOSED/OPEN/HALF_OPEN)
- Failure rates per service
- Total requests, success/failure counts

---

## 5. WordPress API Queries

### _fields Parameter

**Zawsze używaj `_fields` dla mniejszego payload:**

```typescript
// ✅ DOBRZE - tylko potrzebne pola
url.searchParams.set(
  '_fields',
  'id,name,slug,price,regular_price,sale_price,images,stock_status'
);

// ❌ ŹLE - pobiera wszystkie pola (duży payload)
// Brak _fields parameter
```

### per_page Limits

**Ograniczaj `per_page` dla lepszej wydajności:**

```typescript
// ✅ DOBRZE - rozsądne limity
per_page: 24 // Products
per_page: 20 // Orders
per_page: 100 // Categories (static data)

// ❌ ŹLE - zbyt duże limity
per_page: 1000 // Zbyt duży payload
```

### orderby/order

**Dodawaj domyślne sortowanie:**

```typescript
// ✅ DOBRZE - domyślne sortowanie dla lepszej wydajności
if (!searchParams.has('orderby')) {
  searchParams.set('orderby', 'date');
}
if (!searchParams.has('order')) {
  searchParams.set('order', 'desc');
}
```

---

## 6. Performance Testing

### Autocannon

```bash
# Warm scenario (z cache)
node apps/web/scripts/perf-autocannon.mjs --warm

# Cold scenario (bez cache)
node apps/web/scripts/perf-autocannon.mjs --cold

# Wszystkie scenariusze
node apps/web/scripts/perf-autocannon.mjs --all
```

**Wyniki zapisywane w:** `performance-results-autocannon.json`

### k6

```bash
# Podstawowy test
k6 run scripts/perf-k6.js

# Z custom parametrami
k6 run scripts/perf-k6.js --vus 20 --duration 30s

# Z custom BASE_URL
BASE_URL=https://api.example.com k6 run scripts/perf-k6.js
```

**Wyniki zapisywane w:** `performance-results-k6.json`

---

## 7. Checklist przed deployem

- [ ] Wszystkie endpointy używają `httpAgent.fetch()`
- [ ] Cache z odpowiednimi tagami
- [ ] TTL dostosowane do typu danych
- [ ] `_fields` parameter dla wszystkich WordPress API queries
- [ ] `per_page` limits ustawione
- [ ] Circuit breaker dla zewnętrznych API
- [ ] Adaptive timeouts skonfigurowane
- [ ] Performance tests uruchomione i wyniki zapisane
- [ ] Bundle size sprawdzony (`npm run build`)
- [ ] Lazy loading dla heavy components
- [ ] Image optimization (priority, sizes, loading)

---

## 8. Troubleshooting

### Wysokie p95/p99

1. Sprawdź cache hit rate: `GET /api/performance/dashboard`
2. Sprawdź circuit breaker states: `GET /api/health/circuit-breakers`
3. Sprawdź czy używane są `_fields` i `per_page` limits
4. Sprawdź czy cache TTL jest odpowiednie

### Niski cache hit rate

1. Sprawdź czy cache.set() jest wywoływane po fetch
2. Sprawdź czy TTL nie jest zbyt krótkie
3. Sprawdź czy cache keys są unikalne
4. Sprawdź Redis connection (jeśli używany)

### Circuit breaker OPEN

1. Sprawdź failure rate: `GET /api/health/circuit-breakers`
2. Sprawdź czy zewnętrzny serwis działa
3. Poczekaj na recovery timeout (automatyczne)
4. Manual reset (jeśli potrzebny): `circuitBreakers[service].reset()`

---

**Ostatnia aktualizacja:** 2025-01-27  
**Wersja:** 1.0.0

