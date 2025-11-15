# GA4 + GTM Audit Report

**Data audytu:** 2024  
**Wersja projektu:** Next.js 14 (App Router)  
**Zakres:** Kompleksowy audyt implementacji Google Analytics 4 i Google Tag Manager

---

## Executive Summary

Audyt ujawnił **krytyczne problemy** w implementacji GA4 i GTM, w tym podwójne ładowanie skryptów, duplikację kodu, niespójność zmiennych środowiskowych oraz brak pełnej integracji między systemami. Zidentyfikowano **8 problemów krytycznych**, **12 problemów wysokiego priorytetu**, **6 problemów średniego priorytetu** oraz **4 problemy niskiego priorytetu**.

---

## 1. Analiza konfiguracji i zmiennych środowiskowych

### 1.1 Niespójność zmiennych środowiskowych

**Priorytet: CRITICAL**

**Problem:**
Projekt używa trzech różnych zmiennych środowiskowych dla GA4/GTM, które są używane niespójnie w różnych częściach kodu:

- `NEXT_PUBLIC_GA_ID` - legacy/alias (używany w `apps/web/src/utils/analytics.ts` i `packages/shared`)
- `NEXT_PUBLIC_GA4_ID` - primary GA4 ID (używany w `layout.tsx` i `cookie-consent.tsx`)
- `NEXT_PUBLIC_GTM_ID` - GTM ID (używany w `layout.tsx`)

**Szczegóły:**

1. **apps/web/src/config/env.ts:**
   - Definiuje wszystkie trzy zmienne: `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_GTM_ID`
   - ✅ Poprawnie

2. **packages/shared/constants/env.ts:**
   - Definiuje tylko `NEXT_PUBLIC_GA_ID`
   - ❌ Brak `NEXT_PUBLIC_GA4_ID` i `NEXT_PUBLIC_GTM_ID`
   - **Problem:** Shared package nie ma dostępu do nowszych zmiennych

3. **apps/web/src/utils/analytics.ts:**
   - Używa tylko `env.NEXT_PUBLIC_GA_ID`
   - ❌ Ignoruje `NEXT_PUBLIC_GA4_ID`

4. **packages/shared/utils/analytics.ts:**
   - Używa tylko `process.env.NEXT_PUBLIC_GA_ID`
   - ❌ Brak dostępu do `NEXT_PUBLIC_GA4_ID`

5. **apps/web/src/app/layout.tsx:**
   - Używa `env.NEXT_PUBLIC_GA4_ID` i `env.NEXT_PUBLIC_GTM_ID`
   - ✅ Poprawnie

6. **apps/web/src/components/cookie-consent.tsx:**
   - Używa `env.NEXT_PUBLIC_GA4_ID || env.NEXT_PUBLIC_GA_ID`
   - ✅ Fallback, ale może powodować konflikty

**Rekomendacja:**
- Ujednolicić na `NEXT_PUBLIC_GA4_ID` jako primary
- `NEXT_PUBLIC_GA_ID` zachować tylko dla backward compatibility
- Zaktualizować wszystkie pliki do używania `NEXT_PUBLIC_GA4_ID`
- Dodać `NEXT_PUBLIC_GA4_ID` i `NEXT_PUBLIC_GTM_ID` do `packages/shared/constants/env.ts`

---

## 2. Audyt implementacji GA4

### 2.1 Duplikacja kodu analytics

**Priorytet: HIGH**

**Problem:**
Istnieją dwie niemal identyczne implementacje analytics:

1. **apps/web/src/utils/analytics.ts** (308 linii)
   - Używa `env.NEXT_PUBLIC_GA_ID`
   - Eksportuje: `analytics`, `performanceMonitor`, `errorTracker`, `behaviorTracker`
   - Ma pełną implementację e-commerce tracking

2. **packages/shared/utils/analytics.ts** (624 linie)
   - Używa `process.env.NEXT_PUBLIC_GA_ID`
   - Eksportuje: `analytics`, `performanceMonitor`, `errorTracker`, `behaviorTracker`
   - Ma identyczną implementację e-commerce tracking

