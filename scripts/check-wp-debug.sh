#!/bin/bash

# Skrypt do sprawdzania logów WordPress na serwerze
# Użycie: ./scripts/check-wp-debug.sh

SERVER="qvwltjhdjw@s62.cyber-folks.pl"
PORT="222"
WP_PATH="/domains/qvwltjhdjw.cfolks.pl/public_html"

echo "🔍 Sprawdzanie logów WordPress na serwerze..."
echo ""

# Komendy do wykonania na serwerze
ssh -p $PORT $SERVER << 'ENDSSH'
cd /domains/qvwltjhdjw.cfolks.pl/public_html

echo "📁 Lokalizacja:"
pwd
echo ""

echo "📄 Sprawdzanie pliku debug.log..."
if [ -f "wp-content/debug.log" ]; then
    echo "✅ Plik debug.log istnieje"
    echo "📊 Rozmiar pliku:"
    ls -lh wp-content/debug.log
    echo ""
    echo "📝 Ostatnie 30 linii z logów emaili:"
    echo "----------------------------------------"
    grep -i "king email" wp-content/debug.log | tail -n 30 || echo "Brak logów związanych z emailami"
    echo "----------------------------------------"
    echo ""
    echo "📝 Ostatnie 50 linii z wszystkich logów:"
    echo "----------------------------------------"
    tail -n 50 wp-content/debug.log
    echo "----------------------------------------"
else
    echo "❌ Plik debug.log nie istnieje"
    echo ""
    echo "🔧 Sprawdzanie, czy debug jest włączony w wp-config.php..."
    if grep -q "WP_DEBUG.*true" wp-config.php 2>/dev/null; then
        echo "✅ WP_DEBUG jest włączony"
        if grep -q "WP_DEBUG_LOG.*true" wp-config.php 2>/dev/null; then
            echo "✅ WP_DEBUG_LOG jest włączony"
            echo "⚠️  Debug jest włączony, ale plik log nie istnieje - może nie było jeszcze błędów"
        else
            echo "❌ WP_DEBUG_LOG nie jest włączony"
            echo "💡 Dodaj do wp-config.php: define('WP_DEBUG_LOG', true);"
        fi
    else
        echo "❌ WP_DEBUG nie jest włączony"
        echo "💡 Dodaj do wp-config.php:"
        echo "   define('WP_DEBUG', true);"
        echo "   define('WP_DEBUG_LOG', true);"
        echo "   define('WP_DEBUG_DISPLAY', false);"
    fi
fi

echo ""
echo "📧 Sprawdzanie ostatnich zamówień (logi WooCommerce)..."
if [ -f "wp-content/debug.log" ]; then
    echo "Ostatnie zamówienia w logach:"
    grep -i "order" wp-content/debug.log | grep -i "trigger\|email\|pending" | tail -n 20 || echo "Brak logów zamówień"
fi
ENDSSH

echo ""
echo "✅ Sprawdzanie zakończone"

