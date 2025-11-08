# Podsumowanie statusu – wymaga ponownego ustalenia

**Data aktualizacji:** 2025-11-08  
**Status ogólny:** ⚠️ WYMAGA WALIDACJI  
**Notatka:** Dotychczasowy tracking (sprzed refaktoryzacji i synchronizacji dokumentacji) nie odpowiada aktualnemu stanowi prac. Poniższe sekcje służą jako szablon do ponownego „rebaseliningu”.

---

## 📋 Syntetyczna ocena obszarów

| Obszar | Poprzedni status | Co wiemy dzisiaj | Kolejny krok |
| --- | --- | --- | --- |
| API & MU-plugins | ~60–100% | Kod MU bez zmian funkcjonalnych; brak świeżych metryk po synchronizacji. CSRF/CSP zmienione tylko w warstwie web. | Spotkanie z właścicielem backendu – zebrać logi i potwierdzić P0/P1 po ostatnim deployu. |
| Bezpieczeństwo | 65% | CSRF middleware obsługuje JSON, CSP bez `unsafe-inline`. Rate limiting/reCAPTCHA nadal wymagają walidacji w produkcji. | Audyt z zespołem security + smoke testy reCAPTCHA i rate limitów. |
| Wydajność | 60% | ESLint ponownie wymuszony; brak aktualnych wyników `perf:autocannon`/`perf:k6` (backend testowy niedostępny). | Uruchomić testy wydajności po podłączeniu środowiska WP i zaktualizować `OPTIMIZATION_PROGRESS.md`. |
| Jakość / Testy | 30% | Lint znów blokuje build (setki warningów do triage); coverage/E2E nadal historyczne. | Zaplanować cleanup ostrzeżeń ESLint i odświeżyć raport coverage/E2E. |
| Observability | 10% | Brak postępu – wciąż brak dashboardów RED i alertingu. | Zespół SRE – zdefiniować zakres metryk i harmonogram wdrożenia. |
| Deployment guide | 100% | Struktura aktualna; dodano wymóg uruchamiania ESLint w CI. | Przy najbliższym wdrożeniu potwierdzić checklistę oraz wyniki testów perf. |

---

## 🧭 Zalecany plan rebaseliningu

1. **Zwołać krótkie spotkanie właścicieli obszarów**  
   - Backend/API  
   - Security/DevOps  
   - Observability/SRE

2. **Dla każdego obszaru uzupełnić w tabeli poniżej:**
   - aktualny status, % i datę potwierdzenia,
   - właściciela i priorytet P0/P1,
   - najbliższy krok (np. test, wdrożenie, dokument).

3. **Zsynchronizować dokumenty pomocnicze:**  
   - `SECURITY_OVERVIEW.md` (po audycie security)  
   - `OPTIMIZATION_PROGRESS.md` (po testach perf)  
   - `DEPLOYMENT_GUIDE.md` (po kolejnym wdrożeniu)

4. **(Opcjonalnie)** podlinkować w tej sekcji zadania z Jiry/Linear, jeśli to tam trzymacie szczegółowy backlog.

---

## 📈 Szablon statusów do wypełnienia

| Sekcja | Status | % | Priorytet / właściciel | Ostatnia walidacja | Najbliższa akcja |
| --- | --- | --- | --- | --- | --- |
| Inwentarz API | ☐ | ☐ | ☐ | ☐ | ☐ |
| Wydajność API | ☐ | ☐ | ☐ | ☐ | ☐ |
| Bezpieczeństwo | ☐ | ☐ | ☐ | ☐ | ☐ |
| Jakość & testy | ☐ | ☐ | ☐ | ☐ | ☐ |
| mu-plugins | ☐ | ☐ | ☐ | ☐ | ☐ |
| Observability | ☐ | ☐ | ☐ | ☐ | ☐ |

> Wypełnij powyższe po uzgodnieniu z zespołem. Utrzymuj dokument w rytmie sprintowym.

---

## 📌 Przypominajka: gdzie szukać danych

- `docs/API.md` – aktualny spis endpointów (Next.js + MU).  
- `docs/SECURITY_OVERVIEW.md` – checklisty security (do rebaseliningu).  
- `docs/OPTIMIZATION_PROGRESS.md` – ostatnie wyniki testów performance.  
- `docs/DEPLOYMENT_GUIDE.md` – kolejność i checklisty wdrożeń MU-plugins.  
- `docs/COMPONENTS_BRIEF.md` – świeży inwentarz komponentów, hooków i store’ów.  
- `docs/README.md` – mapa dokumentacji + env.

---

## 📅 Następny przegląd

- Propozycja: ustalić cykliczny „status review” (np. raz na sprint).  
- Po każdym przeglądzie zaktualizować tabelę statusów, a w razie potrzeby dopisać notatkę poniżej.

---

## 📝 Notatki robocze

- 2025-11-08 – zresetowano status (synchronizacja dokumentacji).  
- 2025-11-08 – Zaostrzono CSRF i CSP; ESLint ponownie wymusza build (wyniki perf nadal oczekują na środowisko).  
- Wymagane: rebaseline P0/P1 w API, security, performance i observability.  
- Po ustaleniu nowego stanu – pamiętaj o wpisie w `CHANGELOG.md` (sekcja Docs).

---

**Ostatnia aktualizacja:** 2025-11-08 (reset statusu, oczekiwanie na nowe dane)  
**Kontakt:** wpisz właścicieli obszarów po ustaleniach (np. `@backend-lead`, `@devops`, `@sre`).**

