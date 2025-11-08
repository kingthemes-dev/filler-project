# Rate Limiting - Dokumentacja

**Data utworzenia**: 2025-11-06  
**Status**: ✅ Zaimplementowane

## Przegląd

System rate limiting zapewnia:
- **Per-endpoint rate limits** - różne limity dla różnych endpointów
- **Redis-based** - distributed rate limiting (wielu instancji)
- **In-memory fallback** - działa bez Redis
- **Automatyczne headers** - informacje o limicie w odpowiedziach
- **Exemptions** - wyłączenia dla performance tests i localhost

## Per-Endpoint Rate Limits

### Public Read Endpoints (Lenient)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/home-feed` | 200 req | 15 min |
| `/api/woocommerce` | 150 req | 15 min |
| `/api/woocommerce?endpoint=products` | 100 req | 10 min |
| `/api/woocommerce?endpoint=products/categories` | 50 req | 15 min |

### Auth Endpoints (Strict)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/admin/auth` | 10 req | 5 min |
| `/api/woocommerce?endpoint=customers` | 20 req | 5 min |

### Mutations (Strict)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/woocommerce?endpoint=orders` | 30 req | 5 min |
| `/api/reviews` | 20 req | 5 min |

### Search (Moderate)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/woocommerce?endpoint=products&search` | 50 req | 1 min |

### Webhooks (Very Lenient)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/webhooks` | 1000 req | 1 min |

## Użycie

### Podstawowe użycie

```typescript
import { checkEndpointRateLimit } from '@/utils/rate-limiter';
import { RateLimitError, createErrorResponse } from '@/lib/errors';

export async function GET(request: NextRequest) {
  const clientIp = getClientIP(request);
  const path = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  
  // Check rate limit
  const rateLimitResult = await checkEndpointRateLimit(path, clientIp, searchParams);
  
  if (!rateLimitResult.allowed) {
    throw new RateLimitError(
      'Rate limit exceeded',
      rateLimitResult.retryAfter
    );
  }
  
  // Continue with request...
}
```

### Z Error Handler

```typescript
import { withErrorHandler, RateLimitError } from '@/lib/errors';
import { checkEndpointRateLimit } from '@/utils/rate-limiter';

export const GET = withErrorHandler(
  async (request: NextRequest) => {
    const clientIp = getClientIP(request);
    const path = request.nextUrl.pathname;
    const rateLimitResult = await checkEndpointRateLimit(path, clientIp);
    
    if (!rateLimitResult.allowed) {
      throw new RateLimitError('Rate limit exceeded', rateLimitResult.retryAfter);
    }
    
    // ... rest of handler
  },
  { endpoint: 'products', method: 'GET' }
);
```

## Headers

Rate limiting dodaje następujące headers do odpowiedzi:

- `X-RateLimit-Limit`: Maksymalna liczba żądań w oknie
- `X-RateLimit-Remaining`: Pozostała liczba żądań
- `X-RateLimit-Reset`: Timestamp resetu (Unix timestamp)
- `Retry-After`: Sekundy do ponowienia (tylko gdy limit przekroczony)

## Exemptions

### Automatyczne wyłączenia

1. **Localhost w development**:
   - `127.0.0.1`
   - `::1`
   - `localhost`

2. **Performance testing tools**:
   - User-Agent zawierający: `autocannon`, `k6`, `performance-test`, `load-test`
   - Header: `X-Performance-Test: true`

### Konfiguracja exemptions

```typescript
// W middleware/security.ts
const RATE_LIMIT_EXEMPT_IPS = [
  '127.0.0.1',
  '::1',
  'localhost',
  '0.0.0.0',
];

const RATE_LIMIT_EXEMPT_USER_AGENTS = [
  'autocannon',
  'k6',
  'performance-test',
  'load-test',
];
```

## Redis vs In-Memory

### Redis (Production)

- **Distributed**: Działa z wieloma instancjami
- **Persistent**: Limity są zachowane między restartami
- **Scalable**: Może obsłużyć więcej żądań

### In-Memory (Fallback)

- **Local**: Działa tylko w jednej instancji
- **Temporary**: Limity są resetowane przy restarcie
- **Simple**: Nie wymaga Redis

## Konfiguracja

### Dodawanie nowego endpointu

```typescript
// W utils/rate-limiter.ts
export const ENDPOINT_RATE_LIMITS: Record<string, EndpointRateLimit> = {
  '/api/my-endpoint': {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'ratelimit:my-endpoint',
  },
};
```

### Zmiana domyślnych limitów

```typescript
export const DEFAULT_RATE_LIMITS = {
  API: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000,
  },
  // ...
};
```

## Error Handling

Rate limiting używa `RateLimitError` z systemu błędów:

```typescript
{
  "error": {
    "message": "Rate limit exceeded",
    "type": "RATE_LIMIT_ERROR",
    "code": "RATE_LIMIT_EXCEEDED",
    "statusCode": 429,
    "severity": "medium",
    "retryable": true,
    "timestamp": "2025-11-06T10:00:00.000Z",
    "details": {
      "retryAfter": 60
    }
  }
}
```

## Monitoring

Rate limiting loguje następujące zdarzenia:

- **Rate limit exceeded**: `logger.warn()` z IP, URL, remaining, resetAt
- **Redis connection**: `logger.info()` przy połączeniu
- **Redis errors**: `logger.warn()` przy błędach (fallback do memory)

## Best Practices

### 1. Używaj per-endpoint limits

```typescript
// ❌ Złe - jeden limit dla wszystkich
const rateLimitResult = await checkRateLimit({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000,
  identifier: clientIp,
});

// ✅ Dobre - per-endpoint limit
const rateLimitResult = await checkEndpointRateLimit(path, clientIp, searchParams);
```

### 2. Dodawaj rate limit headers

```typescript
return NextResponse.json(data, {
  headers: {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(resetAt),
  },
});
```

### 3. Używaj RateLimitError

```typescript
// ❌ Złe
return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

// ✅ Dobre
throw new RateLimitError('Rate limit exceeded', retryAfter);
```

### 4. Testuj z exemptions

```typescript
// W testach, dodaj header:
headers: {
  'X-Performance-Test': 'true',
}
```

## Pliki

- **Rate Limiter**: `apps/web/src/utils/rate-limiter.ts`
- **Error Handling**: `apps/web/src/lib/errors.ts`
- **Middleware**: `apps/web/src/middleware/security.ts`

## Data Aktualizacji

2025-11-06 - Dodano per-endpoint rate limiting i integrację z systemem błędów

