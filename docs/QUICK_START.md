#
# Quick Start – audyt API i MU-plugins

> Dokument służy jako skrócona instrukcja wejścia w projekt po ostatnim sprzątaniu dokumentacji (2025‑11‑08). Zawiera najważniejsze kroki przygotowawcze, wskazanie narzędzi oraz powiązane materiały.

---

## 1. Co jest już na miejscu

- ✅ Dokumentacja techniczna zsynchronizowana (`API.md`, `ARCHITECTURE.md`, `COMPONENTS_BRIEF.md`, `SECURITY_OVERVIEW.md`, `STATUS_SUMMARY.md`).  
- ✅ Skrypty pomocnicze w repo (autocannon, k6, wp-profile) – patrz `apps/web/scripts/` oraz główny katalog `scripts/`.  
- ✅ Przewodniki wdrożeń MU (`DEPLOYMENT_GUIDE.md`) i audytów (`PLAN_API_MUPLUGINS.md`, `TASKS_API_MUPLUGINS.md`, `MU_PLUGINS_*`).  
- ✅ Konwencje `.env` i sekrety opisane w `docs/README.md`.

---

## 2. Przygotowanie środowiska

```bash
# 1. Instalacja zależności (pnpm zalecane)
pnpm install

# 2. Instalacja zależności web (autocannon w devDeps)
pnpm install --filter @headless-woo/web

# 3. (opcjonalnie) Zainstaluj k6 lokalnie
# macOS
brew install k6
# Debian/Ubuntu
curl -s https://packages.k6.io/key.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/k6.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/k6.gpg] https://packages.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update && sudo apt install k6
# Windows
choco install k6

# 4. (opcjonalnie) Ustaw wp-cli jeżeli planujesz audyt MU-plugins
```

> Jeśli korzystasz z `npm`, komendy są analogiczne (`npm install`, `npm run …`).  
> `autocannon`, `k6` i `wp-profile.sh` mają nadane prawa wykonywania (`chmod +x`).

---

## 3. Szybkie testy / sanity checks

```bash
# Serwer developerski (Next.js)
pnpm --filter @headless-woo/web dev

# Performance – baseline (Edge Node / warm cache)
pnpm --filter @headless-woo/web perf:autocannon:warm
pnpm --filter @headless-woo/web perf:autocannon:cold

# Performance – k6 (jeżeli zainstalowany)
pnpm --filter @headless-woo/web perf:k6

# Audyt MU-plugins (wymaga wp-cli i dostępu do WP)
pnpm --filter @headless-woo/web perf:wp-profile
```

Wyniki/perf notuj w `docs/OPTIMIZATION_PROGRESS.md` oraz `docs/TASKS_API_MUPLUGINS.md`.

---

## 4. Dokumenty do przeczytania na start

- `docs/README.md` – mapa dokumentacji + env.  
- `docs/API.md` – pełny inwentarz endpointów (Next.js + MU).  
- `docs/SECURITY_OVERVIEW.md` – stan zabezpieczeń (JWT, rate limiting, reCAPTCHA).  
- `docs/STATUS_SUMMARY.md` – tabela statusów (po rebaseliningu).  
- `docs/DEPLOYMENT_GUIDE.md` – kolejność i checklisty wdrożeń MU.  
- `docs/PLAN_API_MUPLUGINS.md` / `docs/TASKS_API_MUPLUGINS.md` – plan i backlog audytu.

---

## 5. Sprintowa checklist (propozycja)

- [ ] Uzgodniony backlog P0/P1 (API, bezpieczeństwo, wydajność, observability).  
- [ ] Uruchomione testy wydajności + wpis do `OPTIMIZATION_PROGRESS.md`.  
- [ ] Potwierdzone sekrety `.env` vs README (prod/stage).  
- [ ] Uzupełnione metryki w `STATUS_SUMMARY.md`.  
- [ ] W razie zmian w kodzie: wykorzystaj polecenie `Docs Sync` w Cursorze (auto prompt).

---

## 6. Problemy i FAQ

| Objaw | Podejście |
| --- | --- |
| `autocannon` nie wystartował | `pnpm install --filter @headless-woo/web` (brak w node_modules) |
| `k6` brak polecenia | Zainstaluj lokalnie lub odpal workflow CI (GitHub Actions). |
| `wp-profile.sh` błąd | Upewnij się, że `wp-cli` ma poprawną ścieżkę i serwer WP jest dostępny. |
| Endpoint zwraca 403/401 | Sprawdź `KING_CART_API_SECRET`, JWT scopes, rate limiting. |
| Problemy CORS | Zweryfikuj wdrożenie `headless-config.php` i nagłówki w MU-plugins. |

---

## 7. Co dalej

1. Po zapoznaniu się z dokumentami ustal z zespołem aktualny plan P0/P1.  
2. Zaktualizuj `STATUS_SUMMARY.md` i `SECURITY_OVERVIEW.md` o potwierdzone dane.  
3. Po każdym większym merge’u użyj polecenia `Docs Sync` → aktualizuj `API.md`, `ARCHITECTURE.md`, `COMPONENTS_BRIEF.md`, README i CHANGELOG.  
4. W razie wątpliwości – zajrzyj do archiwum (`docs/archive/`) po historyczne audyty.

---

**Kontakt:** wpisz osoby odpowiedzialne (np. `@backend-lead`, `@devops`, `@sre`).  
**Ostatnia aktualizacja:** 2025-11-08 (Quick Start zresetowany po synchronizacji dokumentacji).**
