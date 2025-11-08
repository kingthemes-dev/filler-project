# Kompendium komponentów i stanów

## Inwentarz komponentów React

<!-- AUTO:COMP-START -->

#### Komponenty domenowe (`apps/web/src/components`)

| Plik | Eksporty |
| --- | --- |
| `admin-nav.tsx` | AdminNav |
| `conditional-footer.tsx` | ConditionalFooter |
| `cookie-consent.tsx` | CookieConsent |
| `defer-client-ui.tsx` | DeferClientUI |
| `error-boundary.tsx` | ErrorBoundary |
| `king-hero-rounded.tsx` | KingHeroRounded |
| `king-product-card.tsx` | KingProductCard |
| `king-product-grid.tsx` | KingProductGrid |
| `king-product-tabs-server.tsx` | KingProductTabsServer |
| `king-product-tabs.tsx` | KingProductTabs |
| `logout-button.tsx` | LogoutButton |
| `PerformanceTracker.tsx` | PerformanceTracker |
| `product-image-server-preload.tsx` | ProductImageServerPreload |
| `seo/search-tracking.tsx` | SearchTracking |
| `shop-data-prefetcher.tsx` | ShopDataPrefetcher |
| `shop-products-grid.tsx` | ShopProductsGrid |

#### Komponenty UI / shadcn (`apps/web/src/components/ui`)

| Plik | Eksporty |
| --- | --- |
| `ui/active-filters-bar.tsx` | ActiveFiltersBar |
| `ui/advanced-dropdown.tsx` | AdvancedDropdown |
| `ui/alert.tsx` | Alert, AlertDescription |
| `ui/animated-dropdown.tsx` | AnimatedDropdown |
| `ui/auth/auth-modal-manager.tsx` | AuthModalManager |
| `ui/auth/auth-provider.tsx` | AuthProvider |
| `ui/auth/forgot-password-modal.tsx` | ForgotPasswordModal |
| `ui/auth/login-modal.tsx` | LoginModal |
| `ui/auth/register-modal.tsx` | RegisterModal |
| `ui/badge.tsx` | Badge |
| `ui/breadcrumbs.tsx` | Breadcrumbs |
| `ui/button.tsx` | Button |
| `ui/card.tsx` | Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent |
| `ui/cart-drawer.tsx` | CartDrawer |
| `ui/category-tabs.tsx` | CategoryTabs |
| `ui/cls-optimizer.tsx` | CLSOptimizer, ImageCLSOptimizer, ProductCardCLSOptimizer, Skeleton |
| `ui/dynamic-attribute-filters.tsx` | DynamicAttributeFilters |
| `ui/dynamic-category-filters.tsx` | DynamicCategoryFilters |
| `ui/email/email-notification-center.tsx` | EmailNotificationCenter |
| `ui/favorites-modal.tsx` | FavoritesModal |
| `ui/favorites-sync-provider.tsx` | FavoritesSyncProvider |
| `ui/footer.tsx` | Footer |
| `ui/free-shipping-banner.tsx` | FreeShippingBanner |
| `ui/global-breadcrumbs.tsx` | GlobalBreadcrumbs |
| `ui/header.tsx` | Header |
| `ui/hierarchical-categories.tsx` | HierarchicalCategories |
| `ui/hierarchical-category-filters.tsx` | HierarchicalCategoryFilters |
| `ui/input.tsx` | Input |
| `ui/invoice-pdf-generator.tsx` | InvoicePDFGenerator |
| `ui/label.tsx` | Label |
| `ui/modal-close-button.tsx` | ModalCloseButton |
| `ui/newsletter-form.tsx` | NewsletterForm |
| `ui/page-container.tsx` | PageContainer |
| `ui/page-header.tsx` | PageHeader |
| `ui/pagination.tsx` | Pagination |
| `ui/popup-chips-motion.tsx` | PopupChipsMotion |
| `ui/quick-view-modal.tsx` | QuickViewModal |
| `ui/recaptcha-provider.tsx` | RecaptchaProvider |
| `ui/review-form.tsx` | ReviewForm |
| `ui/reviews-list.tsx` | ReviewsList |
| `ui/search-modal.tsx` | SearchModal |
| `ui/select.tsx` | Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue |
| `ui/shop-dropdown.tsx` | ShopDropdown |
| `ui/shop-explore-panel.tsx` | ShopExplorePanel |
| `ui/shop-filters.tsx` | ShopFilters |
| `ui/similar-products.tsx` | SimilarProducts |
| `ui/tabs.tsx` | Tabs, TabsList, TabsTrigger, TabsContent |
| `ui/test-form.tsx` | TestFormUnderNewsletter |
| `ui/textarea.tsx` | Textarea |
| `ui/threads.tsx` | Threads |
| `ui/universal-attribute-filters.tsx` | UniversalAttributeFilters |
| `ui/universal-category-filters.tsx` | UniversalCategoryFilters |
| `ui/universal-shop-filters.tsx` | UniversalShopFilters |

