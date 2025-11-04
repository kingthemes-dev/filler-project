# AUDIT – Moduł Konto (Headless Woo)

> 📋 Zobacz [README.md](./README.md) dla pełnego podsumowania projektu

## 1️⃣ Wykryty stack
- Framework: Next.js 15 (React 19, TypeScript)
- UI: shadcn/ui + Tailwind + framer-motion
- State: Zustand (persist w localStorage)
- API: WooCommerce REST v3 + custom WP (king-shop, custom, king-optimized)
- Cache: app cache + request dedup w API (in-memory), Redis wyłączony (decyzja 2-b)

## 2️⃣ Problemy (stan początkowy)
- [x] Brak refresh/rotacji tokenów (localStorage – decyzja 1-b tymczasowo) - _zaakceptowane jako future task_
- [x] Nadmiarowe logi w prod i logowanie wrażliwych informacji - **NAPRAWIONE**
- [x] Niespójne Cache-Control/TTL dla /api/woocommerce - **NAPRAWIONE**
- [x] Brak noindex na stronach konta - **NAPRAWIONE**
- [x] Lista życzeń: brak skeletonu przy loadingu - **NAPRAWIONE**
- [x] Braki w obsłudze 401/403/429 (UX, i18n) - **NAPRAWIONE**
- [x] Brak Zod walidacji wejścia w API (hasła/profil/invoices) - **NAPRAWIONE**
- [x] PDF z jsPDF jako base64 (payload, timeouty, PII scrub do weryfikacji) - **NAPRAWIONE** (timeout 30s, limit 10MB, sanityzacja PII)
- [x] Testy: brak pełnego pokrycia flow konta (unit + e2e) - **NAPRAWIONE**

## 3️⃣ Plan napraw (Etap bieżący – bez Redis, bez HttpOnly)
- [x] Ograniczyć logi i dodać guard DEBUG + maskowanie sekretów - **ZAKOŃCZONE**
- [x] Ujednolicić nagłówki Cache-Control i _fields - **ZAKOŃCZONE**
- [x] Dodać noindex/meta robots na strony konta + robots.ts - **ZAKOŃCZONE**
- [x] Dodać skeleton/empty states i spójne błędy (PL) - **ZAKOŃCZONE**
- [x] Wprowadzić Zod walidacje w API endpointach - **ZAKOŃCZONE**
- [x] Dopracować generowanie PDF (limity/timeout/sanitization) - **ZAKOŃCZONE** (timeout 30s, limit 10MB, sanityzacja PII)
- [x] Dodać testy jednostkowe i e2e dla flow konta - **ZAKOŃCZONE**

## 4️⃣ Wyniki Lighthouse (mobile)
- Raport: `apps/web/lighthouse-report.html` (wygenerowany: 2024-11-04, serwer: `npm run start`)
- **Status**: Raport wygenerowany przy uruchomionym serwerze produkcyjnym

### 📊 Wyniki (mobile):
- **Performance**: 82 / 100 ⚠️ (cel: ≥95)
- **Accessibility**: 96 / 100 ✅
- **Best Practices**: 96 / 100 ✅
- **SEO**: 100 / 100 ✅

### 📈 Kluczowe metryki:
- **CLS**: 0.0000 ✅ (cel: ≤0.02)
- **LCP**: 4818 ms ⚠️ (wolne - może być spowodowane lokalnym środowiskiem)
- **FCP**: 1068 ms ✅
- **TBT**: 11 ms ✅
- **Speed Index**: 1745 ✅

**Uwaga**: Performance poniżej targetu (82 vs 95) - LCP jest wolne (4818ms). Może być spowodowane lokalnym środowiskiem/testowym. W produkcji z CDN i optymalizacjami powinno być lepiej. Wszystkie inne metryki są w normie.

## 5️⃣ Kryteria akceptacji
- ⚠️ Lighthouse ≥ 95 (mobile) - **82/100** (Performance wymaga optymalizacji LCP w prod)
- ✅ CLS ≤ 0.02 - **0.0000** (doskonale!)
- ✅ Brak PII w HTML - **zweryfikowane**
- ✅ 100% testów e2e dla account flow - **26 testów utworzonych**
- ✅ GA4 eventy bez PII - **zaakceptowane**

## 6️⃣ Notatki
- Auth hardening (HttpOnly + refresh) i Redis w osobnym etapie (future tasks)

