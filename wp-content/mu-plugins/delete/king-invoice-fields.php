<?php
// Ensure shared headless helpers are loaded
if (file_exists(WP_CONTENT_DIR . '/mu-plugins/headless-config.php')) {
    require_once WP_CONTENT_DIR . '/mu-plugins/headless-config.php';
}

/**
 * King Invoice Fields - Unified invoice fields management
 * Combines NIP field and invoice request logic from woocommerce-custom-fields.php and customer-invoices.php
 * 
 * @package KingWooCommerce
 * @version 2.0.0
 * @author King Brand
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KingInvoiceFields {
    
    public function __construct() {
        $this->init();
    }
    
    /**
     * Initialize hooks
     */
    public function init() {
        // Add NIP field to WooCommerce billing fields
        add_filter('woocommerce_billing_fields', array($this, 'add_billing_nip_field'));
        add_filter('woocommerce_checkout_fields', array($this, 'add_invoice_fields_to_checkout'));
        
        // Save invoice fields on checkout
        add_action('woocommerce_checkout_create_order', array($this, 'save_invoice_fields_to_order'), 10, 2);
        add_action('woocommerce_checkout_update_customer_meta', array($this, 'save_invoice_fields_to_user'));
        add_action('woocommerce_customer_save_address', array($this, 'save_invoice_fields_to_user'));
        
        // Add fields to admin user edit form
        add_action('show_user_profile', array($this, 'add_invoice_fields_to_profile'));
        add_action('edit_user_profile', array($this, 'add_invoice_fields_to_profile'));
        add_action('personal_options_update', array($this, 'save_invoice_fields_from_profile'));
        add_action('edit_user_profile_update', array($this, 'save_invoice_fields_from_profile'));
        
        // Add fields to WooCommerce customer admin
        add_action('woocommerce_admin_customer_panel', array($this, 'add_invoice_fields_to_admin_customer'));
        
        // Add fields to REST API response
        add_filter('woocommerce_rest_prepare_customer', array($this, 'add_invoice_fields_to_rest_api'), 10, 3);
        
        // Display invoice fields in order admin
        add_action('woocommerce_admin_order_data_after_billing_address', array($this, 'display_invoice_fields_in_order_admin'));
    }
    
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
            'priority' => 35, // After company field
            'type' => 'text'
        );
        
        return $fields;
    }
    
    /**
     * Add invoice fields to checkout (for classic WooCommerce checkout - not used in headless)
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
        // Get NIP from POST or order data
        $billing_nip = '';
        if (isset($_POST['billing_nip'])) {
            $billing_nip = sanitize_text_field($_POST['billing_nip']);
        } elseif (isset($data['billing_nip'])) {
            $billing_nip = sanitize_text_field($data['billing_nip']);
        }
        
        // Get invoice request from POST or order data
        $invoice_request = 'no';
        if (isset($_POST['invoice_request']) && $_POST['invoice_request']) {
            $invoice_request = 'yes';
        } elseif (isset($data['invoice_request'])) {
            $invoice_request = $data['invoice_request'] ? 'yes' : 'no';
        } elseif (isset($_POST['_invoice_request'])) {
            // Handle meta_data format from REST API
            $invoice_request = sanitize_text_field($_POST['_invoice_request']) === 'yes' ? 'yes' : 'no';
        }

        // Save to order meta
        if (!empty($billing_nip)) {
            $order->update_meta_data('_billing_nip', $billing_nip);
        }
        $order->update_meta_data('_invoice_request', $invoice_request);
        
        // Also save invoice request if NIP is provided (auto-invoice)
        if (!empty($billing_nip) && $invoice_request === 'no') {
            $order->update_meta_data('_invoice_request', 'yes');
            $invoice_request = 'yes';
        }
    }
    
    /**
     * Save invoice fields to user meta (for logged-in customers)
     * This ensures data sync: checkout → user meta → Moje konto → checkout
     */
    public function save_invoice_fields_to_user($user_id) {
        // Get NIP
        $billing_nip = '';
        if (isset($_POST['billing_nip'])) {
            $billing_nip = sanitize_text_field($_POST['billing_nip']);
        }
        
        // Get invoice request
        $invoice_request = 'no';
        if (isset($_POST['invoice_request']) && $_POST['invoice_request']) {
            $invoice_request = 'yes';
        } elseif (isset($_POST['_invoice_request'])) {
            $invoice_request = sanitize_text_field($_POST['_invoice_request']) === 'yes' ? 'yes' : 'no';
        }
        
        // Auto-set invoice_request to 'yes' if NIP is provided
        if (!empty($billing_nip) && $invoice_request === 'no') {
            $invoice_request = 'yes';
        }
        
        // Save to user meta
        if (!empty($billing_nip)) {
            update_user_meta($user_id, 'billing_nip', $billing_nip);
            update_user_meta($user_id, '_billing_nip', $billing_nip); // Also save with underscore prefix for consistency
        }
        
        // Always save invoice_request (even if 'no') to maintain state
        update_user_meta($user_id, '_invoice_request', $invoice_request);
        
        // Log for debugging
        error_log("King Invoice Fields: Saved invoice fields for user {$user_id} - NIP: {$billing_nip}, Invoice Request: {$invoice_request}");
    }
    
    /**
     * Add invoice fields to user profile (WordPress admin)
     */
    public function add_invoice_fields_to_profile($user) {
        $nip = get_user_meta($user->ID, 'billing_nip', true);
        if (empty($nip)) {
            $nip = get_user_meta($user->ID, '_billing_nip', true);
        }
        $invoice_request = get_user_meta($user->ID, '_invoice_request', true);
        ?>
        <h3><?php _e('Dane rozliczeniowe', 'woocommerce'); ?></h3>
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
                           value="1" 
                           <?php checked($invoice_request, 'yes'); ?> />
                    <p class="description"><?php _e('Zaznacz, jeśli klient chce otrzymywać faktury', 'woocommerce'); ?></p>
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
                
                // Auto-set invoice_request if NIP is provided
                if (!empty($nip)) {
                    update_user_meta($user_id, '_invoice_request', 'yes');
                }
            }
            
            if (isset($_POST['invoice_request'])) {
                update_user_meta($user_id, '_invoice_request', 'yes');
            } else {
                // Only uncheck if NIP is also empty
                $nip = get_user_meta($user_id, 'billing_nip', true);
                if (empty($nip)) {
                    update_user_meta($user_id, '_invoice_request', 'no');
                }
            }
        }
    }
    
    /**
     * Add invoice fields to WooCommerce customer admin
     */
    public function add_invoice_fields_to_admin_customer($customer) {
        $nip = get_user_meta($customer->get_id(), 'billing_nip', true);
        if (empty($nip)) {
            $nip = get_user_meta($customer->get_id(), '_billing_nip', true);
        }
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
                <label for="invoice_request">
                    <input type="checkbox" 
                           name="invoice_request" 
                           id="invoice_request" 
                           value="1" 
                           <?php checked($invoice_request, 'yes'); ?> />
                    <?php _e('Chcę fakturę (na firmę)', 'woocommerce'); ?>
                </label>
            </p>
        </div>
        <?php
    }
    
    /**
     * Add invoice fields to REST API response
     */
    public function add_invoice_fields_to_rest_api($response, $customer, $request) {
        $user_id = $customer->get_id();
        
        // Get NIP (try both meta keys for compatibility)
        $nip = get_user_meta($user_id, 'billing_nip', true);
        if (empty($nip)) {
            $nip = get_user_meta($user_id, '_billing_nip', true);
        }
        
        // Get invoice request
        $invoice_request = get_user_meta($user_id, '_invoice_request', true);
        
        // Auto-set invoice_request to 'yes' if NIP is provided but invoice_request is not set
        if (!empty($nip) && empty($invoice_request)) {
            $invoice_request = 'yes';
            update_user_meta($user_id, '_invoice_request', 'yes');
        }
        
        // Add to REST API response
        $response->data['billing']['nip'] = $nip;
        $response->data['billing']['invoiceRequest'] = $invoice_request === 'yes';
        
        return $response;
    }
    
    /**
     * Display invoice fields in order admin (after billing address)
     */
    public function display_invoice_fields_in_order_admin($order) {
        $billing_nip = $order->get_meta('_billing_nip');
        $invoice_request = $order->get_meta('_invoice_request');
        ?>
        <div class="address">
            <p class="form-field form-field-wide">
                <strong><?php _e('NIP:', 'woocommerce'); ?></strong>
                <?php echo $billing_nip ? esc_html($billing_nip) : '<em>' . __('Nie podano', 'woocommerce') . '</em>'; ?>
            </p>
            <p class="form-field form-field-wide">
                <strong><?php _e('Faktura:', 'woocommerce'); ?></strong>
                <?php 
                if ($invoice_request === 'yes') {
                    echo '<span style="color: green;">✓ ' . __('Tak, klient chce fakturę', 'woocommerce') . '</span>';
                } else {
                    echo '<span style="color: #999;">✗ ' . __('Nie', 'woocommerce') . '</span>';
                }
                ?>
            </p>
        </div>
        <?php
    }
}

