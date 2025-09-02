<?php
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
        // Hook into WooCommerce
        add_action('woocommerce_order_status_changed', [$this, 'handle_order_status_change'], 10, 4);
        add_action('woocommerce_new_order', [$this, 'handle_new_order'], 10, 1);
        add_action('woocommerce_checkout_order_processed', [$this, 'handle_checkout_completed'], 10, 1);
        
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
        $this->email_templates = [
            'order_confirmation' => [
                'subject' => 'Potwierdzenie zamówienia #{order_number} - FILLER',
                'template' => 'order-confirmation.php'
            ],
            'order_shipped' => [
                'subject' => 'Twoje zamówienie #{order_number} zostało wysłane - FILLER',
                'template' => 'order-shipped.php'
            ],
            'order_delivered' => [
                'subject' => 'Twoje zamówienie #{order_number} zostało dostarczone - FILLER',
                'template' => 'order-delivered.php'
            ],
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
        
        // Send order confirmation email
        $this->send_order_confirmation($order);
        
        // Log email sent
        $this->log_email_sent($order_id, 'order_confirmation', $order->get_billing_email());
    }
    
    /**
     * Handle checkout completed
     */
    public function handle_checkout_completed($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) return;
        
        // Send order confirmation email
        $this->send_order_confirmation($order);
        
        // Log email sent
        $this->log_email_sent($order_id, 'order_confirmation', $order->get_billing_email());
    }
    
    /**
     * Handle order status change
     */
    public function handle_order_status_change($order_id, $old_status, $new_status, $order) {
        switch ($new_status) {
            case 'processing':
                // Order is being processed
                break;
                
            case 'completed':
                // Order completed - send delivery confirmation
                $this->send_order_delivered($order);
                $this->log_email_sent($order_id, 'order_delivered', $order->get_billing_email());
                break;
                
            case 'shipped':
                // Order shipped - send shipping notification
                $this->send_order_shipped($order);
                $this->log_email_sent($order_id, 'order_shipped', $order->get_billing_email());
                break;
        }
    }
    
    /**
     * Send order confirmation email
     */
    public function send_order_confirmation($order) {
        $template_data = $this->prepare_order_template_data($order);
        $subject = $this->process_template_variables($this->email_templates['order_confirmation']['subject'], $template_data);
        
        $this->send_email(
            $order->get_billing_email(),
            $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
            $subject,
            $this->get_email_template('order_confirmation', $template_data)
        );
    }
    
    /**
     * Send order shipped email
     */
    public function send_order_shipped($order) {
        $template_data = $this->prepare_order_template_data($order);
        $subject = $this->process_template_variables($this->email_templates['order_shipped']['subject'], $template_data);
        
        $this->send_email(
            $order->get_billing_email(),
            $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
            $subject,
            $this->get_email_template('order_shipped', $template_data)
        );
    }
    
    /**
     * Send order delivered email
     */
    public function send_order_delivered($order) {
        $template_data = $this->prepare_order_template_data($order);
        $subject = $this->process_template_variables($this->email_templates['order_delivered']['subject'], $template_data);
        
        $this->send_email(
            $order->get_billing_email(),
            $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
            $subject,
            $this->get_email_template('order_delivered', $template_data)
        );
    }
    
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
        foreach ($variables as $key => $value) {
            $template = str_replace('{#' . $key . '}', $value, $template);
        }
        return $template;
    }
    
    /**
     * Send email using WordPress mail function
     */
    private function send_email($to, $to_name, $subject, $message) {
        $headers = [
            'Content-Type: text/html; charset=UTF-8',
            'From: FILLER <noreply@' . parse_url(get_site_url(), PHP_URL_HOST) . '>'
        ];
        
        $result = wp_mail($to, $subject, $message, $headers);
        
        if ($result) {
            error_log("King Email System: Email sent successfully to {$to}");
        } else {
            error_log("King Email System: Failed to send email to {$to}");
        }
        
        return $result;
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
    }
    
    /**
     * Check admin permissions
     */
    public function check_admin_permissions() {
        return current_user_can('manage_options');
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
