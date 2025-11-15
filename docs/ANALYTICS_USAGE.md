# Analytics Usage Guide

Przewodnik używania systemu analytics w projekcie.

## Przegląd

Projekt używa Google Analytics 4 (GA4) do trackowania eventów. Implementacja znajduje się w `apps/web/src/utils/analytics.ts`.

## Konfiguracja

### Zmienne środowiskowe

```env
# Primary GA4 ID (rekomendowane)
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX

# Legacy GA ID (backward compatibility)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Google Tag Manager ID (opcjonalne)
# Jeśli ustawione, GA4 powinien być skonfigurowany w GTM
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

**Priorytet:** `NEXT_PUBLIC_GA4_ID` > `NEXT_PUBLIC_GA_ID`

### GTM vs Bezpośredni GA4

- **Jeśli `NEXT_PUBLIC_GTM_ID` jest ustawiony:** GA4 powinien być skonfigurowany w GTM, nie bezpośrednio
- **Jeśli tylko `NEXT_PUBLIC_GA4_ID` jest ustawiony:** GA4 jest ładowany bezpośrednio

## Podstawowe użycie

### Import

```typescript
import { analytics } from '@/utils/analytics';
```

### Trackowanie custom eventu

```typescript
analytics.track('custom_event_name', {
  custom_parameter: 'value',
  numeric_param: 123,
});
```

### Trackowanie page view

```typescript
analytics.trackPageView('/products', 'Products Page');
```

## E-commerce Events

### View Item (wyświetlenie produktu)

```typescript
import { analytics } from '@/utils/analytics';

analytics.trackViewItem({
  item_id: '123',
  item_name: 'Product Name',
  category: 'Electronics',
  price: 99.99,
  currency: 'PLN',
  image_url: 'https://example.com/image.jpg',
});
```

**Gdzie używać:** Na stronach produktów (`apps/web/src/app/produkt/[slug]/product-client.tsx`)

### Add to Cart (dodanie do koszyka)

```typescript
analytics.trackAddToCart({
  item_id: '123',
  item_name: 'Product Name',
  category: 'Electronics',
  price: 99.99,
  currency: 'PLN',
  quantity: 2,
});
```

**Gdzie używać:** W komponentach dodawania do koszyka

### Begin Checkout (rozpoczęcie checkoutu)

```typescript
analytics.track('begin_checkout', {
  currency: 'PLN',
  value: 199.98,
  items: [
    {
      item_id: '123',
      item_name: 'Product Name',
      category: 'Electronics',
      price: 99.99,
      quantity: 2,
    },
  ],
});
```

**Gdzie używać:** Na początku formularza checkout (`apps/web/src/app/checkout/page.tsx`)

### Purchase (zakup)

```typescript
analytics.trackPurchase({
  transaction_id: 'ORDER-12345',
  value: 199.98,
  currency: 'PLN',
  items: [
    {
      item_id: '123',
      item_name: 'Product Name',
      category: 'Electronics',
      price: 99.99,
      quantity: 2,
    },
  ],
});
```

**Gdzie używać:** Po pomyślnym utworzeniu zamówienia (`apps/web/src/app/checkout/page.tsx`)

## Event Types

Dostępne typy eventów w `EVENT_TYPES`:

```typescript
import { EVENT_TYPES } from '@/utils/analytics';

// User actions
EVENT_TYPES.PAGE_VIEW
EVENT_TYPES.BUTTON_CLICK
EVENT_TYPES.LINK_CLICK
EVENT_TYPES.FORM_SUBMIT
EVENT_TYPES.SEARCH

// E-commerce
EVENT_TYPES.VIEW_ITEM
EVENT_TYPES.ADD_TO_CART
EVENT_TYPES.REMOVE_FROM_CART
EVENT_TYPES.BEGIN_CHECKOUT
EVENT_TYPES.PURCHASE

// User engagement
EVENT_TYPES.SCROLL
EVENT_TYPES.TIME_ON_PAGE
EVENT_TYPES.VIDEO_PLAY
EVENT_TYPES.DOWNLOAD

// Errors
EVENT_TYPES.ERROR
EVENT_TYPES.API_ERROR

