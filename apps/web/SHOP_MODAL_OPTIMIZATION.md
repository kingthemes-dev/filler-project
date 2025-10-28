# 🚀 Optymalizacja Modala Menu Sklep - Dokumentacja

## Przegląd

Zaimplementowano kompleksowe rozwiązanie optymalizacji modala menu sklep, które zapewnia **natychmiastowe otwieranie** bez API calls przy każdym użyciu. Wszystkie dane są prefetchowane i cachowane w sessionStorage.

## 🎯 Cele Osiągnięte

- ✅ **Modal otwiera się natychmiast** - brak loading states przy otwieraniu
- ✅ **Wszystkie dane dostępne od razu** - kategorie, podkategorie, marki, pojemności
- ✅ **Brak API calls przy otwieraniu modala** - dane pobierane raz i cachowane
- ✅ **Zachowana funkcjonalność** - wszystkie features działają jak wcześniej
- ✅ **Optymalizacja mobile menu** - identyczne rozwiązanie dla mobile
- ✅ **Usunięte hardcoded URLs** - użycie zmiennych środowiskowych
- ✅ **Memory leak protection** - prawidłowe czyszczenie i zarządzanie stanem

## 🏗️ Architektura Rozwiązania

### 1. Shop Data Prefetch Service (`/services/shop-data-prefetch.ts`)

**Główne funkcje:**
- Pobiera wszystkie dane sklepu równolegle (kategorie, atrybuty, liczniki)
- Implementuje inteligentny cache z timeout (domyślnie 5 minut)
- Zapewnia fallback data gdy API nie działa
- Singleton pattern dla globalnego dostępu

**API Endpoints:**
- `/api/woocommerce?endpoint=products/categories&per_page=100` - kategorie
- `${WORDPRESS_URL}/wp-json/king-shop/v1/attributes` - atrybuty (marki, pojemności)
- `/api/woocommerce?endpoint=products&per_page=1` - liczba produktów (X-WP-Total)

### 2. Shop Data Store (`/stores/shop-data-store.ts`)

**Funkcje:**
- Globalny Zustand store dla danych sklepu
- Automatyczne prefetchowanie przy inicjalizacji
- Computed getters dla różnych widoków danych
- Error handling i loading states
- SubscribeWithSelector dla optymalizacji re-renderów

**Hooks eksportowane:**
- `useShopCategories()` - kategorie główne i podkategorie
- `useShopAttributes()` - marki i pojemności
- `useShopStats()` - statystyki i metadane
- `useShopDataActions()` - akcje (initialize, refresh, clearError)

### 3. Shop Data Prefetcher (`/components/shop-data-prefetcher.tsx`)

**Funkcje:**
- Komponent do prefetchowania danych przy inicjalizacji aplikacji
- Uruchamia się w tle z opóźnieniem (domyślnie 1s)
- Nie renderuje żadnego UI
- Hook `useShopDataPrefetch()` dla manualnego prefetchowania

### 4. Zoptymalizowane Komponenty

#### ShopExplorePanel (`/components/ui/shop-explore-panel.tsx`)
**Zmiany:**
- ❌ Usunięto wszystkie API calls z useEffect
- ✅ Używa danych z `useShopDataStore`
- ✅ Loading states tylko przy pierwszym ładowaniu
- ✅ Natychmiastowe wyświetlanie danych z cache

#### Header (`/components/ui/header.tsx`)
**Zmiany:**
- ❌ Usunięto funkcje `fetchBrands()` i `fetchCategories()`
- ✅ Używa danych z `useShopDataStore`
- ✅ Mobile menu używa tych samych danych
- ✅ Brak duplikowania API calls

## 🔧 Konfiguracja

### Zmienne Środowiskowe

Wszystkie hardcoded URLs zostały zastąpione zmiennymi środowiskowymi:

```env
NEXT_PUBLIC_WORDPRESS_URL=https://qvwltjhdjw.cfolks.pl
WC_CONSUMER_KEY=ck_deb61eadd7301ebfc5f8074ce7c53c6668eb725d
WC_CONSUMER_SECRET=cs_0de18ed0e013f96aebfb51c77f506bb94e416cb8
```

### Prefetchowanie w Layout

