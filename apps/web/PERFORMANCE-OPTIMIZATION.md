# 🚀 Optymalizacja wydajności strony Sklep

## Problem
Strona `/sklep` wczytuje się **3 sekundy** przy każdym deploy live - zbyt wolno dla e-commerce.

## Wykonane optymalizacje

### 1. ✅ Równoległe prefetche zamiast sekwencyjnych
**Przed**: Sekwencyjne `await` dla każdego prefetchu (shop → categories → attributes)
**Po**: Równoległe `Promise.allSettled()` - wszystkie prefetche jednocześnie

**Oszczędność czasu**: ~2s → ~0.5-1s (zależnie od sieci)

```typescript
// PRZED (sekwencyjne - wolno)
await qc.prefetchQuery({...shop...});
await qc.prefetchQuery({...categories...});
await qc.prefetchQuery({...attributes...});

// PO (równoległe - szybko)
Promise.allSettled([
  qc.prefetchQuery({...shop...}),
  qc.prefetchQuery({...categories...}),
  qc.prefetchQuery({...attributes...})
]);
```

### 2. ✅ Redukcja timeoutów
**Przed**: 10s timeout dla wszystkich fetchów
**Po**: 5s dla shop data, 3s dla categories/metadata

**Oszczędność**: Szybsze fallbacki przy wolnych połączeniach

### 3. ✅ Optymalizacja generateMetadata
**Przed**: Zawsze fetch kategorii podczas SSR
**Po**: Fetch tylko jeśli `category` param istnieje, timeout 3s zamiast 5s

**Oszczędność**: ~0.5s dla głównej strony sklep (brak niepotrzebnego fetcha)

### 4. ✅ Agresywniejsze cache headers
**Przed**: `max-age=60, s-maxage=120`
**Po**: `max-age=60, s-maxage=180, stale-while-revalidate=300`

**Oszczędność**: Dłuższy cache na CDN = mniej requestów do origin

### 5. ✅ Next.js cache dla WordPress API
**Przed**: `cache: 'no-store'` - zawsze fresh fetch
**Po**: `next: { revalidate: 30 }` - cache przez Next.js z revalidate co 30s

**Oszczędność**: Mniej requestów do WordPress API, szybsze odpowiedzi

### 6. ✅ Redukcja liczby prefetchów
**Przed**: Zawsze prefetch: shop + categories + attributes + dynamic-filters
**Po**: Attributes tylko jeśli nie ma defaultCategory (bo duże)

**Oszczędność**: Mniej danych do pobrania przy pierwszym ładowaniu

## Metryki oczekiwane

### Przed optymalizacją:
- ⏱️ **TTFB**: ~2-3s
- ⏱️ **FCP**: ~3-4s
- ⏱️ **LCP**: ~4-5s
- 📦 **Bundle size**: 408 kB (strona sklep)

### Po optymalizacji (oczekiwane):
- ⏱️ **TTFB**: ~0.5-1s (ISR + cache)
- ⏱️ **FCP**: ~1-1.5s
- ⏱️ **LCP**: ~1.5-2s
- 📦 **Bundle size**: 408 kB (bez zmian - optymalizacja po stronie API)

## Dodatkowe rekomendacje na przyszłość

### 🎯 PRIORYTET 1: Krótkoterminowe (1-2 tygodnie, łatwe do wdrożenia)

#### 1. **CDN Cache dla Static Assets**
**Problem**: Static assets (CSS, JS, images) nie są cache'owane na CDN  
**Rozwiązanie**:
```bash
# Vercel - automatycznie włączone
# Cloudflare - dodaj Page Rules:
# - Cache Level: Cache Everything
# - Edge Cache TTL: 1 month
# - Browser Cache TTL: 1 year
```
**Oszczędność**: ~500ms na repeat visits

#### 2. **Preconnect dla WordPress API**
**Problem**: DNS lookup dla WordPress API podczas pierwszego requestu  
**Rozwiązanie**: Dodaj do `app/layout.tsx`:
```tsx
<link rel="preconnect" href="https://www.filler.pl" crossOrigin="anonymous" />
<link rel="dns-prefetch" href="https://www.filler.pl" />
```
**Oszczędność**: ~100-200ms na pierwszym requestcie

#### 3. **Image Format Optimization (WebP/AVIF)**
**Status**: ✅ Już używamy `next/image` z lazy loading  
**Dodatkowo**:
```tsx
// Upewnij się, że wszystkie obrazy mają priority tylko dla above-the-fold
<Image
  src={imageUrl}
  priority={index < 4} // Tylko pierwsze 4 produkty
  loading={index < 4 ? 'eager' : 'lazy'}
  format="webp" // Next.js automatycznie konwertuje
/>
```
**Oszczędność**: ~200-300ms na ładowaniu obrazów

