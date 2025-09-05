# King Mock Reviews - Instrukcja instalacji

## 📋 Opis
Mu-plugin dodaje mock opinie do produktów WooCommerce dla testów frontend.

## 🚀 Instalacja

### 1. Skopiuj plik do WordPress
```bash
# Skopiuj plik do katalogu mu-plugins
cp king-mock-reviews.php /path/to/wordpress/wp-content/mu-plugins/
```

### 2. Utwórz katalog mu-plugins (jeśli nie istnieje)
```bash
mkdir -p /path/to/wordpress/wp-content/mu-plugins/
```

### 3. Aktywuj plugin
- Plugin aktywuje się automatycznie (mu-plugins)
- Sprawdź w WordPress Admin → Plugins → Must-Use Plugins

## 🎯 Użycie

### 1. Przejdź do panelu administracyjnego
- WordPress Admin → WooCommerce → Mock Reviews

### 2. Generuj mock opinie
- Kliknij "Generuj Mock Opinie"
- Plugin doda 8 mock opinii do każdego produktu

### 3. Sprawdź wyniki
- Opinie pojawią się w WooCommerce → Products → Reviews
- Frontend będzie pokazywał prawdziwe oceny i opinie

## 📊 Mock dane

Plugin dodaje:
- **8 opinii** na produkt
- **Oceny**: 2-5 gwiazdek (różnorodne)
- **Autorzy**: Polskie imiona i nazwiska
- **Treści**: Różnorodne, realistyczne opinie
- **Status**: Wszystkie zatwierdzone

## 🔧 Funkcje

- ✅ **Automatyczne dodawanie** opinii do produktów
- ✅ **Aktualizacja ocen** produktów
- ✅ **Panel administracyjny** do zarządzania
- ✅ **Bezpieczeństwo** - nonce verification
- ✅ **Uprawnienia** - tylko dla administratorów
- ✅ **Cache clearing** - automatyczne odświeżanie

## 🧪 Testowanie

Po instalacji:
1. Wygeneruj mock opinie
2. Odśwież stronę produktu
3. Sprawdź sekcję "Opinie"
4. Zobacz prawdziwe oceny i gwiazdki

## 🗑️ Usuwanie

Aby usunąć mock opinie:
```sql
-- Usuń wszystkie opinie (UWAGA: usuwa WSZYSTKIE opinie!)
DELETE FROM wp_comments WHERE comment_type = 'review';

-- Zresetuj oceny produktów
UPDATE wp_postmeta SET meta_value = '0' WHERE meta_key = '_wc_average_rating';
UPDATE wp_postmeta SET meta_value = '0' WHERE meta_key = '_wc_review_count';
```

## ⚠️ Uwagi

- Plugin dodaje opinie tylko do produktów bez istniejących opinii
- Mock dane są realistyczne ale fikcyjne
- Używaj tylko do testów - nie na produkcji z prawdziwymi klientami
- Plugin automatycznie aktualizuje oceny produktów

## 🎉 Rezultat

Po instalacji frontend będzie pokazywał:
- ⭐ Prawdziwe gwiazdki (2-5)
- 📊 Średnie oceny (np. 4.2)
- 📝 Liczbę opinii (8 na produkt)
- 💬 Sekcję opinii w zakładkach

