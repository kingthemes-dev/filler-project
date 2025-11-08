# 📄 Architektura Systemu Faktur - Propozycja dla Starter Template

## 🎯 Obecna sytuacja

### Co mamy:
1. ✅ **Backend (PHP)**: `king-invoices.php`
   - Generowanie danych faktury (`king_generate_invoice_data()`)
   - Generowanie HTML faktury (`king_generate_invoice_html()`)
   - Pseudo-PDF (tylko header + HTML) (`king_generate_pdf_from_html()`)
   - REST API endpoints:
     - `GET /custom/v1/invoices?customer_id=X` - lista faktur
     - `GET /custom/v1/invoice/{id}` - dane faktury (JSON)
     - `GET /custom/v1/invoice/{id}/pdf` - PDF (base64)
   - Automatyczne generowanie faktur przy zmianie statusu zamówienia

2. ✅ **Frontend (Next.js)**: `/moje-faktury`
   - Strona z listą faktur
   - Integracja z REST API
   - Cache w sessionStorage

### Co NIE działa dobrze:
1. ❌ **PDF Generation**: Obecny "PDF" to tylko HTML z headerem PDF - nie działa w przeglądarce
2. ❌ **Brak uniwersalności**: System jest zależny od specyficznych danych firmy (hardcoded)
3. ❌ **Brak konfiguracji**: Dane firmy (NIP, adres) są hardcoded w kodzie
4. ❌ **Brak walidacji**: Nie ma sprawdzania, czy faktura może być wygenerowana

---

## 🏗️ Proponowane rozwiązanie (Uniwersalne dla Starter Template)

### **OPCJA 1: Server-Side PDF Generation (Rekomendowane)** ⭐

#### Zalety:
- ✅ Pełna kontrola nad formatowaniem PDF
- ✅ Zgodność z prawem (faktury muszą mieć stały format)
- ✅ Działa offline (PDF jest wygenerowany na serwerze)
- ✅ Uniwersalne - można użyć różnych bibliotek PDF
- ✅ Bezpieczne - PDF jest generowany na backendzie

#### Wady:
- ❌ Wymaga biblioteki PDF na serwerze PHP
- ❌ Większe obciążenie serwera

#### Implementacja:

**1. Backend (PHP) - Wybór biblioteki PDF:**

```
OPCJA A: TCPDF (Rekomendowane) ⭐
- Lekka, szybka
- Nie wymaga rozszerzeń PHP
- Dobra dokumentacja
- Unicode support
- Instalacja: composer require tecnickcom/tcpdf

OPCJA B: DomPDF
- Łatwa w użyciu (HTML → PDF)
- Wymaga rozszerzeń PHP (GD, MBString)
- Czasami problemy z fontami
- Instalacja: composer require dompdf/dompdf

OPCJA C: mPDF
- Najlepsze wsparcie dla Unicode
- Wymaga rozszerzeń PHP
- Instalacja: composer require mpdf/mpdf
```

**2. Struktura kodu (Uniwersalna):**

```php
// wp-content/mu-plugins/king-invoices.php

// 1. Konfiguracja firmy (przeniesiona do WordPress Options)
function king_get_company_info() {
    return [
        'name' => get_option('king_invoice_company_name', 'Twoja Firma Sp. z o.o.'),
        'address' => get_option('king_invoice_company_address', 'ul. Przykładowa 123'),
        'city' => get_option('king_invoice_company_city', '00-001 Warszawa'),
        'nip' => get_option('king_invoice_company_nip', '1234567890'),
        'phone' => get_option('king_invoice_company_phone', '+48 123 456 789'),
        'email' => get_option('king_invoice_company_email', 'info@twoja-firma.pl'),
        'bank_account' => get_option('king_invoice_company_bank', 'PL 12 3456 7890 1234 5678 9012 3456'),
    ];
}

// 2. Generowanie PDF (z użyciem TCPDF)
function king_generate_invoice_pdf($order, $invoice_data) {
    require_once(__DIR__ . '/vendor/autoload.php');
    
    $pdf = new \TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
    
    // Konfiguracja PDF
    $pdf->SetCreator('King Invoices System');
    $pdf->SetAuthor(get_bloginfo('name'));
    $pdf->SetTitle('Faktura ' . $invoice_data['invoice_number']);
    $pdf->SetSubject('Faktura VAT');
    
    // Usuń header/footer
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    
    // Dodaj stronę
    $pdf->AddPage();
    
    // Generuj HTML faktury
    $html = king_generate_invoice_html($order, $invoice_data);
    
    // Wstaw HTML do PDF
    $pdf->writeHTML($html, true, false, true, false, '');
    
    // Zwróć PDF jako string
    return $pdf->Output('', 'S');
}

// 3. REST API endpoint (bez zmian)
register_rest_route('custom/v1', '/invoice/(?P<id>\d+)/pdf', [
    'methods' => 'GET',
    'callback' => function($request) {
        $order_id = $request->get_param('id');
        $order = wc_get_order($order_id);
        
        // Sprawdź, czy faktura może być wygenerowana
        if (!$order || !king_can_generate_invoice($order)) {
            return new WP_Error('invoice_not_available', 'Faktura nie jest dostępna', ['status' => 404]);
        }
        
        $invoice_data = king_generate_invoice_data($order);
        $pdf_content = king_generate_invoice_pdf($order, $invoice_data);
        
        // Zwróć PDF jako binary
        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="faktura_' . $order_id . '.pdf"');
        echo $pdf_content;
        exit;
    }
]);
```

