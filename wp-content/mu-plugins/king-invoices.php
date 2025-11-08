<?php
// Ensure shared headless helpers are loaded
if (file_exists(WP_CONTENT_DIR . '/mu-plugins/headless-config.php')) {
    require_once WP_CONTENT_DIR . '/mu-plugins/headless-config.php';
}

/**
 * Plugin Name: King Invoices
 * Description: Unified invoice system - handles NIP fields, invoice requests, invoice generation, PDF generation, and REST API endpoints
 * Version: 3.1.0
 * Author: King Brand
 * 
 * This plugin consolidates functionality from:
 * - king-invoice-fields.php (NIP and invoice request fields)
 * - customer-invoices.php (invoice generation, PDF, REST API)
 * - woocommerce-custom-fields.php (redundant, removed)
 * 
 * NOTE: NIP display in emails is handled by king-email-system.php
 * (to avoid duplication - that plugin has more comprehensive email meta injection)
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// HPOS Compatibility Check
add_action('plugins_loaded', function() {
    $hpos_enabled = false;
    if (function_exists('wc_get_container')) {
        try {
            $container = wc_get_container();
            if ($container && $container->has(\Automattic\WooCommerce\Utilities\OrderUtil::class)) {
                $hpos_enabled = $container->get(\Automattic\WooCommerce\Utilities\OrderUtil::class)->custom_orders_table_usage_is_enabled();
            }
        } catch (Exception $e) {
            error_log("King Invoices: HPOS check failed: " . $e->getMessage());
        }
    }
    
    if (!$hpos_enabled && function_exists('wc_get_container')) {
        add_action('admin_notices', function() {
            echo '<div class="notice notice-warning"><p><strong>King Invoices:</strong> HPOS is not enabled. Some features may use fallback methods.</p></div>';
        });
    }
}, 20);

class KingInvoices {
    
    public function __construct() {
        $this->init();
    }
    
    /**
     * Initialize all hooks
     */
    public function init() {
        // ============================================
        // 1. INVOICE FIELDS (NIP & Invoice Request)
        // ============================================
        
        // Add fields to checkout
        add_filter('woocommerce_billing_fields', array($this, 'add_billing_nip_field'));
        add_filter('woocommerce_checkout_fields', array($this, 'add_invoice_fields_to_checkout'));
        
        // Save fields on checkout
        add_action('woocommerce_checkout_create_order', array($this, 'save_invoice_fields_to_order'), 10, 2);
        add_action('woocommerce_checkout_update_customer_meta', array($this, 'save_invoice_fields_to_user'));
        add_action('woocommerce_customer_save_address', array($this, 'save_invoice_fields_to_user'));
        
        // Add fields to admin user edit form
        add_action('show_user_profile', array($this, 'add_invoice_fields_to_profile'));
        add_action('edit_user_profile', array($this, 'add_invoice_fields_to_profile'));
        add_action('personal_options_update', array($this, 'save_invoice_fields_from_profile'));
        add_action('edit_user_profile_update', array($this, 'save_invoice_fields_from_profile'));
        
        // Add fields to WooCommerce customer admin
        add_action('woocommerce_admin_customer_panel', array($this, 'add_invoice_fields_to_admin_customer_panel'));
        // Save fields from customer admin panel - woocommerce_customer_save_address already handles this
        
        // Add fields to REST API response
        add_filter('woocommerce_rest_prepare_customer', array($this, 'add_invoice_fields_to_rest_api'), 10, 3);
        
        // Display fields in order admin
        add_action('woocommerce_admin_order_data_after_billing_address', array($this, 'display_invoice_fields_in_order_admin'));
        
        // Handle REST API order creation
        add_action('woocommerce_rest_insert_shop_order_object', array($this, 'handle_rest_api_order_creation'), 10, 3);
        
        // ============================================
        // 2. INVOICE GENERATION
        // ============================================
        
        // Auto-generate invoices
        add_action('woocommerce_order_status_completed', 'king_auto_generate_invoice_for_order');
        add_action('woocommerce_order_status_processing', 'king_auto_generate_invoice_for_order');
        add_action('woocommerce_new_order', 'king_maybe_generate_invoice_for_new_order', 20);
        
        // ============================================
        // 3. EMAIL DISPLAY (NIP in emails)
        // ============================================
        // NOTE: NIP display in emails is handled by king-email-system.php
        // to avoid duplication - that plugin has more comprehensive email meta injection
        // ============================================
        // 4. REST API ENDPOINTS
        // ============================================
        
        add_action('rest_api_init', array($this, 'register_rest_api_endpoints'));
        
        // ============================================
        // 5. CORS HEADERS
        // ============================================
        
        add_action('rest_api_init', array($this, 'add_cors_headers'), 15);
        
        // ============================================
        // 6. ADMIN SETTINGS PAGE
        // ============================================
        
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    // ============================================
    // INVOICE FIELDS METHODS
    // ============================================
    
    /**
     * Add NIP field to WooCommerce billing fields
     */
    public function add_billing_nip_field($fields) {
        $fields['billing_nip'] = array(
            'label' => __('NIP', 'woocommerce'),
            'placeholder' => __('Wpisz NIP', 'woocommerce'),
            'required' => false,
            'class' => array('form-row-wide'),
            'clear' => true,
            'priority' => 35,
            'type' => 'text'
        );
        return $fields;
    }
    
    /**
     * Add invoice fields to checkout
     */
    public function add_invoice_fields_to_checkout($fields) {
        // Ensure company field is visible
        if (isset($fields['billing']['billing_company'])) {
            $fields['billing']['billing_company']['required'] = false;
            $fields['billing']['billing_company']['label'] = __('Nazwa firmy', 'woocommerce');
            $fields['billing']['billing_company']['priority'] = 120;
        }

        // Add NIP
        $fields['billing']['billing_nip'] = [
            'type' => 'text',
            'label' => __('NIP', 'woocommerce'),
            'placeholder' => __('Wpisz NIP', 'woocommerce'),
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
    }
    
    /**
     * Save invoice fields to order meta
     */
    public function save_invoice_fields_to_order($order, $data) {
        $billing_nip = '';
        if (isset($_POST['billing_nip'])) {
            $billing_nip = sanitize_text_field($_POST['billing_nip']);
        } elseif (isset($data['billing_nip'])) {
            $billing_nip = sanitize_text_field($data['billing_nip']);
        }
        
        $invoice_request = 'no';
        if (isset($_POST['invoice_request']) && $_POST['invoice_request']) {
            $invoice_request = 'yes';
        } elseif (isset($data['invoice_request'])) {
            $invoice_request = $data['invoice_request'] ? 'yes' : 'no';
        }

        if (!empty($billing_nip)) {
            $order->update_meta_data('_billing_nip', $billing_nip);
            // Auto-set invoice request if NIP is provided
            if ($invoice_request === 'no') {
                $invoice_request = 'yes';
            }
        }
        $order->update_meta_data('_invoice_request', $invoice_request);
    }
    
    /**
     * Save invoice fields to user meta
     */
    public function save_invoice_fields_to_user($user_id) {
        $billing_nip = '';
        if (isset($_POST['billing_nip'])) {
            $billing_nip = sanitize_text_field($_POST['billing_nip']);
        }
        
        $invoice_request = 'no';
        if (isset($_POST['invoice_request']) && $_POST['invoice_request']) {
            $invoice_request = 'yes';
        }
        
        // Auto-set invoice_request if NIP is provided
        if (!empty($billing_nip) && $invoice_request === 'no') {
            $invoice_request = 'yes';
        }
        
        if (!empty($billing_nip)) {
            update_user_meta($user_id, 'billing_nip', $billing_nip);
            update_user_meta($user_id, '_billing_nip', $billing_nip);
        }
        
        update_user_meta($user_id, '_invoice_request', $invoice_request);
        
        error_log("King Invoices: Saved invoice fields for user {$user_id} - NIP: {$billing_nip}, Invoice Request: {$invoice_request}");
    }
    
    /**
     * Add invoice fields to user profile (WordPress admin)
     */
    public function add_invoice_fields_to_profile($user) {
        $nip = get_user_meta($user->ID, '_billing_nip', true);
        if (empty($nip)) {
            $nip = get_user_meta($user->ID, 'billing_nip', true);
        }
        $invoice_request = get_user_meta($user->ID, '_invoice_request', true);
        ?>
        <h3><?php _e('Dane rozliczeniowe (Faktura)', 'woocommerce'); ?></h3>
        <table class="form-table">
            <tr>
                <th><label for="billing_nip"><?php _e('NIP', 'woocommerce'); ?></label></th>
                <td>
                    <input type="text" 
                           name="billing_nip" 
                           id="billing_nip" 
                           value="<?php echo esc_attr($nip); ?>" 
                           class="regular-text" />
                    <p class="description"><?php _e('Numer identyfikacji podatkowej', 'woocommerce'); ?></p>
                </td>
            </tr>
            <tr>
                <th><label for="invoice_request"><?php _e('Chcę fakturę (na firmę)', 'woocommerce'); ?></label></th>
                <td>
                    <input type="checkbox" 
                           name="invoice_request" 
                           id="invoice_request" 
                           value="yes" 
                           <?php checked($invoice_request, 'yes'); ?> />
                    <p class="description"><?php _e('Zaznacz, jeśli klient chce otrzymywać faktury VAT', 'woocommerce'); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }
    
    /**
     * Save invoice fields from profile
     */
    public function save_invoice_fields_from_profile($user_id) {
        if (current_user_can('edit_user', $user_id)) {
            if (isset($_POST['billing_nip'])) {
                $nip = sanitize_text_field($_POST['billing_nip']);
                update_user_meta($user_id, 'billing_nip', $nip);
                update_user_meta($user_id, '_billing_nip', $nip);
                
                if (!empty($nip)) {
                    update_user_meta($user_id, '_invoice_request', 'yes');
                }
            }
            
            if (isset($_POST['invoice_request'])) {
                update_user_meta($user_id, '_invoice_request', 'yes');
            } else {
                $nip = get_user_meta($user_id, '_billing_nip', true);
                if (empty($nip)) {
                    update_user_meta($user_id, '_invoice_request', 'no');
                }
            }
        }
    }
    
    /**
     * Add invoice fields to WooCommerce customer admin panel
     */
    public function add_invoice_fields_to_admin_customer_panel($customer) {
        $nip = get_user_meta($customer->get_id(), '_billing_nip', true);
        $invoice_request = get_user_meta($customer->get_id(), '_invoice_request', true);
        ?>
        <div class="address">
            <p class="form-field form-field-wide">
                <label for="billing_nip"><?php _e('NIP', 'woocommerce'); ?></label>
                <input type="text" 
                       name="billing_nip" 
                       id="billing_nip" 
                       value="<?php echo esc_attr($nip); ?>" 
                       class="regular-text" />
            </p>
            <p class="form-field form-field-wide">
                <label for="invoice_request"><?php _e('Chcę fakturę (na firmę)', 'woocommerce'); ?></label>
                <input type="checkbox" 
                       name="invoice_request" 
                       id="invoice_request" 
                       value="yes" 
                       <?php checked($invoice_request, 'yes'); ?> />
            </p>
        </div>
        <?php
    }
    
    
    /**
     * Add invoice fields to REST API response
     */
    public function add_invoice_fields_to_rest_api($response, $customer, $request) {
        $user_id = $customer->get_id();
        
        $nip = get_user_meta($user_id, '_billing_nip', true);
        if (empty($nip)) {
            $nip = get_user_meta($user_id, 'billing_nip', true);
        }
        
        $invoice_request = get_user_meta($user_id, '_invoice_request', true);
        
        if (!empty($nip) && empty($invoice_request)) {
            $invoice_request = 'yes';
            update_user_meta($user_id, '_invoice_request', 'yes');
        }
        
        $response->data['billing']['nip'] = $nip;
        $response->data['billing']['invoiceRequest'] = $invoice_request === 'yes';
        
        return $response;
    }
    
    /**
     * Display invoice fields in order admin
     */
    public function display_invoice_fields_in_order_admin($order) {
        $nip = $order->get_meta('_billing_nip', true);
        $invoice_request = $order->get_meta('_invoice_request', true);

        if (!empty($nip) || $invoice_request === 'yes') {
            echo '<div class="address">';
            echo '<h4>' . __('Dane faktury', 'woocommerce') . '</h4>';
            if (!empty($nip)) {
                echo '<p><strong>' . __('NIP', 'woocommerce') . ':</strong> ' . esc_html($nip) . '</p>';
            }
            echo '<p><strong>' . __('Faktura', 'woocommerce') . ':</strong> ' . ($invoice_request === 'yes' ? __('Tak', 'woocommerce') : __('Nie', 'woocommerce')) . '</p>';
            echo '</div>';
        }
    }
    
    /**
     * Handle REST API order creation
     */
    public function handle_rest_api_order_creation($order, $request, $creating) {
        if ($creating) {
            $meta_data = $request->get_param('meta_data');
            if (is_array($meta_data)) {
                $billing_nip = null;
                $invoice_request = null;
                
                foreach ($meta_data as $meta) {
                    if (isset($meta['key']) && $meta['key'] === '_billing_nip') {
                        $billing_nip = sanitize_text_field($meta['value']);
                    }
                    if (isset($meta['key']) && $meta['key'] === '_invoice_request') {
                        $invoice_request = sanitize_text_field($meta['value']);
                    }
                }
                
                if ($billing_nip !== null) {
                    $order->update_meta_data('_billing_nip', $billing_nip);
                }
                if ($invoice_request !== null) {
                    $order->update_meta_data('_invoice_request', $invoice_request);
                } elseif ($billing_nip !== null) {
                    $order->update_meta_data('_invoice_request', 'yes');
                }
                
                $user_id = $order->get_user_id();
                if ($user_id) {
                    if ($billing_nip !== null && !empty($billing_nip)) {
                        update_user_meta($user_id, 'billing_nip', $billing_nip);
                        update_user_meta($user_id, '_billing_nip', $billing_nip);
                    }
                    
                    $final_invoice_request = $invoice_request !== null ? $invoice_request : ($billing_nip !== null ? 'yes' : 'no');
                    update_user_meta($user_id, '_invoice_request', $final_invoice_request);
                }
            }
        }
    }
    
    // ============================================
    // EMAIL METHODS
    // ============================================
    // NOTE: NIP display in emails is handled by king-email-system.php
    // to avoid duplication - that plugin has more comprehensive email meta injection
    // ============================================
    
    // REST API METHODS
    // ============================================
    
    /**
     * Register REST API endpoints
     */
    public function register_rest_api_endpoints() {
        // Invoice endpoints
        register_rest_route('custom/v1', '/invoices', [
            'methods' => 'GET',
            'callback' => 'king_get_customer_invoices',
            'permission_callback' => 'king_check_customer_permission',
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
            'callback' => 'king_get_invoice_pdf',
            'permission_callback' => 'king_check_customer_permission',
            'args' => [
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ]
            ]
        ]);
        
        // Register PDF endpoint - will be handled by custom route handler
        register_rest_route('custom/v1', '/invoice/(?P<id>\d+)/pdf', [
            'methods' => 'GET',
            'callback' => 'king_get_invoice_pdf_binary',
            'permission_callback' => 'king_check_customer_permission',
            'args' => [
                'id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ]
            ]
        ]);
        
        // Add filter to serve binary PDF response
        add_filter('rest_pre_serve_request', 'king_serve_invoice_pdf', 10, 4);
        
        register_rest_route('custom/v1', '/tracking/(?P<order_id>\d+)', [
            'methods' => 'GET',
            'callback' => 'king_get_order_tracking',
            'permission_callback' => 'king_check_customer_permission',
            'args' => [
                'order_id' => [
                    'required' => true,
                    'type' => 'integer',
                    'sanitize_callback' => 'absint'
                ]
            ]
        ]);
        
        // Customer profile endpoints
        register_rest_route('custom/v1', '/customer/update-profile', [
            'methods' => 'POST',
            'callback' => 'king_update_customer_profile',
            'permission_callback' => 'king_check_customer_permission',
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
            'callback' => 'king_change_customer_password',
            'permission_callback' => 'king_check_customer_permission',
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
    }
    
    /**
     * Add CORS headers
     */
    public function add_cors_headers() {
        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        add_filter('rest_pre_serve_request', function ($value) {
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
            return $value;
        });
    }
    
    /**
     * Add admin menu for invoice settings
     */
    public function add_admin_menu() {
        add_options_page(
            'Ustawienia Faktur',
            'Faktury',
            'manage_options',
            'king-invoices-settings',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('king_invoices_settings', 'king_invoice_company_name');
        register_setting('king_invoices_settings', 'king_invoice_company_address');
        register_setting('king_invoices_settings', 'king_invoice_company_city');
        register_setting('king_invoices_settings', 'king_invoice_company_nip');
        register_setting('king_invoices_settings', 'king_invoice_company_phone');
        register_setting('king_invoices_settings', 'king_invoice_company_email');
        register_setting('king_invoices_settings', 'king_invoice_company_bank');
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        if (isset($_POST['submit']) && check_admin_referer('king_invoices_settings')) {
            update_option('king_invoice_company_name', sanitize_text_field($_POST['king_invoice_company_name']));
            update_option('king_invoice_company_address', sanitize_text_field($_POST['king_invoice_company_address']));
            update_option('king_invoice_company_city', sanitize_text_field($_POST['king_invoice_company_city']));
            update_option('king_invoice_company_nip', sanitize_text_field($_POST['king_invoice_company_nip']));
            update_option('king_invoice_company_phone', sanitize_text_field($_POST['king_invoice_company_phone']));
            update_option('king_invoice_company_email', sanitize_email($_POST['king_invoice_company_email']));
            update_option('king_invoice_company_bank', sanitize_text_field($_POST['king_invoice_company_bank']));
            echo '<div class="notice notice-success"><p>Ustawienia zapisane!</p></div>';
        }
        
        ?>
        <div class="wrap">
            <h1>Ustawienia Faktur</h1>
            <form method="post" action="">
                <?php wp_nonce_field('king_invoices_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row"><label for="king_invoice_company_name">Nazwa firmy</label></th>
                        <td><input type="text" name="king_invoice_company_name" id="king_invoice_company_name" value="<?php echo esc_attr(get_option('king_invoice_company_name', 'KingBrand Sp. z o.o.')); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="king_invoice_company_address">Adres</label></th>
                        <td><input type="text" name="king_invoice_company_address" id="king_invoice_company_address" value="<?php echo esc_attr(get_option('king_invoice_company_address', 'ul. Przykładowa 123')); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="king_invoice_company_city">Miasto i kod pocztowy</label></th>
                        <td><input type="text" name="king_invoice_company_city" id="king_invoice_company_city" value="<?php echo esc_attr(get_option('king_invoice_company_city', '00-001 Warszawa')); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="king_invoice_company_nip">NIP</label></th>
                        <td><input type="text" name="king_invoice_company_nip" id="king_invoice_company_nip" value="<?php echo esc_attr(get_option('king_invoice_company_nip', '1234567890')); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="king_invoice_company_phone">Telefon</label></th>
                        <td><input type="text" name="king_invoice_company_phone" id="king_invoice_company_phone" value="<?php echo esc_attr(get_option('king_invoice_company_phone', '+48 123 456 789')); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="king_invoice_company_email">Email</label></th>
                        <td><input type="email" name="king_invoice_company_email" id="king_invoice_company_email" value="<?php echo esc_attr(get_option('king_invoice_company_email', 'info@kingbrand.pl')); ?>" class="regular-text" /></td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="king_invoice_company_bank">Nr konta bankowego</label></th>
                        <td><input type="text" name="king_invoice_company_bank" id="king_invoice_company_bank" value="<?php echo esc_attr(get_option('king_invoice_company_bank', 'PL 12 3456 7890 1234 5678 9012 3456')); ?>" class="regular-text" /></td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}

// Initialize the plugin
new KingInvoices();

// ============================================
// INVOICE GENERATION FUNCTIONS
// ============================================

if (!function_exists('king_invoice_log')) {
    function king_invoice_log($message, $context = array(), $level = 'info') {
        $upload_dir = wp_get_upload_dir();
        $log_dir = trailingslashit($upload_dir['basedir']) . 'king-logs';
        wp_mkdir_p($log_dir);
        $log_file = trailingslashit($log_dir) . 'invoices.log';
        $line = '[' . current_time('mysql') . '] [' . strtoupper($level) . '] ' . $message;
        if (!empty($context)) {
            $line .= ' ' . wp_json_encode($context);
        }
        $line .= PHP_EOL;
        @file_put_contents($log_file, $line, FILE_APPEND | LOCK_EX);
    }
}

function king_should_generate_invoice($order) {
    if (!$order instanceof WC_Order) {
        return false;
    }
    
    if ($order->get_meta('_invoice_generated') === 'yes') {
        return false;
    }
    
    $billing_nip = $order->get_meta('_billing_nip');
    $invoice_request = $order->get_meta('_invoice_request');
    $order_status = $order->get_status();
    
    if ($order_status === 'completed') {
        return true;
    }
    
    if ($order_status === 'processing' && (!empty($billing_nip) || $invoice_request === 'yes')) {
        return true;
    }
    
    return false;
}

function king_generate_invoice_now($order_id, $context = 'auto') {
    try {
        $order = wc_get_order($order_id);
        if (!$order || !$order->get_id()) {
            king_invoice_log('Order not found for invoice generation', array('order_id' => $order_id), 'error');
            return 'failed';
        }
        
        if (!king_should_generate_invoice($order)) {
            king_invoice_log('Invoice generation skipped - conditions not met', array('order_id' => $order_id, 'status' => $order->get_status()), 'debug');
            return 'skipped';
        }
        
        $invoice_data = king_generate_invoice_data($order);
        
        $order->update_meta_data('_invoice_generated', 'yes');
        $order->update_meta_data('_invoice_number', $invoice_data['invoice_number']);
        $order->update_meta_data('_invoice_date', $invoice_data['invoice_date']);
        $order->update_meta_data('_hpos_invoice_version', '2.0');
        $order->update_meta_data('_king_invoice_generation_status', 'completed');
        $order->update_meta_data('_king_invoice_generation_attempts', 0);
        $order->save();
        
        king_invoice_log('Invoice generated', array(
            'order_id' => $order_id,
            'invoice_number' => $invoice_data['invoice_number'],
            'context' => $context,
            'status' => $order->get_status(),
        ), 'info');
        
        return 'success';
        
    } catch (Exception $e) {
        king_invoice_log('Error generating invoice', array(
            'order_id' => $order_id,
            'message' => $e->getMessage(),
            'context' => $context,
        ), 'error');
        return 'failed';
    }
}

function king_schedule_invoice_generation($order_id, $context = 'status_change') {
    $order = wc_get_order($order_id);
    if (!$order || !$order->get_id()) {
        return;
    }
    
    if (!king_should_generate_invoice($order)) {
        return;
    }
    
    $status = $order->get_meta('_king_invoice_generation_status');
    if (in_array($status, array('scheduled', 'processing', 'completed'), true)) {
        return;
    }
    
    $attempts = (int) $order->get_meta('_king_invoice_generation_attempts');
    $order->update_meta_data('_king_invoice_generation_status', 'scheduled');
    $order->update_meta_data('_king_invoice_generation_context', $context);
    $order->update_meta_data('_king_invoice_generation_attempts', $attempts);
    $order->save();
    
    if (!wp_next_scheduled('king_generate_invoice_async', array($order_id))) {
        wp_schedule_single_event(time() + MINUTE_IN_SECONDS, 'king_generate_invoice_async', array($order_id));
    }
    
    king_invoice_log('Invoice generation scheduled', array('order_id' => $order_id, 'context' => $context), 'info');
}

add_action('king_generate_invoice_async', 'king_handle_async_invoice_generation', 10, 1);
function king_handle_async_invoice_generation($order_id) {
    $order = wc_get_order($order_id);
    if (!$order || !$order->get_id()) {
        return;
    }
    
    $attempts = (int) $order->get_meta('_king_invoice_generation_attempts');
    $attempts++;
    $order->update_meta_data('_king_invoice_generation_attempts', $attempts);
    $order->update_meta_data('_king_invoice_generation_status', 'processing');
    $order->save();
    
    $result = king_generate_invoice_now($order_id, 'async');
    
    if ($result === 'success') {
        return;
    }
    
    if ($result === 'skipped') {
        $order->update_meta_data('_king_invoice_generation_status', 'waiting');
        $order->save();
        king_invoice_log('Invoice generation waiting for conditions', array('order_id' => $order_id, 'attempts' => $attempts), 'debug');
        return;
    }
    
    if ($attempts >= 3) {
        $order->update_meta_data('_king_invoice_generation_status', 'failed');
        $order->save();
        king_invoice_log('Invoice generation failed after max attempts', array('order_id' => $order_id, 'attempts' => $attempts), 'error');
        return;
    }
    
    $order->update_meta_data('_king_invoice_generation_status', 'scheduled');
    $order->save();
    
    $delay = max(MINUTE_IN_SECONDS, $attempts * 5 * MINUTE_IN_SECONDS);
    wp_schedule_single_event(time() + $delay, 'king_generate_invoice_async', array($order_id));
    king_invoice_log('Invoice generation retry scheduled', array('order_id' => $order_id, 'attempts' => $attempts, 'delay' => $delay), 'warning');
}

/**
 * Auto-generate invoice for order (async scheduling)
 */
function king_auto_generate_invoice_for_order($order_id) {
    king_schedule_invoice_generation($order_id, 'status_change');
}

/**
 * Maybe generate invoice for new order (async scheduling)
 */
function king_maybe_generate_invoice_for_new_order($order_id) {
    $order = wc_get_order($order_id);
    if (!$order || !$order->get_id()) {
        return;
    }
    
    $billing_nip = $order->get_meta('_billing_nip');
    $invoice_request = $order->get_meta('_invoice_request');
    $order_status = $order->get_status();
    
    if (($invoice_request === 'yes' || !empty($billing_nip)) && in_array($order_status, array('processing', 'pending'), true)) {
        king_schedule_invoice_generation($order_id, 'new_order');
    }
}

// ============================================
// REST API CALLBACK FUNCTIONS
// ============================================

/**
 * Check customer permission
 */
function king_check_customer_permission($request) {
    return true; // TODO: Add proper authentication
}

/**
 * Get customer invoices
 */
function king_get_customer_invoices($request) {
    try {
        $customer_id = $request->get_param('customer_id');
        
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
        
        $invoices = [];
        
        foreach ($orders as $order) {
            $invoice_number = $order->get_meta('_invoice_number');
            $invoice_date = $order->get_meta('_invoice_date');
            $billing_nip = $order->get_meta('_billing_nip');
            
            $invoices[] = [
                'id' => $order->get_id(),
                'number' => $invoice_number ?: 'FV/' . date('Y') . '/' . str_pad($order->get_id(), 6, '0', STR_PAD_LEFT),
                'date' => $invoice_date ?: $order->get_date_created()->date('Y-m-d'),
                'total' => $order->get_total(),
                'currency' => $order->get_currency(),
                'status' => $order->get_status(),
                'download_url' => king_get_wcpdf_download_url($order->get_id()) ?: rest_url("custom/v1/invoice/{$order->get_id()}"),
                'order_number' => $order->get_order_number(),
                'billing_nip' => $billing_nip,
                'company' => $order->get_billing_company(),
                'hpos_enabled' => true,
                'hpos_version' => $order->get_meta('_hpos_invoice_version') ?: '1.0'
            ];
        }
        
        return new WP_REST_Response([
            'success' => true,
            'invoices' => $invoices,
            'hpos_enabled' => true,
            'total_count' => count($invoices)
        ], 200);
        
    } catch (Exception $e) {
        error_log("King Invoices: Error getting invoices: " . $e->getMessage());
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Wystąpił błąd podczas pobierania faktur',
            'hpos_enabled' => true
        ], 500);
    }
}

/**
 * Get invoice PDF
 */
function king_get_invoice_pdf($request) {
    try {
        $order_id = $request->get_param('id');
        $order = wc_get_order($order_id);
        
        if (!$order || !$order->get_id()) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'Zamówienie nie znalezione',
                'hpos_enabled' => true
            ], 404);
        }
        
        $invoice_data = king_generate_invoice_data($order);
        
        return new WP_REST_Response([
            'success' => true,
            'invoice' => $invoice_data,
            'pdf_url' => rest_url("custom/v1/invoice/{$order_id}/pdf"),
            'hpos_enabled' => true,
            'hpos_version' => '2.0'
        ], 200);
        
    } catch (Exception $e) {
        error_log("King Invoices: Error getting invoice PDF: " . $e->getMessage());
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Wystąpił błąd podczas generowania faktury',
            'hpos_enabled' => true
        ], 500);
    }
}

