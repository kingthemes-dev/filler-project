# 🚚 Free Shipping Banner - Konfiguracja

## Wymagania

### ✅ 1. Zmienne środowiskowe (.env.local)

W katalogu `apps/web/` utwórz plik `.env.local`:

```bash
# WordPress URL
NEXT_PUBLIC_WORDPRESS_URL=https://qvwltjhdjw.cfolks.pl

# WooCommerce API
NEXT_PUBLIC_WC_URL=https://qvwltjhdjw.cfolks.pl/wp-json/wc/v3
WC_CONSUMER_KEY=ck_deb61eadd7301ebfc9254074ce7c53c6668eb725d
WC_CONSUMER_SECRET=cs_0de18ed0e013f96aebfb51c77f506bb94e416cb8

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3001
```

### ✅ 2. Zależności NPM

Komponent używa następujących bibliotek socialnie w `package.json`:

```bash
npm install zustand framer-motion lucide-react
```

Lub używając pnpm:
```bash
pnpm install
```

### ✅ 3. Store (useCartStore)

Komponent wymaga działającego `cart-store.ts` z następującymi właściwościami:
- `total` - sumaryczna wartość koszyka (brutto)
- `itemCount` - liczba produktów w koszyku

### ✅ 4. Konfiguracja stałych

Wartości konfiguracyjne znajdują się w `src/config/constants.ts`:

```typescript
export const SHIPPING_CONFIG = {
  FREE_SHIPPING_THRESHOLD: 200, // PLN netto
  VAT_RATE: 1.23, // Polish VAT rate
} as const;
```

**Możesz zmienić próg darmowej dostawy** edytując `FREE_SHIPPING_THRESHOLD` w pliku `src/config/constants.ts`.

## Funkcjonalność

### 📊 Jak działa

1. **Progres bar** - pokazuje ile brakuje do darmowej dostawy (tylko gdy koszyk nie jest pusty)
2. **Ukrywanie po scrollu** - banner znika po pierwszym scrolu i nie pokazuje się ponownie
3. **Animacja tekstu** - tekst mruga co 5 sekund (2x blink)
4. **Responsywność** - inny tekst na mobile vs desktop
5. **Dynamiczna kalkulacja**:
   - Wartość brutto (z VAT) → wartość netto
   - Porównanie z progiem 200 zł netto
   - Pokazuje brakującą kwotę lub informację o darmowej dostawie

### 🎨 Styling

- Monochromatyczny design (czarno-biały, emerald-400 dla akcentów)
- Sticky banner na górze strony (z-index: 100)
- Progress bar z gradientem zielonym
- Mobile-first responsive

## Testowanie

### Lokalnie

```bash
cd apps/web
npm run dev
# lub
pnpm dev
```

Aplikacja będzie dostępna na: `http://localhost:3001`

### Jak przetestować banner

1. **Dodaj produkty do koszyka** - otwórz dowolny produkt i dodaj do koszyka
2. **Sprawdź progres bar**:
   - Produkty za < 200 zł netto → pokazuje ile brakuje
   - Produkty za ≥ 200 zł netto → pokazuje ✅ "Masz darmową dostawę!"
3. **Scroll w dół** → banner znika
4. **Scroll z powrotem do góry** → banner nie pokazuje się ponownie

## Pliki związane

- `src/components/ui/free-shipping-banner.tsx` - główny komponent
- `src/components/ui/cart-drawer.tsx` - używa tej samej konfiguracji
- `src/app/checkout/page.tsx` - używa tej samej konfiguracji
- `src/config/constants.ts` - konfiguracja stałych
- `src/stores/cart-store.ts` - cart store

## Troubleshooting

### Banner nie pokazuje się

✅ Sprawdź czy:
- `useCartStore` działa poprawnie
- Wartość `total` i `itemCount` są dostępne
- Nie ma błędów w konsoli przeglądarki

### Progres bar nie działa

✅ Sprawdź czy:
- `SHIPPING_CONFIG` jest poprawnie zaimportowany
- Wartość `VAT_RATE` jest poprawna (1.23 dla PL)
- Wartość `total` w koszyku jest prawidłowa

### Teks nie animuje się

✅ Sprawdź czy:
- `framer-motion` jest zainstalowany
- `motion.div` jest poprawnie użyty
- Nie ma konfliktów z innymi animacjami

## Commit zmiany

Po konfiguracji wykonaj:

```bash
git add .
git commit -m "✨ Add Free Shipping Banner configuration"
git push origin main
```

## Notatki

- Komponent jest zgodny z Mobile-first design approach
- Wszystkie wartości są skonfigurowane przez constants (bez hardcoded values)
- Komponent jest odpowiedzialny za monochromatyczny design
- VAT rate można zmienić globalnie w `SHIPPING_CONFIG`

