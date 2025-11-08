# Error Handling - Dokumentacja

**Data utworzenia**: 2025-11-06  
**Status**: W trakcie implementacji

## Przegląd

Ujednolicony system obsługi błędów zapewnia:
- **Typowane błędy** - klasy błędów dla różnych scenariuszy
- **Spójne formaty odpowiedzi** - jednolity format błędów w całej aplikacji
- **Retry logic** - automatyczne ponawianie z exponential backoff
- **Error tracking** - integracja z loggerem i monitoringiem

## Typy Błędów

### 1. ValidationError (400)
Błędy walidacji danych wejściowych.

```typescript
throw new ValidationError('Invalid email format', { field: 'email', value: 'invalid' });
```

### 2. AuthenticationError (401)
Błędy uwierzytelniania.

```typescript
throw new AuthenticationError('Invalid credentials');
```

### 3. AuthorizationError (403)
Błędy autoryzacji (brak uprawnień).

```typescript
throw new AuthorizationError('Insufficient permissions', { required: 'admin' });
```

### 4. NotFoundError (404)
Zasób nie został znaleziony.

```typescript
throw new NotFoundError('Product not found', { productId: 123 });
```

### 5. RateLimitError (429)
Przekroczony limit żądań.

```typescript
throw new RateLimitError('Too many requests', 60); // retry after 60s
```

### 6. ExternalApiError (502/503/504)
Błędy zewnętrznych API (WooCommerce, WordPress).

```typescript
throw new ExternalApiError('WooCommerce API unavailable', 502, { endpoint: 'products' }, true);
```

### 7. TimeoutError (504)
Timeout żądania.

```typescript
throw new TimeoutError('Request timeout', { timeout: 5000 });
```

### 8. CircuitBreakerError (503)
Circuit breaker otwarty (serwis niedostępny).

```typescript
throw new CircuitBreakerError('Service temporarily unavailable');
```

### 9. InternalError (500)
Wewnętrzne błędy serwera.

```typescript
throw new InternalError('Database connection failed', { error: '...' });
```

## Format Odpowiedzi Błędów

Wszystkie błędy zwracają spójny format:

```json
{
  "error": {
    "message": "Error message",
    "type": "EXTERNAL_API_ERROR",
    "code": "EXTERNAL_API_ERROR",
    "statusCode": 502,
    "severity": "high",
    "retryable": true,
    "timestamp": "2025-11-06T10:00:00.000Z",
    "details": {
      "endpoint": "products",
      "attempts": 3
    }
  }
}
```

## Headers

Błędy zwracają dodatkowe headers:

- `X-Error-Type`: Typ błędu (np. `EXTERNAL_API_ERROR`)
- `X-Error-Code`: Kod błędu (np. `EXTERNAL_API_ERROR`)
- `X-Retryable`: `true` jeśli błąd można ponowić
- `Retry-After`: Sekundy do ponowienia (dla RateLimitError)

## Użycie

### Podstawowe użycie

```typescript
import { createErrorResponse, NotFoundError, ValidationError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      throw new ValidationError('ID is required', { field: 'id' });
    }
    
    const product = await getProduct(id);
    if (!product) {
      throw new NotFoundError('Product not found', { productId: id });
    }
    
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return createErrorResponse(error, { endpoint: 'products', method: 'GET' });
  }
}
```

### Z Error Handler Wrapper

```typescript
import { withErrorHandler, ValidationError } from '@/lib/errors';

export const GET = withErrorHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      throw new ValidationError('ID is required');
    }
    
    // ... rest of handler
  },
  { endpoint: 'products', method: 'GET' }
);
```

### Z Retry Logic

```typescript
import { withRetry, ExternalApiError } from '@/lib/errors';

async function fetchProduct(id: string) {
  return await withRetry(
    async () => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) {
        throw new ExternalApiError('Failed to fetch product', response.status);
      }
      return response.json();
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
    }
  );
}
```

## Retry Logic

### Exponential Backoff

```typescript
await withRetry(
  async () => {
    // Operation that might fail
  },
  {
    maxAttempts: 3,        // Max 3 attempts
    initialDelay: 1000,    // Start with 1s delay
    maxDelay: 10000,       // Max 10s delay
    backoffMultiplier: 2,  // Double delay each retry
    retryable: (error) => {
      // Custom retry logic
      return error instanceof ExternalApiError && error.retryable;
    }
  }
);
```

