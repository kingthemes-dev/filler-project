# Plan audytu błędów

**Data utworzenia**: 2025-01-XX  
**Status**: ⏳ PENDING  
**Priorytet**: HIGH

---

## Podsumowanie

Plan kompleksowego audytu błędów TypeScript, runtime errors, i potencjalnych problemów produkcyjnych.

---

## 1. Błędy TypeScript (Krytyczne)

### 1.1 Analytics API (`src/app/api/analytics/route.ts`)

**Błędy**:
- `Cannot find name 'AnalyticsRequest'` (linia 53, 68, 99, 132, 183)
- `Cannot find name 'AnalyticsEvent'` (linia 68, 99, 132, 183)

**Przyczyna**: Brakujące importy lub definicje typów

**Fix**:
```typescript
// Dodaj importy lub zdefiniuj typy
import { AnalyticsRequest, AnalyticsEvent } from '@/lib/schemas/analytics';
// lub
import type { AnalyticsRequest, AnalyticsEvent } from '@/types/analytics';
```

**Priorytet**: P0 (blokuje kompilację)

---

### 1.2 Favorites API (`src/app/api/favorites/route.ts`)

**Błąd**: `Argument of type '{ name: string; id: number; ... }' is not assignable to parameter of type 'WooProduct'` (linia 71)

**Przyczyna**: Niekompletny obiekt produktu przy dodawaniu do favorites

**Fix**:
```typescript
// Użyj Partial<WooProduct> lub utwórz minimalny typ
const favoriteProduct: Partial<WooProduct> = {
  id: product.id,
  name: product.name,
  // ... tylko potrzebne pola
};
```

**Priorytet**: P1 (może powodować runtime errors)

---

### 1.3 Newsletter API (`src/app/api/newsletter/subscribe/route.ts`)

**Błąd**: `Argument of type 'string | undefined' is not assignable to parameter of type 'string'` (linia 101)

**Przyczyna**: Potencjalnie `undefined` wartość przekazywana do funkcji wymagającej `string`

**Fix**:
```typescript
// Dodaj walidację lub użyj optional chaining
const value = someValue || '';
// lub
if (!value) {
  return NextResponse.json({ error: 'Value is required' }, { status: 400 });
}
```

**Priorytet**: P1 (może powodować runtime errors)

---

### 1.4 WooCommerce API (`src/app/api/woocommerce/route.ts`)

**Błędy**:
- `Property 'startTransaction' does not exist on type 'typeof Sentry'` (linia 2110)
- `Cannot find name 'requestId'` (linia 2974)

**Przyczyna**: 
- Sentry API zmienione w nowszej wersji (użyj `Sentry.startSpan` zamiast `startTransaction`)
- Brakująca zmienna `requestId` w scope

**Fix**:
```typescript
// Sentry - użyj nowego API
import * as Sentry from '@sentry/nextjs';

Sentry.startSpan({
  name: `API ${req.method} ${req.nextUrl.pathname}`,
  op: 'http.server',
}, (span) => {
  // kod
});

// requestId - upewnij się że jest zdefiniowany
const requestId = getRequestId(req);
```

**Priorytet**: P0 (blokuje kompilację)

---

### 1.5 Product Client (`src/app/produkt/[slug]/product-client.tsx`)

**Błędy**: `'product' is possibly 'null' or 'undefined'` (wiele linii: 263, 273, 275, 276, 291, 293, 302, 322, 326)

**Przyczyna**: Brak null checks przed użyciem `product`

**Fix**:
```typescript
// Dodaj optional chaining lub guard clauses
if (!product) {
  return <div>Product not found</div>;
}

// lub
product?.name
product?.price
```

**Priorytet**: P1 (może powodować runtime errors)

---

### 1.6 WooCommerce Optimized (`src/services/woocommerce-optimized.ts`)

**Błąd**: Type error w normalizacji Store API (linia 260)

**Przyczyna**: Prawdopodobnie cache lintera - funkcja `normalizeStoreApiProduct` jest już zaimplementowana

**Fix**: Restart TypeScript server lub sprawdź czy wszystkie miejsca używają funkcji

**Priorytet**: P2 (prawdopodobnie false positive)

---

## 2. Runtime Errors (Potencjalne)

### 2.1 Error Handling