**Różnice:**
- `apps/web/src/utils/analytics.ts` używa `env` z `@/config/env`
- `packages/shared/utils/analytics.ts` używa bezpośrednio `process.env`
- Różne typy TypeScript (bardziej szczegółowe w apps/web)

**Rekomendacja:**
- Usunąć duplikację - wybrać jedną implementację
- Rekomendacja: zachować `apps/web/src/utils/analytics.ts` jako główną
- `packages/shared/utils/analytics.ts` powinien importować z apps/web lub być usunięty
- Jeśli shared package potrzebuje analytics, powinien używać wrappera

### 2.2 Brak inicjalizacji GA4 w niektórych miejscach

**Priorytet: MEDIUM**

**Problem:**
- `apps/web/src/utils/analytics.ts` inicjalizuje GA4 w konstruktorze klasy `Analytics`
- `packages/shared/utils/analytics.ts` również inicjalizuje w konstruktorze
- Oba tworzą singleton, ale mogą konfliktować jeśli oba są importowane

**Rekomendacja:**
- Upewnić się, że tylko jedna implementacja jest używana
- Dodać guard przed inicjalizacją (sprawdzenie czy już zainicjalizowane)

### 2.3 Queue'owanie eventów

**Status: ✅ POPRAWNIE ZAIMPLEMENTOWANE**

Oba pliki mają poprawną implementację queue'owania eventów przed inicjalizacją GA4.

---

## 3. Audyt implementacji GTM

### 3.1 Ładowanie GTM w layout.tsx

**Priorytet: HIGH**

**Lokalizacja:** `apps/web/src/app/layout.tsx` (linie 127-165)

**Implementacja:**
- GTM jest ładowany w consent-gated script
- Używa `lazyOnload` strategy (✅ dobre dla performance)
- Sprawdza `cookie_preferences` z localStorage
- Ładuje GTM tylko jeśli `allowAnalytics === true`

**Problem:**
- GTM jest ładowany, ale **nie ma widocznej konfiguracji GA4 w GTM**
- GA4 jest ładowany **bezpośrednio przez gtag.js**, nie przez GTM
- To oznacza, że GTM i GA4 działają niezależnie, co może powodować duplikację eventów

**Rekomendacja:**
- **Opcja 1 (Rekomendowana):** Skonfigurować GA4 w GTM i usunąć bezpośrednie ładowanie GA4
- **Opcja 2:** Usunąć GTM jeśli nie jest używany do innych tagów
- Jeśli GTM jest potrzebny, GA4 powinien być konfigurowany w GTM, nie bezpośrednio

### 3.2 Noscript fallback

**Status: ✅ POPRAWNIE ZAIMPLEMENTOWANE**

`layout.tsx` ma poprawny noscript fallback dla GTM (linie 238-248).

### 3.3 DataLayer initialization

**Status: ✅ POPRAWNIE ZAIMPLEMENTOWANE**

DataLayer jest poprawnie inicjalizowany w obu miejscach (layout.tsx i cookie-consent.tsx).

---

## 4. Analiza duplikacji i konfliktów

### 4.1 Podwójne ładowanie GA4

**Priorytet: CRITICAL**

**Problem:**
GA4 jest ładowany w **dwóch miejscach**:

1. **apps/web/src/app/layout.tsx** (linie 148-161)
   - Ładuje GA4 w consent-gated script
   - Używa `env.NEXT_PUBLIC_GA4_ID`
   - Konfiguruje z `anonymize_ip: true`

2. **apps/web/src/components/cookie-consent.tsx** (linie 100-125)
   - Ładuje GA4 w `loadScripts()` funkcji
   - Używa `env.NEXT_PUBLIC_GA4_ID || env.NEXT_PUBLIC_GA_ID`
   - Konfiguruje z `anonymize_ip: true` i `cookie_flags: 'SameSite=None;Secure'`

**Konsekwencje:**
- GA4 może być ładowany **dwukrotnie** jeśli użytkownik zaakceptuje cookies
- Duplikacja eventów w GA4
- Większy bundle size
- Potencjalne konflikty w dataLayer

