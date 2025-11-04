# 📚 Dokumentacja projektu

Centralne miejsce na dokumentację optymalizacji, analiz i poprawek.

## 📁 Struktura

### [Account](./account/)
Optymalizacja modułu konta użytkownika
- Bezpieczeństwo (walidacja, sanityzacja)
- Wydajność (cache, lazy loading)
- UX (skeleton loaders, empty states)
- Testy (unit + e2e)

### [Shop](./shop/)
Optymalizacja wydajności strony sklep
- Redukcja czasu ładowania (3s → <1s)
- Bundle optimization (~40-60% redukcja)
- Code splitting i lazy loading
- Streaming SSR i progressive rendering
- LCP optimization

## 🎯 Zasady

- **Prostota** - struktura rośnie z potrzebami
- **Przez funkcjonalność** - grupowanie według tego, co zoptymalizowaliśmy
- **Praktyczność** - łatwo znaleźć i utrzymać

## 📝 Dodawanie nowej dokumentacji

1. Utwórz folder w `docs/` z nazwą obszaru (np. `checkout/`, `cart/`)
2. Dodaj `README.md` z podsumowaniem
3. Dodaj szczegółowe pliki (AUDIT.md, PERF.md, SECURITY.md, etc.)
4. Zaktualizuj ten README z linkiem do nowej dokumentacji

---
**Status**: ✅ Active  
**Ostatnia aktualizacja**: 2024-11-XX