**Sprawdź**:
- [ ] Wszystkie `try-catch` bloki
- [ ] Error boundaries w React
- [ ] Graceful degradation przy błędach API
- [ ] Logging błędów (Sentry integration)

**Narzędzia**:
- Sentry error tracking
- Console errors w production
- Error logs w server logs

---

### 2.2 Null/Undefined Checks

**Sprawdź**:
- [ ] Optional chaining (`?.`) gdzie potrzebne
- [ ] Nullish coalescing (`??`) dla defaultów
- [ ] Guard clauses przed użyciem obiektów
- [ ] Type guards dla bezpiecznych type assertions

---

### 2.3 Async/Await Errors

**Sprawdź**:
- [ ] Wszystkie `Promise.all` i `Promise.allSettled`
- [ ] Timeout handling dla fetch requests
- [ ] AbortController dla cancelowanych requestów
- [ ] Error propagation w async chains

---

## 3. Security Issues

### 3.1 Input Validation

**Sprawdź**:
- [ ] Wszystkie endpointy mają Zod validation
- [ ] XSS protection (sanitization)
- [ ] SQL injection protection (parametryzowane queries)
- [ ] CSRF protection dla mutacji

---

### 3.2 Authentication & Authorization

**Sprawdź**:
- [ ] JWT validation
- [ ] Rate limiting działa poprawnie
- [ ] Permission checks dla protected resources
- [ ] Session management

---

## 4. Performance Issues

### 4.1 Memory Leaks

**Sprawdź**:
- [ ] Event listeners cleanup
- [ ] Timers/intervals cleanup
- [ ] Cache size limits
- [ ] Circular references

---

### 4.2 Slow Queries

**Sprawdź**:
- [ ] N+1 queries (już zoptymalizowane ✅)
- [ ] Overfetch (już zoptymalizowane ✅)
- [ ] Missing indexes w bazie
- [ ] Slow API responses

---

## 5. Checklist audytu

### TypeScript Errors
- [ ] Napraw wszystkie błędy TypeScript (10+ błędów)
- [ ] Uruchom `npm run type-check` - powinno być 0 błędów
- [ ] Sprawdź `strict: true` w tsconfig.json

### Runtime Errors
- [ ] Test wszystkich endpointów API
- [ ] Test error scenarios (400, 500, timeout)
- [ ] Test edge cases (null, undefined, empty arrays)
- [ ] Sprawdź Sentry dla production errors

### Security
- [ ] Audit wszystkich input validations
- [ ] Test CSRF protection
- [ ] Test rate limiting
- [ ] Security headers audit

### Performance
- [ ] Memory leak detection
- [ ] Slow query detection
- [ ] Cache effectiveness
- [ ] Bundle size optimization

---

## 6. Narzędzia do audytu

### TypeScript
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Test coverage
npm run test:coverage
```

### Runtime
```bash
# Production build test
npm run build

# Dev server z error logging
npm run dev
```

### Security
```bash
# Security audit
npm audit

# Dependency check
npm outdated
```

### Performance
```bash
# Lighthouse CI
npm run lighthouse

# Bundle analyzer
npm run analyze
```

---

## 7. Priorytety naprawy

### P0 (Krytyczne - blokują kompilację)
1. ✅ Analytics API - brakujące typy
2. ✅ WooCommerce API - Sentry API i requestId

### P1 (Wysokie - mogą powodować runtime errors)
3. ✅ Favorites API - typ WooProduct
4. ✅ Newsletter API - string | undefined
5. ✅ Product Client - null checks

### P2 (Średnie - false positives lub mniej krytyczne)
6. ⏳ WooCommerce Optimized - cache lintera

---

## 8. Rekomendacje

1. **Napraw wszystkie błędy TypeScript przed audytem runtime**
   - Ułatwi to identyfikację prawdziwych runtime errors
   - Zapobiegnie maskowaniu błędów przez TypeScript

2. **Użyj Sentry do monitorowania production errors**
   - Automatyczne wykrywanie błędów
   - Stack traces i context

3. **Dodaj więcej testów**
   - Edge cases
   - Error scenarios
   - Integration tests

4. **Code review checklist**
   - Null/undefined checks
   - Error handling
   - Type safety
   - Security

---

**Data utworzenia**: 2025-01-XX  
**Status**: ⏳ PENDING  
**Następne kroki**: Napraw błędy P0 i P1, następnie przejdź do runtime audit