**3. Frontend (Next.js) - Pobieranie PDF:**

```typescript
// apps/web/src/app/moje-faktury/page.tsx

const handleDownloadInvoice = async (invoiceId: string) => {
  try {
    const response = await fetch(`/api/woocommerce/invoices/${invoiceId}/pdf`);
    
    if (!response.ok) {
      throw new Error('Nie udało się pobrać faktury');
    }
    
    // Pobierz PDF jako blob
    const blob = await response.blob();
    
    // Utwórz link do pobrania
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faktura_${invoiceId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Błąd pobierania faktury:', error);
  }
};
```

**4. Next.js API Route (Proxy):**

```typescript
// apps/web/src/app/api/woocommerce/invoices/[id]/pdf/route.ts

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const invoiceId = params.id;
  
  const response = await fetch(
    `${process.env.WORDPRESS_URL}/wp-json/custom/v1/invoice/${invoiceId}/pdf`,
    {
      headers: {
        'Authorization': `Bearer ${token}`, // Jeśli potrzebne
      },
    }
  );
  
  if (!response.ok) {
    return new Response('Błąd pobierania faktury', { status: 500 });
  }
  
  // Przekaż PDF jako binary
  const pdfBlob = await response.blob();
  return new Response(pdfBlob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="faktura_${invoiceId}.pdf"`,
    },
  });
}
```

---

### **OPCJA 2: Client-Side PDF Generation (Alternatywa)**

#### Zalety:
- ✅ Brak obciążenia serwera
- ✅ Szybsza generacja (w przeglądarce)
- ✅ Nie wymaga bibliotek PHP

#### Wady:
- ❌ Wymaga JavaScript w przeglądarce
- ❌ Może być wolniejsze dla dużych faktur
- ❌ Mniej kontroli nad formatowaniem

#### Implementacja:

**1. Backend (PHP) - Zwraca tylko dane:**

```php
// Bez zmian - zwracamy JSON z danymi faktury
register_rest_route('custom/v1', '/invoice/(?P<id>\d+)', [
    'methods' => 'GET',
    'callback' => 'king_get_invoice_pdf', // Zwraca JSON
]);
```

**2. Frontend (Next.js) - Generowanie PDF w przeglądarce:**

```typescript
// Użyj biblioteki: jspdf + jspdf-autotable
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const generatePDF = (invoiceData: InvoiceData) => {
  const doc = new jsPDF();
  
  // Nagłówek
  doc.setFontSize(20);
  doc.text('FAKTURA VAT', 105, 20, { align: 'center' });
  doc.text(invoiceData.invoice_number, 105, 30, { align: 'center' });
  
  // Dane firmy
  doc.setFontSize(12);
  doc.text('Sprzedawca:', 20, 50);
  doc.text(invoiceData.company_info.name, 20, 60);
  doc.text(invoiceData.company_info.address, 20, 70);
  
  // Tabela produktów
  doc.autoTable({
    head: [['Nazwa', 'Ilość', 'Cena']],
    body: invoiceData.items.map(item => [
      item.name,
      item.quantity,
      item.price
    ]),
  });
  
  // Pobierz PDF
  doc.save(`faktura_${invoiceData.invoice_number}.pdf`);
};
```

---

## 🎨 Rekomendowane rozwiązanie: **OPCJA 1 (Server-Side PDF)**

### Dlaczego?
1. **Uniwersalność**: Działa dla każdego starter template
2. **Zgodność z prawem**: Faktury muszą mieć stały format (PDF na serwerze)
3. **Bezpieczeństwo**: PDF jest generowany na backendzie (nie można go zmodyfikować)
4. **Wydajność**: Raz wygenerowany PDF może być cache'owany
5. **Kompatybilność**: Działa w każdej przeglądarce (nie wymaga JavaScript)

### Implementacja krok po kroku:

#### **KROK 1: Konfiguracja WordPress (Admin Panel)**

Dodaj sekcję w WordPress Admin do konfiguracji danych firmy:

```php
// wp-content/mu-plugins/king-invoices-settings.php

