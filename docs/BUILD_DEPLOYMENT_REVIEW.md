# Przegląd Builda i Deploymentu

**Data przeglądu**: 2025-01-27  
**Wersja Next.js**: 15.5.6  
**Framework**: Next.js App Router  
**Status**: Kompleksowy przegląd konfiguracji builda i deploymentu

---

## Executive Summary

Przeprowadzono kompleksowy przegląd konfiguracji builda i deploymentu aplikacji Next.js. Projekt wykorzystuje wieloetapowy build Docker, deployment na Vercel oraz self-hosted Docker Compose z Nginx. Zidentyfikowano kilka obszarów wymagających poprawy, szczególnie w zakresie kompatybilności standalone output między Docker a Vercel, zarządzania zmiennymi środowiskowymi oraz optymalizacji builda.

### Kluczowe Znaleziska

- ✅ **Dobrze**: Wieloetapowy Dockerfile z optymalizacjami
- ✅ **Dobrze**: Security headers w Nginx i Next.js middleware
- ⚠️ **Uwaga**: Standalone output wyłączony dla Vercel, ale Docker go wymaga
- ⚠️ **Uwaga**: Brak CI/CD workflows dla automatycznego deploymentu
- ⚠️ **Uwaga**: Niepełna dokumentacja zmiennych środowiskowych w Docker Compose
- ⚠️ **Uwaga**: Healthcheck w Docker wymaga curl (nie jest w base image)

---

## 1. Analiza Dockerfile

### Obecna Konfiguracja

```dockerfile
# Wieloetapowy build:
# 1. base - Node.js 20 Alpine
# 2. deps - instalacja zależności (production only)
# 3. builder - build aplikacji
# 4. runner - production image
```

### Zalety

- ✅ Wieloetapowy build (optymalizacja rozmiaru obrazu)
- ✅ Użycie Alpine Linux (mniejszy rozmiar)
- ✅ Non-root user (nextjs:nodejs)
- ✅ Standalone output dla minimalnego obrazu
- ✅ Telemetry wyłączona
- ✅ Proper permissions dla `.next` directory

### Problemy i Rekomendacje

#### 🔴 Krytyczne

1. **Standalone Output Konflikt**
   - **Problem**: `next.config.ts` ma wyłączony `output: 'standalone'` (linia 240) dla kompatybilności z Vercel
   - **Dockerfile** (linia 46) kopiuje `.next/standalone`, który nie istnieje bez tej opcji
   - **Skutek**: Docker build będzie failować
   - **Rekomendacja**: 
     ```typescript
     // next.config.ts
     output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
     ```
     Lub użyj warunkowego builda w Dockerfile

2. **Healthcheck wymaga curl**
   - **Problem**: `docker-compose.yml` używa `curl` w healthcheck (linia 21), ale `node:20-alpine` nie ma curl
   - **Rekomendacja**: 
     ```dockerfile
     # W Dockerfile runner stage:
     RUN apk add --no-cache curl
     ```
     Lub użyj `wget` lub Node.js script

#### ⚠️ Ważne

3. **Deps stage używa `--only=production`**
   - **Problem**: Build wymaga devDependencies (TypeScript, webpack, etc.)
   - **Rekomendacja**: 
     ```dockerfile
     # W deps stage:
     RUN npm ci  # bez --only=production
     ```

4. **Brak cache dla npm install**
   - **Rekomendacja**: Dodaj cache mount dla szybszych rebuildów:
     ```dockerfile
     RUN --mount=type=cache,target=/root/.npm \
         npm ci
     ```

5. **Brak .dockerignore dla root**
   - **Problem**: `.dockerignore` jest tylko w `apps/web/`, ale build context może być root
   - **Rekomendacja**: Dodaj `.dockerignore` w root projektu

---

## 2. Analiza next.config.ts

### Zalety