#### 4. **Font Optimization**
**Problem**: Fonts ładowane synchronicznie  
**Rozwiązanie**: Dodaj do `app/layout.tsx`:
```tsx
<link
  rel="preload"
  href="/fonts/raleway.woff2"
  as="font"
  type="font/woff2"
  crossOrigin="anonymous"
/>
```
**Oszczędność**: ~100ms na FCP

#### 5. **React Query staleTime dla Shop Data**
**Status**: ✅ Już zaimplementowane (2 minuty)  
**Dodatkowo**: Zwiększ dla kategorii/atrybutów (rzadko się zmieniają):
```typescript
staleTime: 30 * 60_000, // 30 minut dla kategorii
gcTime: 60 * 60_000, // 1 godzina garbage collection
```

---

### 🎯 PRIORYTET 2: Średnioterminowe (1-2 miesiące, wymaga pracy)

#### 1. **GraphQL API Layer**
**Problem**: REST API wymaga wielu requestów (N+1 problem)  
**Rozwiązanie**: WordPress GraphQL plugin (WPGraphQL)
```typescript
// Przed (REST - wiele requestów):
GET /api/woocommerce?endpoint=shop
GET /api/woocommerce?endpoint=categories
GET /api/woocommerce?endpoint=attributes

// Po (GraphQL - jeden request):
POST /graphql
query {
  shop(page: 1) {
    products { id, name, price }
    categories { id, name, slug }
    attributes { name, terms }
  }
}
```
**Oszczędność**: ~1-1.5s (redukcja z 3+ requestów do 1)  
**Czas implementacji**: 2-3 tygodnie

#### 2. **Edge Functions dla Cache**
**Problem**: API route wykonuje się na Node.js (wolniejsze)  
**Rozwiązanie**: Przenieś `/api/woocommerce` na Edge Functions
```typescript
// apps/web/src/app/api/woocommerce/route.ts
export const runtime = 'edge'; // Zmiana z 'nodejs'
// UWAGA: Edge nie wspiera niektórych Node.js APIs (Buffer, require)
```
**Oszczędność**: ~200-300ms na każdym requestcie  
**Ograniczenia**: Edge Functions mają limity (10s timeout, brak niektórych Node.js APIs)

#### 3. **WordPress Query Optimization**
**Problem**: WordPress queries mogą być nieoptymalne  
**Rozwiązanie**:
- **Database indexes**: Dodaj indeksy dla `wp_posts.post_date`, `wp_postmeta.meta_key`
- **Query caching**: Włącz Redis object cache w WordPress
- **Eager loading**: Użyj `include` zamiast lazy loading dla związanych danych

```php
// WordPress mu-plugin optimization
// Cache shop queries w Redis
add_action('init', function() {
  if (!wp_cache_get('shop_products')) {
    // Fetch and cache
  }
});
```

**Oszczędność**: ~500ms-1s na WordPress queries  
**Czas implementacji**: 1 tydzień

#### 4. **API Response Compression**
**Problem**: Duże JSON responses (shop data może być >100KB)  
**Rozwiązanie**: Next.js automatycznie kompresuje, ale sprawdź:
```typescript
// apps/web/next.config.ts
compress: true, // ✅ Już włączone w produkcji
```

**Dodatkowo**: Rozważ paginację lub zmniejszenie `per_page` dla initial load:
```typescript
per_page: 12 → 8 // Mniejsze initial payload
```

---

### 🎯 PRIORYTET 3: Długoterminowe (3-6 miesięcy, większa refaktoryzacja)

#### 1. **Partial Prerendering (PPR)**
**Problem**: Cała strona renderowana na serwerze  
**Rozwiązanie**: Next.js 15 PPR (experimental)
```typescript
// apps/web/next.config.ts
experimental: {
  ppr: true, // Partial Prerendering
}

// apps/web/src/app/sklep/page.tsx
export const dynamic = 'force-dynamic'; // Tylko dynamiczne części
// Static shell + dynamic content
```
**Oszczędność**: ~500ms-1s na TTFB (tylko dynamic parts renderowane)  
**Status**: Wymaga Next.js 15 canary/stable

#### 2. **Service Worker + Cache API**
**Problem**: Powtarzające się requesty do API  
**Rozwiązanie**: Cache API responses w Service Worker
```typescript
// apps/web/public/sw.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/woocommerce')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open('api-cache-v1').then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
  }
});
```
**Oszczędność**: Instant load dla repeat visits (offline support bonus)  
**Czas implementacji**: 2 tygodnie

#### 3. **Streaming SSR**
**Problem**: Cała strona czeka na wszystkie dane  
**Rozwiązanie**: React Suspense boundaries dla streaming:
```tsx
// apps/web/src/app/sklep/page.tsx
<Suspense fallback={<ShopSkeleton />}>
  <ShopProducts />
</Suspense>
<Suspense fallback={<FiltersSkeleton />}>
  <ShopFilters /> {/* Lazy load - nie blokuje */}
</Suspense>
```
**Oszczędność**: ~1s na FCP (show content as it streams)

