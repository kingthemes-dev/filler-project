# WordPress Debug Log - Jak znaleźć i włączyć

## Lokalizacja pliku debug.log

Plik `debug.log` znajduje się na serwerze WordPress w katalogu:
```
wp-content/debug.log
```

**Pełna ścieżka na serwerze:**
```
/ścieżka/do/wordpress/wp-content/debug.log
```

## Jak włączyć debug logging

### 1. Edytuj plik `wp-config.php` na serwerze

Dodaj na początku pliku (przed linią `/* That's all, stop editing! Happy publishing. */`):

```php
// Enable WordPress debug logging
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);        // Log errors to wp-content/debug.log
define('WP_DEBUG_DISPLAY', false);   // Don't display errors on frontend (security)
define('SCRIPT_DEBUG', true);        // Use non-minified JS/CSS (optional)
```

### 2. Ustaw uprawnienia do pliku

Upewnij się, że WordPress ma uprawnienia do zapisu w katalogu `wp-content`:
```bash
chmod 755 wp-content
chmod 666 wp-content/debug.log  # jeśli plik już istnieje
```

### 3. Sprawdź logi

#### Via SSH/FTP:
```bash
# Zobacz ostatnie 50 linii loga
tail -n 50 wp-content/debug.log

# Śledź logi w czasie rzeczywistym
tail -f wp-content/debug.log

# Wyszukaj błędy związane z emailami
grep -i "king email" wp-content/debug.log
grep -i "trigger" wp-content/debug.log
```

#### Via Panel Administracyjny WordPress:
- Zainstaluj plugin **"WP Log Viewer"** lub **"Error Log Monitor"**
- Pluginy pozwalają przeglądać logi bezpośrednio w panelu admina

#### Via File Manager (cPanel/Plesk):
1. Zaloguj się do panelu hostingu
2. Otwórz File Manager
3. Przejdź do `wp-content/`
4. Otwórz plik `debug.log`

## Co znajdziesz w logach

Logi z naszego systemu emaili będą zawierać:
```
King Email System DEBUG: trigger_rest_api_emails called for order X
King Email System DEBUG: Order X found, attempting to send emails
King Email System DEBUG: Available emails: WC_Email_Customer_Processing_Order, ...
King Email System: ✅ Sent WC_Email_Customer_Processing_Order email for pending order X
```

Lub błędy:
```
King Email System ERROR: Could not get order X
King Email System ERROR: Failed to trigger email: ...
```

## Bezpieczeństwo

⚠️ **WAŻNE:** 
- **NIE** włączaj `WP_DEBUG_DISPLAY = true` na produkcji (wyświetla błędy użytkownikom)
- **NIE** commituj `wp-config.php` z włączonym debug do repo
- **NIE** udostępniaj publicznie pliku `debug.log` (może zawierać wrażliwe dane)

## Wyłączenie debug

Po zakończeniu debugowania, wyłącz logowanie:
```php
define('WP_DEBUG', false);
define('WP_DEBUG_LOG', false);
```

Lub po prostu usuń/zkomentuj te linie.

## Alternatywa: Logi przez plugin

Jeśli nie masz dostępu do pliku, możesz użyć pluginu:
- **Query Monitor** - pokazuje zapytania SQL i błędy PHP
- **WP Log Viewer** - przeglądarka logów w panelu admina
- **Error Log Monitor** - monitorowanie błędów w czasie rzeczywistym

