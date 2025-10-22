<?php
// Ensure shared headless helpers are loaded
if (file_exists(WP_CONTENT_DIR . '/mu-plugins/headless-config.php')) {
    require_once WP_CONTENT_DIR . '/mu-plugins/headless-config.php';
}
// wp-content/mu-plugins/customer-invoices.php

/**
 * Custom REST API endpoints for customer invoices and tracking
 */

// Hook into WooCommerce order completion to auto-generate invoices
// FIXED: Faktura tylko przy completed status - Senior Level
add_action('woocommerce_order_status_completed', 'auto_generate_invoice_for_order');

// REMOVED: PDF Invoices & Packing Slips control - we don't need that plugin
// We have our own invoice system that works independently

// REMOVED: PDF Invoices & Packing Slips control function
// We don't need to control that plugin - we have our own invoice system

function auto_generate_invoice_for_order($order_id) {
    $order = wc_get_order($order_id);
    
    if (!$order) {
        return;
    }
    
    // Check if customer requested invoice (has NIP)
    $billing_nip = $order->get_meta('_billing_nip');
    $invoice_request = $order->get_meta('_invoice_request');
    
    // Auto-generate invoice if NIP is provided or invoice is requested
    if (!empty($billing_nip) || $invoice_request === 'yes') {
        // Create invoice record
        $invoice_data = generate_invoice_data($order);
        
        // Store invoice data in order meta
        $order->update_meta_data('_invoice_generated', 'yes');
        $order->update_meta_data('_invoice_number', $invoice_data['invoice_number']);
        $order->update_meta_data('_invoice_date', $invoice_data['invoice_date']);
        $order->save();
        
        // DISABLED: Custom invoice email sending - let PDF Invoices & Packing Slips handle it
        // if ($invoice_request === 'yes') {
        //     send_invoice_email($order, $invoice_data);
        // }
        
        error_log("Auto-generated invoice for order: " . $order_id);
    }
}

/**
 * Add custom billing fields (NIP, invoice request) to checkout
 */
add_filter('woocommerce_checkout_fields', function($fields) {
    // Ensure company field is visible (WooCommerce has it built-in)
    if (isset($fields['billing']['billing_company'])) {
        $fields['billing']['billing_company']['required'] = false;
        $fields['billing']['billing_company']['label'] = __('Nazwa firmy', 'woocommerce');
        $fields['billing']['billing_company']['priority'] = 120;
    }

    // Add NIP
    $fields['billing']['billing_nip'] = [
        'type' => 'text',
        'label' => __('NIP', 'woocommerce'),
        'required' => false,
        'class' => ['form-row-wide'],
        'priority' => 121,
    ];

    // Add invoice request checkbox
    $fields['billing']['invoice_request'] = [
        'type' => 'checkbox',
        'label' => __('Chcę fakturę (na firmę)', 'woocommerce'),
        'required' => false,
        'class' => ['form-row-wide'],
        'priority' => 122,
    ];

    return $fields;
});

/**
 * Persist custom fields to order and user meta
 */
add_action('woocommerce_checkout_create_order', function($order, $data) {
    $billing_nip = isset($_POST['billing_nip']) ? sanitize_text_field($_POST['billing_nip']) : '';
    $invoice_request = isset($_POST['invoice_request']) && $_POST['invoice_request'] ? 'yes' : 'no';

    if (!empty($billing_nip)) {
        $order->update_meta_data('_billing_nip', $billing_nip);
    }
    $order->update_meta_data('_invoice_request', $invoice_request);

    // Persist to user meta for logged-in customers
    $user_id = $order->get_user_id();
    if ($user_id) {
        if (!empty($billing_nip)) {
            update_user_meta($user_id, '_billing_nip', $billing_nip);
        }
        update_user_meta($user_id, '_invoice_request', $invoice_request);
    }
}, 10, 2);

/**
 * Helper: build PDF Invoices & Packing Slips download URL if plugin is active
 */
function kb_get_wcpdf_download_url($order_id) {
    if (class_exists('WPO_WCPDF') || function_exists('wpo_wcpdf')) {
        // Keep PDF generation on backend, but provide frontend download link
        $frontend = function_exists('headless_frontend_url') ? headless_frontend_url() : site_url();
        return rtrim($frontend, '/') . '/moje-faktury?download=' . intval($order_id);
    }
    return null;
}