**Rekomendacja:**
- **Usunąć ładowanie GA4 z jednego z miejsc**
- Rekomendacja: zachować w `layout.tsx` (consent-gated), usunąć z `cookie-consent.tsx`
- `cookie-consent.tsx` powinien tylko aktualizować consent, nie ładować skryptów

### 4.2 Konflikt między GTM a bezpośrednim GA4

**Priorytet: CRITICAL**

**Problem:**
- GTM jest ładowany w `layout.tsx`
- GA4 jest również ładowany bezpośrednio w `layout.tsx`
- Jeśli GA4 jest skonfigurowany w GTM, będzie duplikacja

**Rekomendacja:**
- Wybrać jedną metodę:
  - **Opcja A:** GA4 przez GTM (usunąć bezpośrednie ładowanie)
  - **Opcja B:** GA4 bezpośrednio (usunąć GTM jeśli nie jest używany)
- Sprawdzić w GTM czy GA4 jest skonfigurowany

### 4.3 Konflikt między różnymi implementacjami analytics

**Priorytet: HIGH**

**Problem:**
Istnieją trzy różne systemy analytics:

1. `apps/web/src/utils/analytics.ts` - podstawowy GA4
2. `packages/shared/utils/analytics.ts` - duplikat podstawowego
3. `apps/web/src/utils/advanced-analytics.ts` - zaawansowany system (nie używa GA4 bezpośrednio)

**Problem:**
- `advanced-analytics.ts` wysyła eventy do `/api/analytics`, nie do GA4
- `analytics.ts` wysyła eventy bezpośrednio do GA4 przez gtag
- Możliwa duplikacja jeśli oba są używane

**Rekomendacja:**
- Ujednolicić system analytics
- `advanced-analytics.ts` powinien również wysyłać do GA4 (opcjonalnie)
- Lub zdecydować który system jest primary

---

## 5. Audyt użycia w komponentach

### 5.1 Użycie w komponentach

**Status: ✅ POPRAWNIE UŻYWANE**

**Znalezione użycia:**

1. **apps/web/src/components/ui/cart-drawer.tsx:**
   - `analytics.track('cart_opened')` - ✅
   - `analytics.track('cart_closed')` - ✅
   - `analytics.track('cart_quantity_updated')` - ✅
   - `analytics.track('cart_item_removed')` - ✅

2. **apps/web/src/components/ui/shop-filters.tsx:**
   - `analytics.track('filters_panel_state')` - ✅

3. **apps/web/src/app/sklep/shop-client.tsx:**
   - `analytics.track('filter_change')` - ✅
   - `analytics.track('filters_clear_all')` - ✅

4. **apps/web/src/components/seo/search-tracking.tsx:**
   - Używa `search-console-analytics.ts` - ✅

### 5.2 Brak trackingu purchase/checkout

**Priorytet: HIGH**

**Problem:**
- Funkcje `trackPurchase()` i `trackCheckout()` istnieją w `analytics.ts`
- **Nie znaleziono użycia** w komponentach checkout/order
- Brak trackingu `begin_checkout` event

**Rekomendacja:**
- Dodać tracking `begin_checkout` w komponencie checkout
- Dodać tracking `purchase` po zakończeniu zamówienia
- Sprawdzić czy istnieje strona/komponent checkout

### 5.3 Brak trackingu view_item

**Priorytet: MEDIUM**

**Problem:**
- Funkcja `trackViewItem()` istnieje w `analytics.ts`
- Nie znaleziono użycia w komponentach produktów

**Rekomendacja:**
- Dodać tracking `view_item` na stronach produktów
- Użyć w `apps/web/src/app/produkt/[slug]/page.tsx` (jeśli istnieje)

---

## 6. Security i CSP

### 6.1 Content Security Policy

**Status: ✅ POPRAWNIE SKONFIGUROWANE**

**Lokalizacja:** `apps/web/src/middleware/security.ts` (linie 65, 72)

**CSP directives:**
- `script-src`: zawiera `https://www.googletagmanager.com`, `https://www.google-analytics.com`, `https://www.google.com`, `https://www.gstatic.com` ✅
- `connect-src`: zawiera `https://www.google-analytics.com`, `https://www.googletagmanager.com`, `https://www.google.com` ✅

