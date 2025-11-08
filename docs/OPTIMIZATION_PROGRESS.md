#
# Postęp optymalizacji API – stan na 2025-11-08

> Dokument uporządkowany po synchronizacji dokumentacji. Poprzednie dane (sprzed refaktoryzacji loggerów i rate limitingu) są historyczne. Poniżej zdefiniowano nową ramę do monitorowania postępów.

---

## 1. Status ogólny

| Obszar | Co mamy | Co trzeba potwierdzić | Kolejny krok |
| --- | --- | --- | --- |
| Rate limiting & exemptions | Middleware `security.ts` ma `isRateLimitExempt()` dla perf testów. | 🔍 Trzeba potwierdzić, że wszystkie mutacje używają centralnego limitera (`checkEndpointRateLimit`). | Zamapować endpointy i dodać brakujące wywołania. |
| `/api/home-feed` optymalizacja | Równoległe pobieranie, mniejsza liczba requestów. | 📊 Brak świeżych metryk p95/p99 (backend testowy offline). | Uruchomić `perf:autocannon:warm/cold` i zapisać wyniki. |
| Logger & typing cleanup | Endpointy i serwisy korzystają z `logger`; ESLint ponownie pilnuje błędów. | ⚠️ Wciąż setki ostrzeżeń (`no-explicit-any`, hook deps) do triage. | Zaplanować cleanup ostrzeżeń i monitorować regresje. |
| k6 baseline | Skrypty gotowe (`perf-k6.js`). | 📊 Brak aktualnych raportów (ostatnie odnosiły się do starego kodu). | Uruchomić test i wgrać raport do `performance-results-k6.json`. |
| Observability (RED) | Brak dashboardu / alertów. | ⏳ Do zaplanowania z zespołem SRE. | Zebrać wymagania i zapisać w backlogu. |

---

## 2. Jak mierzyć (proponowany workflow)

```bash
# 1. Uruchom lokalnie dev server (jeżeli potrzebujesz)
pnpm --filter @headless-woo/web dev

# 2. Baseline – Autocannon
pnpm --filter @headless-woo/web perf:autocannon:warm
pnpm --filter @headless-woo/web perf:autocannon:cold

# 3. Baseline – k6 (opcjonalnie / wymagany k6)
pnpm --filter @headless-woo/web perf:k6

# 4. Po testach zapisz wyniki:
#    - docs/OPTIMIZATION_PROGRESS.md (skrót)
#    - performance-results-autocannon.json / performance-results-k6.json (pełne dane)
```

> Utrzymuj wersjonowanie wyników (np. `2025-11-08-autocannon-warm.json`) – łatwiej porównać.

---

## 3. Tabela wyników (do wypełnienia po testach)

| Data | Scenariusz | p50 | p95 | p99 | Błąd | Notatki |
| --- | --- | --- | --- | --- | --- | --- |
| 2025-11-08 | ⚠️ Testy wstrzymane | - | - | - | brak środowiska | Backend WP niedostępny – testy perf przeniesione po przywróceniu środowiska. |

> Zalecany format notatek: `"Autocannon warm – 100 req/s, concurrency 20"`, `"k6 1m ramp, 50 vus"` itp.

---

## 4. Backlog optymalizacji (priorytety)

| Priorytet | Zadanie | Stan | Uwagi |
| --- | --- | --- | --- |
| P0 | Przebiec baseline i zaktualizować metryki | ☐ | Blocker: brak dostępu do środowiska WP/staging. |
| P0 | Sprawdzić rate limiting na wszystkich mutacjach | ☐ | Współpraca z security. |
| P1 | Observability – dashboard / alerty (RED) | ☐ | Do uzgodnienia z SRE. |
| P1 | Stores/utils – dokończyć `no-explicit-any` | ☐ | Triage ostrzeżeń ESLint po re-enforce. |
| P2 | Cache strategy deep dive (ETag, TTL) | ☐ | Wymaga danych z performance. |

---

## 5. Notatki historyczne

- 2025-11-08 – dokument wyzerowany po synchronizacji doców; poprzednie dane dostępne w Git history.  
- 2025-11-08 – ESLint ponownie wymusza build; testy `perf:*` oczekują na przywrócenie środowiska WP.  
- 2025-11-06–07 – refaktoryzacja loggerów, rate limitingu i `/api/home-feed`.  
- Archiwalne szczegóły: zobacz historię pliku lub poprzednie commit'y (np. `git show HEAD~1:docs/OPTIMIZATION_PROGRESS.md`).

---

## 6. Rekomendacje operacyjne

1. Po każdych większych zmianach w API/MU -> odpal `perf:autocannon` i `perf:k6`.  
2. Dokumentuj odchylenia (nowe alerty, spike w p95/p99) tutaj i w `STATUS_SUMMARY.md`.  
3. Jeśli testy robisz w CI – dołącz link do raportu/artefaktu.  
4. Jeśli brak czasu na pełny test – przynajmniej uruchom `perf:autocannon:warm` i zanotuj wynik.

---

**Ostatnia aktualizacja:** 2025-11-08 (reset statusu).  
**Kontakt:** `@performance-lead`, `@backend-lead`, `@devops`.**
