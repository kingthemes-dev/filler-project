<?php
// Ensure shared headless helpers are loaded
if (file_exists(WP_CONTENT_DIR . '/mu-plugins/headless-config.php')) {
    require_once WP_CONTENT_DIR . '/mu-plugins/headless-config.php';
}
/**
 * Custom Password Reset API - Mu-Plugin
 * 
 * Dodaje custom endpoint do resetowania hasła przez REST API
 * Działa na każdym serwerze z domyślnymi ustawieniami WordPress
 * 
 * @package CustomPasswordReset
 * @version 1.0.0
 */

// Zapobiegaj bezpośredniemu dostępowi
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Rejestruj custom REST API endpoint
 */
add_action('rest_api_init', function() {
    register_rest_route('custom/v1', '/password-reset', [
        'methods' => 'POST',
        'callback' => 'custom_password_reset_handler',
        'permission_callback' => '__return_true',
        'args' => [
            'email' => [
                'required' => true,
                'type' => 'string',
                'format' => 'email',
                'sanitize_callback' => 'sanitize_email'
            ]
        ]
    ]);
});

/**
 * Handler dla custom password reset endpoint
 * 
 * @param WP_REST_Request $request Request object
 * @return WP_REST_Response Response object
 */
function custom_password_reset_handler($request) {
    $email = $request->get_param('email');
    
    // Logowanie dla debugowania
    error_log("Custom Password Reset API called for email: " . $email);
    
    // Sprawdź czy użytkownik istnieje
    $user = get_user_by('email', $email);
    
    if (!$user) {
        // Użytkownik nie istnieje - zwróć success dla bezpieczeństwa
        error_log("User not found for email: " . $email);
        return new WP_REST_Response([
            'success' => true,
            'message' => 'Jeśli podany email istnieje w systemie, otrzymasz link do resetowania hasła.'
        ], 200);
    }
    
    // Użytkownik istnieje - stwórz custom link resetujący
    error_log("User found, creating custom reset link for: " . $email);
    
    // Stwórz link resetujący używając WordPress funkcji
    $reset_key = get_password_reset_key($user);
    
    if (is_wp_error($reset_key)) {
        error_log("Failed to generate password reset key for user: " . $user->user_login);
        return new WP_REST_Response([
            'success' => true,
            'message' => 'Jeśli podany email istnieje w systemie, otrzymasz link do resetowania hasła.'
        ], 200);
    }
    
    // Stwórz link do naszej aplikacji Next.js (używając stałej frontu)
    $nextjs_domain = function_exists('headless_frontend_url') ? headless_frontend_url() : site_url();
    $reset_link = rtrim($nextjs_domain, '/') . "/reset-hasla/?key=" . rawurlencode($reset_key) . "&login=" . rawurlencode($user->user_login);
    
    // Przygotuj profesjonalny email
    $subject = 'Resetowanie hasła - KingBrand';
    $message = "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>Resetowanie hasła</title>
        </head>
        <body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;'>
            <div style='max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);'>
                <div style='text-align: center; margin-bottom: 30px;'>
                    <h1 style='color: #333; margin: 0; font-size: 28px;'>Resetowanie hasła</h1>
                </div>
                
                <div style='color: #555; line-height: 1.6; margin-bottom: 30px;'>
                    <p>Otrzymałeś tę wiadomość, ponieważ zostało wysłane żądanie resetowania hasła dla Twojego konta.</p>
                    <p>Kliknij poniższy przycisk, aby zresetować hasło:</p>
                </div>
                
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{$reset_link}' style='display: inline-block; background-color: #000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;'>Resetuj hasło</a>
                </div>
                
                <div style='color: #777; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;'>
                    <p><strong>Informacje:</strong></p>
                    <ul style='margin: 10px 0; padding-left: 20px;'>
                        <li>Link będzie ważny przez 24 godziny</li>
                        <li>Jeśli nie prosiłeś o resetowanie hasła, zignoruj tę wiadomość</li>
                        <li>Twoje hasło pozostanie niezmienione, dopóki nie utworzysz nowego</li>
                    </ul>
                </div>
                
                <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;'>
                    <p>Pozdrawiamy,<br><strong>Zespół KingBrand</strong></p>
                </div>
            </div>
        </body>
        </html>
    ";
    
    // Ustaw headers dla HTML email
    $headers = [
        'Content-Type: text/html; charset=UTF-8',
        'From: KingBrand <noreply@kingbrand.pl>'
    ];
    
    // Wyślij email
    $result = wp_mail($email, $subject, $message, $headers);
    
    if ($result) {
        error_log("Custom password reset email sent successfully to: " . $email);
        return new WP_REST_Response([
            'success' => true,
            'message' => 'Link do resetowania hasła został wysłany na podany adres email. Sprawdź folder spam.',
            'debug_info' => [
                'reset_link' => $reset_link,
                'user_login' => $user->user_login,
                'reset_key_length' => strlen($reset_key)
            ]
        ], 200);
    } else {
        error_log("Failed to send password reset email to: " . $email);
        return new WP_REST_Response([
            'success' => true,
            'message' => 'Jeśli podany email istnieje w systemie, otrzymasz link do resetowania hasła.'
        ], 200);
    }
}

/**
 * Rejestruj endpoint do resetowania hasła
 */
add_action('rest_api_init', function() {
    register_rest_route('custom/v1', '/reset-password', [
        'methods' => 'POST',
        'callback' => 'custom_password_reset_confirm_handler',
        'permission_callback' => '__return_true',
        'args' => [
            'key' => [
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field'
            ],
            'login' => [
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field'
            ],
            'password' => [
                'required' => true,
                'type' => 'string',
                'sanitize_callback' => 'sanitize_text_field'
            ]
        ]
    ]);
});

/**
 * Handler dla resetowania hasła
 */
function custom_password_reset_confirm_handler($request) {
    $key = $request->get_param('key');
    $login = $request->get_param('login');
    $password = $request->get_param('password');
    
    error_log("Custom password reset confirm for: " . $login);
    
    // Sprawdź czy klucz resetujący jest prawidłowy
    $user = check_password_reset_key($key, $login);
    
    if (is_wp_error($user) || !$user) {
        error_log("Invalid password reset key for: " . $login);
        return new WP_REST_Response([
            'success' => false,
            'error' => 'Nieprawidłowy lub wygasły klucz resetujący'
        ], 400);
    }

    // Zresetuj hasło
    wp_set_password($password, $user->ID);
    
    error_log("Password reset successful for: " . $login);
    
    return new WP_REST_Response([
        'success' => true,
        'message' => 'Hasło zostało pomyślnie zresetowane'
    ], 200);
}

/**
 * Dodaj CORS headers dla API
 */
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        return $value;
    });
});