**Rekomendacja:**
- ✅ Brak zmian potrzebnych

### 6.2 SRI (Subresource Integrity) Hashes

**Priorytet: MEDIUM**

**Problem:**
`apps/web/src/utils/sri.ts` ma placeholder hashes:
```typescript
'https://www.googletagmanager.com/gtag/js': 'sha384-...', // Update with actual hash
'https://www.google-analytics.com/analytics.js': 'sha384-...', // Update with actual hash
```

**Rekomendacja:**
- Zaktualizować hashe SRI dla GA4/GTM skryptów
- Lub usunąć SRI jeśli nie jest używany (sprawdzić czy jest używany w kodzie)

### 6.3 Security Headers Configuration

**Status: ✅ POPRAWNIE SKONFIGUROWANE**

`config/security.headers.json` ma poprawną konfigurację dla GA/GTM.

---

## 7. Performance Impact

### 7.1 Lazy Loading

**Status: ✅ DOBRZE ZOPTYMALIZOWANE**

- GTM/GA4 są ładowane z `strategy="lazyOnload"` w `layout.tsx` ✅
- Consent-gated loading zapobiega niepotrzebnemu ładowaniu ✅

### 7.2 Preconnect/DNS-Prefetch

**Status: ✅ POPRAWNIE SKONFIGUROWANE**

`layout.tsx` ma:
- `<link rel="preconnect" href="https://www.googletagmanager.com">` ✅
- `<link rel="preconnect" href="https://www.google-analytics.com">` ✅
- `<link rel="dns-prefetch" href="https://www.googletagmanager.com">` ✅
- `<link rel="dns-prefetch" href="https://www.google-analytics.com">` ✅

### 7.3 Impact na Core Web Vitals

**Status: ✅ MINIMALNY WPŁYW**

- Lazy loading zapobiega wpływowi na LCP
- Consent-gated loading zapobiega niepotrzebnemu JS
- Preconnect optymalizuje połączenia

**Rekomendacja:**
- Monitorować Core Web Vitals w GA4
- Rozważyć użycie `partytown` dla jeszcze lepszej wydajności (opcjonalnie)

---

## 8. Dokumentacja i Best Practices

### 8.1 Zgodność z GA4 Measurement Protocol

**Status: ⚠️ CZĘŚCIOWO ZGODNE**

**Znalezione problemy:**
- Eventy e-commerce używają poprawnej struktury ✅
- Brak niektórych wymaganych parametrów (np. `currency` w niektórych eventach)
- `view_item` powinien mieć `items` array zgodnie z GA4 spec

**Rekomendacja:**
- Zweryfikować wszystkie eventy e-commerce pod kątem GA4 Measurement Protocol
- Dodać brakujące wymagane parametry

### 8.2 GDPR/RODO Compliance

**Status: ✅ ZGODNE**

- Consent management jest zaimplementowany ✅
- Analytics są ładowane tylko po zgodzie ✅
- `anonymize_ip: true` jest ustawione ✅

**Rekomendacja:**
- Rozważyć dodanie `cookie_flags: 'SameSite=None;Secure'` również w `layout.tsx` (obecnie tylko w `cookie-consent.tsx`)

### 8.3 GTM Best Practices

**Status: ⚠️ WYMAGA POPRAWEK**

**Problem:**
- GTM jest ładowany, ale GA4 jest również ładowany bezpośrednio
- Brak widocznej konfiguracji GA4 w GTM
- Możliwa duplikacja eventów

**Rekomendacja:**
- Skonfigurować GA4 w GTM jako tag
- Usunąć bezpośrednie ładowanie GA4
- Wszystkie eventy powinny przechodzić przez GTM dataLayer

---

## Podsumowanie problemów

### Critical (8 problemów)