/**
 * Serve invoice PDF as binary response (filter hook)
 */
function king_serve_invoice_pdf($served, $result, $request, $server) {
    $route = $request->get_route();
    
    // Only handle invoice PDF endpoint
    if (strpos($route, '/custom/v1/invoice/') === false || strpos($route, '/pdf') === false) {
        return $served;
    }
    
    // Extract order ID from route
    preg_match('/\/invoice\/(\d+)\/pdf/', $route, $matches);
    if (empty($matches[1])) {
        return $served;
    }
    
    $order_id = intval($matches[1]);
    
    try {
        $order = wc_get_order($order_id);
        
        if (!$order || !$order->get_id()) {
            status_header(404);
            echo json_encode(['success' => false, 'error' => 'Zamówienie nie znalezione']);
            return true;
        }
        
        // Check if invoice can be generated
        if (!king_can_generate_invoice($order)) {
            status_header(403);
            echo json_encode(['success' => false, 'error' => 'Faktura nie jest dostępna dla tego zamówienia']);
            return true;
        }
        
        $invoice_data = king_generate_invoice_data($order);
        $html = king_generate_invoice_html($order, $invoice_data);
        $pdf_content = king_generate_pdf_from_html($html, $order_id);
        
        // Check if we have a real PDF (TCPDF) or fallback
        $is_real_pdf = (substr($pdf_content, 0, 4) === '%PDF' && strlen($pdf_content) > 100);
        
        if ($is_real_pdf) {
            // Serve binary PDF
            status_header(200);
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="faktura_' . $order_id . '.pdf"');
            header('Content-Length: ' . strlen($pdf_content));
            // Disable caching for PDF to ensure fresh generation
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            echo $pdf_content;
            return true; // We handled the request
        } else {
            // Fallback: Return JSON with HTML/base64 for client-side PDF generation
            status_header(200);
            header('Content-Type: application/json');
            $base64 = base64_encode($html);
            echo json_encode([
                'success' => true,
                'mime' => 'text/html',
                'filename' => 'faktura_' . $order_id . '.html',
                'base64' => $base64,
                'html' => $html,
                'hpos_enabled' => true,
                'hpos_version' => '2.0',
                'pdf_available' => false
            ]);
            return true;
        }
        
    } catch (Exception $e) {
        error_log("King Invoices: Error generating PDF binary: " . $e->getMessage());
        status_header(500);
        echo json_encode(['success' => false, 'error' => 'Wystąpił błąd podczas generowania PDF']);
        return true;
    }
}