function send_invoice_email($order, $invoice_data) {
    $customer_email = $order->get_billing_email();
    $customer_name = $order->get_billing_first_name() . ' ' . $order->get_billing_last_name();
    
    $subject = 'Faktura VAT - KingBrand';
    $message = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Faktura VAT</title>
        </head>
        <body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;'>
            <div style='max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>
                <div style='text-align: center; margin-bottom: 30px;'>
                    <h1 style='color: #333; margin: 0; font-size: 28px;'>Faktura VAT</h1>
                    <p style='color: #666; margin: 5px 0 0 0;'>Nr: {$invoice_data['invoice_number']}</p>
                    <p style='color: #666; margin: 5px 0 0 0;'>Data: {$invoice_data['invoice_date']}</p>
                </div>
                
                <div style='color: #555; line-height: 1.6; margin-bottom: 30px;'>
                    <p>Drogi/a {$customer_name},</p>
                    <p>W załączniku przesyłamy fakturę VAT za zamówienie nr <strong>{$invoice_data['order_number']}</strong>.</p>
                    <p>Kwota do zapłaty: <strong>{$invoice_data['totals']['total']} PLN</strong></p>
                </div>
                
                <div style='background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 30px 0;'>
                    <h3 style='color: #333; margin: 0 0 10px 0;'>Szczegóły płatności:</h3>
                    <p style='margin: 5px 0; color: #555;'>Metoda płatności: {$invoice_data['payment_method']}</p>
                    <p style='margin: 5px 0; color: #555;'>Status: Zamówienie zrealizowane</p>
                </div>
                
                <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;'>
                    <p>Pozdrawiamy,<br><strong>Zespół KingBrand</strong></p>
                    <p>Faktura jest również dostępna w Twoim panelu klienta.</p>
                </div>
            </div>
        </body>
        </html>
    ";
    
    $headers = [
        'Content-Type: text/html; charset=UTF-8',
        'From: KingBrand <noreply@kingbrand.pl>'
    ];
    
    wp_mail($customer_email, $subject, $message, $headers);
    
    error_log("Invoice email sent to: " . $customer_email);
}

// Register invoice endpoints
add_action('rest_api_init', function() {
    // Debug: Log REST API registration
    error_log("🔍 Customer invoices REST API endpoints registered");
    register_rest_route('custom/v1', '/invoices', [
        'methods' => 'GET',
        'callback' => 'get_customer_invoices',
        'permission_callback' => 'check_customer_permission',
        'args' => [
            'customer_id' => [
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint'
            ]
        ]
    ]);
    
    register_rest_route('custom/v1', '/invoice/(?P<id>\d+)', [
        'methods' => 'GET',
        'callback' => 'get_invoice_pdf',
        'permission_callback' => 'check_customer_permission',
        'args' => [
            'id' => [
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint'
            ]
        ]
    ]);
    register_rest_route('custom/v1', '/invoice/(?P<id>\d+)/pdf', [
        'methods' => 'GET',
        'callback' => 'get_invoice_pdf_binary',
        'permission_callback' => 'check_customer_permission',
        'args' => [
            'id' => [
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint'
            ]
        ]
    ]);
    
    register_rest_route('custom/v1', '/tracking/(?P<order_id>\d+)', [
        'methods' => 'GET',
        'callback' => 'get_order_tracking',
        'permission_callback' => 'check_customer_permission',
        'args' => [
            'order_id' => [
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint'
            ]
        ]
    ]);
});

/**
 * Check if user has permission to access customer data
 */
function check_customer_permission($request) {
    // Debug: Log permission check
    error_log("🔍 Customer invoices permission check - customer_id: " . $request->get_param('customer_id'));
    
    // For now, allow all requests - in production add proper authentication
    return true;
}

/**
 * Get customer invoices
 */
