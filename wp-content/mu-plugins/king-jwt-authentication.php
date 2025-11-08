<?php
/**
 * Plugin Name: King JWT Authentication for WooCommerce
 * Description: Adds JWT authentication endpoints for WooCommerce user login
 * Version: 1.0.0
 * Author: King Brand
 * Text Domain: king-jwt-auth
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KingJWTAuthentication {
    
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('wp_ajax_nopriv_king_jwt_login', array($this, 'handle_ajax_login'));
        add_action('wp_ajax_king_jwt_login', array($this, 'handle_ajax_login'));
    }
    
    /**
     * Register REST API routes
     */
    public function register_routes() {
        register_rest_route('king-jwt/v1', '/login', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_login'),
            'permission_callback' => '__return_true',
            'args' => array(
                'email' => array(
                    'required' => true,
                    'type' => 'string',
                    'format' => 'email',
                ),
                'password' => array(
                    'required' => true,
                    'type' => 'string',
                    'minLength' => 6,
                ),
            ),
        ));
        
        register_rest_route('king-jwt/v1', '/validate', array(
            'methods' => 'POST',
            'callback' => array($this, 'validate_token'),
            'permission_callback' => '__return_true',
        ));
        
        register_rest_route('king-jwt/v1', '/refresh', array(
            'methods' => 'POST',
            'callback' => array($this, 'refresh_token'),
            'permission_callback' => '__return_true',
        ));
    }
    
    /**
     * Handle login request
     */
    public function handle_login($request) {
        $email = sanitize_email($request->get_param('email'));
        $password = $request->get_param('password');
        
        // Validate credentials
        $user = wp_authenticate($email, $password);
        
        if (is_wp_error($user)) {
            return new WP_Error(
                'invalid_credentials',
                'Nieprawidłowy email lub hasło',
                array('status' => 401)
            );
        }
        
        // Check if user is a customer
        if (!in_array('customer', $user->roles)) {
            return new WP_Error(
                'insufficient_permissions',
                'Użytkownik musi mieć rolę klienta',
                array('status' => 403)
            );
        }
        
        // Generate JWT token
        $token = $this->generate_jwt_token($user);
        
        // Get WooCommerce customer data
        $customer_data = $this->get_customer_data($user->ID);
        
        return array(
            'success' => true,
            'token' => $token,
            'user' => array(
                'id' => $user->ID,
                'email' => $user->user_email,
                'firstName' => $user->first_name,
                'lastName' => $user->user_lastname,
                'role' => 'customer',
                'billing' => $customer_data['billing'],
                'shipping' => $customer_data['shipping']
            )
        );
    }
    
    /**
     * Validate JWT token
     */
    public function validate_token($request) {
        $token = $request->get_param('token');
        
        if (empty($token)) {
            return new WP_Error(
                'missing_token',
                'Token jest wymagany',
                array('status' => 400)
            );
        }
        
        try {
            $payload = $this->verify_jwt_token($token);
            $user = get_user_by('ID', $payload->user_id);
            
            if (!$user) {
                return new WP_Error(
                    'invalid_user',
                    'Użytkownik nie istnieje',
                    array('status' => 404)
                );
            }
            
            // Get customer data for response
            $customer_data = $this->get_customer_data($user->ID);
            
            return array(
                'success' => true,
                'valid' => true,
                'user' => array(
                    'id' => $user->ID,
                    'email' => $user->user_email,
                    'name' => trim($user->first_name . ' ' . $user->last_name) ?: $user->user_email
                ),
                'user_id' => $user->ID,
                'expires_at' => $payload->exp
            );
            
        } catch (Exception $e) {
            return new WP_Error(
                'invalid_token',
                'Nieprawidłowy token',
                array('status' => 401)
            );
        }
    }
    
    /**
     * Refresh JWT token with rotation (P0 security fix)
     */
    public function refresh_token($request) {
        $token = $request->get_param('token');
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        
        if (empty($token)) {
            return new WP_Error(
                'missing_token',
                'Token jest wymagany',
                array('status' => 400)
            );
        }
        
        // Rate limiting: max 5 refresh per minute per IP
        $rate_limit_key = "jwt_refresh_rate_limit_{$ip}";
        $refresh_count = get_transient($rate_limit_key) ?: 0;
        
        if ($refresh_count >= 5) {
            return new WP_Error(
                'rate_limit_exceeded',
                'Zbyt wiele żądań odświeżania tokenu. Spróbuj ponownie za chwilę.',
                array('status' => 429)
            );
        }
        
        set_transient($rate_limit_key, $refresh_count + 1, 60); // 1 minute TTL
        
        try {
            $payload = $this->verify_jwt_token($token);
            $user = get_user_by('ID', $payload->user_id);
            
            if (!$user) {
                return new WP_Error(
                    'invalid_user',
                    'Użytkownik nie istnieje',
                    array('status' => 404)
                );
            }
            
            // Check if token is in refresh whitelist (prevent reuse)
            $whitelist_key = "jwt_refresh_whitelist_{$payload->user_id}";
            $whitelist = get_transient($whitelist_key) ?: array();
            
            // If token is not in whitelist, it was already used or invalid
            if (!in_array($token, $whitelist)) {
                return new WP_Error(
                    'token_already_used',
                    'Token został już użyty do odświeżania',
                    array('status' => 401)
                );
            }
            
            // Remove old token from whitelist (token rotation)
            $whitelist = array_diff($whitelist, array($token));
            delete_transient($whitelist_key);
            
            // Generate new token with same scopes
            $scopes = isset($payload->scopes) ? $payload->scopes : array('read:profile');
            $new_token = $this->generate_jwt_token($user, $scopes);
            
            // Add new token to whitelist (store only last 5 tokens per user)
            $whitelist[] = $new_token;
            $whitelist = array_slice($whitelist, -5); // Keep only last 5
            set_transient($whitelist_key, $whitelist, 7 * 24 * 60 * 60); // 7 days
            
            return array(
                'success' => true,
                'token' => $new_token
            );
            
        } catch (Exception $e) {
            return new WP_Error(
                'invalid_token',
                'Nieprawidłowy token: ' . $e->getMessage(),
                array('status' => 401)
            );
        }
    }
    
    /**
     * Generate JWT token with scopes (P0 security fix)
     */
    private function generate_jwt_token($user, $scopes = array('read:profile')) {
        // Default scopes for customer role
        if (in_array('customer', $user->roles)) {
            $scopes = array_merge($scopes, array('read:orders', 'read:profile', 'write:profile'));
        }
        
        $header = json_encode(array('typ' => 'JWT', 'alg' => 'HS256'));
        $payload = json_encode(array(
            'user_id' => $user->ID,
            'email' => $user->user_email,
            'scopes' => $scopes, // Add scopes for verification
            'iat' => time(),
            'exp' => time() + (7 * 24 * 60 * 60), // 7 days
            'iss' => get_site_url()
        ));
        
        $base64_header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64_payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $secret = $this->get_jwt_secret();
        $signature = hash_hmac('sha256', $base64_header . "." . $base64_payload, $secret, true);
        $base64_signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        $token = $base64_header . "." . $base64_payload . "." . $base64_signature;
        
        // Add token to refresh whitelist (store only last 5 tokens per user)
        $whitelist_key = "jwt_refresh_whitelist_{$user->ID}";
        $whitelist = get_transient($whitelist_key) ?: array();
        $whitelist[] = $token;
        $whitelist = array_slice($whitelist, -5); // Keep only last 5
        set_transient($whitelist_key, $whitelist, 7 * 24 * 60 * 60); // 7 days
        
        return $token;
    }
    
    /**
     * Verify token has required scope
     */
    public function verify_token_scope($token, $required_scope) {
        try {
            $payload = $this->verify_jwt_token($token);
            $scopes = isset($payload->scopes) ? $payload->scopes : array();
            return in_array($required_scope, $scopes);
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Verify JWT token
     */
    private function verify_jwt_token($token) {
        $parts = explode('.', $token);
        
        if (count($parts) !== 3) {
            throw new Exception('Invalid token format');
        }
        
        list($header, $payload, $signature) = $parts;
        
        // Verify signature
        $secret = $this->get_jwt_secret();
        $expected_signature = hash_hmac('sha256', $header . "." . $payload, $secret, true);
        $expected_signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expected_signature));
        
        if (!hash_equals($signature, $expected_signature)) {
            throw new Exception('Invalid signature');
        }
        
        // Decode payload
        $payload = base64_decode(str_replace(['-', '_'], ['+', '/'], $payload));
        $payload_data = json_decode($payload);
        
        if (!$payload_data) {
            throw new Exception('Invalid payload');
        }
        
        // Check expiration
        if (isset($payload_data->exp) && $payload_data->exp < time()) {
            throw new Exception('Token expired');
        }
        
        return $payload_data;
    }
    
    /**
     * Get JWT secret key
     */
    private function get_jwt_secret() {
        $secret = get_option('king_jwt_secret');
        
        if (!$secret) {
            $secret = wp_generate_password(64, false);
            update_option('king_jwt_secret', $secret);
        }
        
        return $secret;
    }
    
    /**
     * Get WooCommerce customer data
     */
    private function get_customer_data($user_id) {
        $customer = new WC_Customer($user_id);
        
        // Get custom meta data (NIP, invoice request)
        $nip = $customer->get_meta('_billing_nip');
        $invoice_request = $customer->get_meta('_invoice_request');
        
        return array(
            'billing' => array(
                'address' => $customer->get_billing_address_1(),
                'city' => $customer->get_billing_city(),
                'postcode' => $customer->get_billing_postcode(),
                'country' => $customer->get_billing_country(),
                'phone' => $customer->get_billing_phone(),
                'company' => $customer->get_billing_company(),
                'nip' => $nip,
                'invoice_request' => $invoice_request === 'yes'
            ),
            'shipping' => array(
                'address' => $customer->get_shipping_address_1(),
                'city' => $customer->get_shipping_city(),
                'postcode' => $customer->get_shipping_postcode(),
                'country' => $customer->get_shipping_country()
            )
        );
    }
    
    /**
     * Handle AJAX login (fallback)
     */
    public function handle_ajax_login() {
        check_ajax_referer('king_jwt_nonce', 'nonce');
        
        $email = sanitize_email($_POST['email']);
        $password = $_POST['password'];
        
        $user = wp_authenticate($email, $password);
        
        if (is_wp_error($user)) {
            wp_send_json_error('Nieprawidłowy email lub hasło');
        }
        
        if (!in_array('customer', $user->roles)) {
            wp_send_json_error('Użytkownik musi mieć rolę klienta');
        }
        
        $token = $this->generate_jwt_token($user);
        $customer_data = $this->get_customer_data($user->ID);
        
        wp_send_json_success(array(
            'token' => $token,
            'user' => array(
                'id' => $user->ID,
                'email' => $user->user_email,
                'firstName' => $user->first_name,
                'lastName' => $user->user_lastname,
                'role' => 'customer',
                'billing' => $customer_data['billing'],
                'shipping' => $customer_data['shipping']
            )
        ));
    }
}

// Initialize plugin
new KingJWTAuthentication();

// Add activation hook
register_activation_hook(__FILE__, function() {
    // Generate JWT secret on activation
    if (!get_option('king_jwt_secret')) {
        update_option('king_jwt_secret', wp_generate_password(64, false));
    }
});
