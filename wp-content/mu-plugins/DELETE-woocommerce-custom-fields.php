<?php
/**
 * Plugin Name: WooCommerce Custom Fields
 * Description: Adds custom fields (NIP) to WooCommerce customer billing address
 * Version: 1.0.0
 * Author: King
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class WooCommerceCustomFields {
    
    public function __construct() {
        $this->init();
    }
    
    /**
     * Initialize hooks
     */
    public function init() {
        // Add NIP field to WooCommerce billing address
        add_filter('woocommerce_billing_fields', array($this, 'add_billing_nip_field'));
        
        // Save NIP field data
        add_action('woocommerce_checkout_update_customer_meta', array($this, 'save_billing_nip_field'));
        add_action('woocommerce_customer_save_address', array($this, 'save_billing_nip_field'));
        
        // Add NIP to admin user edit form
        add_action('show_user_profile', array($this, 'add_nip_field_to_profile'));
        add_action('edit_user_profile', array($this, 'add_nip_field_to_profile'));
        add_action('personal_options_update', array($this, 'save_nip_field_from_profile'));
        add_action('edit_user_profile_update', array($this, 'save_nip_field_from_profile'));
        
        // Add NIP to WooCommerce customer admin edit
        add_action('woocommerce_admin_customer_panel', array($this, 'add_nip_field_to_admin_customer'));
        
        // Add NIP to REST API response
        add_filter('woocommerce_rest_prepare_customer', array($this, 'add_nip_to_rest_api'), 10, 3);
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
     * Save NIP field data
     */
    public function save_billing_nip_field($user_id) {
        if (isset($_POST['billing_nip'])) {
            update_user_meta($user_id, 'billing_nip', sanitize_text_field($_POST['billing_nip']));
        }
    }
    
    /**
     * Add NIP field to user profile (WordPress admin)
     */
    public function add_nip_field_to_profile($user) {
        ?>
        <h3><?php _e('Dane rozliczeniowe', 'woocommerce'); ?></h3>
        <table class="form-table">
            <tr>
                <th><label for="billing_nip"><?php _e('NIP', 'woocommerce'); ?></label></th>
                <td>
                    <input type="text" 
                           name="billing_nip" 
                           id="billing_nip" 
                           value="<?php echo esc_attr(get_user_meta($user->ID, 'billing_nip', true)); ?>" 
                           class="regular-text" />
                    <p class="description"><?php _e('Numer identyfikacji podatkowej', 'woocommerce'); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }
    
    /**
     * Save NIP field from profile
     */
    public function save_nip_field_from_profile($user_id) {
        if (current_user_can('edit_user', $user_id)) {
            if (isset($_POST['billing_nip'])) {
                update_user_meta($user_id, 'billing_nip', sanitize_text_field($_POST['billing_nip']));
            }
        }
    }
    
    /**
     * Add NIP field to WooCommerce customer admin
     */
    public function add_nip_field_to_admin_customer($customer) {
        $nip = get_user_meta($customer->get_id(), 'billing_nip', true);
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
        </div>
        <?php
    }
    
    /**
     * Add NIP to REST API response
     */
    public function add_nip_to_rest_api($response, $customer, $request) {
        $nip = get_user_meta($customer->get_id(), 'billing_nip', true);
        $response->data['billing']['nip'] = $nip;
        return $response;
    }
}

// Initialize the plugin
new WooCommerceCustomFields();
