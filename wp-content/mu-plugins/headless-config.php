<?php
/**
 * Headless Config - shared helpers for headless frontend integration
 */

// Prevent direct access
if (!defined('ABSPATH')) { exit; }

// Resolve frontend URL from env/constant once
if (!defined('HEADLESS_FRONTEND_URL')) {
    // Try env first (settable via hosting panel)
    $envValue = getenv('HEADLESS_FRONTEND_URL');
    if ($envValue && is_string($envValue)) {
        define('HEADLESS_FRONTEND_URL', rtrim($envValue, '/'));
    } else {
        // Sensible default – may be overridden in wp-config.php if needed
        define('HEADLESS_FRONTEND_URL', 'https://filler.pl');
    }
}

if (!function_exists('headless_frontend_url')) {
    /**
     * Return canonical headless frontend base URL.
     */
    function headless_frontend_url(): string {
        return defined('HEADLESS_FRONTEND_URL') ? HEADLESS_FRONTEND_URL : site_url();
    }
}

if (!function_exists('headless_rewrite_to_frontend')) {
    /**
     * Replace WordPress absolute URLs with headless frontend domain in given string
     */
    function headless_rewrite_to_frontend(string $content): string {
        $from = rtrim(site_url(), '/');
        $to = rtrim(headless_frontend_url(), '/');
        if ($from === $to) { return $content; }
        return str_replace($from, $to, $content);
    }
}

/**
 * Centralized CORS configuration for headless WooCommerce
 * FIX: Ujednolicenie CORS z 3 pluginów do jednej centralnej funkcji
 */
if (!function_exists('headless_get_allowed_origins')) {
    /**
     * Get list of allowed CORS origins
     * 
     * @return array List of allowed origins
     */
    function headless_get_allowed_origins(): array {
        return array(
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
    }
}

if (!function_exists('headless_add_cors_headers')) {
    /**
     * Add CORS headers for REST API requests
     * Centralized CORS handler - use this instead of duplicating in plugins
     * 
     * @param mixed $value Filter value (usually null)
     * @return mixed Filter value
     */
    function headless_add_cors_headers($value) {
        $origin = get_http_origin();
        $allowed_origins = headless_get_allowed_origins();
        
        // Set origin header if origin is allowed
        if ($origin && in_array($origin, $allowed_origins, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
        
        // Set CORS headers
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce, x-wp-nonce');
        header('Access-Control-Allow-Credentials: true');
        
        // Handle preflight requests
        if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) {
            status_header(200);
            exit;
        }
        
        return $value;
    }
}

// Register centralized CORS handler
if (!has_filter('rest_pre_serve_request', 'headless_add_cors_headers')) {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', 'headless_add_cors_headers', 10, 1);
}


