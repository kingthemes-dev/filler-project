<?php
/**
 * Plugin Name: Email Link Redirect for Headless WooCommerce
 * Description: Redirects WooCommerce email links to headless frontend
 * Version: 1.0.0
 * Author: King Brand
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class EmailLinkRedirect {
    
    private $frontend_url;
    
    public function __construct() {
        // Use headless config URL
        $this->frontend_url = headless_frontend_url();
        
        // Hook into WooCommerce email templates
        add_filter('woocommerce_email_get_heading', array($this, 'modify_email_links'), 10, 3);
        add_filter('woocommerce_email_get_additional_content', array($this, 'modify_email_links'), 10, 3);
        add_filter('woocommerce_email_order_items_table', array($this, 'modify_order_items_table'), 10, 1);
        
        // Hook into specific email actions
        add_action('woocommerce_email_before_order_table', array($this, 'add_frontend_links'), 10, 4);
        
        // Modify payment URLs
        add_filter('woocommerce_get_checkout_payment_url', array($this, 'redirect_payment_url'), 10, 2);
        add_filter('woocommerce_get_checkout_order_received_url', array($this, 'redirect_order_received_url'), 10, 2);
    }
    
    /**
     * Modify email content to replace backend URLs with frontend URLs
     */
    public function modify_email_links($content, $object, $email) {
        if (!$content) {
            return $content;
        }
        
        // Replace common backend URLs with frontend URLs
        $replacements = array(
            home_url('/moje-konto/') => $this->frontend_url . '/moje-konto',
            home_url('/koszyk/') => $this->frontend_url . '/koszyk',
            home_url('/sklep/') => $this->frontend_url . '/sklep',
            home_url('/zamowienie/') => $this->frontend_url . '/checkout',
            home_url('/moje-zamowienia/') => $this->frontend_url . '/moje-zamowienia',
        );
        
        return str_replace(array_keys($replacements), array_values($replacements), $content);
    }
    
    /**
     * Add frontend links to order items table
     */
    public function modify_order_items_table($table) {
        // Add a note about viewing order on frontend
        $frontend_order_url = $this->frontend_url . '/moje-zamowienia';
        $table .= '<p><a href="' . esc_url($frontend_order_url) . '">Zobacz szczegóły zamówienia na stronie</a></p>';
        
        return $table;
    }
    
    /**
     * Add frontend links to email content
     */
    public function add_frontend_links($order, $sent_to_admin, $plain_text, $email) {
        if ($plain_text) {
            return; // Skip for plain text emails
        }
        
        $frontend_links = '<div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">';
        $frontend_links .= '<h3>Przydatne linki:</h3>';
        $frontend_links .= '<p><a href="' . esc_url($this->frontend_url . '/moje-zamowienia') . '">Moje zamówienia</a></p>';
        $frontend_links .= '<p><a href="' . esc_url($this->frontend_url . '/moje-konto') . '">Moje konto</a></p>';
        $frontend_links .= '<p><a href="' . esc_url($this->frontend_url . '/sklep') . '">Kontynuuj zakupy</a></p>';
        $frontend_links .= '</div>';
        
        echo $frontend_links;
    }
    
    /**
     * Redirect payment URL to frontend
     */
    public function redirect_payment_url($url, $order) {
        if ($order && $order->get_id()) {
            return $this->frontend_url . '/checkout?order_id=' . $order->get_id() . '&key=' . $order->get_order_key();
        }
        return $url;
    }
    
    /**
     * Redirect order received URL to frontend
     */
    public function redirect_order_received_url($url, $order) {
        if ($order && $order->get_id()) {
            return $this->frontend_url . '/moje-zamowienia/' . $order->get_id();
        }
        return $url;
    }
}

// Initialize the plugin
new EmailLinkRedirect();
