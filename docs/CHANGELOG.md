# Changelog

Wersjonowanie według [Conventional Commits](https://www.conventionalcommits.org/). Wydania opisują zmiany w aplikacji webowej (Next.js) oraz dokumentacji.

## [0.1.2] - 2025-01-XX

### Docs
- `docs: synchronizacja dokumentacji (Docs Sync)`
- Zaktualizowane bloki AUTO w `API.md` (dodane endpointy GDPR, cache/invalidate, health/circuit-breakers, performance/dashboard, king-jwt/logout)
- Zaktualizowane bloki AUTO w `COMPONENTS_BRIEF.md` (dodane brakujące eksporty: hooki, typy, funkcje pomocnicze)
- Zaktualizowane bloki AUTO w `ARCHITECTURE.md` (dodane foldery: config, types, __tests__, examples, shared-types)
- Weryfikacja `README.md` - zmienne środowiskowe i skrypty zgodne z aktualnym stanem projektu

## [0.1.1] - 2025-11-08

### Docs
- `docs: synchronizacja dokumentacji z rzeczywistym stanem projektu`
- Zaktualizowane bloki AUTO (`API.md`, `ARCHITECTURE.md`, `COMPONENTS_BRIEF.md`), README i kompendium enterprise.
- Notatka: tymczasowo wyłączono część reguł ESLint (`no-explicit-any`, `no-unused-vars`, `react-hooks/exhaustive-deps`, `@next/next/no-img-element`), aby umożliwić start nowych zadań – planowany cleanup w kolejnych iteracjach.

## [0.1.0] - 2025-11-08

### Added
- `9b1ea22` – rozszerzenia UI: nagłówek, menu mobilne, widoki produktów i sekcja „O nas”.

### Changed
- `5c490de` – ujednolicenie typografii (rozmiary fontów, hero, buttony).
- `2ba3d99` – aktualizacja tytułu strony głównej (SEO).

### Fixed
- `ea8d9e9` – poprawka sticky headera oraz stylów aktywnych filtrów sklepu.

### Performance
- Brak zmian.

### Docs
- `b4f388f` – reorganizacja wcześniejszej dokumentacji (`docs/`).

---

> Chronologia starszych zmian dostępna w historii Git. Kolejne wydania dodawaj na górze pliku.