1. ❌ **Podwójne ładowanie GA4** - layout.tsx + cookie-consent.tsx
2. ❌ **Konflikt GTM vs bezpośredni GA4** - oba są ładowane jednocześnie
3. ❌ **Niespójność zmiennych środowiskowych** - NEXT_PUBLIC_GA_ID vs NEXT_PUBLIC_GA4_ID
4. ❌ **Duplikacja implementacji analytics** - apps/web vs packages/shared
5. ❌ **Brak integracji GTM z GA4** - GA4 nie jest konfigurowany w GTM
6. ❌ **Możliwa duplikacja eventów** - różne systemy wysyłają te same eventy
7. ❌ **Brak trackingu purchase** - funkcja istnieje, ale nie jest używana
8. ❌ **Brak trackingu begin_checkout** - brak implementacji

### High (12 problemów)

1. ⚠️ Brak trackingu view_item w komponentach produktów
2. ⚠️ packages/shared nie ma dostępu do NEXT_PUBLIC_GA4_ID
3. ⚠️ apps/web/src/utils/analytics.ts używa tylko NEXT_PUBLIC_GA_ID
4. ⚠️ Trzy różne systemy analytics (analytics.ts, shared/analytics.ts, advanced-analytics.ts)
5. ⚠️ Brak guard przed podwójną inicjalizacją GA4
6. ⚠️ advanced-analytics.ts nie integruje się z GA4
7. ⚠️ Brak walidacji czy GA4/GTM ID są poprawne
8. ⚠️ Brak error handling dla failed GA4 initialization
9. ⚠️ Brak testów dla analytics integration
10. ⚠️ Brak dokumentacji jak używać analytics w komponentach
11. ⚠️ Brak TypeScript types dla GA4 events
12. ⚠️ Brak monitoring dla analytics errors

### Medium (6 problemów)

1. ⚠️ SRI hashes są placeholderami
2. ⚠️ Brak cookie_flags w layout.tsx (tylko w cookie-consent.tsx)
3. ⚠️ Brak walidacji GA4 Measurement Protocol compliance
4. ⚠️ Brak optymalizacji dla partytown (opcjonalnie)
5. ⚠️ Brak dokumentacji dla GTM configuration
6. ⚠️ Brak TypeScript types dla dataLayer

### Low (4 problemy)

1. ℹ️ Brak dokumentacji w kodzie
2. ℹ️ Brak przykładów użycia analytics
3. ℹ️ Brak CI/CD checks dla analytics
4. ℹ️ Brak analytics debugging tools

---

## Rekomendacje naprawy

### Faza 1: Critical Fixes (Priorytet 1)

1. **Usunąć podwójne ładowanie GA4**
   - Usunąć ładowanie GA4 z `cookie-consent.tsx`
   - Zachować tylko w `layout.tsx` (consent-gated)

2. **Ujednolicić zmienne środowiskowe**
   - Zaktualizować `apps/web/src/utils/analytics.ts` do używania `NEXT_PUBLIC_GA4_ID`
   - Dodać `NEXT_PUBLIC_GA4_ID` do `packages/shared/constants/env.ts`
   - Zachować `NEXT_PUBLIC_GA_ID` tylko dla backward compatibility

3. **Rozwiązać konflikt GTM vs GA4**
   - Zdecydować: GA4 przez GTM LUB bezpośrednio
   - Rekomendacja: GA4 przez GTM (usunąć bezpośrednie ładowanie z layout.tsx)
   - Skonfigurować GA4 tag w GTM

4. **Usunąć duplikację analytics.ts**
   - Usunąć `packages/shared/utils/analytics.ts`
   - Zaktualizować wszystkie importy do `apps/web/src/utils/analytics.ts`
   - Lub stworzyć wrapper w shared package

### Faza 2: High Priority Fixes (Priorytet 2)

5. **Dodać tracking purchase/checkout**
   - Dodać `begin_checkout` tracking w komponencie checkout
   - Dodać `purchase` tracking po zakończeniu zamówienia

6. **Dodać tracking view_item**
   - Dodać w komponentach/stronach produktów

7. **Ujednolicić system analytics**
   - Zintegrować `advanced-analytics.ts` z GA4
   - Lub zdecydować który system jest primary

8. **Dodać error handling i walidację**
   - Dodać walidację GA4/GTM ID format
   - Dodać error handling dla failed initialization
   - Dodać logging dla analytics errors