#### Hooki (`apps/web/src/hooks`)

| Plik | Eksporty |
| --- | --- |
| `hooks/use-debounced-callback.ts` | useDebouncedCallback |
| `hooks/use-favorites-sync.ts` | useFavoritesSync |
| `hooks/use-performance-optimization.ts` | useLCPOptimization, useCLSOptimization, useFIDOptimization, useTTFBOptimization, usePageLoadOptimization, useResourcePreloading, useImageOptimization, useBundleOptimization, usePerformanceMonitoring |
| `hooks/use-viewport-height-var.ts` | useViewportHeightVar |
| `hooks/use-wishlist.ts` | useWishlist |

#### Store’y Zustand – web (`apps/web/src/stores`)

| Plik | Eksporty |
| --- | --- |
| `stores/auth-modal-store.ts` | useAuthModalStore |
| `stores/auth-store.ts` | useAuthStore |
| `stores/cart-store.ts` | useCartStore |
| `stores/favorites-store.ts` | useFavoritesStore |
| `stores/quickview-store.ts` | useQuickViewStore |
| `stores/shop-data-store.ts` | useShopDataStore, useShopCategories, useShopAttributes, useShopStats, useShopDataActions |
| `stores/wishlist-store.ts` | useWishlistStore |

#### Store’y współdzielone (`packages/shared/stores`)

| Plik | Eksporty |
| --- | --- |
| `auth-store.ts` | useAuthStore |
| `cart-store.ts` | useCartStore |
| `favorites-store.ts` | useFavoritesStore |
| `wishlist-store.ts` | useWishlistStore |

<!-- AUTO:COMP-END -->

- **Layout i shell**: `page-container`, `page-header`, `header`, `footer`, `conditional-footer`, `global-breadcrumbs`.
- **Karty produktów**: `king-product-card`, `king-product-grid`, `shop-products-grid`, `similar-products`, `quick-view-modal`.
- **Filtrowanie i wyszukiwarka**: `shop-filters`, `shop-explore-panel`, `hierarchical-*`, `dynamic-attribute-filters`, `active-filters-bar`, `search-modal`, `shop-dropdown`.
- **Checkout / koszyk**: `cart-drawer`, `quick-view-modal`, `favorites-modal`, `favorites-sync-provider`, komponenty zarządzające kuponami i wariantami.
- **Autoryzacja**: `auth-provider`, `auth-modal-manager`, `login-modal`, `register-modal`, `forgot-password-modal`, `logout-button`.
- **Content marketing**: `king-hero-rounded`, `newsletter-form`, `threads`, `free-shipping-banner`, `PerformanceTracker`, `seo/search-tracking`.
- **UI bazowe (shadcn/tailwind)**: `ui/button`, `ui/input`, `ui/select`, `ui/textarea`, `ui/card`, `ui/badge`, `ui/alert`, `ui/tabs`, `ui/modal-close-button`, `ui/advanced-dropdown`.
- **Serwerowe prefetchery**: `product-image-server-preload`, `king-product-tabs-server`, `shop-data-prefetcher`, `defer-client-ui`.

> Szczegółowe nazwy znajdziesz w `apps/web/src/components/`. Struktura jest płaska, podkatalog `ui/` zawiera atomy i elementy shadcn.

## Hooki i helpery UI
- `use-debounced-callback`: throttling wpisów w wyszukiwarce i filtrach.
- `use-favorites-sync`: synchronizacja ulubionych (Zustand ⇄ API / localStorage).
- `use-performance-optimization`: wysyła metryki Web Vitals do `app/api/performance/*`.
- `use-viewport-height-var`: CSS `--vh` dla mobilnych layoutów.
- `use-wishlist`: skrócona obsługa listy życzeń (współdzielona z mobile).

Hooki rezydują w `apps/web/src/hooks/`, wszystkie są klientowe (`'use client'`).

## Sklepy Zustand
| Store | Plik | Zakres |
| --- | --- | --- |
| `useAuthStore` | `auth-store.ts` | Stan użytkownika, tok logowania, refresh profilu. |
| `useCartStore` | `cart-store.ts` | Pozycje koszyka, sumy brutto (VAT), integracja z Woo Store API via `wooCommerceService`. |
| `useFavoritesStore` | `favorites-store.ts` | Ulubione produkty i synchronizacja z API. |
| `useWishlistStore` | `wishlist-store.ts` | Lista życzeń (różni się od ulubionych przez segmentację B2B/B2C). |
| `useQuickviewStore` | `quickview-store.ts` | Sterowanie modalem podglądu. |
| `useAuthModalStore` | `auth-modal-store.ts` | Sekwencja modali logowania/rejestracji. |
| `useShopDataStore` | `shop-data-store.ts` | Cache zapytań dla list produktowych i filtrów. |

Wszystkie store’y używają `persist` (localStorage) lub sesji; nie eksportują żadnych danych publicznych na serwer. Przy modyfikacjach zachowuj wzór: akcje typowane, pure functions, brak bezpośrednich wywołań fetch w setterach (poza obsługą optymistyczną).

