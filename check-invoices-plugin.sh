#!/bin/bash
# Script do sprawdzania pluginów faktur na serwerze

echo "═══════════════════════════════════════════════════════"
echo "🔍 SPRAWDZANIE PLUGINÓW FAKTUR"
echo "═══════════════════════════════════════════════════════"
echo ""

# Sprawdź, czy jesteś w odpowiednim katalogu
if [ ! -f "wp-config.php" ]; then
    echo "❌ Błąd: Uruchom skrypt w katalogu głównym WordPress"
    exit 1
fi

MU_PLUGINS_DIR="wp-content/mu-plugins"

echo "1️⃣ Sprawdzanie plików mu-plugins..."
echo ""

# Sprawdź nowy plugin
if [ -f "$MU_PLUGINS_DIR/king-invoices.php" ]; then
    echo "✅ king-invoices.php - ISTNIEJE"
    
    # Sprawdź składnię
    if php -l "$MU_PLUGINS_DIR/king-invoices.php" > /dev/null 2>&1; then
        echo "   ✅ Składnia PHP - OK"
    else
        echo "   ❌ Składnia PHP - BŁĄD!"
        php -l "$MU_PLUGINS_DIR/king-invoices.php"
    fi
else
    echo "❌ king-invoices.php - NIE ISTNIEJE!"
fi

echo ""

# Sprawdź stare pluginy (nie powinny istnieć)
echo "2️⃣ Sprawdzanie starych pluginów (powinny być usunięte)..."
echo ""

OLD_PLUGINS=(
    "woocommerce-custom-fields.php"
    "customer-invoices.php"
    "king-invoice-fields.php"
)

for plugin in "${OLD_PLUGINS[@]}"; do
    if [ -f "$MU_PLUGINS_DIR/$plugin" ]; then
        echo "⚠️  $plugin - NADAL ISTNIEJE (powinien być usunięty)"
    else
        echo "✅ $plugin - USUNIĘTY (ok)"
    fi
done

echo ""

# Sprawdź logi błędów
echo "3️⃣ Sprawdzanie logów błędów..."
echo ""

if [ -f "wp-content/debug.log" ]; then
    echo "Ostatnie błędy związane z invoice:"
    tail -50 wp-content/debug.log | grep -i "king.*invoice\|invoice.*error" | tail -5 || echo "   Brak błędów związanych z invoice"
else
    echo "⚠️  Plik debug.log nie istnieje"
fi

echo ""

# Sprawdź, czy REST API endpoints są zarejestrowane
echo "4️⃣ Sprawdzanie REST API endpoints..."
echo ""

# Sprawdź, czy można załadować plugin
php -r "
define('ABSPATH', __DIR__ . '/');
if (file_exists('$MU_PLUGINS_DIR/king-invoices.php')) {
    // Sprawdź, czy klasa istnieje
    \$content = file_get_contents('$MU_PLUGINS_DIR/king-invoices.php');
    if (strpos(\$content, 'class KingInvoices') !== false) {
        echo '✅ Klasa KingInvoices - OK\n';
    } else {
        echo '❌ Klasa KingInvoices - NIE ZNALEZIONA\n';
    }
    
    // Sprawdź funkcje
    \$functions = [
        'king_auto_generate_invoice_for_order',
        'king_get_customer_invoices',
        'king_generate_invoice_data'
    ];
    
    foreach (\$functions as \$func) {
        if (strpos(\$content, \"function \$func\") !== false) {
            echo \"✅ Funkcja \$func - OK\n\";
        } else {
            echo \"❌ Funkcja \$func - NIE ZNALEZIONA\n\";
        }
    }
    
    // Sprawdź REST API endpoints
    \$endpoints = [
        '/invoices',
        '/invoice/',
        '/tracking/',
        '/customer/update-profile',
        '/customer/change-password'
    ];
    
    foreach (\$endpoints as \$endpoint) {
        if (strpos(\$content, \$endpoint) !== false) {
            echo \"✅ Endpoint \$endpoint - OK\n\";
        } else {
            echo \"❌ Endpoint \$endpoint - NIE ZNALEZIONY\n\";
        }
    }
} else {
    echo '❌ Plik king-invoices.php nie istnieje\n';
}
"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ SPRAWDZANIE ZAKOŃCZONE"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Następne kroki:"
echo "1. Przetestuj checkout - sprawdź, czy pola NIP są widoczne"
echo "2. Złóż testowe zamówienie z NIP"
echo "3. Sprawdź w WordPress admin, czy NIP jest zapisany"
echo "4. Przetestuj REST API endpoints"
echo "5. Sprawdź synchronizację checkout ↔ Moje konto"
echo ""

