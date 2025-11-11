# Vercel Deployment Fix - Monorepo Configuration

## Problem
Vercel nie wykrywa Next.js w monorepo podczas build:
```
Error: No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies".
```

## Rozwiązanie

### 1. Ustawienia w Vercel Dashboard

**Wymagane ustawienia w Vercel Dashboard:**

1. Przejdź do **Settings → General**
2. Ustaw **Root Directory** na: `apps/web`
3. **Build Command**: (zostaw puste - Vercel automatycznie wykryje)
4. **Output Directory**: (zostaw puste - Vercel automatycznie wykryje `.next`)
5. **Install Command**: `pnpm install` (lub zostaw puste)
6. **Framework Preset**: Next.js (lub zostaw auto-detect)

### 2. Weryfikacja konfiguracji

#### `vercel.json` (root)
```json
{
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

#### `apps/web/package.json`
- Musi zawierać `"next": "15.5.6"` w `dependencies`
- Musi mieć script `"build": "next build"`

### 3. Alternatywne rozwiązanie (jeśli Root Directory nie działa)

Jeśli ustawienie Root Directory w dashboardzie nie działa, możesz użyć `vercel.json` z explicit build command:

```json
{
  "buildCommand": "cd apps/web && pnpm run build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "build": {
    "env": {
      "NEXT_TELEMETRY_DISABLED": "1"
    }
  }
}
```

**UWAGA:** To rozwiązanie może nie działać z automatycznym wykrywaniem Next.js. Lepiej użyć Root Directory w dashboardzie.

### 4. Weryfikacja po deploy

Po ustawieniu Root Directory w dashboardzie Vercel:
1. Zrób nowy commit (lub re-deploy)
2. Sprawdź logi build w Vercel
3. Powinno wykryć Next.js automatycznie

### 5. Troubleshooting

#### Problem: Vercel nadal nie wykrywa Next.js

**Rozwiązanie:**
1. Sprawdź, czy `apps/web/package.json` zawiera `next` w dependencies
2. Sprawdź, czy Root Directory jest ustawione na `apps/web` (nie `apps/web/`)
3. Sprawdź, czy `pnpm-lock.yaml` jest w root repo
4. Spróbuj usunąć cache build w Vercel (Settings → Build & Development Settings → Clear Build Cache)

#### Problem: Build fails z błędami zależności

**Rozwiązanie:**
1. Upewnij się, że `pnpm install` działa lokalnie
2. Sprawdź, czy wszystkie workspace dependencies są poprawnie zdefiniowane
3. Sprawdź, czy `pnpm-workspace.yaml` jest w root repo

### 6. Rekomendowana konfiguracja

**Vercel Dashboard Settings:**
- **Root Directory:** `apps/web`
- **Build Command:** (puste - auto-detect)
- **Output Directory:** (puste - auto-detect)
- **Install Command:** `pnpm install`
- **Framework Preset:** Next.js (lub auto-detect)

**vercel.json:**
- Minimalna konfiguracja (tylko headers i build env)
- Nie ustawiaj `buildCommand`, `outputDirectory`, `framework` - pozwól Vercel automatycznie wykryć

---

**Status:** ✅ `vercel.json` zaktualizowany  
**Następny krok:** Ustaw Root Directory w Vercel Dashboard na `apps/web`