- ✅ Bundle analyzer skonfigurowany
- ✅ Package import optimization (tree-shaking)
- ✅ Zaawansowane webpack optimization (splitChunks)
- ✅ TranspilePackages dla workspace packages
- ✅ Image optimization (AVIF, WebP)
- ✅ Console removal w production

### Problemy i Rekomendacje

#### 🔴 Krytyczne

1. **Standalone Output Wyłączony**
   - **Problem**: Linia 240 - `output: 'standalone'` zakomentowane
   - **Skutek**: Docker build nie działa (kopiuje nieistniejący katalog)
   - **Rekomendacja**: Warunkowa konfiguracja (patrz sekcja Dockerfile)

#### ⚠️ Ważne

2. **ESLint Ignorowany w Build**
   - **Problem**: `eslint.ignoreDuringBuilds: true` (linia 27)
   - **Rekomendacja**: Włącz linting w CI/CD, nie w buildzie produkcyjnym

3. **Brak Output File Tracing Config**
   - **Rekomendacja**: Dodaj konfigurację dla lepszego standalone output:
     ```typescript
     experimental: {
       outputFileTracingIncludes: {
         '/api/**/*': ['./wp-content/**/*'],
       },
     }
     ```

4. **Hardcoded WordPress URL**
   - **Problem**: Linia 74 - hardcoded `qvwltjhdjw.cfolks.pl`
   - **Rekomendacja**: Użyj zmiennej środowiskowej

---

## 3. Analiza Vercel Deployment

### Obecna Konfiguracja

```json
{
  "buildCommand": "cd apps/web && pnpm run build",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs"
}
```

### Zalety

- ✅ Prawidłowa konfiguracja dla monorepo
- ✅ Telemetry wyłączona
- ✅ CORS headers skonfigurowane

### Problemy i Rekomendacje

#### ⚠️ Ważne

1. **CORS Headers w vercel.json**
   - **Problem**: `Access-Control-Allow-Origin: *` (linia 18) - zbyt permissive
   - **Rekomendacja**: Użyj konkretnych domen lub zmiennej środowiskowej
   - **Uwaga**: Next.js middleware już obsługuje CORS - może być duplikacja

2. **Brak Environment Variables Validation**
   - **Rekomendacja**: Dodaj walidację w buildCommand:
     ```json
     "buildCommand": "cd apps/web && node scripts/validate-env.js && pnpm run build"
     ```

3. **Brak Rewrites dla WordPress API**
   - **Rekomendacja**: Rozważ rewrites dla lepszej integracji:
     ```json
     "rewrites": [
       {
         "source": "/wp-api/:path*",
         "destination": "https://your-wordpress.com/wp-json/:path*"
       }
     ]
     ```

---

## 4. Analiza Docker Compose

### Obecna Konfiguracja

- **Web**: Next.js app
- **Redis**: Cache layer
- **Nginx**: Reverse proxy

### Zalety

- ✅ Health checks skonfigurowane
- ✅ Restart policies
- ✅ Volume dla Redis persistence
- ✅ Proper dependencies

### Problemy i Rekomendacje

#### 🔴 Krytyczne

1. **Brak Wymaganych Environment Variables**
   - **Problem**: `docker-compose.yml` definiuje tylko 3 zmienne (REDIS_URL, WP_BASE_URL, SENTRY_DSN)
   - **Wymagane**: WC_CONSUMER_KEY, WC_CONSUMER_SECRET, REVALIDATE_SECRET, ADMIN_CACHE_TOKEN, CSRF_SECRET, WOOCOMMERCE_WEBHOOK_SECRET, KING_CART_API_SECRET
   - **Rekomendacja**: 
     ```yaml
     environment:
       - NODE_ENV=production
       - REDIS_URL=redis://redis:6379
       - WP_BASE_URL=${WP_BASE_URL}
       - SENTRY_DSN=${SENTRY_DSN}
       - NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}
       # Dodaj wszystkie wymagane zmienne:
       - WC_CONSUMER_KEY=${WC_CONSUMER_KEY}
       - WC_CONSUMER_SECRET=${WC_CONSUMER_SECRET}
       - REVALIDATE_SECRET=${REVALIDATE_SECRET}
       - ADMIN_CACHE_TOKEN=${ADMIN_CACHE_TOKEN}
       - CSRF_SECRET=${CSRF_SECRET}
       - WOOCOMMERCE_WEBHOOK_SECRET=${WOOCOMMERCE_WEBHOOK_SECRET}
       - KING_CART_API_SECRET=${KING_CART_API_SECRET}
       - NEXT_PUBLIC_WORDPRESS_URL=${NEXT_PUBLIC_WORDPRESS_URL}
       - NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
       - NEXT_PUBLIC_WC_URL=${NEXT_PUBLIC_WC_URL}
     ```