add_action('admin_menu', function() {
    add_options_page(
        'Ustawienia Faktur',
        'Faktury',
        'manage_options',
        'king-invoices-settings',
        'king_invoices_settings_page'
    );
});

function king_invoices_settings_page() {
    if (isset($_POST['submit'])) {
        update_option('king_invoice_company_name', sanitize_text_field($_POST['company_name']));
        update_option('king_invoice_company_address', sanitize_text_field($_POST['company_address']));
        update_option('king_invoice_company_city', sanitize_text_field($_POST['company_city']));
        update_option('king_invoice_company_nip', sanitize_text_field($_POST['company_nip']));
        update_option('king_invoice_company_phone', sanitize_text_field($_POST['company_phone']));
        update_option('king_invoice_company_email', sanitize_email($_POST['company_email']));
        update_option('king_invoice_company_bank', sanitize_text_field($_POST['company_bank']));
        echo '<div class="notice notice-success"><p>Ustawienia zapisane!</p></div>';
    }
    
    // Formularz HTML
    ?>
    <div class="wrap">
        <h1>Ustawienia Faktur</h1>
        <form method="post">
            <table class="form-table">
                <tr>
                    <th><label>Nazwa firmy</label></th>
                    <td><input type="text" name="company_name" value="<?php echo esc_attr(get_option('king_invoice_company_name')); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label>Adres</label></th>
                    <td><input type="text" name="company_address" value="<?php echo esc_attr(get_option('king_invoice_company_address')); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label>Miasto</label></th>
                    <td><input type="text" name="company_city" value="<?php echo esc_attr(get_option('king_invoice_company_city')); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label>NIP</label></th>
                    <td><input type="text" name="company_nip" value="<?php echo esc_attr(get_option('king_invoice_company_nip')); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label>Telefon</label></th>
                    <td><input type="text" name="company_phone" value="<?php echo esc_attr(get_option('king_invoice_company_phone')); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label>Email</label></th>
                    <td><input type="email" name="company_email" value="<?php echo esc_attr(get_option('king_invoice_company_email')); ?>" class="regular-text" /></td>
                </tr>
                <tr>
                    <th><label>Nr konta bankowego</label></th>
                    <td><input type="text" name="company_bank" value="<?php echo esc_attr(get_option('king_invoice_company_bank')); ?>" class="regular-text" /></td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
```

#### **KROK 2: Instalacja TCPDF**

```bash
# Na serwerze WordPress
cd wp-content/mu-plugins
composer require tecnickcom/tcpdf
```

#### **KROK 3: Aktualizacja `king_generate_invoice_data()`**

```php
function king_generate_invoice_data($order) {
    $company_info = king_get_company_info(); // Zamiast hardcoded
    
    return [
        // ... istniejące dane ...
        'company_info' => $company_info, // Z konfiguracji
    ];
}
```

#### **KROK 4: Aktualizacja `king_generate_invoice_pdf()`**

```php
function king_generate_invoice_pdf($order, $invoice_data) {
    // Sprawdź, czy TCPDF jest dostępny
    if (!class_exists('TCPDF')) {
        require_once(__DIR__ . '/vendor/autoload.php');
    }
    
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
    
    // Konfiguracja
    $pdf->SetCreator('King Invoices System');
    $pdf->SetAuthor(get_bloginfo('name'));
    $pdf->SetTitle('Faktura ' . $invoice_data['invoice_number']);
    
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);
    $pdf->AddPage();
    
    // Generuj HTML
    $html = king_generate_invoice_html($order, $invoice_data);
    $pdf->writeHTML($html, true, false, true, false, '');
    
    return $pdf->Output('', 'S');
}
```

#### **KROK 5: Aktualizacja REST API endpoint**

```php
register_rest_route('custom/v1', '/invoice/(?P<id>\d+)/pdf', [
    'methods' => 'GET',
    'callback' => function($request) {
        $order_id = $request->get_param('id');
        $order = wc_get_order($order_id);
        
        if (!$order || !king_can_generate_invoice($order)) {
            return new WP_Error('invoice_not_available', 'Faktura nie jest dostępna', ['status' => 404]);
        }
        
        $invoice_data = king_generate_invoice_data($order);
        $pdf_content = king_generate_invoice_pdf($order, $invoice_data);
        
        // Zwróć PDF jako binary response
        return new WP_REST_Response($pdf_content, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="faktura_' . $order_id . '.pdf"',
        ]);
    }
]);
```

#### **KROK 6: Frontend - Aktualizacja strony `/moje-faktury`**

```typescript
// apps/web/src/app/moje-faktury/page.tsx