function get_customer_invoices($request) {
    $customer_id = $request->get_param('customer_id');
    
    // Debug: Log invoice request
    error_log("🔍 Customer invoices request - customer_id: " . $customer_id);

    // Get orders for customer that have invoices generated
    $orders = wc_get_orders([
        'customer_id' => $customer_id,
        'status' => ['completed', 'processing', 'shipped'],
        'limit' => 50,
        'orderby' => 'date',
        'order' => 'DESC',
        'meta_query' => [
            [
                'key' => '_invoice_generated',
                'value' => 'yes',
                'compare' => '='
            ]
        ]
    ]);
    
    // Debug: Log found orders
    error_log("🔍 Found orders with invoices: " . count($orders));
    
    $invoices = [];
    
    foreach ($orders as $order) {
        $invoice_number = $order->get_meta('_invoice_number');
        $invoice_date = $order->get_meta('_invoice_date');
        
        $invoices[] = [
            'id' => $order->get_id(),
            'number' => $invoice_number ?: 'FV/' . date('Y') . '/' . str_pad($order->get_id(), 6, '0', STR_PAD_LEFT),
            'date' => $invoice_date ?: $order->get_date_created()->date('Y-m-d'),
            'total' => $order->get_total(),
            'currency' => $order->get_currency(),
            'status' => $order->get_status(),
            'download_url' => kb_get_wcpdf_download_url($order->get_id()) ?: rest_url("custom/v1/invoice/{$order->get_id()}"),
            'order_number' => $order->get_order_number(),
            'billing_nip' => $order->get_meta('_billing_nip'),
            'company' => $order->get_billing_company()
        ];
    }
    
    return new WP_REST_Response([
        'success' => true,
        'invoices' => $invoices
    ], 200);
}

/**
 * Generate and return invoice PDF
 */
function get_invoice_pdf($request) {
    $order_id = $request->get_param('id');
    $order = wc_get_order($order_id);
    
    if (!$order) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Zamówienie nie znalezione'
        ], 404);
    }
    
    // Generate PDF invoice (simplified version)
    $invoice_data = generate_invoice_data($order);
    
    // For now, return JSON data - in production generate actual PDF
    return new WP_REST_Response([
        'success' => true,
        'invoice' => $invoice_data,
        'pdf_url' => rest_url("custom/v1/invoice/{$order_id}/pdf") // Future PDF endpoint
    ], 200);
}

/**
 * Get order tracking information
 */
function get_order_tracking($request) {
    $order_id = $request->get_param('order_id');
    $order = wc_get_order($order_id);
    
    if (!$order) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Zamówienie nie znalezione'
        ], 404);
    }
    
    // Get tracking number from order meta
    $tracking_number = $order->get_meta('_tracking_number');
    $carrier = $order->get_meta('_tracking_carrier') ?: 'InPost';
    
    // Get order status
    $status = $order->get_status();
    $status_info = get_order_status_info($status);
    
    $tracking_info = [
        'order_id' => $order->get_id(),
        'order_number' => $order->get_order_number(),
        'tracking_number' => $tracking_number,
        'carrier' => $carrier,
        'status' => $status,
        'status_label' => $status_info['label'],
        'status_description' => $status_info['description'],
        'estimated_delivery' => $order->get_meta('_estimated_delivery'),
        'tracking_url' => $tracking_number ? "https://inpost.pl/sledzenie-przesylek?number={$tracking_number}" : null,
        'history' => get_tracking_history($order)
    ];
    
    return new WP_REST_Response([
        'success' => true,
        'tracking' => $tracking_info
    ], 200);
}

/**
 * Generate invoice data
 */
function generate_invoice_data($order) {
    return [
        'invoice_number' => 'FV/' . date('Y') . '/' . str_pad($order->get_id(), 6, '0', STR_PAD_LEFT),
        'invoice_date' => date('Y-m-d'),
        'order_number' => $order->get_order_number(),
        'order_date' => $order->get_date_created()->date('Y-m-d'),
        'customer' => [
            'name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
            'email' => $order->get_billing_email(),
            'phone' => $order->get_billing_phone(),
            'address' => $order->get_formatted_billing_address()
        ],
        'items' => [],
        'totals' => [
            'subtotal' => $order->get_subtotal(),
            'shipping' => $order->get_shipping_total(),
            'tax' => $order->get_total_tax(),
            'total' => $order->get_total()
        ],
        'payment_method' => $order->get_payment_method_title(),
        'company_info' => [
            'name' => 'KingBrand Sp. z o.o.',
            'address' => 'ul. Przykładowa 123, 00-001 Warszawa',
            'nip' => '1234567890',
            'phone' => '+48 123 456 789',
            'email' => 'info@kingbrand.pl'
        ]
    ];
}

/**
 * Get order status information
 */