### Retryable Errors

Błędy są automatycznie retryable jeśli:
- `error.retryable === true`
- Błąd to `ExternalApiError`, `TimeoutError`, `CircuitBreakerError`, `RateLimitError`

## Error Tracking

Wszystkie błędy są automatycznie logowane przez `logger.error()` z kontekstem:
- Typ błędu
- Kod błędu
- Status code
- Severity
- Retryable flag
- Context (endpoint, method)
- Details (jeśli dostępne)

## Best Practices

### 1. Używaj odpowiednich typów błędów

```typescript
// ❌ Złe
throw new Error('Not found');

// ✅ Dobre
throw new NotFoundError('Product not found', { productId: id });
```

### 2. Dodawaj kontekst w details

```typescript
throw new ValidationError('Invalid input', {
  field: 'email',
  value: email,
  reason: 'Invalid format'
});
```

### 3. Używaj createErrorResponse

```typescript
// ❌ Złe
return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });

// ✅ Dobre
return createErrorResponse(error, { endpoint: 'products', method: 'GET' });
```

### 4. Nie loguj wrażliwych danych

```typescript
// ❌ Złe
throw new InternalError('Database error', { password: userPassword });

// ✅ Dobre
throw new InternalError('Database error', { userId: user.id });
```

### 5. Używaj retry dla zewnętrznych API

```typescript
const data = await withRetry(
  () => fetchExternalApi(),
  { maxAttempts: 3, retryable: (e) => e instanceof ExternalApiError }
);
```

## Plan audytu błędów (skrót)

> Historyczny dokument `ERROR_AUDIT_PLAN.md` został przeniesiony do `docs/archive/` – poniżej aktualny kompas.

### Priorytety P0/P1 – do monitorowania

- **TypeScript**: `npm run type-check` powinien być czysty (brakujące typy w `analytics` / `woocommerce` traktować jako regres).
- **WooCommerce API + Sentry**: używać `Sentry.startSpan` i helpera `getRequestId`; każdy rollback w tym obszarze → testy e2e.
- **Favorites / Newsletter / Product client**: utrzymywać null checks i poprawne typy (w review pilnować `?.` / `??`).
- **Input validation**: każdy nowy endpoint musi mieć schemat w `lib/schemas` (`validateApiInput` + `safeParse`).

### Przegląd kwartalny

| Obszar | Co sprawdzamy | Narzędzia |
|--------|----------------|----------|
| Runtime errors | `try/catch`, React Error Boundaries, fallbacki API | Sentry, `npm run build` |
| Null/undefined | Optional chaining, guard clauses | ESLint, code review checklist |
| Async/await | Timeouty, `Promise.allSettled`, AbortController | manualna inspekcja, testy integracyjne |
| Security | Rate limiting, CSRF, JWT scopes | `SECURITY_OVERVIEW.md`, `TEST_PLAYBOOK.md` |
| Performance | Memory leak, N+1, cache effectiveness | Lighthouse, Redis monitor |

### Checklist

- [ ] `npm run type-check`, `npm run lint`, `npm run test:coverage` – wszystkie OK
- [ ] `npm audit` – brak krytycznych CVE
- [ ] Sentry – PII scrub + alerty działają
- [ ] Dokumentacja (ten plik, `STATUS_SUMMARY.md`) zaktualizowana po większych zmianach

## Migracja

### Przed

```typescript
try {
  // ...
} catch (error) {
  return NextResponse.json(
    { error: 'Something went wrong' },
    { status: 500 }
  );
}
```

### Po

```typescript
import { createErrorResponse, InternalError } from '@/lib/errors';

try {
  // ...
} catch (error) {
  return createErrorResponse(error, { endpoint: 'products', method: 'GET' });
}
```

## Pliki

- **Error Classes**: `apps/web/src/lib/errors.ts`
- **Error Tracking**: `apps/web/src/app/api/errors/route.ts`
- **Logger**: `apps/web/src/utils/logger.ts`

## Data Aktualizacji

2025-11-06 - Utworzony system ujednoliconej obsługi błędów

