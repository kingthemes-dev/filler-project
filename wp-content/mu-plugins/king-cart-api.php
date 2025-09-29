<?php
/**
 * Plugin Name: King Cart API
 * Description: Custom cart API endpoints with nonce support for WooCommerce Store API
 * Version: 1.0.0
 * Author: King
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KingCartAPI {
    
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('wp_enqueue_scripts', array($this, 'localize_script'));
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
        // Get nonce for cart operations
        register_rest_route('king-cart/v1', '/nonce', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_nonce'),
            'permission_callback' => '__return_true'
        ));
        
        // Add item to cart (proxy to Store API)
        register_rest_route('king-cart/v1', '/add-item', array(
            'methods' => array('POST', 'OPTIONS'),
            'callback' => array($this, 'add_item_to_cart'),
            'permission_callback' => array($this, 'verify_nonce_or_options'),
            'args' => array(
                'id' => array(
                    'required' => true,
                    'type' => 'integer',
                    'description' => 'Product ID'
                ),
                'quantity' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 1,
                    'description' => 'Quantity to add'
                ),
                'variation' => array(
                    'required' => false,
                    'type' => 'array',
                    'description' => 'Variation attributes'
                )
            )
        ));
        
        // Remove item from cart (proxy to Store API)
        register_rest_route('king-cart/v1', '/remove-item', array(
            'methods' => 'POST',
            'callback' => array($this, 'remove_item_from_cart'),
            'permission_callback' => array($this, 'verify_nonce'),
            'args' => array(
                'key' => array(
                    'required' => true,
                    'type' => 'string',
                    'description' => 'Cart item key'
                )
            )
        ));
        
        // Update cart item (proxy to Store API)
        register_rest_route('king-cart/v1', '/update-item', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_cart_item'),
            'permission_callback' => array($this, 'verify_nonce'),
            'args' => array(
                'key' => array(
                    'required' => true,
                    'type' => 'string',
                    'description' => 'Cart item key'
                ),
                'quantity' => array(
                    'required' => true,
                    'type' => 'integer',
                    'description' => 'New quantity'
                )
            )
        ));
        
        // Get cart (proxy to Store API)
        register_rest_route('king-cart/v1', '/cart', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_cart'),
            'permission_callback' => '__return_true'
        ));
    }
    
    /**
     * Get nonce for cart operations
     */
    public function get_nonce() {
        $nonce = wp_create_nonce('king_cart_nonce');
        return array(
            'success' => true,
            'nonce' => $nonce,
            'expires' => time() + (24 * 60 * 60) // 24 hours
        );
    }
    
    /**
     * Verify nonce or allow OPTIONS requests
     */
    public function verify_nonce_or_options($request) {
        // Allow OPTIONS requests for CORS preflight
        if ($request->get_method() === 'OPTIONS') {
            return true;
        }
        
        return $this->verify_nonce($request);
    }
    
    /**
     * Verify nonce
     */
    public function verify_nonce($request) {
        $nonce = $request->get_header('X-WP-Nonce');
        if (!$nonce) {
            return new WP_Error('missing_nonce', 'Nonce header is required', array('status' => 403));
        }
        
        if (!wp_verify_nonce($nonce, 'king_cart_nonce')) {
            return new WP_Error('invalid_nonce', 'Invalid nonce', array('status' => 403));
        }
        
        return true;
    }
    
    /**
     * Add item to cart via Store API
     */
    public function add_item_to_cart($request) {
        // Handle OPTIONS request for CORS preflight
        if ($request->get_method() === 'OPTIONS') {
            return new WP_REST_Response(null, 200);
        }
        
        $product_id = $request->get_param('id');
        $quantity = $request->get_param('quantity');
        $variation = $request->get_param('variation');
        
        // Prepare data for Store API
        $data = array(
            'id' => $product_id,
            'quantity' => $quantity
        );
        
        if ($variation) {
            $data['variation'] = $variation;
        }
        
        // Call Store API
        $store_api_url = rest_url('wc/store/v1/cart/add-item');
        $response = wp_remote_post($store_api_url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-WP-Nonce' => wp_create_nonce('wp_rest')
            ),
            'body' => json_encode($data)
        ));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => $response->get_error_message()
            );
        }
        
        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);
        
        return array(
            'success' => true,
            'data' => $result
        );
    }
    
    /**
     * Remove item from cart via Store API
     */
    public function remove_item_from_cart($request) {
        $key = $request->get_param('key');
        
        // Call Store API
        $store_api_url = rest_url('wc/store/v1/cart/remove-item');
        $response = wp_remote_post($store_api_url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-WP-Nonce' => wp_create_nonce('wp_rest')
            ),
            'body' => json_encode(array('key' => $key))
        ));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => $response->get_error_message()
            );
        }
        
        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);
        
        return array(
            'success' => true,
            'data' => $result
        );
    }
    
    /**
     * Update cart item via Store API
     */
    public function update_cart_item($request) {
        $key = $request->get_param('key');
        $quantity = $request->get_param('quantity');
        
        // Call Store API
        $store_api_url = rest_url('wc/store/v1/cart/update-item');
        $response = wp_remote_post($store_api_url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-WP-Nonce' => wp_create_nonce('wp_rest')
            ),
            'body' => json_encode(array(
                'key' => $key,
                'quantity' => $quantity
            ))
        ));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => $response->get_error_message()
            );
        }
        
        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);
        
        return array(
            'success' => true,
            'data' => $result
        );
    }
    
    /**
     * Get cart via Store API
     */
    public function get_cart() {
        // Call Store API
        $store_api_url = rest_url('wc/store/v1/cart');
        $response = wp_remote_get($store_api_url);
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => $response->get_error_message()
            );
        }
        
        $body = wp_remote_retrieve_body($response);
        $result = json_decode($body, true);
        
        return array(
            'success' => true,
            'data' => $result
        );
    }
    
    /**
     * Localize script with nonce
     */
    public function localize_script() {
        wp_localize_script('jquery', 'kingCartAPI', array(
            'nonceUrl' => rest_url('king-cart/v1/nonce'),
            'addItemUrl' => rest_url('king-cart/v1/add-item'),
            'removeItemUrl' => rest_url('king-cart/v1/remove-item'),
            'updateItemUrl' => rest_url('king-cart/v1/update-item'),
            'getCartUrl' => rest_url('king-cart/v1/cart')
        ));
    }
}

// Initialize the plugin
new KingCartAPI();