#### 4. **Database Read Replica**
**Problem**: Jeden WordPress database (bottleneck)  
**Rozwiązanie**: Read replica dla queries:
```php
// WordPress mu-plugin
define('DB_HOST', 'primary-db');
define('DB_HOST_READ', 'replica-db'); // Read-only queries
```
**Oszczędność**: ~300-500ms przy wysokim ruchu  
**Czas implementacji**: 1-2 tygodnie (infrastructure)

---

### 🎯 PRIORYTET 4: Zaawansowane (opcjonalne, długoterminowe)

#### 1. **Progressive Web App (PWA)**
- **Service Worker**: Offline support
- **App Shell**: Instant load dla repeat users
- **Push Notifications**: Re-engagement
**Oszczędność**: Instant load (~0ms perceived load time)

#### 2. **Edge Caching Strategy**
- **Vercel Edge Config**: Distributed cache
- **Redis on Edge**: Ultra-fast cache layer
- **Geographic distribution**: CDN + Edge Functions

#### 3. **Query Deduplication**
**Status**: ✅ React Query już to robi  
**Dodatkowo**: Implementacja na poziomie API:
```typescript
// apps/web/src/app/api/woocommerce/route.ts
const requestCache = new Map();
// Deduplicate identical requests within 100ms window
```

#### 4. **Prefetch Critical Resources**
```tsx
// app/layout.tsx
<link rel="prefetch" href="/api/woocommerce?endpoint=shop&page=1" as="fetch" />
```

---

## Priorytetyzacja - Plan działania

### ✅ **Wykonane (Priority 0)**:
- [x] Równoległe prefetche
- [x] Redukcja timeoutów
- [x] Cache headers
- [x] Next.js cache dla API

### 🎯 **Następne kroki (Priority 1 - 1-2 tygodnie)**:
1. **Preconnect dla WordPress API** (5 min) - najłatwiejsze
2. **Font preload** (10 min) - quick win
3. **Image priority optimization** (30 min) - sprawdź wszystkie komponenty
4. **CDN verification** (15 min) - upewnij się, że działa

### 📊 **Oczekiwane rezultaty po Priority 1**:
- **TTFB**: 0.5-1s → **0.3-0.7s**
- **FCP**: 1-1.5s → **0.8-1.2s**
- **LCP**: 1.5-2s → **1.2-1.6s**

### 🚀 **Po Priority 1 → Priority 2**:
- GraphQL API (największy impact)
- Edge Functions
- WordPress query optimization

---

## Monitoring i mierzenie sukcesu

### Kluczowe metryki do śledzenia:
1. **TTFB** (Time to First Byte): < 500ms target
2. **FCP** (First Contentful Paint): < 1.2s target
3. **LCP** (Largest Contentful Paint): < 1.5s target
4. **CLS** (Cumulative Layout Shift): < 0.1 target
5. **API Response Time**: < 300ms dla `/api/woocommerce`

### Narzędzia:
- **Vercel Analytics**: Real User Monitoring (RUM)
- **Lighthouse CI**: Automatyczne testy przy każdym deploy
- **Sentry Performance**: Trace slow API calls

### Alerty:
```yaml
# .github/workflows/lighthouse.yml
- TTFB > 1s → Alert
- LCP > 2.5s → Alert
- API 95th percentile > 500ms → Alert
```

## Testowanie

### Uruchom Lighthouse:
```bash
# 1. Uruchom dev server
npm run dev

# 2. W przeglądarce (Chrome DevTools)
# - Otwórz DevTools (F12)
# - Przejdź do zakładki "Lighthouse"
# - Wybierz "Performance" + "Desktop" lub "Mobile"
# - Uruchom test dla URL: http://localhost:3000/sklep

# 3. Lub użyj CLI:
npx lighthouse http://localhost:3000/sklep --view
```

### Oczekiwane wyniki Lighthouse:
- **Performance**: 80-90+ (było ~60-70)
- **FCP**: < 1.8s
- **LCP**: < 2.5s
- **TTI**: < 3.8s
- **Speed Index**: < 3.4s

## Monitoring produkcji

### Vercel Analytics:
- Sprawdź Vercel Analytics dla rzeczywistych metryk użytkowników
- Monitoruj TTFB, FCP, LCP w czasie rzeczywistym

### Custom metrics:
```javascript
// Dodaj do app/layout.tsx lub PerformanceTracker
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('TTFB:', perfData.responseStart - perfData.requestStart);
    console.log('FCP:', performance.getEntriesByName('first-contentful-paint')[0]?.startTime);
  });
}
```

## Status
✅ **Optymalizacje zaimplementowane**
⏳ **Oczekiwanie na testy Lighthouse w produkcji**

---
**Data**: 2024-11-01
**Autor**: Senior Dev Optimization

