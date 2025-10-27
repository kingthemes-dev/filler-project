<?php
/**
 * Plugin Name: King Shipping API
 * Description: Shipping zones API endpoints for headless WooCommerce
 * Version: 1.0.0
 * Author: King
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KingShippingAPI {
    
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('rest_api_init', array($this, 'add_cors_support'));
    }
    
    /**
     * Add CORS support for REST API
     */
    public function add_cors_support() {
        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        add_filter('rest_pre_serve_request', array($this, 'add_cors_headers'));
    }
    
    /**
     * Add custom CORS headers
     */
    public function add_cors_headers($value) {
        $origin = get_http_origin();
        $allowed_origins = array(
            'https://www.filler.pl',
            'https://filler.pl',
            'https://filler-project-3pn426bdx-king-themes.vercel.app',
            'https://filler-project-ft2wd4pxs-king-themes.vercel.app',
            'https://filler-project-hjv37nadi-king-themes.vercel.app',
            'https://filler-project-qibwg3yf5-king-themes.vercel.app',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002'
        );
        
        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce, x-wp-nonce');
        header('Access-Control-Allow-Credentials: true');
        
        return $value;
    }
    
    /**
     * Register REST API routes
     */
    public function register_routes() {
        // Get all shipping zones
        register_rest_route('king-shipping/v1', '/zones', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_shipping_zones'),
            'permission_callback' => '__return_true'
        ));
        
        // Get shipping methods for a zone
        register_rest_route('king-shipping/v1', '/zones/(?P<zone_id>\d+)/methods', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_shipping_methods'),
            'permission_callback' => '__return_true',
            'args' => array(
                'zone_id' => array(
                    'required' => true,
                    'type' => 'integer',
                    'description' => 'Zone ID'
                )
            )
        ));
        
        // Calculate shipping cost
        register_rest_route('king-shipping/v1', '/calculate', array(
            'methods' => 'POST',
            'callback' => array($this, 'calculate_shipping'),
            'permission_callback' => '__return_true',
            'args' => array(
                'address' => array(
                    'required' => false,
                    'type' => 'object',
                    'description' => 'Shipping address'
                ),
                'total' => array(
                    'required' => false,
                    'type' => 'number',
                    'description' => 'Cart total'
                )
            )
        ));
    }
    
    /**
     * Get all shipping zones
     */
    public function get_shipping_zones($request) {
        if (!class_exists('WC_Shipping_Zone')) {
            return new WP_Error('woocommerce_not_active', 'WooCommerce is not active', array('status' => 404));
        }
        
        $zones = WC_Shipping_Zones::get_zones();
        $formatted_zones = array();
        
        foreach ($zones as $zone) {
            $zone_data = WC_Shipping_Zones::get_zone($zone['zone_id']);
            
            $formatted_zones[] = array(
                'id' => $zone['zone_id'],
                'name' => $zone['zone_name'],
                'order' => $zone['zone_order'],
                'locations' => $zone['formatted_zone_location'],
                'enabled' => true
            );
        }
        
        // Add the rest of the world zone
        $rest_of_world = WC_Shipping_Zones::get_zone(0);
        if ($rest_of_world) {
            $formatted_zones[] = array(
                'id' => 0,
                'name' => 'Rest of the World',
                'order' => 0,
                'locations' => '',
                'enabled' => true
            );
        }
        
        return rest_ensure_response($formatted_zones);
    }
    
    /**
     * Get shipping methods for a zone
     */
    public function get_shipping_methods($request) {
        if (!class_exists('WC_Shipping_Zone')) {
            return new WP_Error('woocommerce_not_active', 'WooCommerce is not active', array('status' => 404));
        }
        
        $zone_id = $request->get_param('zone_id');
        $zone = WC_Shipping_Zones::get_zone($zone_id);
        
        if (!$zone) {
            return new WP_Error('zone_not_found', 'Shipping zone not found', array('status' => 404));
        }
        
        $methods = $zone->get_shipping_methods();
        $formatted_methods = array();
        
        foreach ($methods as $method) {
            $formatted_methods[] = array(
                'id' => $method->get_instance_id(),
                'method_id' => $method->get_method_id(),
                'method_title' => $method->get_method_title(),
                'title' => $method->get_title(),
                'enabled' => $method->get_enabled(),
                'cost' => $method->get_option('cost'),
                'tax_status' => $method->get_option('tax_status'),
                'settings' => $method->get_instance_option_fields()
            );
        }
        
        return rest_ensure_response($formatted_methods);
    }
    
    /**
     * Calculate shipping cost
     */
    public function calculate_shipping($request) {
        if (!class_exists('WC_Shipping_Zone')) {
            return new WP_Error('woocommerce_not_active', 'WooCommerce is not active', array('status' => 404));
        }
        
        $params = $request->get_json_params();
        $address = isset($params['address']) ? $params['address'] : array();
        $total = isset($params['total']) ? floatval($params['total']) : 0;
        
        // Get all shipping zones
        $zones = WC_Shipping_Zones::get_zones();
        $shipping_options = array();
        
        foreach ($zones as $zone) {
            $zone_obj = WC_Shipping_Zones::get_zone($zone['zone_id']);
            $methods = $zone_obj->get_shipping_methods();
            
            foreach ($methods as $method) {
                if (!$method->get_enabled()) {
                    continue;
                }
                
                $cost = $method->get_option('cost', 0);
                $rate = array(
                    'id' => $method->get_instance_id(),
                    'method_id' => $method->get_method_id(),
                    'method_title' => $method->get_method_title(),
                    'title' => $method->get_title(),
                    'cost' => floatval($cost),
                    'formatted_cost' => wc_price($cost)
                );
                
                $shipping_options[] = $rate;
            }
        }
        
        return rest_ensure_response(array(
            'options' => $shipping_options,
            'total' => $total
        ));
    }
}

new KingShippingAPI();