W `layout.tsx` dodano komponent prefetchowania:

```tsx
<ShopDataPrefetcher 
  immediate={true} 
  delay={1000} 
  onlyIfEmpty={true} 
/>
```

## 📊 Struktura Danych

### Kategorie
```typescript
interface ShopCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  parent: number; // 0 = główna kategoria
}
```

### Atrybuty
```typescript
interface ShopAttributes {
  brands: ShopAttribute[];     // Marki (limit 36 w modalu)
  capacities: ShopAttribute[];  // Pojemności
}

interface ShopAttribute {
  id: number | string;
  name: string;
  slug: string;
}
```

## 🚀 Wydajność

### Przed Optymalizacją
- ❌ 3-4 API calls przy każdym otwarciu modala
- ❌ Loading states 2-3 sekundy
- ❌ Duplikowanie API calls między desktop a mobile
- ❌ Hardcoded URLs w kodzie

### Po Optymalizacji
- ✅ 0 API calls przy otwarciu modala
- ✅ Natychmiastowe wyświetlanie danych
- ✅ Wspólne dane dla desktop i mobile
- ✅ Konfigurowalne URLs przez zmienne środowiskowe
- ✅ Inteligentny cache z automatycznym odświeżaniem

## 🔄 Cache Strategy

### SessionStorage Cache
- **Klucz:** `shop-data-prefetch`
- **Timeout:** 5 minut (konfigurowalny)
- **Struktura:** Pełne dane sklepu + timestamp
- **Fallback:** Hardcoded data gdy API nie działa

### Cache Invalidation
- Automatyczne po timeout
- Manual refresh przez `refresh()` action
- Clear cache przez `clearCache()` method

## 🛠️ Użycie

### Podstawowe Użycie
```tsx
import { useShopDataStore } from '@/stores/shop-data-store';

function MyComponent() {
  const { categories, brands, isLoading } = useShopDataStore();
  
  if (isLoading) return <div>Ładowanie...</div>;
  
  return (
    <div>
      {categories.map(cat => (
        <div key={cat.id}>{cat.name}</div>
      ))}
    </div>
  );
}
```

### Specjalizowane Hooks
```tsx
import { useShopCategories, useShopAttributes } from '@/stores/shop-data-store';

function CategoriesComponent() {
  const { mainCategories, getSubCategories } = useShopCategories();
  const { brandsForModal } = useShopAttributes();
  
  // Użyj danych...
}
```

### Manual Prefetch
```tsx
import { useShopDataPrefetch } from '@/components/shop-data-prefetcher';

function MyComponent() {
  const { prefetch, hasData } = useShopDataPrefetch();
  
  const handleRefresh = () => {
    prefetch();
  };
  
  return (
    <button onClick={handleRefresh}>
      {hasData ? 'Odśwież' : 'Załaduj'} dane
    </button>
  );
}
```

## 🐛 Debugging

### Logi Konsoli
- `🚀 Shop data prefetched and cached` - dane pobrane i zapisane
- `🚀 Shop data loaded from cache` - dane załadowane z cache
- `⏰ Shop data cache expired` - cache wygasł
- `🔄 Using fallback shop data` - używane dane fallback

### Sprawdzanie Cache
```javascript
// W konsoli przeglądarki
console.log(JSON.parse(sessionStorage.getItem('shop-data-prefetch')));
```

## 🔮 Przyszłe Ulepszenia

1. **Redis Cache** - dla większej skalowalności
2. **ISR (Incremental Static Regeneration)** - dla statycznych danych
3. **Service Worker Cache** - dla offline support
4. **GraphQL** - dla bardziej efektywnych zapytań
5. **Real-time Updates** - WebSocket dla live updates

## 📝 Podsumowanie

Rozwiązanie zapewnia **natychmiastowe otwieranie modala menu sklep** poprzez:

1. **Prefetchowanie danych** przy inicjalizacji aplikacji
2. **Inteligentny cache** w sessionStorage
3. **Globalny store** dla zarządzania stanem
4. **Eliminację API calls** przy otwieraniu modala
5. **Zachowanie wszystkich funkcji** z lepszą wydajnością

Modal teraz otwiera się **natychmiast** bez żadnych loading states, zapewniając doskonałe UX dla użytkowników.
