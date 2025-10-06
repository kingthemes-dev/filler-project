# Headless WooCommerce Monorepo

## 📁 Struktura Projektu

```
headless-woo/
├── apps/
│   ├── web/          # Aplikacja webowa (Next.js)
│   └── mobile/       # Aplikacja mobilna (React Native/Expo)
├── packages/
│   └── shared/       # Wspólne pliki (typy, API, utils, stores)
└── [oryginalne pliki projektu webowego - zachowane]
```

## 🚀 Komendy

### Wszystkie aplikacje

```bash
# Instalacja zależności we wszystkich projektach
npm run install:all

# Uruchom aplikację webową
npm run dev:web

# Uruchom aplikację mobilną
npm run dev:mobile

# Build aplikacji webowej
npm run build:web

# Build aplikacji mobilnej
npm run build:mobile
```

### Tylko web

```bash
cd apps/web
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

### Tylko mobile

```bash
cd apps/mobile
npm run start
npm run android
npm run ios
npm run web
```

## 📦 Shared Packages

Wspólne pliki znajdują się w `packages/shared/`:

- **types/** - Typy TypeScript (Product, User, Order, itp.)
- **services/** - API calls (WooCommerce, Email, Payment)
- **utils/** - Funkcje pomocnicze (formatowanie, walidacja)
- **constants/** - Stałe (konfiguracja, env)
- **stores/** - Zustand stores (auth, cart, favorites)

## 🔄 Jak używać shared packages

### W aplikacji webowej (apps/web):

```typescript
import { Product, getProducts } from '@headless-woo/shared';
```

### W aplikacji mobilnej (apps/mobile):

```typescript
import { Product, getProducts } from '../../packages/shared';
```

## ⚠️ Ważne

- **Oryginalne pliki projektu webowego pozostały w root folderze** - działają tak samo jak wcześniej
- **apps/web/** - kopia projektu webowego do użycia w monorepo
- **apps/mobile/** - nowy projekt React Native/Expo
- **packages/shared/** - wspólne pliki dla web i mobile

## 🛠️ Następne kroki

1. ✅ Utworzono strukturę monorepo
2. ✅ Skopiowano projekt webowy do apps/web/
3. ✅ Utworzono packages/shared/ z wspólnymi plikami
4. ✅ Skonfigurowano apps/mobile/ (React Native/Expo)
5. ✅ Zaktualizowano package.json i konfiguracje
6. ⏳ Otwórz nowe okno Cursor dla apps/mobile/
7. ⏳ Skonfiguruj aplikację mobilną

## 📱 Konfiguracja aplikacji mobilnej

W nowym oknie Cursor:

1. Otwórz folder: `/Users/kingbrand/Desktop/headless-woo/apps/mobile`
2. Zainstaluj zależności: `npm install`
3. Uruchom: `npm run start`
4. Naciśnij `i` dla iOS lub `a` dla Android

## 🔗 Linki

- Projekt webowy: http://localhost:3000
- Dokumentacja: `docs/API.md`
- Status projektu: `PROJECT_STATUS.md`

