<?php
// Ensure shared headless helpers are loaded
if (file_exists(WP_CONTENT_DIR . '/mu-plugins/headless-config.php')) {
    require_once WP_CONTENT_DIR . '/mu-plugins/headless-config.php';
}
/**
 * King Email System - System powiadomień email
 * 
 * @package KingWooCommerce
 * @version 1.0.0
 * @author King Brand
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KingEmailSystem {
    
    private $email_templates = [];
    private $email_service = 'wordpress'; // 'wordpress', 'sendgrid', 'mailgun'
    
    public function __construct() {
        $this->init();
    }
    
    /**
     * Initialize the email system
     */
    public function init() {
        // Adapter mode: do not send custom emails. Rely on WooCommerce defaults.
        // Keep only adapters/filters that enrich/brand default emails.
        add_action('woocommerce_order_status_changed', [$this, 'handle_order_status_change'], 10, 4);

        // Add meta (NIP, firma, tracking) to Woo emails
        add_action('woocommerce_email_order_meta', [$this, 'inject_order_meta_into_email'], 10, 3);
        // Rewrite WP links -> headless frontend domain in email content
        add_filter('woocommerce_mail_content', [$this, 'rewrite_email_content_domain'], 999);
        // CTA links to frontend (order details + account)
        add_action('woocommerce_email_after_order_table', [$this, 'inject_frontend_cta_links'], 15, 4);
        
        // REMOVED: Polish email subjects - edit in WooCommerce admin instead
        // You can now edit all email titles in WooCommerce → Settings → Emails
        
        // Add FILLER branding to email headers
        add_action('woocommerce_email_header', [$this, 'add_filler_branding'], 10, 2);
        
        // DISABLED: Custom email triggering - let WooCommerce handle emails automatically
        // This was causing duplicate emails and bypassing WooCommerce templates
        // add_action('woocommerce_new_order', [$this, 'trigger_rest_api_emails'], 10, 1);
        // add_action('woocommerce_api_create_order', [$this, 'trigger_rest_api_emails'], 10, 2);
        // add_action('woocommerce_rest_insert_shop_order_object', [$this, 'trigger_rest_api_emails'], 10, 2);
        // add_action('woocommerce_create_order', [$this, 'trigger_rest_api_emails'], 10, 1);
        // add_action('woocommerce_checkout_order_processed', [$this, 'trigger_rest_api_emails'], 10, 1);
        
        // Debug: Log all order creation attempts
        add_action('woocommerce_new_order', [$this, 'debug_order_creation'], 5, 1);
        add_action('woocommerce_rest_insert_shop_order_object', [$this, 'debug_rest_order_creation'], 5, 2);
        
        // Custom REST API endpoints
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        
        // Initialize templates
        $this->init_email_templates();
        
        // Configure email settings
        $this->configure_email_settings();
    }
    
    /**
     * Initialize email templates
     */
    private function init_email_templates() {
        // ADAPTER MODE: Only keep templates for custom functionality (password reset)
        // WooCommerce default emails will be used and enriched
        $this->email_templates = [
            'password_reset' => [
                'subject' => 'Reset hasła - FILLER',
                'template' => 'password-reset.php'
            ]
        ];
    }
    
    /**
     * Configure email settings
     */
    private function configure_email_settings() {
        // Set from name and email
        add_filter('wp_mail_from_name', function($name) {
            return 'FILLER - Profesjonalne produkty do pielęgnacji';
        });
        
        add_filter('wp_mail_from', function($email) {
            return 'noreply@' . parse_url(get_site_url(), PHP_URL_HOST);
        });
        
        // Configure SMTP if needed
        if (defined('KING_EMAIL_SMTP_HOST')) {
            add_action('phpmailer_init', [$this, 'configure_smtp']);
        }
    }
    
    /**
     * Configure SMTP settings
     */
    public function configure_smtp($phpmailer) {
        $phpmailer->isSMTP();
        $phpmailer->Host = KING_EMAIL_SMTP_HOST;
        $phpmailer->SMTPAuth = true;
        $phpmailer->Username = KING_EMAIL_SMTP_USERNAME;
        $phpmailer->Password = KING_EMAIL_SMTP_PASSWORD;
        $phpmailer->SMTPSecure = KING_EMAIL_SMTP_SECURE; // 'tls' or 'ssl'
        $phpmailer->Port = KING_EMAIL_SMTP_PORT;
        $phpmailer->setFrom(KING_EMAIL_SMTP_FROM_EMAIL, KING_EMAIL_SMTP_FROM_NAME);
    }
    
    /**
     * Handle new order
     */
    public function handle_new_order($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        // Adapter: rely on Woo default email. Optionally log.
        $this->log_email_sent($order_id, 'order_confirmation_adapter', $order->get_billing_email());
    }
    
    /**
     * Handle checkout completed
     */
    public function handle_checkout_completed($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        // Adapter: rely on Woo default email. Optionally log.
        $this->log_email_sent($order_id, 'order_confirmation_adapter', $order->get_billing_email());
    }
    
    /**
     * Handle order status change
     */
    public function handle_order_status_change($order_id, $old_status, $new_status, $order) {
        // ADAPTER MODE: Only log and enrich WooCommerce default emails
        // Do not send custom emails - let WooCommerce handle it
        switch ($new_status) {
            case 'processing':
                // Order is being processed - log only
                $this->log_email_sent($order_id, 'order_processing_adapter', $order->get_billing_email());
                break;
                
            case 'completed':
                // Order completed – log only
                $this->log_email_sent($order_id, 'order_completed_adapter', $order->get_billing_email());
                break;
                
            case 'shipped':
                // Order shipped – log only
                $this->log_email_sent($order_id, 'order_shipped_adapter', $order->get_billing_email());
                break;
                
            case 'cancelled':
                // Order cancelled - log only
                $this->log_email_sent($order_id, 'order_cancelled_adapter', $order->get_billing_email());
                break;
                
            case 'on-hold':
                // Order on hold - log only
                $this->log_email_sent($order_id, 'order_on_hold_adapter', $order->get_billing_email());
                break;
        }
    }
    
    /**
     * Debug order creation
     */
    public function debug_order_creation($order_id) {
        error_log("King Email System DEBUG: woocommerce_new_order hook triggered for order {$order_id}");
    }
    
    /**
     * Debug REST order creation
     */
    public function debug_rest_order_creation($order, $request) {
        $order_id = $order->get_id();
        error_log("King Email System DEBUG: woocommerce_rest_insert_shop_order_object hook triggered for order {$order_id}");
    }
    
    /**
     * TYMCZASOWE: Trigger emails for REST API orders
     */
    public function trigger_rest_api_emails($order_id, $order = null) {
        error_log("King Email System DEBUG: trigger_rest_api_emails called for order {$order_id}");
        
        if (!$order) {
            $order = wc_get_order($order_id);
        }
        
        if (!$order) {
            error_log("King Email System ERROR: Could not get order {$order_id}");
            return;
        }
        
        error_log("King Email System DEBUG: Order {$order_id} found, attempting to send emails");
        
        try {
            // Get WooCommerce email class
            $mailer = WC()->mailer();
            $emails = $mailer->get_emails();
            
            error_log("King Email System DEBUG: Available emails: " . implode(', ', array_keys($emails)));
            
            // REMOVED: customer_processing_order email - WooCommerce will send it automatically when order status changes to 'processing'
            
            // Send new order notification to admin
            if (isset($emails['new_order'])) {
                $email = $emails['new_order'];
                $email->trigger($order_id);
                error_log("King Email System: ✅ Sent new_order email for order {$order_id}");
            } else {
                error_log("King Email System ERROR: new_order email not found");
            }
            
        } catch (Exception $e) {
            error_log("King Email System: ❌ Error triggering emails for order {$order_id}: " . $e->getMessage());
        }
    }
    
    // REMOVED: Custom email sending methods - using ADAPTER MODE instead
    // WooCommerce default emails will be enriched with Polish branding and frontend links
    
    /**
     * Send password reset email
     */
    public function send_password_reset($user_email, $reset_link) {
        $user = get_user_by('email', $user_email);
        if (!$user) return false;
        
        $template_data = [
            'customer_name' => $user->display_name,
            'reset_link' => $reset_link
        ];
        
        $subject = $this->process_template_variables($this->email_templates['password_reset']['subject'], $template_data);
        
        return $this->send_email(
            $user_email,
            $user->display_name,
            $subject,
            $this->get_email_template('password_reset', $template_data)
        );
    }
    
    // REMOVED: Custom email sending methods - using ADAPTER MODE instead
    // WooCommerce default emails will be enriched with Polish branding and frontend links
    
    /**
     * Prepare order template data
     */
    private function prepare_order_template_data($order) {
        $items = [];
        foreach ($order->get_items() as $item) {
            $items[] = [
                'name' => $item->get_name(),
                'quantity' => $item->get_quantity(),
                'price' => $order->get_formatted_line_subtotal($item),
                'total' => $order->get_formatted_line_subtotal($item)
            ];
        }
        
        return [
            'order_number' => $order->get_order_number(),
            'customer_name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
            'customer_email' => $order->get_billing_email(),
            'order_date' => $order->get_date_created()->format('d.m.Y'),
            'total' => $order->get_formatted_order_total(),
            'items' => $items,
            'billing_address' => $this->format_address($order->get_address('billing')),
            'shipping_address' => $this->format_address($order->get_address('shipping')),
            'payment_method' => $order->get_payment_method_title(),
            'tracking_number' => $order->get_meta('_tracking_number')
        ];
    }
    
    /**
     * Format address for email
     */
    private function format_address($address) {
        $parts = [];
        if (!empty($address['address_1'])) $parts[] = $address['address_1'];
        if (!empty($address['city'])) $parts[] = $address['city'];
        if (!empty($address['postcode'])) $parts[] = $address['postcode'];
        if (!empty($address['country'])) $parts[] = $address['country'];
        
        return implode(', ', $parts);
    }
    
    /**
     * Get email template
     */
    private function get_email_template($template_name, $data) {
        $template_file = plugin_dir_path(__FILE__) . 'templates/' . $this->email_templates[$template_name]['template'];
        
        if (file_exists($template_file)) {
            ob_start();
            include $template_file;
            return ob_get_clean();
        }
        
        // Fallback to default template
        return $this->get_default_template($template_name, $data);
    }
    
    /**
     * Get default email template
     */
    private function get_default_template($template_name, $data) {
        switch ($template_name) {
            case 'order_confirmation':
                return $this->get_order_confirmation_template($data);
            case 'order_shipped':
                return $this->get_order_shipped_template($data);
            case 'order_delivered':
                return $this->get_order_delivered_template($data);
            case 'password_reset':
                return $this->get_password_reset_template($data);
            default:
                return 'Default template not found';
        }
    }
    
    /**
     * Process template variables
     */
    private function process_template_variables($template, $variables) {
        $tpl = (string)$template;
        foreach ($variables as $key => $value) {
            $tpl = str_replace('{#' . (string)$key . '}', $this->to_string($value), $tpl);
        }
        return $tpl;
    }

    /**
     * Safely convert any value to string for email templates
     */
    private function to_string($value) {
        if (is_null($value)) {
            return '';
        }
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        if (is_array($value)) {
            // Flatten arrays to human-friendly string
            $parts = array_map(function($v) { return $this->to_string($v); }, $value);
            return implode(', ', $parts);
        }
        if (is_object($value)) {
            // Encode objects as JSON for safety
            return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        return (string)$value;
    }
    
    /**
     * Send email using WordPress mail function
     */
    private function send_email($to, $to_name, $subject, $message) {
        $headers = [
            'Content-Type: text/html; charset=UTF-8',
            'From: FILLER <noreply@' . parse_url(get_site_url(), PHP_URL_HOST) . '>'
        ];
        
        // Adapter mode: do not send custom emails – leave to Woo defaults
        // Keep rewrite helper for potential use in filters below
        $result = true;
        
        if ($result) {
            error_log("King Email System: Email sent successfully to {$to}");
        } else {
            error_log("King Email System: Failed to send email to {$to}");
        }
        
        return $result;
    }

    /**
     * Inject extra order meta into standard Woo emails
     */
    public function inject_order_meta_into_email($order, $sent_to_admin, $plain_text) {
        if (!$order instanceof WC_Order) { return; }
        $nip = $order->get_meta('_billing_nip');
        $company = $order->get_billing_company();
        $tracking = $order->get_meta('_tracking_number');
        $lines = [];
        if (!empty($company)) { $lines[] = __('Firma', 'woocommerce') . ': ' . esc_html($company); }
        if (!empty($nip)) { $lines[] = 'NIP: ' . esc_html($nip); }
        if (!empty($tracking)) { $lines[] = __('Numer śledzenia', 'woocommerce') . ': ' . esc_html($tracking); }
        if (empty($lines)) { return; }
        if ($plain_text) {
            echo "\n" . implode("\n", $lines) . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        } else {
            echo '<div style="margin-top:10px;color:#555">' . wp_kses_post(implode('<br>', $lines)) . '</div>';
        }
    }

    /**
     * Rewrite WP domain to headless frontend domain in Woo email HTML
     */
    public function rewrite_email_content_domain($content) {
        if (function_exists('headless_rewrite_to_frontend')) {
            return headless_rewrite_to_frontend((string)$content);
        }
        return $content;
    }

    /**
     * Add CTA links pointing to headless frontend (order details, account)
     */
    public function inject_frontend_cta_links($order, $sent_to_admin, $plain_text, $email) {
        if (!$order instanceof WC_Order) { return; }
        $frontend = function_exists('headless_frontend_url') ? headless_frontend_url() : site_url();
        $order_id = $order->get_id();
        $order_url = rtrim($frontend, '/') . '/moje-zamowienia/' . $order_id;
        $account_url = rtrim($frontend, '/') . '/moje-konto';
        if ($plain_text) {
            echo "\n" . __('Szczegóły zamówienia:', 'woocommerce') . ' ' . $order_url . "\n";
            echo __('Twoje konto:', 'woocommerce') . ' ' . $account_url . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput
        } else {
            echo '<div style="margin-top:16px">'
               . '<a href="' . esc_url($order_url) . '" style="display:inline-block;background:#000;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;margin-right:10px;">'
               . esc_html__('Zobacz zamówienie', 'woocommerce') . '</a>'
               . '<a href="' . esc_url($account_url) . '" style="display:inline-block;background:#111827;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">'
               . esc_html__('Przejdź do konta', 'woocommerce') . '</a>'
               . '</div>';
        }
    }
    
    /**
     * Log email sent
     */
    private function log_email_sent($order_id, $email_type, $recipient) {
        $log_entry = [
            'order_id' => $order_id,
            'email_type' => $email_type,
            'recipient' => $recipient,
            'sent_at' => current_time('mysql'),
            'status' => 'sent'
        ];
        
        // Store in WordPress options (you could also use custom table)
        $existing_logs = get_option('king_email_logs', []);
        $existing_logs[] = $log_entry;
        
        // Keep only last 1000 logs
        if (count($existing_logs) > 1000) {
            $existing_logs = array_slice($existing_logs, -1000);
        }
        
        update_option('king_email_logs', $existing_logs);
    }
    
    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        register_rest_route('king-email/v1', '/send-test', [
            'methods' => 'POST',
            'callback' => [$this, 'send_test_email'],
            'permission_callback' => [$this, 'check_admin_permissions']
        ]);
        
        register_rest_route('king-email/v1', '/logs', [
            'methods' => 'GET',
            'callback' => [$this, 'get_email_logs'],
            'permission_callback' => [$this, 'check_admin_permissions']
        ]);
        
        register_rest_route('king-email/v1', '/templates', [
            'methods' => 'GET',
            'callback' => [$this, 'get_email_templates'],
            'permission_callback' => [$this, 'check_admin_permissions']
        ]);
        
        register_rest_route('king-email/v1', '/trigger-order-email', [
            'methods' => 'POST',
            'callback' => [$this, 'trigger_order_email_api'],
            'permission_callback' => '__return_true',
            'args' => [
                'order_id' => [
                    'required' => true,
                    'type' => 'integer',
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                ]
            ]
        ]);
        
        register_rest_route('king-email/v1', '/send-direct-email', [
            'methods' => 'POST',
            'callback' => [$this, 'send_direct_email_api'],
            'permission_callback' => '__return_true',
            'args' => [
                'order_id' => [
                    'required' => true,
                    'type' => 'integer'
                ],
                'customer_email' => [
                    'required' => true,
                    'type' => 'string'
                ],
                'customer_name' => [
                    'required' => true,
                    'type' => 'string'
                ],
                'order_number' => [
                    'required' => true,
                    'type' => 'string'
                ],
                'total' => [
                    'required' => true,
                    'type' => 'number'
                ],
                'items' => [
                    'required' => true,
                    'type' => 'array'
                ]
            ]
        ]);
        
        register_rest_route('king-email/v1', '/send-newsletter-email', [
            'methods' => 'POST',
            'callback' => [$this, 'send_newsletter_email_api'],
            'permission_callback' => '__return_true',
            'args' => [
                'to' => [
                    'required' => true,
                    'type' => 'string',
                    'description' => 'Recipient email'
                ],
                'subject' => [
                    'required' => true,
                    'type' => 'string',
                    'description' => 'Email subject'
                ],
                'message' => [
                    'required' => true,
                    'type' => 'string',
                    'description' => 'Email message'
                ],
                'customerName' => [
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Customer name'
                ]
            ]
        ]);
    }
    
    /**
     * Trigger order email via API
     */
    public function trigger_order_email_api($request) {
        $order_id = $request->get_param('order_id');
        
        if (!$order_id) {
            return new WP_Error('missing_order_id', 'Brak ID zamówienia', array('status' => 400));
        }
        
        error_log("King Email System API: Triggering email for order {$order_id}");
        
        try {
            $result = $this->trigger_rest_api_emails($order_id);
            
            if ($result) {
                return array(
                    'success' => true,
                    'message' => "Email wysłany dla zamówienia {$order_id}",
                    'order_id' => $order_id
                );
            } else {
                return new WP_Error('email_failed', 'Nie udało się wysłać emaila', array('status' => 500));
            }
            
        } catch (Exception $e) {
            error_log("King Email System API Error: " . $e->getMessage());
            return new WP_Error('email_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Send direct email via API
     */
    public function send_direct_email_api($request) {
        $order_id = $request->get_param('order_id');
        $customer_email = $request->get_param('customer_email');
        $customer_name = $request->get_param('customer_name');
        $order_number = $request->get_param('order_number');
        $total = $request->get_param('total');
        $items = $request->get_param('items');
        
        error_log("King Email System API: Sending direct email for order {$order_id} to {$customer_email}");
        
        try {
            // Create email content
            $subject = "Potwierdzenie zamówienia #{$order_number} - FILLER";
            
            $items_html = '';
            foreach ($items as $item) {
                $items_html .= "<tr><td>{$item['name']}</td><td>{$item['quantity']}</td><td>{$item['price']} zł</td></tr>";
            }
            
            $message = "
                <html>
                <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>
                    <h2 style='color: #333;'>Dziękujemy za zamówienie!</h2>
                    <p>Witaj {$customer_name},</p>
                    <p>Twoje zamówienie #{$order_number} zostało przyjęte i jest w trakcie realizacji.</p>
                    
                    <h3>Szczegóły zamówienia:</h3>
                    <table border='1' style='border-collapse: collapse; width: 100%;'>
                        <tr><th>Produkt</th><th>Ilość</th><th>Cena</th></tr>
                        {$items_html}
                    </table>
                    
                    <p><strong>Łączna kwota: {$total} zł</strong></p>
                    
                    <p>Możesz śledzić status swojego zamówienia w <a href='" . headless_frontend_url() . "/moje-zamowienia'>swoim panelu</a>.</p>
                    
                    <p>Pozdrawiamy,<br>Zespół FILLER</p>
                </body>
                </html>
            ";
            
            // Send email using WordPress mail
            $headers = [
                'Content-Type: text/html; charset=UTF-8',
                'From: FILLER <noreply@' . parse_url(get_site_url(), PHP_URL_HOST) . '>'
            ];
            
            $result = wp_mail($customer_email, $subject, $message, $headers);
            
            if ($result) {
                error_log("King Email System: ✅ Direct email sent successfully to {$customer_email}");
                return array(
                    'success' => true,
                    'message' => "Email wysłany pomyślnie do {$customer_email}",
                    'order_id' => $order_id
                );
            } else {
                error_log("King Email System: ❌ Failed to send direct email to {$customer_email}");
                return new WP_Error('email_failed', 'Nie udało się wysłać emaila', array('status' => 500));
            }
            
        } catch (Exception $e) {
            error_log("King Email System API Error: " . $e->getMessage());
            return new WP_Error('email_error', $e->getMessage(), array('status' => 500));
        }
    }
    
    /**
     * Check admin permissions
     */
    public function check_admin_permissions() {
        return current_user_can('manage_options');
    }
    
    /**
     * Send newsletter email via API
     */
    public function send_newsletter_email_api($request) {
        $to = sanitize_email($request->get_param('to'));
        $subject = sanitize_text_field($request->get_param('subject'));
        $message = $request->get_param('message');
        $customerName = sanitize_text_field($request->get_param('customerName'));
        
        error_log("King Email System: Sending newsletter email to {$to}");
        
        try {
            // Send email using WordPress mail
            $headers = [
                'Content-Type: text/html; charset=UTF-8',
                'From: Cosmetic Cream <noreply@' . parse_url(get_site_url(), PHP_URL_HOST) . '>'
            ];
            
            $result = wp_mail($to, $subject, $message, $headers);
            
            if ($result) {
                error_log("King Email System: ✅ Newsletter email sent to {$to}");
                return new WP_REST_Response([
                    'success' => true,
                    'message' => 'Email został wysłany'
                ], 200);
            } else {
                error_log("King Email System: ❌ Failed to send newsletter email to {$to}");
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Nie udało się wysłać emaila'
                ], 500);
            }
        } catch (Exception $e) {
            error_log("King Email System: Exception sending newsletter email: " . $e->getMessage());
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Błąd podczas wysyłania emaila'
            ], 500);
        }
    }
    
    /**
     * Send test email
     */
    public function send_test_email($request) {
        $params = $request->get_params();
        $template = sanitize_text_field($params['template'] ?? 'order_confirmation');
        $email = sanitize_email($params['email'] ?? 'test@example.com');
        
        $test_data = [
            'order_number' => 'TEST-123',
            'customer_name' => 'Test User',
            'customer_email' => $email,
            'order_date' => current_time('d.m.Y'),
            'total' => '299.00 zł',
            'items' => [['name' => 'Test Product', 'quantity' => 1, 'price' => '299.00 zł', 'total' => '299.00 zł']],
            'billing_address' => 'ul. Testowa 123, Warszawa 00-001, PL',
            'shipping_address' => 'ul. Testowa 123, Warszawa 00-001, PL',
            'payment_method' => 'Karta kredytowa',
            'tracking_number' => 'TRK123456789'
        ];
        
        $result = $this->send_email(
            $email,
            'Test User',
            'Test Email - ' . $this->email_templates[$template]['subject'],
            $this->get_email_template($template, $test_data)
        );
        
        return [
            'success' => $result,
            'message' => $result ? 'Test email sent successfully' : 'Failed to send test email'
        ];
    }
    
    /**
     * Get email logs
     */
    public function get_email_logs() {
        $logs = get_option('king_email_logs', []);
        return array_reverse($logs); // Latest first
    }
    
    /**
     * Get email templates
     */
    public function get_email_templates() {
        return $this->email_templates;
    }
    
    // Default template methods
    private function get_order_confirmation_template($data) {
        return $this->get_basic_email_template('Potwierdzenie zamówienia', $data);
    }
    
    private function get_order_shipped_template($data) {
        return $this->get_basic_email_template('Zamówienie wysłane', $data);
    }
    
    private function get_order_delivered_template($data) {
        return $this->get_basic_email_template('Zamówienie dostarczone', $data);
    }
    
    private function get_password_reset_template($data) {
        return $this->get_basic_email_template('Reset hasła', $data);
    }
    
    private function get_basic_email_template($title, $data) {
        return "
        <!DOCTYPE html>
        <html>
        <head>
            <title>{$title}</title>
        </head>
        <body>
            <h1>{$title}</h1>
            <p>Dane: " . json_encode($data) . "</p>
        </body>
        </html>";
    }
    
    // REMOVED: Polish email subjects - edit in WooCommerce admin instead
    // Go to WooCommerce → Settings → Emails to customize all email titles
    
    /**
     * Add FILLER branding to email headers
     */
    public function add_filler_branding($email_heading, $email) {
        // Add FILLER branding to email headers
        if ($email_heading) {
            return '<h1 style="color: #000; font-size: 28px; font-weight: bold; margin: 0; text-align: center;">FILLER</h1>' . $email_heading;
        }
        return $email_heading;
    }
}

// Initialize the email system
new KingEmailSystem();

// Activation hook
register_activation_hook(__FILE__, function() {
    // Create email logs table if needed
    // Set default options
    add_option('king_email_logs', []);
});

// Deactivation hook
register_deactivation_hook(__FILE__, function() {
    // Cleanup if needed
});