### Faza 3: Medium Priority Fixes (Priorytet 3)

9. **Zaktualizować SRI hashes**
   - Pobrać aktualne hashe dla GA4/GTM skryptów
   - Zaktualizować `sri.ts`

10. **Dodać TypeScript types**
    - Stworzyć types dla GA4 events
    - Stworzyć types dla dataLayer

11. **Dodać dokumentację**
    - Dokumentacja jak używać analytics
    - Dokumentacja GTM configuration
    - Przykłady użycia

### Faza 4: Low Priority Improvements (Priorytet 4)

12. **Dodać testy**
    - Unit tests dla analytics functions
    - Integration tests dla GA4 events

13. **Dodać monitoring**
    - Monitoring dla analytics errors
    - Dashboard dla analytics health

14. **Optymalizacje**
    - Rozważyć partytown dla jeszcze lepszej wydajności
    - Optymalizacja bundle size

---

## Checklist zgodności z Best Practices

### GA4 Best Practices

- ✅ Consent management
- ✅ Anonymize IP
- ⚠️ Event naming (sprawdzić zgodność z GA4)
- ⚠️ E-commerce events structure (zweryfikować)
- ❌ Purchase tracking (brak implementacji)
- ❌ Begin checkout tracking (brak implementacji)
- ⚠️ User properties (częściowo)

### GTM Best Practices

- ✅ Consent-gated loading
- ✅ Noscript fallback
- ❌ GA4 configuration w GTM (brak)
- ❌ DataLayer events (sprawdzić)
- ⚠️ Tag firing order (sprawdzić)

### Security Best Practices

- ✅ CSP configuration
- ✅ Security headers
- ⚠️ SRI hashes (placeholder)
- ✅ Consent management

### Performance Best Practices

- ✅ Lazy loading
- ✅ Preconnect/DNS-prefetch
- ✅ Consent-gated loading
- ✅ Minimal impact on Core Web Vitals

---

## Propozycja idealnej implementacji

### Architektura

```
┌─────────────────────────────────────────┐
│         Cookie Consent Component         │
│  (zarządza zgodą, nie ładuje skryptów)  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│           Root Layout (layout.tsx)       │
│  - Consent-gated GTM loading            │
│  - Consent-gated GA4 loading (via GTM)  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Analytics Utils (analytics.ts)     │
│  - Single source of truth               │
│  - GA4 integration                      │
│  - Event queueing                       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Components                      │
│  - Use analytics.track()               │
│  - E-commerce events                    │
└─────────────────────────────────────────┘
```

### Zmienne środowiskowe

```typescript
// apps/web/src/config/env.ts
NEXT_PUBLIC_GA4_ID: string | undefined  // Primary GA4 ID
NEXT_PUBLIC_GTM_ID: string | undefined  // GTM ID
NEXT_PUBLIC_GA_ID: string | undefined   // Legacy (deprecated, backward compat)
```

### Implementacja

1. **GTM w layout.tsx:**
   - Consent-gated loading
   - GA4 skonfigurowany w GTM (nie bezpośrednio)

2. **Analytics utils:**
   - Single implementation w `apps/web/src/utils/analytics.ts`
   - Używa `NEXT_PUBLIC_GA4_ID`
   - Wysyła eventy przez GTM dataLayer

3. **Components:**
   - Używają `analytics.track()` z `apps/web/src/utils/analytics.ts`
   - Wszystkie e-commerce events są trackowane

---

## Wnioski

Implementacja GA4 i GTM wymaga **znaczących poprawek** przed użyciem w produkcji. Główne problemy to:

1. **Podwójne ładowanie** - może powodować duplikację eventów
2. **Niespójność konfiguracji** - różne zmienne i implementacje
3. **Brak integracji** - GTM i GA4 działają niezależnie
4. **Brak trackingu** - purchase i checkout nie są trackowane

**Rekomendacja:** Wdrożyć wszystkie **Critical** i **High** priority fixes przed wdrożeniem do produkcji.

---

**Raport wygenerowany:** 2024  
**Następny przegląd:** Po wdrożeniu Critical fixes