function get_order_status_info($status) {
    $statuses = [
        'pending' => [
            'label' => 'Oczekujące',
            'description' => 'Zamówienie zostało przyjęte i oczekuje na realizację'
        ],
        'processing' => [
            'label' => 'W realizacji',
            'description' => 'Zamówienie jest przygotowywane do wysyłki'
        ],
        'shipped' => [
            'label' => 'Wysłane',
            'description' => 'Zamówienie zostało wysłane'
        ],
        'completed' => [
            'label' => 'Dostarczone',
            'description' => 'Zamówienie zostało dostarczone'
        ],
        'cancelled' => [
            'label' => 'Anulowane',
            'description' => 'Zamówienie zostało anulowane'
        ]
    ];
    
    return $statuses[$status] ?? [
        'label' => 'Nieznany',
        'description' => 'Status nieznany'
    ];
}

/**
 * Get tracking history
 */
function get_tracking_history($order) {
    // Mock tracking history - in production integrate with real carrier API
    $history = [
        [
            'date' => $order->get_date_created()->date('Y-m-d H:i'),
            'status' => 'Zamówienie przyjęte',
            'description' => 'Zamówienie zostało przyjęte do realizacji'
        ]
    ];
    
    if ($order->get_status() !== 'pending') {
        $history[] = [
            'date' => $order->get_date_modified()->date('Y-m-d H:i'),
            'status' => 'W przygotowaniu',
            'description' => 'Zamówienie jest przygotowywane do wysyłki'
        ];
    }
    
    if (in_array($order->get_status(), ['shipped', 'completed'])) {
        $history[] = [
            'date' => $order->get_date_modified()->date('Y-m-d H:i'),
            'status' => 'Wysłane',
            'description' => 'Zamówienie zostało przekazane do przewoźnika'
        ];
    }
    
    return $history;
}

// Register customer profile update endpoints
add_action('rest_api_init', function() {
    register_rest_route('custom/v1', '/customer/update-profile', [
        'methods' => 'POST',
        'callback' => 'update_customer_profile',
        'permission_callback' => 'check_customer_permission',
        'args' => [
            'customer_id' => [
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint'
            ],
            'profile_data' => [
                'required' => true,
                'type' => 'object'
            ]
        ]
    ]);
    
    register_rest_route('custom/v1', '/customer/change-password', [
        'methods' => 'POST',
        'callback' => 'change_customer_password',
        'permission_callback' => 'check_customer_permission',
        'args' => [
            'customer_id' => [
                'required' => true,
                'type' => 'integer',
                'sanitize_callback' => 'absint'
            ],
            'current_password' => [
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field'
            ],
            'new_password' => [
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field'
            ]
        ]
    ]);
});

/**
 * Update customer profile
 */
