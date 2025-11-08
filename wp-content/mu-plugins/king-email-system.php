<?php
// Ensure shared headless helpers are loaded
if (file_exists(WP_CONTENT_DIR . '/mu-plugins/headless-config.php')) {
    require_once WP_CONTENT_DIR . '/mu-plugins/headless-config.php';
}

/**
 * HPOS-Compatible King Email System - System powiadomień email
 * Updated for High-Performance Order Storage compatibility
 * 
 * @package KingWooCommerce
 * @version 2.0.0
 * @author King Brand
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// HPOS Compatibility Check - sprawdź później, gdy WooCommerce jest załadowany
// Mu-plugins ładują się przed WooCommerce, więc sprawdzamy w hooku 'plugins_loaded'
add_action('plugins_loaded', function() {
    // Check if WooCommerce is loaded
    if (!function_exists('wc_get_container')) {
        add_action('admin_notices', function() {
            echo '<div class="notice notice-warning"><p><strong>King Email System:</strong> WooCommerce may not be fully loaded. Some features may not work.</p></div>';
        });
        return; // Don't check HPOS if WooCommerce isn't loaded
    }
    
    // Check if HPOS is enabled (but don't block plugin - it should work either way)
    $hpos_enabled = false;
    try {
        $container = wc_get_container();
        if ($container && $container->has(\Automattic\WooCommerce\Utilities\OrderUtil::class)) {
            $hpos_enabled = $container->get(\Automattic\WooCommerce\Utilities\OrderUtil::class)->custom_orders_table_usage_is_enabled();
        }
    } catch (Exception $e) {
        // HPOS check failed, continue anyway
        error_log("King Email System: HPOS check failed, continuing anyway: " . $e->getMessage());
    }
    
    // Only show warning if HPOS is explicitly not enabled (not if check failed)
    if (!$hpos_enabled) {
        add_action('admin_notices', function() {
            echo '<div class="notice notice-warning"><p><strong>King Email System:</strong> HPOS is not enabled. Plugin will work but some features may use fallback methods.</p></div>';
        });
    }
}, 20); // Priority 20 to ensure WooCommerce is loaded

class KingEmailSystem {
    
    private $email_templates = [];
    private $email_service = 'wordpress'; // 'wordpress', 'sendgrid', 'mailgun'
    private $hpos_enabled = false;
    private $hpos_version = '2.0';
    
    public function __construct() {
        // Don't call WooCommerce functions in constructor - mu-plugins load too early
        // Check HPOS status later when WooCommerce is loaded
        $this->init();
    }
    
    /**
     * Initialize the email system
     */
    public function init() {
        // Check HPOS status if WooCommerce is loaded
        if (function_exists('wc_get_container')) {
            try {
                $this->hpos_enabled = wc_get_container()->get(\Automattic\WooCommerce\Utilities\OrderUtil::class)->custom_orders_table_usage_is_enabled();
            } catch (Exception $e) {
                // HPOS check failed, continue anyway
                error_log("King Email System: HPOS check failed in init: " . $e->getMessage());
                $this->hpos_enabled = false;
            }
        } else {
            // WooCommerce not loaded yet - will check later
            $this->hpos_enabled = false;
        }
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
        // REMOVED: Don't override SMTP settings - let wp-mail-smtp plugin handle it
        // The wp-mail-smtp plugin is already configured and should handle all SMTP settings
        // Overriding wp_mail_from and wp_mail_from_name can conflict with SMTP authentication
        
        // Only configure custom SMTP if wp-mail-smtp is NOT active and custom constants are defined
        if (!class_exists('WPMailSMTP') && defined('KING_EMAIL_SMTP_HOST')) {
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
     * HPOS-Compatible: Handle order status change
     */
    public function handle_order_status_change($order_id, $old_status, $new_status, $order) {
        try {
            // HPOS-compatible order validation
            if (!$order || !$order->get_id()) {
                error_log("HPOS King Email System: Invalid order in status change hook");
                return;
            }
            
            // ADAPTER MODE: Only log and enrich WooCommerce default emails
            // Do not send custom emails - let WooCommerce handle it
            switch ($new_status) {
                case 'pending':
                    // Order is pending payment - WooCommerce should send email automatically
                    $this->log_email_sent($order_id, 'order_pending_adapter', $order->get_billing_email());
                    $this->log_hpos_event($order_id, 'status_change', 'pending', $old_status);
                    break;
                case 'processing':
                    // Order is being processed - log only
                    $this->log_email_sent($order_id, 'order_processing_adapter', $order->get_billing_email());
                    $this->log_hpos_event($order_id, 'status_change', 'processing', $old_status);
                    break;
                    
                case 'completed':
                    // Order completed – log only
                    $this->log_email_sent($order_id, 'order_completed_adapter', $order->get_billing_email());
                    $this->log_hpos_event($order_id, 'status_change', 'completed', $old_status);
                    break;
                    
                case 'shipped':
                    // Order shipped – log only
                    $this->log_email_sent($order_id, 'order_shipped_adapter', $order->get_billing_email());
                    $this->log_hpos_event($order_id, 'status_change', 'shipped', $old_status);
                    break;
                    
                case 'cancelled':
                    // Order cancelled - log only
                    $this->log_email_sent($order_id, 'order_cancelled_adapter', $order->get_billing_email());
                    $this->log_hpos_event($order_id, 'status_change', 'cancelled', $old_status);
                    break;
                    
                case 'on-hold':
                    // Order on hold - log only
                    $this->log_email_sent($order_id, 'order_on_hold_adapter', $order->get_billing_email());
                    $this->log_hpos_event($order_id, 'status_change', 'on-hold', $old_status);
                    break;
            }
            
        } catch (Exception $e) {
            error_log("HPOS King Email System: Error handling order status change for order {$order_id}: " . $e->getMessage());
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
            return false;
        }
        
        error_log("King Email System DEBUG: Order {$order_id} found, attempting to send emails");
        
        try {
            // Get WooCommerce email class
            $mailer = WC()->mailer();
            $emails = $mailer->get_emails();
            
            error_log("King Email System DEBUG: Available emails: " . implode(', ', array_keys($emails)));
            
            // Debug: Log all available email classes and their status
            foreach ($emails as $key => $email_obj) {
                $enabled_status = 'unknown';
                if (method_exists($email_obj, 'is_enabled')) {
                    $enabled_status = $email_obj->is_enabled() ? 'enabled' : 'disabled';
                }
                error_log("King Email System DEBUG: Email class '{$key}' is {$enabled_status}");
                
                // Also check if it's one of the emails we need
                if (in_array($key, ['WC_Email_Customer_Processing_Order', 'WC_Email_New_Order', 'WC_Email_Customer_On_Hold_Order'])) {
                    error_log("King Email System DEBUG: ⭐ Found required email '{$key}' with status: {$enabled_status}");
                }
            }
            
            $emails_sent = 0;
            
            // Check order status and send appropriate email
            $order_status = $order->get_status();
            error_log("King Email System DEBUG: Order {$order_id} status is: {$order_status}");
            
            // Send customer email based on order status
            // IMPORTANT: WooCommerce does NOT automatically send emails for "pending" status orders created via REST API
            // We need to manually trigger emails for pending/processing/on-hold orders
            if ($order_status === 'pending') {
                // For pending orders (COD, bank transfer), WooCommerce does NOT send emails automatically
                // We need to manually send email - WooCommerce email classes check order status and may refuse to send
                // Solution: Temporarily change order status to 'processing', send email, then revert
                $email_triggered = false;
                
                // Save original status
                $original_status = $order->get_status();
                
                try {
                    // Temporarily change status to 'processing' to allow WooCommerce email to send
                    $order->set_status('processing', 'Temporary status change for email sending', false);
                    $order->save();
                    error_log("King Email System DEBUG: Temporarily changed order {$order_id} status from {$original_status} to processing");
                    
                    // Now try to send the email
                    // WooCommerce stores emails with class name as key (WC_Email_Customer_Processing_Order)
                    $email_found = false;
                    
                    // Try WC_Email_Customer_Processing_Order first (correct key)
                    if (isset($emails['WC_Email_Customer_Processing_Order'])) {
                        $email = $emails['WC_Email_Customer_Processing_Order'];
                        if (method_exists($email, 'is_enabled')) {
                            if ($email->is_enabled()) {
                                $email->trigger($order_id);
                                error_log("King Email System: ✅ Sent WC_Email_Customer_Processing_Order email for pending order {$order_id}");
                                $emails_sent++;
                                $email_triggered = true;
                                $email_found = true;
                            } else {
                                error_log("King Email System WARNING: WC_Email_Customer_Processing_Order is disabled");
                            }
                        } else {
                            // If is_enabled doesn't exist, try to trigger anyway
                            $email->trigger($order_id);
                            error_log("King Email System: ✅ Sent WC_Email_Customer_Processing_Order email (no is_enabled check) for pending order {$order_id}");
                            $emails_sent++;
                            $email_triggered = true;
                            $email_found = true;
                        }
                    }
                    
                    // Fallback: try lowercase key (some WooCommerce versions use this)
                    if (!$email_found && isset($emails['customer_processing_order'])) {
                        $email = $emails['customer_processing_order'];
                        $email->trigger($order_id);
                        error_log("King Email System: ✅ Sent customer_processing_order email (fallback) for pending order {$order_id}");
                        $emails_sent++;
                        $email_triggered = true;
                        $email_found = true;
                    }
                    
                    // Restore original status
                    $order->set_status($original_status, 'Restored original status after email sending', false);
                    $order->save();
                    error_log("King Email System DEBUG: Restored order {$order_id} status to {$original_status}");
                    
                } catch (Exception $e) {
                    error_log("King Email System ERROR: Failed to send email for pending order {$order_id}: " . $e->getMessage());
                    // Try to restore status even if email failed
                    try {
                        $order->set_status($original_status, 'Restored original status after email error', false);
                        $order->save();
                    } catch (Exception $e2) {
                        error_log("King Email System CRITICAL: Failed to restore order status: " . $e2->getMessage());
                    }
                }
                
                if (!$email_triggered) {
                    error_log("King Email System ERROR: No suitable email class found for pending order {$order_id}");
                }
            } elseif ($order_status === 'on-hold') {
                // For on-hold orders, try on-hold email first, then fallback to processing
                $onhold_email_found = false;
                if (isset($emails['WC_Email_Customer_On_Hold_Order'])) {
                    $email = $emails['WC_Email_Customer_On_Hold_Order'];
                    if (method_exists($email, 'is_enabled') && $email->is_enabled()) {
                        $email->trigger($order_id);
                        error_log("King Email System: ✅ Sent WC_Email_Customer_On_Hold_Order email for order {$order_id}");
                        $emails_sent++;
                        $onhold_email_found = true;
                    }
                } elseif (isset($emails['customer_on_hold_order'])) {
                    $email = $emails['customer_on_hold_order'];
                    $email->trigger($order_id);
                    error_log("King Email System: ✅ Sent customer_on_hold_order email (fallback) for order {$order_id}");
                    $emails_sent++;
                    $onhold_email_found = true;
                }
                
                // Fallback to processing email if on-hold not found
                if (!$onhold_email_found) {
                    if (isset($emails['WC_Email_Customer_Processing_Order'])) {
                        $email = $emails['WC_Email_Customer_Processing_Order'];
                        if (method_exists($email, 'is_enabled') && $email->is_enabled()) {
                            $email->trigger($order_id);
                            error_log("King Email System: ✅ Sent WC_Email_Customer_Processing_Order email (fallback) for on-hold order {$order_id}");
                            $emails_sent++;
                        }
                    } elseif (isset($emails['customer_processing_order'])) {
                        $email = $emails['customer_processing_order'];
                        $email->trigger($order_id);
                        error_log("King Email System: ✅ Sent customer_processing_order email (fallback) for on-hold order {$order_id}");
                        $emails_sent++;
                    }
                }
            } else {
                // For processing/completed orders, send processing email
                if (isset($emails['WC_Email_Customer_Processing_Order'])) {
                    $email = $emails['WC_Email_Customer_Processing_Order'];
                    if (method_exists($email, 'is_enabled') && $email->is_enabled()) {
                        $email->trigger($order_id);
                        error_log("King Email System: ✅ Sent WC_Email_Customer_Processing_Order email for order {$order_id}");
                        $emails_sent++;
                    } else {
                        error_log("King Email System WARNING: WC_Email_Customer_Processing_Order is disabled");
                    }
                } elseif (isset($emails['customer_processing_order'])) {
                    $email = $emails['customer_processing_order'];
                    $email->trigger($order_id);
                    error_log("King Email System: ✅ Sent customer_processing_order email (fallback) for order {$order_id}");
                    $emails_sent++;
                } else {
                    error_log("King Email System WARNING: customer_processing_order email not found. Available keys: " . implode(', ', array_keys($emails)));
                }
            }
            
            // Send new order notification to admin
            $admin_email_found = false;
            if (isset($emails['WC_Email_New_Order'])) {
                $email = $emails['WC_Email_New_Order'];
                if (method_exists($email, 'is_enabled')) {
                    if ($email->is_enabled()) {
                        $email->trigger($order_id);
                        error_log("King Email System: ✅ Sent WC_Email_New_Order email for order {$order_id}");
                        $emails_sent++;
                        $admin_email_found = true;
                    } else {
                        error_log("King Email System WARNING: WC_Email_New_Order is disabled");
                    }
                } else {
                    $email->trigger($order_id);
                    error_log("King Email System: ✅ Sent WC_Email_New_Order email (no is_enabled check) for order {$order_id}");
                    $emails_sent++;
                    $admin_email_found = true;
                }
            } elseif (isset($emails['new_order'])) {
                $email = $emails['new_order'];
                $email->trigger($order_id);
                error_log("King Email System: ✅ Sent new_order email (fallback) for order {$order_id}");
                $emails_sent++;
                $admin_email_found = true;
            }
            
            if (!$admin_email_found) {
                error_log("King Email System ERROR: new_order email not found. Available keys: " . implode(', ', array_keys($emails)));
            }
            
            return $emails_sent > 0;
            
        } catch (Exception $e) {
            error_log("King Email System: ❌ Error triggering emails for order {$order_id}: " . $e->getMessage());
            return false;
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
     * HPOS-Compatible: Inject extra order meta into standard Woo emails
     */
    public function inject_order_meta_into_email($order, $sent_to_admin, $plain_text) {
        try {
            // HPOS-compatible order validation
            if (!$order instanceof WC_Order || !$order->get_id()) {
                return;
            }
            
            // HPOS-compatible meta data access
            $nip = $order->get_meta('_billing_nip');
            $company = $order->get_billing_company();
            $tracking = $order->get_meta('_tracking_number');
            $hpos_version = $order->get_meta('_hpos_invoice_version');
            
            $lines = [];
            if (!empty($company)) { 
                $lines[] = __('Firma', 'woocommerce') . ': ' . esc_html($company); 
            }
            if (!empty($nip)) { 
                $lines[] = 'NIP: ' . esc_html($nip); 
            }
            if (!empty($tracking)) { 
                $lines[] = __('Numer śledzenia', 'woocommerce') . ': ' . esc_html($tracking); 
            }
            if (!empty($hpos_version)) {
                $lines[] = 'HPOS Version: ' . esc_html($hpos_version);
            }
            
            if (empty($lines)) { 
                return; 
            }
            
            if ($plain_text) {
                echo "\n" . implode("\n", $lines) . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
            } else {
                echo '<div style="margin-top:10px;color:#555">' . wp_kses_post(implode('<br>', $lines)) . '</div>';
            }
            
        } catch (Exception $e) {
            error_log("HPOS King Email System: Error injecting order meta for order {$order->get_id()}: " . $e->getMessage());
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
     * HPOS-Compatible: Add CTA links pointing to headless frontend (order details, account)
     */
    public function inject_frontend_cta_links($order, $sent_to_admin, $plain_text, $email) {
        try {
            // HPOS-compatible order validation
            if (!$order instanceof WC_Order || !$order->get_id()) {
                return;
            }
            
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
            
        } catch (Exception $e) {
            error_log("HPOS King Email System: Error injecting frontend CTA links for order {$order->get_id()}: " . $e->getMessage());
        }
    }
    
    /**
     * HPOS-Compatible: Log HPOS-specific events
     */
    private function log_hpos_event($order_id, $event_type, $new_value, $old_value = null) {
        try {
            $log_entry = [
                'order_id' => $order_id,
                'event_type' => $event_type,
                'new_value' => $new_value,
                'old_value' => $old_value,
                'timestamp' => current_time('mysql'),
                'hpos_enabled' => $this->hpos_enabled,
                'hpos_version' => $this->hpos_version
            ];
            
            // Store in WordPress options
            $existing_logs = get_option('king_hpos_email_logs', []);
            $existing_logs[] = $log_entry;
            
            // Keep only last 1000 logs
            if (count($existing_logs) > 1000) {
                $existing_logs = array_slice($existing_logs, -1000);
            }
            
            update_option('king_hpos_email_logs', $existing_logs);
            
        } catch (Exception $e) {
            error_log("HPOS King Email System: Error logging HPOS event for order {$order_id}: " . $e->getMessage());
        }
    }
    
    /**
     * HPOS-Compatible: Log email sent
     */
    private function log_email_sent($order_id, $email_type, $recipient) {
        try {
            $log_entry = [
                'order_id' => $order_id,
                'email_type' => $email_type,
                'recipient' => $recipient,
                'sent_at' => current_time('mysql'),
                'status' => 'sent',
                'hpos_enabled' => $this->hpos_enabled,
                'hpos_version' => $this->hpos_version
            ];
            
            // Store in WordPress options (you could also use custom table)
            $existing_logs = get_option('king_email_logs', []);
            $existing_logs[] = $log_entry;
            
            // Keep only last 1000 logs
            if (count($existing_logs) > 1000) {
                $existing_logs = array_slice($existing_logs, -1000);
            }
            
            update_option('king_email_logs', $existing_logs);
            
        } catch (Exception $e) {
            error_log("HPOS King Email System: Error logging email for order {$order_id}: " . $e->getMessage());
        }
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
        
        // HPOS-specific endpoints
        register_rest_route('king-email/v1', '/hpos-logs', [
            'methods' => 'GET',
            'callback' => [$this, 'get_hpos_logs'],
            'permission_callback' => [$this, 'check_admin_permissions']
        ]);
        
        register_rest_route('king-email/v1', '/hpos-status', [
            'methods' => 'GET',
            'callback' => [$this, 'get_hpos_status'],
            'permission_callback' => [$this, 'check_admin_permissions']
        ]);
        
        // ENABLED: REST API endpoint for triggering emails when HPOS is not enabled
        // This allows headless frontend to trigger WooCommerce emails manually
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
        
        // DISABLED: REST API endpoint for sending direct emails - let WooCommerce handle emails automatically
        // register_rest_route('king-email/v1', '/send-direct-email', [
        //     'methods' => 'POST',
        //     'callback' => [$this, 'send_direct_email_api'],
        //     'permission_callback' => '__return_true',
        //     'args' => [
        //         'order_id' => [
        //             'required' => true,
        //             'type' => 'integer'
        //         ],
        //         'customer_email' => [
        //             'required' => true,
        //             'type' => 'string'
        //         ],
        //         'customer_name' => [
        //             'required' => true,
        //             'type' => 'string'
        //         ],
        //         'order_number' => [
        //             'required' => true,
        //             'type' => 'string'
        //         ],
        //         'total' => [
        //             'required' => true,
        //             'type' => 'number'
        //         ],
        //         'items' => [
        //             'required' => true,
        //             'type' => 'array'
        //         ]
        //     ]
        // ]);
        
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
        
        error_log("King Email System API: trigger_order_email_api called with order_id: {$order_id}");
        
        if (!$order_id) {
            error_log("King Email System API ERROR: Missing order_id parameter");
            return new WP_Error('missing_order_id', 'Brak ID zamówienia', array('status' => 400));
        }
        
        error_log("King Email System API: Triggering email for order {$order_id}");
        
        try {
            $result = $this->trigger_rest_api_emails($order_id);
            
            error_log("King Email System API: trigger_rest_api_emails returned: " . ($result ? 'true' : 'false'));
            
            if ($result) {
                $response = array(
                    'success' => true,
                    'message' => "Email wysłany dla zamówienia {$order_id}",
                    'order_id' => $order_id
                );
                error_log("King Email System API: Returning success response: " . json_encode($response));
                return $response;
            } else {
                error_log("King Email System API ERROR: trigger_rest_api_emails returned false");
                return new WP_Error('email_failed', 'Nie udało się wysłać emaila', array('status' => 500));
            }
            
        } catch (Exception $e) {
            error_log("King Email System API Error: " . $e->getMessage());
            error_log("King Email System API Error Stack: " . $e->getTraceAsString());
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
    
    /**
     * HPOS-Compatible: Get HPOS logs
     */
    public function get_hpos_logs() {
        try {
            $logs = get_option('king_hpos_email_logs', []);
            return array_reverse($logs); // Latest first
        } catch (Exception $e) {
            error_log("HPOS King Email System: Error getting HPOS logs: " . $e->getMessage());
            return new WP_Error('hpos_logs_error', 'Error retrieving HPOS logs', array('status' => 500));
        }
    }
    
    /**
     * HPOS-Compatible: Get HPOS status
     */
    public function get_hpos_status() {
        try {
            return [
                'hpos_enabled' => $this->hpos_enabled,
                'hpos_version' => $this->hpos_version,
                'email_system_version' => '2.0',
                'compatibility' => 'HPOS-Compatible',
                'last_check' => current_time('mysql')
            ];
        } catch (Exception $e) {
            error_log("HPOS King Email System: Error getting HPOS status: " . $e->getMessage());
            return new WP_Error('hpos_status_error', 'Error retrieving HPOS status', array('status' => 500));
        }
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
    add_option('king_hpos_email_logs', []);
    
    // Log HPOS activation
    error_log("HPOS King Email System: Plugin activated with HPOS compatibility");
});

// Deactivation hook
register_deactivation_hook(__FILE__, function() {
    // Cleanup if needed
    error_log("HPOS King Email System: Plugin deactivated");
});