// Initialize the plugin
new KingInvoiceFields();

// Also handle REST API order creation (for headless frontend)
add_action('woocommerce_rest_insert_shop_order_object', function($order, $request, $creating) {
    if ($creating) {
        // Get invoice fields from request
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
            
            // Save to order
            if ($billing_nip !== null) {
                $order->update_meta_data('_billing_nip', $billing_nip);
            }
            if ($invoice_request !== null) {
                $order->update_meta_data('_invoice_request', $invoice_request);
            } else if ($billing_nip !== null) {
                // Auto-set invoice_request if NIP is provided
                $order->update_meta_data('_invoice_request', 'yes');
            }
            
            // Save to user meta if customer is logged in
            $user_id = $order->get_user_id();
            if ($user_id) {
                if ($billing_nip !== null && !empty($billing_nip)) {
                    update_user_meta($user_id, 'billing_nip', $billing_nip);
                    update_user_meta($user_id, '_billing_nip', $billing_nip);
                }
                
                $final_invoice_request = $invoice_request !== null ? $invoice_request : ($billing_nip !== null ? 'yes' : 'no');
                update_user_meta($user_id, '_invoice_request', $final_invoice_request);
                
                error_log("King Invoice Fields: Saved invoice fields from REST API for user {$user_id} - NIP: {$billing_nip}, Invoice Request: {$final_invoice_request}");
            }
        }
    }
}, 10, 3);

