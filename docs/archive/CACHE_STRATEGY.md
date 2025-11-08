# Cache Strategy - Dokumentacja

**Data utworzenia**: 2025-11-06  
**Status**: W trakcie implementacji

## Przegląd

System cache wykorzystuje wielopoziomową strategię:
1. **Next.js ISR** (Incremental Static Regeneration) - dla stron i API routes
2. **Redis** (opcjonalnie) - dla cache API responses
3. **In-memory cache** - fallback gdy Redis niedostępny
4. **ETag/If-None-Match** - conditional requests
5. **CDN Cache** - przez middleware

## Komponenty Cache

### 1. CacheManager (`lib/cache.ts`)

**Funkcje**:
- Redis fallback do in-memory
- ETag generation
- TTL management
- Cache key generation

**TTL Defaults**:
- Default: 60s (1 minuta)
- Production: 600s (10 minut) dla home-feed
- Development: 300s (5 minut)

**Redis Configuration**:
- Lazy connection
- Max retries: 3
- Connect timeout: 5s
- Command timeout: 3s

### 2. ISR (Incremental Static Regeneration)

**Użycie**:
- `next: { revalidate: 300, tags: ['home-feed'] }` - w fetch calls
- `revalidateTag('home-feed')` - w webhook handlers
- `revalidatePath('/')` - w webhook handlers

**Tags**:
- `home-feed` - dla `/api/home-feed`
- `home-feed-promocje` - dla promocji
- `products` - dla produktów (używane w webhooks)
- `categories` - dla kategorii
- `orders` - dla zamówień

### 3. ETag Headers

**Implementacja**:
- Generowanie: `crypto.createHash('md5').update(content).digest('hex').slice(0, 16)`
- Format: `"<hash>"` (z cudzysłowami)
- Conditional GET: `If-None-Match` header → 304 Not Modified

**Endpointy z ETag**:
- ✅ `/api/home-feed` - ETag + conditional GET
- ✅ `/api/woocommerce` - ETag dla wszystkich endpointów
- ⏳ Inne endpointy - do dodania

### 4. Cache Headers (Cache-Control)

**Strategie** (z `middleware/cdn-cache.ts`):

| Typ | max-age | s-maxage | stale-while-revalidate | private |
|-----|---------|----------|------------------------|---------|
| Static assets | 31536000 (1 rok) | 31536000 | 86400 (1 dzień) | false |
| API responses | 300 (5 min) | 300 | 60 (1 min) | false |
| HTML pages | 0 | 300 (5 min) | 60 (1 min) | false |
| User-specific | 0 | 0 | 0 | true |

**Endpointy**:
- `/api/home-feed`: `public, s-maxage=600, stale-while-revalidate=86400` (production)
- `/api/woocommerce`: `public, max-age=60, s-maxage=180, stale-while-revalidate=300`
- `/api/woocommerce?endpoint=orders`: `private, max-age=120` (user-specific)

## Cache Invalidation

### 1. ISR Revalidation

**Endpoint**: `/api/revalidate` (POST)

**Authorization**: `Bearer ${REVALIDATE_SECRET}`

**Payload**:
```json
{
  "paths": ["/", "/produkt/123"],
  "tags": ["home-feed", "products"]
}
```

**Użycie w webhooks**:
- Product created/updated/deleted → `revalidateTag('products')`
- Order created/updated → `revalidatePath('/moje-zamowienia')`
- Category updated → `revalidateTag('categories')`

### 2. Cache Purge

**Endpoint**: `/api/cache/purge` (POST)

**Funkcje**:
- `cache.purge(pattern)` - usuwa cache po wzorcu
- `cache.delete(key)` - usuwa konkretny klucz
- `cache.clear()` - czyści cały cache

### 3. Webhook Handlers

**Plik**: `services/webhook-handler.ts`

**Akcje**:
- Product webhook → `hposCache.invalidateByTag('products')`
- Order webhook → `cacheInvalidation.orders(customerId)`
- Category webhook → `cacheInvalidation.categories()`

