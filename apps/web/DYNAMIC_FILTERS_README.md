# Dynamiczne Filtry - Automatyczne Pobieranie Kategorii i Atrybutów

## 🎯 Co zostało zaimplementowane

System dynamicznych filtrów automatycznie pobiera wszystkie kategorie i atrybuty z WordPress/WooCommerce bez potrzeby ręcznego mapowania. To oznacza, że:

### ✅ Automatyczne Kategorie
- **Wszystkie kategorie** z WordPress są automatycznie pobierane
- **Hierarchia** jest budowana automatycznie na podstawie `parent/child` relacji
- **Liczby produktów** są aktualizowane w czasie rzeczywistym
- **Nowe kategorie** pojawiają się automatycznie po dodaniu w WordPress

### ✅ Automatyczne Atrybuty
- **Wszystkie atrybuty** z WooCommerce są automatycznie pobierane
- **Terminy atrybutów** (np. marki, pojemności) są pobierane dynamicznie
- **Liczby produktów** dla każdego terminu są aktualizowane
- **Nowe atrybuty** pojawiają się automatycznie po dodaniu w WooCommerce

## 🚀 Jak to działa

### 1. Serwis Dynamicznych Kategorii
```typescript
// apps/web/src/services/dynamic-categories.ts
- getAllCategories() - pobiera wszystkie kategorie
- getAllAttributes() - pobiera wszystkie atrybuty
- getAttributeTerms() - pobiera terminy dla atrybutu
- buildCategoryHierarchy() - buduje hierarchię kategorii
- getDynamicFilters() - pobiera wszystkie dane filtrów
```

### 2. Komponenty Filtrów
```typescript
// apps/web/src/components/ui/dynamic-category-filters.tsx
- Automatycznie wyświetla wszystkie kategorie z WordPress
- Buduje hierarchię na podstawie parent/child
- Pokazuje liczby produktów w czasie rzeczywistym

// apps/web/src/components/ui/dynamic-attribute-filters.tsx
- Automatycznie wyświetla wszystkie atrybuty z WooCommerce
- Pobiera terminy dla każdego atrybutu
- Filtruje terminy z liczbą produktów > 0
```

### 3. Integracja z Shop
```typescript
// apps/web/src/app/sklep/shop-client.tsx
- Obsługuje dynamiczne filtry atrybutów (pa_*)
- Automatycznie dodaje parametry do API
- Obsługuje wielokrotne wybory atrybutów
```

## 📋 Instrukcje dla Użytkownika

### Dodawanie Nowych Kategorii
1. **W WordPress Admin:**
   - Idź do `Produkty > Kategorie`
   - Dodaj nową kategorię
   - Ustaw kategorię nadrzędną (parent) jeśli potrzebna
   - Przypisz produkty do kategorii

2. **W aplikacji:**
   - Kategoria pojawi się automatycznie w filtrach
   - Hierarchia zostanie zbudowana automatycznie
   - Liczby produktów będą aktualizowane

### Dodawanie Nowych Atrybutów
1. **W WooCommerce Admin:**
   - Idź do `Produkty > Atrybuty`
   - Dodaj nowy atrybut (np. "Kolor", "Rozmiar")
   - Dodaj terminy do atrybutu
   - Przypisz atrybuty do produktów

2. **W aplikacji:**
   - Atrybut pojawi się automatycznie w sekcji "Atrybuty"
   - Wszystkie terminy będą dostępne
   - Liczby produktów będą aktualizowane

## 🔧 Konfiguracja

### Wymagane Zmienne Środowiskowe
```env
WOOCOMMERCE_API_URL=https://twoja-domena.pl/wp-json/wc/v3
WOOCOMMERCE_CONSUMER_KEY=ck_...
WOOCOMMERCE_CONSUMER_SECRET=cs_...
```

### API Endpoints
System używa standardowych endpointów WooCommerce:
- `/wp-json/wc/v3/products/categories` - kategorie
- `/wp-json/wc/v3/products/attributes` - atrybuty
- `/wp-json/wc/v3/products/attributes/{id}/terms` - terminy atrybutów

## 🎨 UI/UX Features

### Kategorie
- **Hierarchiczne wyświetlanie** z możliwością rozwijania/zwijania
- **Animacje** przy rozwijaniu/zwijaniu
- **Liczby produktów** przy każdej kategorii
- **Wszystkie kategorie** z całkowitą liczbą produktów

### Atrybuty
- **Grupowanie** według atrybutów
- **Sortowanie** terminów według liczby produktów
- **Filtrowanie** - pokazuje tylko terminy z produktami
- **Animacje** przy rozwijaniu/zwijaniu

## 🚀 Korzyści

### Dla Deweloperów
- **Zero konfiguracji** - działa out-of-the-box
- **Automatyczne aktualizacje** - nowe kategorie/atrybuty pojawiają się automatycznie
- **Skalowalność** - obsługuje dowolną liczbę kategorii i atrybutów
- **TypeScript** - pełne typowanie

### Dla Użytkowników
- **Aktualne dane** - zawsze najnowsze kategorie i atrybuty
- **Intuicyjny interfejs** - hierarchiczne wyświetlanie
- **Szybkie filtrowanie** - liczby produktów w czasie rzeczywistym
- **Responsywność** - działa na wszystkich urządzeniach

## 🔄 Aktualizacje

System automatycznie:
- **Pobiera nowe kategorie** przy każdym ładowaniu strony
- **Aktualizuje liczby produktów** przy każdym filtrowaniu
- **Buduje hierarchię** na podstawie relacji parent/child
- **Filtruje puste kategorie/atrybuty** (bez produktów)

## 🐛 Rozwiązywanie Problemów

### Kategorie się nie pokazują
1. Sprawdź czy kategorie mają przypisane produkty
2. Sprawdź połączenie z API WooCommerce
3. Sprawdź zmienne środowiskowe

### Atrybuty się nie pokazują
1. Sprawdź czy atrybuty mają terminy z produktami
2. Sprawdź czy produkty mają przypisane atrybuty
3. Sprawdź endpoint `/wp-json/wc/v3/products/attributes`

### Problemy z wydajnością
1. System używa cache'owania w API
2. Pobiera maksymalnie 100 kategorii/atrybutów na raz
3. Filtruje puste terminy automatycznie

## 📝 Przykłady Użycia

### Dodanie nowej kategorii "Kremy"
1. WordPress Admin → Produkty → Kategorie
2. Dodaj kategorię "Kremy"
3. Ustaw parent (np. "Kosmetyki")
4. Przypisz produkty
5. **Gotowe!** Kategoria pojawi się automatycznie w aplikacji

### Dodanie nowego atrybutu "Kolor"
1. WooCommerce Admin → Produkty → Atrybuty
2. Dodaj atrybut "Kolor"
3. Dodaj terminy: "Czerwony", "Niebieski", "Zielony"
4. Przypisz do produktów
5. **Gotowe!** Atrybut pojawi się automatycznie w filtrach

---

**System jest w pełni automatyczny i nie wymaga żadnej konfiguracji po instalacji!** 🎉