// Performance
EVENT_TYPES.PERFORMANCE
EVENT_TYPES.CORE_WEB_VITALS
```

## Przykłady użycia w komponentach

### Trackowanie kliknięcia przycisku

```typescript
'use client';

import { analytics } from '@/utils/analytics';

export function MyButton() {
  const handleClick = () => {
    analytics.track('button_click', {
      button_text: 'Add to Cart',
      button_id: 'add-to-cart-btn',
      page_path: window.location.pathname,
    });
    
    // Your button logic here
  };

  return <button onClick={handleClick}>Add to Cart</button>;
}
```

### Trackowanie scroll depth

```typescript
useEffect(() => {
  const handleScroll = () => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );
    
    if ([25, 50, 75, 90, 100].includes(scrollPercent)) {
      analytics.track('scroll', {
        scroll_depth: scrollPercent,
        page_path: window.location.pathname,
      });
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

### Trackowanie błędów

```typescript
try {
  // Your code
} catch (error) {
  analytics.trackError({
    message: error.message,
    stack: error.stack,
    component: 'MyComponent',
    severity: 'high',
  });
}
```

## TypeScript Types

Dostępne typy w `apps/web/src/types/ga4-events.ts`:

```typescript
import type {
  GA4EventName,
  GA4Item,
  GA4EventParameters,
  GA4ViewItemEvent,
  GA4PurchaseEvent,
} from '@/types/ga4-events';
```

## Best Practices

1. **Zawsze używaj `analytics.track()` zamiast bezpośredniego `gtag()`**
   - Zapewnia queue'owanie eventów przed inicjalizacją
   - Automatycznie dodaje metadata (timestamp, user_agent, etc.)

2. **Używaj właściwych metod dla e-commerce events**
   - `trackViewItem()` dla view_item
   - `trackAddToCart()` dla add_to_cart
   - `trackPurchase()` dla purchase

3. **Dodawaj wszystkie wymagane parametry**
   - `item_id`, `item_name`, `category`, `price`, `currency` dla e-commerce
   - `transaction_id` dla purchase

4. **Nie trackuj PII (Personally Identifiable Information)**
   - Nie używaj email, phone, address w parametrach
   - Używaj `user_id` tylko dla zalogowanych użytkowników (anonimowo)

5. **Testuj w trybie development**
   - Sprawdź czy eventy są wysyłane w DevTools > Network
   - Użyj GA4 DebugView do weryfikacji

## Consent Management

Analytics są ładowane tylko po zgodzie użytkownika (cookie consent). Eventy są queue'owane przed inicjalizacją, więc nie są tracone.

## Debugging

### Włącz debug mode

```env
NEXT_PUBLIC_DEBUG=true
```

### Sprawdź w konsoli

```javascript
// Sprawdź czy analytics jest zainicjalizowany
window.gtag

// Sprawdź dataLayer
window.dataLayer

// Sprawdź czy GA4 ID jest ustawiony
console.log('GA4 ID:', process.env.NEXT_PUBLIC_GA4_ID);
```

### GA4 DebugView

1. Zainstaluj [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
2. Otwórz GA4 > Admin > DebugView
3. Zobacz eventy w czasie rzeczywistym

## Troubleshooting

### Eventy nie są wysyłane

1. Sprawdź czy `NEXT_PUBLIC_GA4_ID` jest ustawiony
2. Sprawdź czy użytkownik zaakceptował cookies
3. Sprawdź konsolę przeglądarki pod kątem błędów
4. Sprawdź Network tab czy są requesty do `google-analytics.com`

### Duplikacja eventów

1. Sprawdź czy nie ma podwójnego ładowania GA4
2. Sprawdź czy GTM nie konfliktuje z bezpośrednim GA4
3. Upewnij się że używasz tylko jednej metody trackowania

### Eventy są queue'owane ale nie wysyłane

1. Sprawdź czy `analytics.isInitialized` jest `true`
2. Sprawdź czy `GA_CONFIG.enabled` jest `true`
3. Sprawdź czy `window.gtag` istnieje

## Dodatkowe zasoby

- [GA4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [GA4 E-commerce Events](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
- [GA4 Event Reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)