## Endpointy - Cache Status

### ✅ Zaimplementowane

| Endpoint | ISR | ETag | Redis | TTL | Tags |
|----------|-----|------|-------|-----|------|
| `/api/home-feed` | ✅ | ✅ | ✅ | 600s | `home-feed` |
| `/api/woocommerce?endpoint=products` | ✅ | ✅ | ✅ | 300s | `products`, `category-{id}` |
| `/api/woocommerce?endpoint=products/{id}` | ✅ | ✅ | ✅ | 300s | `products` |
| `/api/woocommerce?endpoint=products/categories` | ✅ | ❌ | ✅ | 1800s | `categories` |
| `/api/woocommerce?endpoint=products/attributes` | ✅ | ❌ | ✅ | 1800s | `attributes` |
| `/api/woocommerce?endpoint=orders` | ❌ | ✅ | ❌ | 120s (in-memory) | - |
| `/api/woocommerce?endpoint=shop` | ✅ | ❌ | ❌ | 30s (ISR) | - |

### ⏳ Do zaimplementowania

| Endpoint | ISR | ETag | Redis | TTL | Tags |
|----------|-----|------|-------|-----|------|
| `/api/woocommerce?endpoint=products/categories` | ✅ | ⏳ | ✅ | 1800s | `categories` (ETag do dodania) |
| `/api/woocommerce?endpoint=products/attributes` | ✅ | ⏳ | ✅ | 1800s | `attributes` (ETag do dodania) |
| `/api/reviews` | ❌ | ❌ | ❌ | 60s | - |

## Cache Keys

**Format**: `cache:${method}:${md5(url)}`

**Przykłady**:
- `cache:GET:abc123def456...` - dla `/api/home-feed`
- `cache:GET:xyz789ghi012...` - dla `/api/woocommerce?endpoint=products`

**Redis Keys**:
- Format: `cache:GET:<hash>`
- TTL: zależny od endpointu (60s-600s)

## Best Practices

### 1. ISR Tags

Używaj tagów dla grup powiązanych danych:
```typescript
fetch(url, {
  next: { 
    revalidate: 300,
    tags: ['products', 'category-123'] 
  }
});
```

### 2. ETag dla Conditional GET

Zawsze generuj ETag i sprawdzaj `If-None-Match`:
```typescript
const etag = cache.generateETag(body);
const ifNoneMatch = request.headers.get('if-none-match');
if (ifNoneMatch === etag) {
  return new NextResponse(null, { status: 304, headers: { ETag: etag } });
}
```

### 3. Cache Invalidation

Invaliduj cache przy zmianach danych:
```typescript
// W webhook handler
await revalidateTag('products');
await cache.purge('products');
```

### 4. TTL Strategy

- **Static data** (categories, attributes): 30 min - 1 godzina
- **Product lists**: 5-10 minut
- **Single products**: 1-5 minut
- **User-specific** (orders, cart): 2 min (private cache)
- **Home feed**: 10 minut (production), 5 minut (development)

## Monitoring

**Metryki do śledzenia**:
- Cache hit rate (Redis vs in-memory)
- ETag hit rate (304 responses)
- Cache invalidation frequency
- Average TTL per endpoint
- Redis connection status

**Logi**:
- `X-Cache-Status`: `HIT`, `MISS`, `BYPASS`, `DEDUP`
- `X-Cache`: `HIT`, `MISS`, `MISS-FALLBACK`
- `ETag`: hash wartości

## Pliki

- **Cache Manager**: `apps/web/src/lib/cache.ts`
- **Cache Optimized**: `apps/web/src/lib/cache-optimized.ts`
- **Redis Client**: `apps/web/src/lib/redis.ts`
- **CDN Cache**: `apps/web/src/middleware/cdn-cache.ts`
- **Revalidation**: `apps/web/src/app/api/revalidate/route.ts`
- **Webhook Handler**: `apps/web/src/services/webhook-handler.ts`

## Data Aktualizacji

2025-11-06 - Utworzona dokumentacja cache strategy

