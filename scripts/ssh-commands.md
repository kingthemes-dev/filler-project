# Komendy SSH do sprawdzania logów WordPress

## Połączenie SSH

```bash
ssh qvwltjhdjw@s62.cyber-folks.pl -p 222
# Hasło: Haslo963!@#
```

## Po połączeniu - przejdź do katalogu WordPress

```bash
cd /domains/qvwltjhdjw.cfolks.pl/public_html/
```

## Sprawdź, czy plik debug.log istnieje

```bash
ls -la wp-content/debug.log
```

## Zobacz ostatnie logi związane z emailami

```bash
# Ostatnie 50 linii z logów emaili
grep -i "king email" wp-content/debug.log | tail -n 50

# Wszystkie logi związane z triggerowaniem emaili
grep -i "trigger.*email\|trigger_rest_api_emails" wp-content/debug.log | tail -n 30

# Logi dla ostatniego zamówienia (podmień X na ID zamówienia)
grep "order.*X\|order_id.*X" wp-content/debug.log | tail -n 30
```

## Zobacz wszystkie ostatnie logi

```bash
# Ostatnie 100 linii
tail -n 100 wp-content/debug.log

# Śledź logi w czasie rzeczywistym (Ctrl+C żeby wyjść)
tail -f wp-content/debug.log
```

## Sprawdź, czy debug jest włączony

```bash
grep -i "WP_DEBUG" wp-config.php
```

## Jeśli debug nie jest włączony, dodaj do wp-config.php

```bash
# Edytuj plik (użyj nano lub vim)
nano wp-config.php

# Dodaj przed linią "/* That's all, stop editing! */":
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

## Sprawdź rozmiar pliku log

```bash
ls -lh wp-content/debug.log
```

## Wyczyść log (jeśli jest za duży)

```bash
# Backup starych logów
cp wp-content/debug.log wp-content/debug.log.backup

# Wyczyść log
> wp-content/debug.log
```

## Sprawdź uprawnienia do pliku

```bash
ls -la wp-content/debug.log
# Powinno być: -rw-rw-rw- lub -rw-r--r--
# Jeśli nie, napraw:
chmod 666 wp-content/debug.log
```