/**
 * Get invoice PDF binary (REST API callback - returns data for filter)
 */
function king_get_invoice_pdf_binary($request) {
    // This function is called but the actual response is handled by king_serve_invoice_pdf filter
    // We return a marker so the filter knows to handle it
    return ['served_by_filter' => true];
}

/**
 * Get order tracking
 */
function king_get_order_tracking($request) {
    try {
        $order_id = $request->get_param('order_id');
        $order = wc_get_order($order_id);
        
        if (!$order || !$order->get_id()) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'Zamówienie nie znalezione',
                'hpos_enabled' => true
            ], 404);
        }
        
        $tracking_number = $order->get_meta('_tracking_number');
        $carrier = $order->get_meta('_tracking_carrier') ?: 'InPost';
        $estimated_delivery = $order->get_meta('_estimated_delivery');
        $status = $order->get_status();
        $status_info = king_get_order_status_info($status);
        
        $tracking_info = [
            'order_id' => $order->get_id(),
            'order_number' => $order->get_order_number(),
            'tracking_number' => $tracking_number,
            'carrier' => $carrier,
            'status' => $status,
            'status_label' => $status_info['label'],
            'status_description' => $status_info['description'],
            'estimated_delivery' => $estimated_delivery,
            'tracking_url' => $tracking_number ? "https://inpost.pl/sledzenie-przesylek?number={$tracking_number}" : null,
            'history' => king_get_tracking_history($order),
            'hpos_enabled' => true,
            'hpos_version' => '2.0'
        ];
        
        return new WP_REST_Response([
            'success' => true,
            'tracking' => $tracking_info
        ], 200);
        
    } catch (Exception $e) {
        error_log("King Invoices: Error getting tracking: " . $e->getMessage());
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Wystąpił błąd podczas pobierania informacji o śledzeniu',
            'hpos_enabled' => true
        ], 500);
    }
}