const handleDownloadInvoice = async (invoice: Invoice) => {
  try {
    const response = await fetch(`/api/woocommerce/invoices/${invoice.id}/pdf`);
    
    if (!response.ok) {
      throw new Error('Nie udało się pobrać faktury');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faktura_${invoice.number}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Błąd pobierania faktury:', error);
    // Pokaż komunikat błędu użytkownikowi
  }
};
```

#### **KROK 7: Next.js API Route**

```typescript
// apps/web/src/app/api/woocommerce/invoices/[id]/pdf/route.ts

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
    const wordpressUrl = process.env.WORDPRESS_URL;
    
    const response = await fetch(
      `${wordpressUrl}/wp-json/custom/v1/invoice/${invoiceId}/pdf`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      return new Response('Błąd pobierania faktury', { status: response.status });
    }
    
    const pdfBlob = await response.blob();
    
    return new Response(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="faktura_${invoiceId}.pdf"`,
      },
    });
  } catch (error) {
    return new Response('Błąd serwera', { status: 500 });
  }
}
```

---

## 📋 Checklist implementacji:

- [ ] **KROK 1**: Utworzyć `king-invoices-settings.php` (konfiguracja danych firmy)
- [ ] **KROK 2**: Zainstalować TCPDF (`composer require tecnickcom/tcpdf`)
- [ ] **KROK 3**: Zaktualizować `king_generate_invoice_data()` (używa konfiguracji)
- [ ] **KROK 4**: Zaktualizować `king_generate_invoice_pdf()` (używa TCPDF)
- [ ] **KROK 5**: Zaktualizować REST API endpoint (zwraca binary PDF)
- [ ] **KROK 6**: Zaktualizować frontend (`/moje-faktury`) - pobieranie PDF
- [ ] **KROK 7**: Utworzyć Next.js API route (`/api/woocommerce/invoices/[id]/pdf`)
- [ ] **KROK 8**: Dodać walidację (`king_can_generate_invoice()`)
- [ ] **KROK 9**: Dodać cache'owanie PDF (opcjonalnie)
- [ ] **KROK 10**: Testy end-to-end

---

## 🎯 Zalety tego rozwiązania:

1. **Uniwersalność**: Działa dla każdego starter template
2. **Konfigurowalność**: Dane firmy w WordPress Admin (nie hardcoded)
3. **Zgodność z prawem**: Prawdziwe PDF (nie HTML)
4. **Bezpieczeństwo**: PDF generowany na backendzie
5. **Wydajność**: Możliwość cache'owania PDF
6. **Kompatybilność**: Działa w każdej przeglądarce
7. **Maintainability**: Łatwe do utrzymania i rozszerzenia

---

## 📝 Uwagi dodatkowe:

1. **Cache'owanie PDF**: Można cache'ować wygenerowane PDF na serwerze (np. w `wp-content/uploads/invoices/`)
2. **Walidacja**: Sprawdzać, czy zamówienie ma status, który pozwala na generowanie faktury
3. **Bezpieczeństwo**: Sprawdzać, czy user ma dostęp do faktury (customer_id matching)
4. **Logowanie**: Logować wszystkie próby pobrania faktur (audit trail)
5. **Email**: Automatyczne wysyłanie faktur na email (opcjonalnie)

---

## 🔄 Alternatywne podejścia:

### **OPCJA 3: Hybrid (HTML Preview + PDF Download)**

- Preview faktury w przeglądarce (HTML)
- Pobieranie jako PDF (generowany na serwerze)
- Najlepsze UX - użytkownik widzi fakturę przed pobraniem

### **OPCJA 4: Third-party Service (np. Invoice Ninja API)**

- Użycie zewnętrznej usługi do generowania faktur
- Wymaga integracji z API
- Dodatkowe koszty (ale mniej kodu do utrzymania)

---

## ✅ Rekomendacja końcowa:

**OPCJA 1 (Server-Side PDF z TCPDF)** jest najlepszym wyborem dla starter template, ponieważ:
- Jest uniwersalna
- Jest konfigurowalna
- Jest bezpieczna
- Jest zgodna z prawem
- Nie wymaga zewnętrznych usług
- Łatwa do utrzymania

