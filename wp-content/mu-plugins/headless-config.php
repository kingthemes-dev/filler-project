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


