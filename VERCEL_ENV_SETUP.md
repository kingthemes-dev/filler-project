# 🔧 Vercel Environment Variables Setup

## Problem
Build failed na Vercel z błędem: `ERR_INVALID_URL` - brakuje zmiennej `NEXT_PUBLIC_WORDPRESS_URL`

## Rozwiązanie
Ustaw następujące zmienne środowiskowe w Vercel Dashboard:

### 1. Przejdź do Vercel Dashboard
- Otwórz projekt `filler-project`
- Przejdź do Settings → Environment Variables

### 2. Dodaj zmienne środowiskowe:

```
NEXT_PUBLIC_WORDPRESS_URL = https://qvwltjhdjw.cfolks.pl
NEXT_PUBLIC_BASE_URL = https://filler-project-git-main-king-themes.vercel.app
WC_CONSUMER_KEY = ck_your_consumer_key
WC_CONSUMER_SECRET = cs_your_consumer_secret
NODE_ENV = production
```

### 3. Opcjonalne (jeśli masz):
```
SENTRY_DSN = https://your_sentry_dsn@sentry.io/project_id
SENTRY_AUTH_TOKEN = your_sentry_auth_token
```

## Po ustawieniu zmiennych:
1. Trigger nowy deployment w Vercel
2. Build powinien przejść pomyślnie

## Status
✅ Naprawiono błędy w kodzie:
- Dodano fallback URL w sitemap.ts
- Naprawiono performance monitor endpoint
- Commit: 6695c9c