2. **Healthcheck używa curl**
   - **Problem**: `curl` nie jest dostępny w `node:20-alpine`
   - **Rekomendacja**: 
     ```yaml
     healthcheck:
       test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
       # Lub użyj Node.js:
       # test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
     ```

#### ⚠️ Ważne

3. **Brak depends_on dla healthcheck**
   - **Rekomendacja**: Użyj `depends_on` z `condition: service_healthy`:
     ```yaml
     depends_on:
       redis:
         condition: service_healthy
     ```

4. **Brak resource limits**
   - **Rekomendacja**: Dodaj limits dla production:
     ```yaml
     deploy:
       resources:
         limits:
           cpus: '2'
           memory: 2G
         reservations:
           cpus: '1'
           memory: 1G
     ```

5. **Redis bez hasła**
   - **Problem**: Redis nie ma autentykacji
   - **Rekomendacja**: Dodaj hasło dla production:
     ```yaml
     command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes ...
     ```

---

## 5. Analiza Nginx Configuration

### Zalety

- ✅ Security headers skonfigurowane
- ✅ Rate limiting
- ✅ SSL/TLS configuration
- ✅ Gzip i Brotli compression
- ✅ HTTP to HTTPS redirect
- ✅ Static files caching

### Problemy i Rekomendacje

#### ⚠️ Ważne

1. **CSP z unsafe-inline**
   - **Problem**: Linia 21 - `unsafe-inline` w CSP (komentarz mówi, że Next.js middleware to nadpisze)
   - **Rekomendacja**: Usuń `unsafe-inline` z Nginx, poleganie na middleware Next.js

2. **Brak HSTS Preload**
   - **Rekomendacja**: Dodaj `preload` do HSTS (Next.js middleware już to ma, ale warto w Nginx też)

3. **Rate Limiting może być zbyt restrykcyjne**
   - **Problem**: 10 req/s dla API może być za mało dla niektórych endpointów
   - **Rekomendacja**: Rozważ różne limity dla różnych endpointów

4. **Brak proxy_cache dla API**
   - **Rekomendacja**: Dodaj cache dla GET requests do API:
     ```nginx
     proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:10m max_size=100m;
     location /api/ {
       proxy_cache api_cache;
       proxy_cache_valid 200 5m;
       # ...
     }
     ```

5. **Brak logowania**
   - **Rekomendacja**: Dodaj access_log i error_log dla debugging

---

## 6. Analiza Environment Variables

### Obecna Konfiguracja

- **Walidacja**: `apps/web/src/config/env.ts` - dobra walidacja
- **Dokumentacja**: `vercel.env.example` - kompletna
- **Docker**: `docker-compose.yml` - niekompletna

### Problemy i Rekomendacje

#### 🔴 Krytyczne

1. **Brak .env.example w root**
   - **Rekomendacja**: Utwórz `.env.example` w root z wszystkimi wymaganymi zmiennymi

2. **Docker Compose brakuje zmiennych**
   - **Problem**: Tylko 3 zmienne zdefiniowane, potrzeba 10+
   - **Rekomendacja**: Patrz sekcja Docker Compose