## Konwencje propsów i stany ładowania
- **Nazewnictwo**: `on*` dla handlerów, `is*` dla booleanów. Komponenty UI przyjmują `className` do rozszerzeń tailwindowych.
- **Typowanie**: preferowane `type Props = { ... }` + `React.FC<Props>` lub funkcje bez FC. Złożone obiekty importują typy z `packages/shared/types`.
- **Loading**:
  - Skeletony (`animate-pulse`, `cls-optimizer`) dla kart i podglądów.
  - Modale (np. `quick-view-modal`) renderują loading spinner zanim pojawią się dane.
  - W PDP `product-client.tsx` zwraca fallback `<p>Ładowanie produktu...>` zanim `react-query` zakończy fetch.
- **Błędy**:
  - `components/error-boundary.tsx` opakowuje newralgiczne sekcje (np. dynamiczne filtry).
  - `createErrorResponse` w API normalizuje błędy; w UI mapowane do `toasts` / `alert`.

## Wytyczne Tailwind / shadcn
- Tailwind: korzystamy z tokenów CSS (np. `var(--background)`) zdefiniowanych w `tailwind.config.ts`. Trzymaj się utility-first, unikać inline `style`.
- shadcn/ui: komponenty w `components/ui/*` mają przeniesione warianty `(button.tsx, select.tsx, tabs.tsx)`. Dodając nowe, kopiuj wzór (forwardRef, `cn()`).
- Animacje: standardowe nazwy (`fade-in`, `slide-up`, `gradient-x`) – dostępne w `tailwind.config.ts`.
- Responsywność: projekt zakłada breakpoints Tailwind. Nie używamy własnych media queries bez potrzeby.

## Dostępność
- Formularze: `label` i `input` z `id/htmlFor`, aria-label tam gdzie ikonowe przyciski (np. ulubione).
- Modale: shadcn dialog zapewnia focus trap, a `modal-close-button` ma `aria-label`.
- Karuzele/galerie: `ImageCLSOptimizer` dodaje `alt`, miniatury PDP są przyciskami z `aria-pressed`.
- Kolorystyka: paleta generowana z CSS variables – zapewnia kontrast (≥4.5) w trybie jasnym.

## Granice komponentów serwer/klient
- **Strona główna (`app/page.tsx`)**: RSC pobiera dane (`getHomeFeedData`) i przekazuje do `KingProductTabsServer`. Sekcje newslettera hero są statyczne, komponenty animowane (np. `threads`) renderują się po stronie klienta dzięki `dynamic()`.
- **Katalog (`app/sklep/page.tsx`)**: RSC renderuje layout + prefetcher (`shop-data-prefetcher`). Filtry i siatka produktów (`shop-filters`, `shop-products-grid`) są komponentami klienckimi – korzystają z Zustand i fetchy `react-query`.
- **PDP (`app/produkt/[slug]/page.tsx`)**: Strona serwerowa tylko pobiera `params` i renderuje klientowy `ProductClient`. Sam klient ładuje produkt, warianty, recenzje (react-query), synchronizuje z `useCartStore`.
- **Koszyk / checkout**: Moduły w `components/ui` są klientowe (hooki, localStorage). Dane zamówień pobierane są przez API `woocommerce` (server-only).
- **Analityka**: `app/api/edge/analytics` to Edge runtime; UI korzysta z `<PerformanceTracker />` i wysyła metryki do serwerowego API (Node).

## Wzorce ładowania, błędów i fallbacków
- **Prefetch**: `shop-data-prefetcher` i `product-image-server-preload` inicjują SSR fetch, ale ostateczne dane doczytuje klient (progressive hydration).
- **Fallback**: MU‑pluginy zwracają fallbackowe dane (puste listy) – UI jest na to przygotowane (sekcje z komunikatem „Brak produktów”).
- **Retry**: `react-query` ma domyślne retry (3 podejścia). W PDP błędy zamieniane są na komunikaty (`Produkt nie znaleziony`) bez crashu strony.

## Polecane praktyki przy rozbudowie
- Dokładając nowy komponent – trzymaj go w odpowiednim segmencie (`ui`, `seo`, `auth`, `shop`). Dla atomów preferuj `ui/`.
- Korzystaj z `cn()` (shadcn) do łączenia klas.
- W UI używaj polskich etykiet (preferencja klienta).
- Zanim dodasz nowy store, sprawdź `packages/shared/stores` – wiele z nich jest współdzielonych z aplikacją mobilną.
- Zmieniaj tylko klientowe komponenty, gdy musisz sięgać po `window` / `localStorage`. Inaczej preferuj RSC i przenoszenie fetchy na serwer dla lepszego TTFB.

---

📚 Kolejne dokumenty:
- Architektura i przepływy danych – `ARCHITECTURE.md`
- Szczegóły API i mapowanie endpointów – `API.md`
- Onboarding i kontekst biznesowy – `KING_Headless_Enterprise.md`