/**
 * Update customer profile
 */
function king_update_customer_profile($request) {
    $customer_id = $request->get_param('customer_id');
    $profile_data = $request->get_param('profile_data');
    
    $customer = new WC_Customer($customer_id);
    
    if (!$customer || !$customer->get_id()) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Klient nie znaleziony'
        ], 404);
    }
    
    try {
        if (isset($profile_data['firstName'])) {
            $customer->set_first_name($profile_data['firstName']);
        }
        if (isset($profile_data['lastName'])) {
            $customer->set_last_name($profile_data['lastName']);
        }
        if (isset($profile_data['email'])) {
            $customer->set_email($profile_data['email']);
        }
        
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
                update_user_meta($customer_id, 'billing_nip', sanitize_text_field($billing['nip']));
            }
            if (isset($billing['invoiceRequest'])) {
                update_user_meta($customer_id, '_invoice_request', $billing['invoiceRequest'] ? 'yes' : 'no');
            }
        }
        
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
function king_change_customer_password($request) {
    $customer_id = $request->get_param('customer_id');
    $current_password = $request->get_param('current_password');
    $new_password = $request->get_param('new_password');
    
    $customer = new WC_Customer($customer_id);
    
    if (!$customer || !$customer->get_id()) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Klient nie znaleziony'
        ], 404);
    }
    
    $user = get_user_by('id', $customer_id);
    if (!$user) {
        $user = get_user_by('email', $customer->get_email());
    }
    
    if (!$user) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Użytkownik nie znaleziony'
        ], 404);
    }
    
    if (!wp_check_password($current_password, $user->user_pass, $user->ID)) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Nieprawidłowe aktualne hasło'
        ], 400);
    }
    
    if (strlen($new_password) < 8) {
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Nowe hasło musi mieć co najmniej 8 znaków'
        ], 400);
    }
    
    try {
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

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get company info from WordPress options (configurable)
 */
function king_get_company_info() {
    return [
        'name' => get_option('king_invoice_company_name', 'KingBrand Sp. z o.o.'),
        'address' => get_option('king_invoice_company_address', 'ul. Przykładowa 123'),
        'city' => get_option('king_invoice_company_city', '00-001 Warszawa'),
        'nip' => get_option('king_invoice_company_nip', '1234567890'),
        'phone' => get_option('king_invoice_company_phone', '+48 123 456 789'),
        'email' => get_option('king_invoice_company_email', 'info@kingbrand.pl'),
        'bank_account' => get_option('king_invoice_company_bank', 'PL 12 3456 7890 1234 5678 9012 3456'),
    ];
}

/**
 * Check if invoice can be generated for order
 */
function king_can_generate_invoice($order) {
    if (!$order || !$order->get_id()) {
        return false;
    }
    
    // Check if order has invoice request or NIP
    $invoice_request = $order->get_meta('_invoice_request');
    $billing_nip = $order->get_meta('_billing_nip');
    $order_status = $order->get_status();
    
    // Faktura dostępna tylko dla zamówień opłaconych lub zrealizowanych:
    // 1. Order is completed (zrealizowane) - zawsze dostępna
    // 2. Order is processing (w trakcie, ale opłacone) - dostępna jeśli ma NIP lub request
    // 3. Order is pending (oczekujące na płatność) - NIE dostępna
    // 4. Order is on-hold (wstrzymane) - NIE dostępna
    
    if ($order_status === 'completed') {
        // Zrealizowane - zawsze można wygenerować fakturę
        return true;
    } elseif ($order_status === 'processing') {
        // W trakcie realizacji (ale opłacone) - tylko jeśli ma NIP lub request
        return ($invoice_request === 'yes' || !empty($billing_nip));
    }
    
    // Inne statusy (pending, on-hold, cancelled, etc.) - faktura niedostępna
    return false;
}

/**
 * Generate invoice data
 */
/**
 * Helper: Get default tax rate for a given tax class.
 *
 * Falls back to standard rate when specific class is not available.
 */
function king_get_default_tax_rate($tax_class = '', $type = 'product') {
    static $cache = [];
    
    $cache_key = ($type ?: 'product') . '|' . ($tax_class !== '' ? $tax_class : 'standard');
    if (array_key_exists($cache_key, $cache)) {
        return $cache[$cache_key];
    }
    
    if (!class_exists('WC_Tax')) {
        $cache[$cache_key] = null;
        return null;
    }
    
    try {
        if ($type === 'shipping' && method_exists('WC_Tax', 'get_shipping_tax_rates')) {
            $rates = WC_Tax::get_shipping_tax_rates($tax_class);
        } else {
            $rates = WC_Tax::get_rates($tax_class);
        }
        
        if (empty($rates) && $tax_class !== '') {
            // Fallback to standard (empty string)
            if ($type === 'shipping' && method_exists('WC_Tax', 'get_shipping_tax_rates')) {
                $rates = WC_Tax::get_shipping_tax_rates('');
            } else {
                $rates = WC_Tax::get_rates('');
            }
        }
        
        if (!empty($rates)) {
            $rate = floatval(reset($rates)['rate']);
            $cache[$cache_key] = $rate;
            return $rate;
        }
    } catch (Exception $e) {
        error_log('King Invoices: Unable to fetch tax rate - ' . $e->getMessage());
    }
    
    $cache[$cache_key] = null;
    return null;
}

/**
 * Helper: Calculate tax amount using rate (percentage) and amount.
 */
function king_calculate_tax_amount($amount, $rate) {
    if ($rate === null) {
        return 0.0;
    }
    
    $decimals = wc_get_price_decimals();
    return round(floatval($amount) * (floatval($rate) / 100), $decimals);
}

function king_generate_invoice_data($order) {
    try {
        $order_items = $order->get_items();
        $items_data = [];
        $items_net_total = 0.0;
        $items_tax_total = 0.0;
        $currency = $order->get_currency();
        $price_decimals = wc_get_price_decimals();
        
        foreach ($order_items as $item) {
            $product = $item->get_product();
            $line_net = floatval($item->get_total()); // WooCommerce stores totals excl. tax
            $line_tax = floatval($item->get_total_tax());
            $quantity = $item->get_quantity();
            $tax_class = $item->get_tax_class();
            $tax_rate = null;
            
            if ($line_net > 0) {
                if ($line_tax > 0) {
                    $tax_rate = round(($line_tax / $line_net) * 100, 4);
                } else {
                    $tax_rate = king_get_default_tax_rate($tax_class);
                    if ($tax_rate !== null) {
                        $line_tax = king_calculate_tax_amount($line_net, $tax_rate);
                    }
                }
            }
            
            $line_gross = $line_net + $line_tax;
            $items_net_total += $line_net;
            $items_tax_total += $line_tax;
            
            $items_data[] = [
                'name' => $item->get_name(),
                'quantity' => $quantity,
                'total_net' => round($line_net, $price_decimals),
                'total_tax' => round($line_tax, $price_decimals),
                'total_gross' => round($line_gross, $price_decimals),
                'tax_rate' => $tax_rate,
                'product_id' => $item->get_product_id(),
                'variation_id' => $item->get_variation_id(),
                'sku' => $product ? $product->get_sku() : '',
                'tax_class' => $tax_class,
            ];
        }
        
        // Shipping totals
        $shipping_net = floatval($order->get_shipping_total());
        $shipping_tax = floatval($order->get_shipping_tax());
        $shipping_tax_rate = null;
        
        if ($shipping_net > 0) {
            if ($shipping_tax > 0) {
                $shipping_tax_rate = round(($shipping_tax / $shipping_net) * 100, 4);
            } else {
                $shipping_tax_rate = king_get_default_tax_rate('', 'shipping');
                if ($shipping_tax_rate !== null) {
                    $shipping_tax = king_calculate_tax_amount($shipping_net, $shipping_tax_rate);
                }
            }
        }
        
        $computed_tax_total = $items_tax_total + $shipping_tax;
        $order_tax_total = floatval($order->get_total_tax());
        $tax_total = $order_tax_total > 0 ? $order_tax_total : $computed_tax_total;
        
        $order_total = floatval($order->get_total());
        $computed_gross_total = $items_net_total + $shipping_net + $computed_tax_total;
        $gross_total = $order_tax_total > 0 ? $order_total : $computed_gross_total;
        
        return [
            'invoice_number' => 'FV/' . date('Y') . '/' . str_pad($order->get_id(), 6, '0', STR_PAD_LEFT),
            'invoice_date' => date('Y-m-d'),
            'order_number' => $order->get_order_number(),
            'order_date' => $order->get_date_created()->date('Y-m-d'),
            'order_id' => $order->get_id(),
            'customer' => [
                'id' => $order->get_customer_id(),
                'name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
                'email' => $order->get_billing_email(),
                'phone' => $order->get_billing_phone(),
                'address' => $order->get_formatted_billing_address(),
                'company' => $order->get_billing_company(),
                'nip' => $order->get_meta('_billing_nip')
            ],
            'items' => $items_data,
            'totals' => [
                'items_net' => round($items_net_total, $price_decimals),
                'items_tax' => round($items_tax_total, $price_decimals),
                'items_gross' => round($items_net_total + $items_tax_total, $price_decimals),
                'shipping_net' => round($shipping_net, $price_decimals),
                'shipping_tax' => round($shipping_tax, $price_decimals),
                'shipping_tax_rate' => $shipping_tax_rate,
                'net' => round($items_net_total + $shipping_net, $price_decimals),
                'tax' => round($tax_total, $price_decimals),
                'calculated_tax' => round($computed_tax_total, $price_decimals),
                'gross' => round($gross_total, $price_decimals),
                'order_total' => round($order_total, $price_decimals),
                'currency' => $currency,
                'tax_source' => $order_tax_total > 0 ? 'order' : 'calculated',
            ],
            'payment_method' => $order->get_payment_method_title(),
            'payment_method_id' => $order->get_payment_method(),
            'shipping_method' => $order->get_shipping_method(),
            'company_info' => king_get_company_info(),
            'hpos_enabled' => true,
            'hpos_version' => '2.0',
            'generated_at' => current_time('mysql')
        ];
        
    } catch (Exception $e) {
        error_log("King Invoices: Error generating invoice data: " . $e->getMessage());
        return [
            'invoice_number' => 'FV/' . date('Y') . '/' . str_pad($order->get_id(), 6, '0', STR_PAD_LEFT),
            'invoice_date' => date('Y-m-d'),
            'order_number' => $order->get_order_number(),
            'order_date' => $order->get_date_created()->date('Y-m-d'),
            'order_id' => $order->get_id(),
            'customer' => [
                'name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
                'email' => $order->get_billing_email(),
                'address' => $order->get_formatted_billing_address()
            ],
            'items' => [],
            'totals' => [
                'total' => $order->get_total(),
                'currency' => $order->get_currency()
            ],
            'payment_method' => $order->get_payment_method_title(),
            'hpos_enabled' => true,
            'hpos_version' => '2.0',
            'error' => 'Partial data due to error'
        ];
    }
}

/**
 * Generate invoice HTML
 */
function king_generate_invoice_html($order, $invoice_data) {
    try {
        $items_html = '';
        $currency = $invoice_data['totals']['currency'] ?? $order->get_currency();
        $price_args = ['currency' => $currency];
        
        foreach ($invoice_data['items'] as $item_data) {
            $item_name = $item_data['name'];
            $quantity = $item_data['quantity'];
            $item_net = floatval($item_data['total_net']);
            $item_gross = floatval($item_data['total_gross']);
            
            $items_html .= '
            <tr>
                <td style="border: 1px solid #ddd; padding: 4px 6px;">' . esc_html($item_name) . '</td>
                <td style="border: 1px solid #ddd; padding: 4px 6px; text-align: center;">' . esc_html($quantity) . '</td>
                <td style="border: 1px solid #ddd; padding: 4px 6px; text-align: right;">' . wc_price($item_net, $price_args) . '</td>
                <td style="border: 1px solid #ddd; padding: 4px 6px; text-align: right;">' . wc_price($item_gross, $price_args) . '</td>
            </tr>';
        }
        
        $customer_name = $order->get_billing_first_name() . ' ' . $order->get_billing_last_name();
        $customer_company = $order->get_billing_company();
        $customer_nip = $order->get_meta('_billing_nip');
        $shipping_net = floatval($invoice_data['totals']['shipping_net'] ?? 0);
        $tax_value = floatval($invoice_data['totals']['tax'] ?? 0);
        $calculated_tax = floatval($invoice_data['totals']['calculated_tax'] ?? 0);
        $tax_display = $tax_value > 0 ? $tax_value : $calculated_tax;
        
        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Faktura ' . esc_html($invoice_data['invoice_number']) . '</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; margin: 0; padding: 5px; color: #333; font-size: 10px; line-height: 1.2; }
                .header { text-align: center; margin-bottom: 5px; border-bottom: 2px solid #000; padding-bottom: 5px; }
                .header h1 { margin: 2px 0; font-size: 16px; font-weight: bold; }
                .header h2 { margin: 2px 0; font-size: 12px; }
                .company-info { float: left; width: 48%; font-size: 9px; margin-bottom: 5px; line-height: 1.3; }
                .company-info h3 { margin: 2px 0; font-size: 10px; font-weight: bold; }
                .company-info p { margin: 1px 0; }
                .invoice-info { float: right; width: 48%; text-align: right; font-size: 9px; margin-bottom: 5px; line-height: 1.3; }
                .invoice-info p { margin: 1px 0; }
                .clear { clear: both; height: 0; }
                .customer-info { margin: 5px 0; font-size: 9px; line-height: 1.3; }
                .customer-info h3 { margin: 2px 0; font-size: 10px; font-weight: bold; }
                .customer-info p { margin: 1px 0; }
                .items-table { width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 9px; }
                .items-table th, .items-table td { border: 1px solid #ddd; padding: 3px 4px; text-align: left; line-height: 1.2; }
                .items-table th { background-color: #f5f5f5; font-weight: bold; font-size: 9px; }
                .totals { float: right; width: 250px; margin-top: 5px; font-size: 9px; }
                .total-row { display: flex; justify-content: space-between; padding: 2px 0; }
                .total-final { font-weight: bold; font-size: 11px; border-top: 2px solid #000; padding-top: 3px; margin-top: 3px; }
                .footer { margin-top: 8px; text-align: center; font-size: 9px; color: #666; }
                .footer p { margin: 2px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>FAKTURA VAT</h1>
                <h2>' . esc_html($invoice_data['invoice_number']) . '</h2>
            </div>
            
            <div class="company-info">
                <p><strong>' . esc_html($invoice_data['company_info']['name']) . '</strong> | ' . esc_html($invoice_data['company_info']['address']) . ', ' . esc_html($invoice_data['company_info']['city']) . ' | NIP: ' . esc_html($invoice_data['company_info']['nip']) . ' | Tel: ' . esc_html($invoice_data['company_info']['phone']) . ' | Email: ' . esc_html($invoice_data['company_info']['email']) . '</p>
            </div>
            
            <div class="invoice-info">
                <p><strong>Data wystawienia:</strong> ' . esc_html($invoice_data['invoice_date']) . ' | <strong>Data sprzedaży:</strong> ' . esc_html($invoice_data['order_date']) . ' | <strong>Nr zamówienia:</strong> ' . esc_html($invoice_data['order_number']) . '</p>
            </div>
            
            <div class="clear"></div>
            
            <div class="customer-info">
                <p><strong>Dane nabywcy:</strong> ' . esc_html($customer_name) . (!empty($customer_company) ? ' | ' . esc_html($customer_company) : '') . (!empty($customer_nip) ? ' | NIP: ' . esc_html($customer_nip) : '') . ' | ' . str_replace('<br />', ', ', $invoice_data['customer']['address']) . ' | Email: ' . esc_html($invoice_data['customer']['email']) . ' | Tel: ' . esc_html($invoice_data['customer']['phone']) . '</p>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Nazwa produktu</th>
                        <th style="text-align: center;">Ilość</th>
                        <th style="text-align: right;">Cena netto</th>
                        <th style="text-align: right;">Cena brutto</th>
                    </tr>
                </thead>
                <tbody>
                    ' . $items_html . '
                </tbody>
            </table>
            
            <div class="totals">
                <div class="total-row"><span>Wartość netto:</span><span>' . wc_price($invoice_data['totals']['net'] ?? 0, $price_args) . '</span></div>
                ' . ($shipping_net > 0 ? '<div class="total-row"><span>Dostawa:</span><span>' . wc_price($shipping_net, $price_args) . '</span></div>' : '') . '
                <div class="total-row"><span>VAT:</span><span>' . wc_price($tax_display, $price_args) . '</span></div>
                <div class="total-row"><span>Wartość brutto:</span><span>' . wc_price(($invoice_data['totals']['net'] ?? 0) + $tax_display, $price_args) . '</span></div>
                <div class="total-row total-final"><span>RAZEM:</span><span>' . wc_price($invoice_data['totals']['gross'] ?? ($invoice_data['totals']['net'] ?? 0) + $tax_display, $price_args) . '</span></div>
            </div>
            
            <div class="clear"></div>
            
            <div class="footer">
                <p><strong>Płatność:</strong> ' . esc_html($invoice_data['payment_method']) . 
                (!empty($invoice_data['company_info']['bank_account']) ? ' | <strong>Nr konta:</strong> ' . esc_html($invoice_data['company_info']['bank_account']) : '') . ' | Dziękujemy za zakupy w ' . esc_html($invoice_data['company_info']['name']) . '!</p>
            </div>
        </body>
        </html>';
        
    } catch (Exception $e) {
        error_log("King Invoices: Error generating HTML: " . $e->getMessage());
        return '<html><body><h1>Błąd generowania faktury</h1></body></html>';
    }
}

/**
 * Generate PDF from HTML using TCPDF (if available) or fallback to simple method
 */
function king_generate_pdf_from_html($html, $order_id = null) {
    // Define TCPDF constants if not already defined
    if (!defined('PDF_PAGE_ORIENTATION')) {
        define('PDF_PAGE_ORIENTATION', 'P'); // Portrait
    }
    if (!defined('PDF_UNIT')) {
        define('PDF_UNIT', 'mm');
    }
    if (!defined('PDF_PAGE_FORMAT')) {
        define('PDF_PAGE_FORMAT', 'A4');
    }
    
    // Try to load Composer autoloader first (best method)
    $autoload_paths = [
        __DIR__ . '/vendor/autoload.php',
        WP_CONTENT_DIR . '/mu-plugins/vendor/autoload.php',
        WP_CONTENT_DIR . '/vendor/autoload.php',
    ];
    
    $autoload_loaded = false;
    foreach ($autoload_paths as $autoload_path) {
        if (file_exists($autoload_path)) {
            require_once($autoload_path);
            $autoload_loaded = true;
            break;
        }
    }
    
    // Fallback: Try to load TCPDF directly if autoloader not available
    if (!$autoload_loaded) {
        $tcpdf_paths = [
            __DIR__ . '/vendor/tecnickcom/tcpdf/tcpdf.php',
            WP_CONTENT_DIR . '/mu-plugins/vendor/tecnickcom/tcpdf/tcpdf.php',
            WP_CONTENT_DIR . '/vendor/tecnickcom/tcpdf/tcpdf.php',
        ];
        
        foreach ($tcpdf_paths as $tcpdf_path) {
            if (file_exists($tcpdf_path)) {
                require_once($tcpdf_path);
                break;
            }
        }
    }
    
    // Check if TCPDF class is available (after loading autoloader or direct file)
    if (class_exists('TCPDF')) {
        try {
            // TCPDF class is available via autoloader or direct require
            $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
            
            // Remove default header/footer
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            
            // Set document information
            $pdf->SetCreator('King Invoices System');
            $pdf->SetAuthor(get_bloginfo('name'));
            $pdf->SetTitle('Faktura' . ($order_id ? ' #' . $order_id : ''));
            $pdf->SetSubject('Faktura VAT');
            
            // Set minimal margins for compact layout (fit on one page)
            $pdf->SetMargins(8, 8, 8);
            // Disable auto page break or set very high bottom margin
            $pdf->SetAutoPageBreak(false);
            
            // Ensure proper Unicode rendering (Polish diacritics)
            $pdf->SetDefaultMonospacedFont(PDF_FONT_MONOSPACED);
            
            $dejavu_font = 'dejavusans';
            if (class_exists('TCPDF_FONTS')) {
                $font_paths = [
                    WP_CONTENT_DIR . '/mu-plugins/assets/fonts/DejaVuSans.ttf',
                    WP_CONTENT_DIR . '/mu-plugins/vendor/tecnickcom/tcpdf/fonts/DejaVuSans.ttf',
                    WP_CONTENT_DIR . '/mu-plugins/vendor/tecnickcom/tcpdf/fonts/ttfonts/DejaVuSans.ttf',
                    WP_CONTENT_DIR . '/mu-plugins/vendor/tecnickcom/tcpdf/fonts/dejavu-fonts-ttf-2.34/ttf/DejaVuSans.ttf',
                ];
                
                foreach ($font_paths as $font_path) {
                    if (file_exists($font_path)) {
                        try {
                            $registered_font = TCPDF_FONTS::addTTFfont($font_path, 'TrueTypeUnicode', '', 32);
                            if ($registered_font) {
                                $dejavu_font = $registered_font;
                                break;
                            }
                        } catch (Exception $e) {
                            error_log('King Invoices: Unable to load DejaVu font - ' . $e->getMessage());
                        }
                    }
                }
            }
            
            if (method_exists($pdf, 'setFontSubsetting')) {
                $pdf->setFontSubsetting(true);
            }
            $pdf->SetFont($dejavu_font, '', 8, '', false);
            
            // Provide language meta for TCPDF (Polish)
            if (method_exists($pdf, 'setLanguageArray')) {
                $lg = [
                    'a_meta_charset' => 'UTF-8',
                    'a_meta_dir' => 'ltr',
                    'a_meta_language' => 'pl',
                    'w_page' => 'strona'
                ];
                $pdf->setLanguageArray($lg);
            }
            
            // Add a page
            $pdf->AddPage();
            
            // Reduce line height
            $pdf->setCellHeightRatio(1.1);
            
            // Write HTML content
            $pdf->writeHTML($html, true, false, true, false, '');
            
            // Return PDF as string
            return $pdf->Output('', 'S');
            
        } catch (Exception $e) {
            error_log("King Invoices: TCPDF error: " . $e->getMessage());
            // Fallback to simple method
        }
    }
    
    // Fallback: Simple PDF-like output (not a real PDF, but better than nothing)
    // This will be converted to proper PDF on frontend if needed
    error_log("King Invoices: TCPDF not available, using fallback method");
    $pdf_header = "%PDF-1.4\n";
    return $pdf_header . "\n" . $html;
}

/**
 * Get WCPDF download URL
 */
function king_get_wcpdf_download_url($order_id) {
    if (class_exists('WPO_WCPDF') || function_exists('wpo_wcpdf')) {
        $frontend = function_exists('headless_frontend_url') ? headless_frontend_url() : site_url();
        return rtrim($frontend, '/') . '/moje-faktury?download=' . intval($order_id);
    }
    return null;
}

/**
 * Get order status info
 */
function king_get_order_status_info($status) {
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
function king_get_tracking_history($order) {
    try {
        $history = [
            [
                'date' => $order->get_date_created()->date('Y-m-d H:i'),
                'status' => 'Zamówienie przyjęte',
                'description' => 'Zamówienie zostało przyjęte do realizacji',
                'hpos_enabled' => true
            ]
        ];
        
        if ($order->get_status() !== 'pending') {
            $history[] = [
                'date' => $order->get_date_modified()->date('Y-m-d H:i'),
                'status' => 'W przygotowaniu',
                'description' => 'Zamówienie jest przygotowywane do wysyłki',
                'hpos_enabled' => true
            ];
        }
        
        if (in_array($order->get_status(), ['shipped', 'completed'])) {
            $history[] = [
                'date' => $order->get_date_modified()->date('Y-m-d H:i'),
                'status' => 'Wysłane',
                'description' => 'Zamówienie zostało przekazane do przewoźnika',
                'hpos_enabled' => true
            ];
        }
        
        $hpos_events = $order->get_meta('_hpos_tracking_events');
        if (!empty($hpos_events) && is_array($hpos_events)) {
            foreach ($hpos_events as $event) {
                $history[] = [
                    'date' => $event['date'],
                    'status' => $event['status'],
                    'description' => $event['description'],
                    'hpos_enabled' => true,
                    'source' => 'hpos'
                ];
            }
        }
        
        return $history;
        
    } catch (Exception $e) {
        error_log("King Invoices: Error getting tracking history: " . $e->getMessage());
        return [
            [
                'date' => $order->get_date_created()->date('Y-m-d H:i'),
                'status' => 'Zamówienie przyjęte',
                'description' => 'Zamówienie zostało przyjęte do realizacji',
                'hpos_enabled' => true,
                'error' => 'Partial data due to error'
            ]
        ];
    }
}