#### ⚠️ Ważne

3. **Brak walidacji w Dockerfile**
   - **Rekomendacja**: Dodaj healthcheck script, który weryfikuje zmienne:
     ```dockerfile
     RUN echo '#!/bin/sh\n\
       if [ -z "$WC_CONSUMER_KEY" ]; then echo "Missing WC_CONSUMER_KEY"; exit 1; fi\n\
       node server.js' > /app/start.sh && chmod +x /app/start.sh
     CMD ["/app/start.sh"]
     ```

4. **Brak dokumentacji dla Docker deployment**
   - **Rekomendacja**: Dodaj sekcję w `DEPLOYMENT_GUIDE.md` o Docker deployment

---

## 7. Analiza Security

### Zalety

- ✅ Security headers w Nginx
- ✅ Security middleware w Next.js z CSP nonce
- ✅ CSRF protection
- ✅ Rate limiting (Nginx + Next.js)
- ✅ Non-root user w Docker
- ✅ Secrets management przez environment variables

### Problemy i Rekomendacje

#### ⚠️ Ważne

1. **CORS w vercel.json zbyt permissive**
   - **Problem**: `Access-Control-Allow-Origin: *`
   - **Rekomendacja**: Użyj konkretnych domen

2. **Brak Secrets Rotation Strategy**
   - **Rekomendacja**: Dokumentuj proces rotacji sekretów

3. **Brak Security Headers w Dockerfile**
   - **Rekomendacja**: Rozważ dodanie security scanning w CI/CD

---

## 8. Analiza Optymalizacji

### Zalety

- ✅ Wieloetapowy Docker build
- ✅ Standalone output (gdy włączony)
- ✅ Webpack code splitting
- ✅ Image optimization
- ✅ Package import optimization
- ✅ Compression (Gzip, Brotli)

### Problemy i Rekomendacje

#### ⚠️ Ważne

1. **Brak Build Cache**
   - **Rekomendacja**: Dodaj cache dla npm install w Dockerfile

2. **Brak Multi-stage Cache**
   - **Rekomendacja**: Użyj BuildKit cache mounts:
     ```dockerfile
     RUN --mount=type=cache,target=/root/.npm \
         npm ci
     ```

3. **Brak Bundle Size Monitoring**
   - **Rekomendacja**: Użyj `build:report` script w CI/CD

4. **Brak Build Time Monitoring**
   - **Rekomendacja**: Dodaj timing do build process

---

## 9. Analiza Dokumentacji

### Obecna Dokumentacja

- ✅ `DEPLOYMENT_GUIDE.md` - dobra dla mu-plugins
- ✅ `vercel.env.example` - kompletna
- ⚠️ Brak dokumentacji dla Docker deployment
- ⚠️ Brak dokumentacji dla CI/CD

### Rekomendacje

1. **Dodaj Docker Deployment Guide**
   - Sekcja w `DEPLOYMENT_GUIDE.md` lub osobny plik
   - Instrukcje setup, environment variables, troubleshooting

2. **Dodaj CI/CD Documentation**
   - Jeśli używasz GitHub Actions, dokumentuj workflows
   - Jeśli nie, rozważ dodanie

3. **Dodaj Environment Variables Reference**
   - Kompletna lista wszystkich zmiennych z opisami
   - Które są wymagane, które opcjonalne
   - Przykłady wartości

---

## 10. Rekomendacje Priorytetowe

### 🔴 Krytyczne (Wymagane do działania)

1. **Napraw Standalone Output**
   - Włącz warunkowo `output: 'standalone'` dla Docker
   - Lub użyj różnych build commands

2. **Napraw Healthcheck**
   - Dodaj `curl` do Dockerfile lub użyj alternatywy

3. **Dodaj Wymagane Environment Variables do Docker Compose**
   - Wszystkie zmienne z `REQUIRED_SERVER_VARS`

### ⚠️ Ważne (Zalecane)