function update_customer_profile($request) {
    $customer_id = $request->get_param('customer_id');
    $profile_data = $request->get_param('profile_data');
    
    // Get customer
    $customer = new WC_Customer($customer_id);
    
    if (!$customer || !$customer->get_id()) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Klient nie znaleziony'
        ], 404);
    }
    
    try {
        // Update basic info
        if (isset($profile_data['firstName'])) {
            $customer->set_first_name($profile_data['firstName']);
        }
        if (isset($profile_data['lastName'])) {
            $customer->set_last_name($profile_data['lastName']);
        }
        if (isset($profile_data['email'])) {
            $customer->set_email($profile_data['email']);
        }
        
        // Update billing address + company/NIP/invoice flag
        if (isset($profile_data['billing'])) {
            $billing = $profile_data['billing'];
            if (isset($billing['address'])) {
                $customer->set_billing_address_1($billing['address']);
            }
            if (isset($billing['city'])) {
                $customer->set_billing_city($billing['city']);
            }
            if (isset($billing['postcode'])) {
                $customer->set_billing_postcode($billing['postcode']);
            }
            if (isset($billing['country'])) {
                $customer->set_billing_country($billing['country']);
            }
            if (isset($billing['phone'])) {
                $customer->set_billing_phone($billing['phone']);
            }
            if (isset($billing['company'])) {
                $customer->set_billing_company($billing['company']);
                update_user_meta($customer_id, 'billing_company', sanitize_text_field($billing['company']));
            }
            if (isset($billing['nip'])) {
                update_user_meta($customer_id, '_billing_nip', sanitize_text_field($billing['nip']));
            }
            if (isset($billing['invoiceRequest'])) {
                update_user_meta($customer_id, '_invoice_request', $billing['invoiceRequest'] ? 'yes' : 'no');
            }
        }
        
        // Update shipping address
        if (isset($profile_data['shipping'])) {
            $shipping = $profile_data['shipping'];
            if (isset($shipping['address'])) {
                $customer->set_shipping_address_1($shipping['address']);
            }
            if (isset($shipping['city'])) {
                $customer->set_shipping_city($shipping['city']);
            }
            if (isset($shipping['postcode'])) {
                $customer->set_shipping_postcode($shipping['postcode']);
            }
            if (isset($shipping['country'])) {
                $customer->set_shipping_country($shipping['country']);
            }
        }
        
        // Save customer
        $customer->save();
        
        return new WP_REST_Response([
            'success' => true,
            'message' => 'Profil został zaktualizowany',
            'customer' => [
                'id' => $customer->get_id(),
                'firstName' => $customer->get_first_name(),
                'lastName' => $customer->get_last_name(),
                'email' => $customer->get_email(),
                'billing' => [
                    'address' => $customer->get_billing_address_1(),
                    'city' => $customer->get_billing_city(),
                    'postcode' => $customer->get_billing_postcode(),
                    'country' => $customer->get_billing_country(),
                    'phone' => $customer->get_billing_phone(),
                    'company' => $customer->get_billing_company(),
                    'nip' => get_user_meta($customer_id, '_billing_nip', true),
                    'invoiceRequest' => get_user_meta($customer_id, '_invoice_request', true) === 'yes'
                ],
                'shipping' => [
                    'address' => $customer->get_shipping_address_1(),
                    'city' => $customer->get_shipping_city(),
                    'postcode' => $customer->get_shipping_postcode(),
                    'country' => $customer->get_shipping_country()
                ]
            ]
        ], 200);
        
    } catch (Exception $e) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Wystąpił błąd podczas aktualizacji profilu'
        ], 500);
    }
}

/**
 * Change customer password
 */
function change_customer_password($request) {
    $customer_id = $request->get_param('customer_id');
    $current_password = $request->get_param('current_password');
    $new_password = $request->get_param('new_password');
    
    // Get customer
    $customer = new WC_Customer($customer_id);
    
    if (!$customer || !$customer->get_id()) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Klient nie znaleziony'
        ], 404);
    }
    
    // Get WordPress user - WooCommerce customer ID is the same as WordPress user ID
    $user = get_user_by('id', $customer_id);
    
    // Alternative: get user by email if customer ID doesn't work
    if (!$user) {
        $user = get_user_by('email', $customer->get_email());
    }
    
    if (!$user) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Użytkownik nie znaleziony'
        ], 404);
    }
    
    // Verify current password
    if (!wp_check_password($current_password, $user->user_pass, $user->ID)) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Nieprawidłowe aktualne hasło'
        ], 400);
    }
    
    // Validate new password
    if (strlen($new_password) < 8) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Nowe hasło musi mieć co najmniej 8 znaków'
        ], 400);
    }
    
    try {
        // Update password
        wp_set_password($new_password, $user->ID);
        
        return new WP_REST_Response([
            'success' => true,
            'message' => 'Hasło zostało zmienione'
        ], 200);
        
    } catch (Exception $e) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Wystąpił błąd podczas zmiany hasła'
        ], 500);
    }
}

/**
 * Add CORS headers
 */
add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        return $value;
    });
}, 15);

function get_invoice_pdf_binary($request) {
    $order_id = $request->get_param('id');
    $order = wc_get_order($order_id);

    if (!$order) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Zamówienie nie znalezione'
        ], 404);
    }

    // Fallback: zwróć dane faktury jako base64 pseudo-PDF (do podmiany na dompdf/mpdf)
    $invoice_data = generate_invoice_data($order);
    $content = "FAKTURA: " . $invoice_data['invoice_number'] . "\nDATA: " . $invoice_data['invoice_date'] . "\nKWOTA: " . $invoice_data['totals']['total'];
    $base64 = base64_encode($content);

    return new WP_REST_Response([
        'success' => true,
        'mime' => 'application/pdf',
        'filename' => 'faktura_' . $order_id . '.pdf',
        'base64' => $base64
    ], 200);
}
?>
