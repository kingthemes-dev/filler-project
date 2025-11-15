<?php
/**
 * Newsletter Unsubscribe Endpoint
 * 
 * Publiczny endpoint REST API do wypisu z listy newslettera Brevo (Sendinblue).
 * 
 * Przykłady użycia w mailach:
 * 
 * 1. Podstawowy link wypisu:
 *    https://twojadomena.pl/wp-json/newsletter/v1/unsubscribe?email={{EMAIL}}
 * 
 * 2. Link z przekierowaniem po wypisie:
 *    https://twojadomena.pl/wp-json/newsletter/v1/unsubscribe?email={{EMAIL}}&redirect=https%3A%2F%2Ftwojadomena.pl%2Funsubscribe-confirmed%2F
 * 
 * @package KingWooCommerce
 * @version 1.0.0
 * @author King Brand
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register unsubscribe REST API endpoint
 * 
 * Uwaga: Endpoint wymaga odświeżenia permalinków WordPress po pierwszym wdrożeniu.
 * Wykonaj: Ustawienia → Permalinki → Zapisz zmiany (bez zmian, tylko zapisz)
 */
add_action('rest_api_init', function() {
    // Rejestracja endpointu wypisu z newslettera
    register_rest_route('newsletter/v1', '/unsubscribe', [
        'methods' => 'GET',
        'callback' => 'king_newsletter_unsubscribe_handler',
        'permission_callback' => '__return_true', // Publiczny endpoint - bez uwierzytelniania
        'args' => [
            'email' => [
                'required' => true,
                'type' => 'string',
                'validate_callback' => function($param) {
                    return !empty($param) && is_email($param);
                },
                'sanitize_callback' => 'sanitize_email',
            ],
            'redirect' => [
                'required' => false,
                'type' => 'string',
                'sanitize_callback' => 'esc_url_raw',
            ],
        ],
    ]);
    
    // Testowy endpoint do weryfikacji czy REST API działa
    register_rest_route('newsletter/v1', '/test', [
        'methods' => 'GET',
        'callback' => function() {
            return new WP_REST_Response([
                'success' => true,
                'message' => 'Newsletter REST API działa poprawnie',
                'timestamp' => current_time('mysql'),
            ], 200);
        },
        'permission_callback' => '__return_true',
    ]);
}, 10);

/**
 * Handler dla endpointu wypisu z newslettera
 * 
 * @param WP_REST_Request $request Request object
 * @return WP_REST_Response|WP_Error Response lub błąd
 */
function king_newsletter_unsubscribe_handler($request) {
    // Pobierz i zwaliduj email
    $email = $request->get_param('email');
    $email = sanitize_email($email);
    
    // Walidacja emaila
    if (empty($email) || !is_email($email)) {
        return new WP_Error(
            'invalid_email',
            'Nieprawidłowy adres e-mail.',
            ['status' => 400]
        );
    }
    
    // Pobierz zmienne środowiskowe Brevo
    $api_key = defined('SENDINBLUE_API_KEY') ? SENDINBLUE_API_KEY : getenv('SENDINBLUE_API_KEY');
    $list_id = defined('SENDINBLUE_LIST_ID') ? SENDINBLUE_LIST_ID : getenv('SENDINBLUE_LIST_ID');
    
    // Sprawdź czy zmienne są ustawione
    if (empty($api_key) || empty($list_id)) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("King Newsletter Unsubscribe: Brak konfiguracji Brevo API (SENDINBLUE_API_KEY lub SENDINBLUE_LIST_ID)");
        }
        return new WP_Error(
            'configuration_error',
            'Nie udało się wypisać z listy.',
            ['status' => 500]
        );
    }
    
    // Przygotuj URL do Brevo API
    $brevo_url = sprintf(
        'https://api.brevo.com/v3/contacts/lists/%s/contacts/remove',
        absint($list_id)
    );
    
    // Przygotuj body requestu
    $body = json_encode([
        'emails' => [$email]
    ]);
    
    // Przygotuj nagłówki
    $headers = [
        'accept' => 'application/json',
        'api-key' => $api_key,
        'content-type' => 'application/json',
    ];
    
    // Wywołaj Brevo API
    $response = wp_remote_post($brevo_url, [
        'method' => 'POST',
        'headers' => $headers,
        'body' => $body,
        'timeout' => 15,
    ]);
    
    // Sprawdź błędy requestu
    if (is_wp_error($response)) {
        $error_message = $response->get_error_message();
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("King Newsletter Unsubscribe: Błąd requestu do Brevo API: " . $error_message);
        }
        return new WP_Error(
            'api_error',
            'Nie udało się wypisać z listy.',
            ['status' => 500]
        );
    }
    
    // Sprawdź kod odpowiedzi
    $response_code = wp_remote_retrieve_response_code($response);
    $response_body = wp_remote_retrieve_body($response);
    
    // Brevo API zwraca różne kody:
    // - 204 (No Content) - sukces, kontakt usunięty
    // - 200 - sukces
    // - 400 z komunikatem "Contact already removed" - kontakt już nie jest w liście (sukces dla nas)
    // - 404 - kontakt nie istnieje (sukces dla nas)
    
    $is_success = false;
    
    if ($response_code === 204 || $response_code === 200) {
        // Sukces - kontakt został usunięty z listy
        $is_success = true;
    } elseif ($response_code === 400) {
        // Sprawdź czy to błąd "Contact already removed" - to sukces dla nas
        $response_data = json_decode($response_body, true);
        if (isset($response_data['message']) && 
            (stripos($response_data['message'], 'already removed') !== false || 
             stripos($response_data['message'], 'does not exist') !== false)) {
            // Kontakt już nie jest w liście - to sukces
            $is_success = true;
        }
    } elseif ($response_code === 404) {
        // Kontakt nie istnieje w liście - to też sukces (już wypisany)
        $is_success = true;
    }
    
    if (!$is_success && $response_code >= 400) {
        // Inne błędy (401, 403, 500, etc.)
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("King Newsletter Unsubscribe: Brevo API zwróciło błąd. Kod: {$response_code}, Body: {$response_body}");
        }
        return new WP_Error(
            'api_error',
            'Nie udało się wypisać z listy.',
            ['status' => 500]
        );
    }
    
    // Sukces - sprawdź czy jest redirect
    $redirect_url = $request->get_param('redirect');
    
    if (!empty($redirect_url)) {
        // Wykonaj przekierowanie
        wp_safe_redirect($redirect_url);
        exit;
    }
    
    // Zwróć sukces jako JSON
    return new WP_REST_Response([
        'success' => true
    ], 200);
}