4. **Popraw CORS Configuration**
   - Usuń `*` z vercel.json, użyj konkretnych domen

5. **Dodaj CI/CD Workflows**
   - Automatyczny build i test
   - Automatyczny deployment

6. **Dodaj Build Cache**
   - Optymalizacja czasu builda

7. **Dodaj Docker Deployment Documentation**
   - Kompletny guide dla self-hosted deployment

### ℹ️ Opcjonalne (Nice to have)

8. **Dodaj Resource Limits**
   - W Docker Compose

9. **Dodaj Redis Authentication**
   - Dla production security

10. **Dodaj Bundle Size Monitoring**
    - W CI/CD pipeline

---

## 11. Checklist Implementacji

### Faza 1: Krytyczne Naprawy

- [ ] Napraw standalone output (warunkowa konfiguracja)
- [ ] Dodaj curl do Dockerfile lub zmień healthcheck
- [ ] Dodaj wszystkie wymagane env vars do docker-compose.yml
- [ ] Przetestuj Docker build end-to-end

### Faza 2: Ważne Ulepszenia

- [ ] Popraw CORS w vercel.json
- [ ] Dodaj build cache do Dockerfile
- [ ] Dodaj .env.example w root
- [ ] Zaktualizuj dokumentację deploymentu

### Faza 3: Opcjonalne Optymalizacje

- [ ] Dodaj CI/CD workflows
- [ ] Dodaj resource limits
- [ ] Dodaj Redis authentication
- [ ] Dodaj bundle size monitoring

---

## 12. Przykładowe Poprawki

### Dockerfile - Naprawa Healthcheck

```dockerfile
# W runner stage, przed USER nextjs:
RUN apk add --no-cache curl

# Lub użyj Node.js healthcheck:
# HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

### next.config.ts - Warunkowy Standalone

```typescript
const nextConfig: NextConfig = {
  // ... existing config ...
  
  // Enable standalone output only for Docker builds
  ...(process.env.DOCKER_BUILD === 'true' && {
    output: 'standalone',
  }),
  
  // ... rest of config ...
};
```

### docker-compose.yml - Kompletne Environment Variables

```yaml
environment:
  - NODE_ENV=production
  - REDIS_URL=redis://redis:6379
  - WP_BASE_URL=${WP_BASE_URL}
  - SENTRY_DSN=${SENTRY_DSN}
  - NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}
  # WooCommerce
  - WC_CONSUMER_KEY=${WC_CONSUMER_KEY}
  - WC_CONSUMER_SECRET=${WC_CONSUMER_SECRET}
  - NEXT_PUBLIC_WC_URL=${NEXT_PUBLIC_WC_URL}
  # WordPress
  - NEXT_PUBLIC_WORDPRESS_URL=${NEXT_PUBLIC_WORDPRESS_URL}
  - NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
  # Security
  - REVALIDATE_SECRET=${REVALIDATE_SECRET}
  - ADMIN_CACHE_TOKEN=${ADMIN_CACHE_TOKEN}
  - CSRF_SECRET=${CSRF_SECRET}
  - WOOCOMMERCE_WEBHOOK_SECRET=${WOOCOMMERCE_WEBHOOK_SECRET}
  - KING_CART_API_SECRET=${KING_CART_API_SECRET}
```

---

## Podsumowanie

Przegląd wykazał, że konfiguracja builda i deploymentu jest ogólnie dobrze zaprojektowana, ale wymaga kilku krytycznych poprawek, szczególnie w zakresie kompatybilności standalone output między Docker a Vercel oraz kompletności konfiguracji environment variables w Docker Compose.

**Priorytet**: Napraw krytyczne problemy przed następnym deploymentem.

**Następne kroki**: Zaimplementuj poprawki z Fazy 1, przetestuj build i deployment, następnie przejdź do Fazy 2.

---

*Raport wygenerowany automatycznie przez Build & Deployment Review*  
*Data: 2025-01-27*

