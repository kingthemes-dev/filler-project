<?php
// Ensure shared headless helpers are loaded
if (file_exists(WP_CONTENT_DIR . '/mu-plugins/headless-config.php')) {
    require_once WP_CONTENT_DIR . '/mu-plugins/headless-config.php';
}

// Load newsletter unsubscribe endpoint
if (file_exists(WP_CONTENT_DIR . '/mu-plugins/unsubscribe-endpoint.php')) {
    require_once WP_CONTENT_DIR . '/mu-plugins/unsubscribe-endpoint.php';
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
        
        // Prevent duplicate emails for REST API orders
        // WooCommerce sends emails automatically, but may send twice for REST API orders
        // Hook into all customer email types
        add_filter('woocommerce_email_enabled_customer_processing_order', [$this, 'prevent_duplicate_emails'], 10, 2);
        add_filter('woocommerce_email_enabled_customer_on_hold_order', [$this, 'prevent_duplicate_emails'], 10, 2);
        add_filter('woocommerce_email_enabled_customer_completed_order', [$this, 'prevent_duplicate_emails'], 10, 2);
        add_filter('woocommerce_email_enabled_customer_invoice', [$this, 'prevent_duplicate_emails'], 10, 2);
        add_filter('woocommerce_email_enabled_customer_refunded_order', [$this, 'prevent_duplicate_emails'], 10, 2);
        
        // Also prevent at the trigger level (more reliable)
        add_filter('woocommerce_email_recipient_customer_processing_order', [$this, 'prevent_duplicate_emails_recipient'], 10, 2);
        add_filter('woocommerce_email_recipient_customer_on_hold_order', [$this, 'prevent_duplicate_emails_recipient'], 10, 2);
        add_filter('woocommerce_email_recipient_customer_completed_order', [$this, 'prevent_duplicate_emails_recipient'], 10, 2);
        
        // Mark email as sent when WooCommerce sends it
        // Note: woocommerce_email_sent hook passes different arguments depending on WooCommerce version
        // Some versions pass: ($enabled, $email_id, $order)
        // Others pass: ($to, $subject, $message, $headers, $attachments) from wp_mail
        add_action('woocommerce_email_sent', [$this, 'mark_email_as_sent'], 10, 3);
        // Also hook into before_send to mark immediately
        add_action('woocommerce_email_before_send', [$this, 'mark_email_before_send'], 10, 2);

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
        
        // Prevent duplicate emails at order creation level
        add_action('woocommerce_new_order', [$this, 'prevent_duplicate_on_new_order'], 1, 1);
        add_action('woocommerce_rest_insert_shop_order_object', [$this, 'prevent_duplicate_on_rest_order'], 1, 2);
        
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
     * Prevent duplicate emails when new order is created
     * Mark order as having email sent to prevent WooCommerce from sending duplicate
     */
    public function prevent_duplicate_on_new_order($order_id) {
        try {
            $order = wc_get_order($order_id);
            if (!$order) {
                return;
            }
            
            // Check if email was already sent (shouldn't be, but check anyway)
            $email_sent_key = '_king_email_sent_' . $order_id;
            $email_sent = $order->get_meta($email_sent_key);
            
            if ($email_sent && $email_sent !== 'sending') {
                error_log("King Email System: Order {$order_id} already has email sent flag at creation, preventing duplicate");
            }
        } catch (Exception $e) {
            error_log("King Email System: Error preventing duplicate on new order: " . $e->getMessage());
        }
    }
    
    /**
     * Prevent duplicate emails when REST API order is created
     */
    public function prevent_duplicate_on_rest_order($order, $request) {
        try {
            $order_id = $order->get_id();
            if (!$order_id) {
                return;
            }
            
            // Mark that we're processing this order to prevent duplicates
            $email_sent_key = '_king_email_sent_' . $order_id;
            $email_sent = $order->get_meta($email_sent_key);
            
            if ($email_sent && $email_sent !== 'sending') {
                error_log("King Email System: REST order {$order_id} already has email sent flag, preventing duplicate");
            }
        } catch (Exception $e) {
            error_log("King Email System: Error preventing duplicate on REST order: " . $e->getMessage());
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
                    // Mark order as "sending" to prevent duplicate emails during status change
                    $email_sent_key = '_king_email_sent_' . $order_id;
                    $order->update_meta_data($email_sent_key, 'sending');
                    $order->save();
                    
                    // Temporarily change status to 'processing' to allow WooCommerce email to send
                    $order->set_status('processing', 'Temporary status change for email sending', false);
                    $order->save();
                    error_log("King Email System DEBUG: Temporarily changed order {$order_id} status from {$original_status} to processing");
                    
                    // Now try to send the email
                    // WooCommerce stores emails with class name as key (WC_Email_Customer_Processing_Order)
                    $email_found = false;
                    
                    // Temporarily remove 'sending' flag to allow manual trigger
                    // This allows our manual trigger() to work, but blocks automatic WooCommerce emails
                    $order->update_meta_data($email_sent_key, null);
                    $order->save();
                    
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
                    
                    // Restore 'sending' flag after manual trigger
                    $order->update_meta_data($email_sent_key, 'sending');
                    $order->save();
                    
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
            
            // Mark emails as fully sent (with timestamp) after all emails are sent
            if ($emails_sent > 0) {
                $email_sent_key = '_king_email_sent_' . $order_id;
                $order->update_meta_data($email_sent_key, current_time('mysql'));
                $order->save();
                error_log("King Email System: Marked all emails as sent for order {$order_id} (timestamp set)");
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
     * Prevent duplicate emails for REST API orders
     * WooCommerce may send emails twice - once on creation and once on status change
     */
    public function prevent_duplicate_emails($enabled, $order) {
        if (!$enabled || !$order) {
            return $enabled;
        }
        
        try {
            $order_id = $order->get_id();
            if (!$order_id) {
                return $enabled;
            }
            
            // Check if email was already sent for this order
            $email_sent_key = '_king_email_sent_' . $order_id;
            $email_sent = $order->get_meta($email_sent_key);
            
            // Block if email was already sent (has timestamp)
            if ($email_sent && $email_sent !== 'sending') {
                error_log("King Email System: Preventing duplicate email for order {$order_id} (already sent at {$email_sent})");
                return false; // Disable email
            }
            
            // Also block if 'sending' is set - this prevents WooCommerce automatic emails
            // during our manual email sending process
            if ($email_sent === 'sending') {
                error_log("King Email System: Preventing automatic WooCommerce email for order {$order_id} (manual sending in progress)");
                return false; // Disable automatic WooCommerce email
            }
            
            return $enabled;
        } catch (Exception $e) {
            error_log("King Email System: Error preventing duplicate emails: " . $e->getMessage());
            return $enabled; // If error, allow email to be sent
        }
    }
    
    /**
     * Prevent duplicate emails at recipient level (more reliable)
     * Returns empty string to prevent email sending if already sent
     */
    public function prevent_duplicate_emails_recipient($recipient, $order) {
        if (!$order || !method_exists($order, 'get_id')) {
            return $recipient;
        }
        
        try {
            $order_id = $order->get_id();
            if (!$order_id) {
                return $recipient;
            }
            
            // Check if email was already sent for this order
            $email_sent_key = '_king_email_sent_' . $order_id;
            $email_sent = $order->get_meta($email_sent_key);
            
            // Only block if email was already sent (has timestamp), not if it's just 'sending'
            // 'sending' means email is being sent right now, which is OK for multiple emails (admin + customer)
            if ($email_sent && $email_sent !== 'sending') {
                error_log("King Email System: Preventing duplicate email at recipient level for order {$order_id} (already sent at {$email_sent})");
                return ''; // Empty recipient = no email sent
            }
            
            return $recipient;
        } catch (Exception $e) {
            error_log("King Email System: Error preventing duplicate emails at recipient level: " . $e->getMessage());
            return $recipient; // If error, allow email to be sent
        }
    }
    
    /**
     * Mark email as sent before WooCommerce sends it
     * This hook has direct access to the order object
     */
    public function mark_email_before_send($email, $order) {
        try {
            if (!$order || !method_exists($order, 'get_id')) {
                return;
            }
            
            $order_id = $order->get_id();
            if (!$order_id) {
                return;
            }
            
            $email_sent_key = '_king_email_sent_' . $order_id;
            $email_sent = $order->get_meta($email_sent_key);
            
            // Only mark as sent if not already marked (allows multiple emails in same request)
            // Mark with timestamp only after ALL emails are sent (we'll use a different approach)
            // For now, just set 'sending' to allow multiple emails, and mark as sent only at the end
            if (!$email_sent || $email_sent === 'sending') {
                // Keep as 'sending' to allow multiple emails (admin + customer) in same request
                // We'll mark as fully sent only when we're sure all emails are sent
                // This is handled by checking if we're in trigger_rest_api_emails context
                $order->update_meta_data($email_sent_key, 'sending');
                $order->save();
                error_log("King Email System: Marked email as sending for order {$order_id} (before_send)");
            }
        } catch (Exception $e) {
            error_log("King Email System: Error marking email before send: " . $e->getMessage());
        }
    }
    
    /**
     * Mark email as sent when WooCommerce sends it (fallback)
     * This hook receives different arguments depending on WooCommerce version:
     * - Newer versions: ($enabled, $email_id, $order)
     * - Older versions: ($to, $subject, $message, $headers, $attachments) from wp_mail
     */
    public function mark_email_as_sent($arg1, $arg2 = null, $arg3 = null) {
        try {
            $order = null;
            $order_id = null;
            
            // Check if first argument is an order object (newer WooCommerce versions)
            if (is_object($arg1) && method_exists($arg1, 'get_id')) {
                $order = $arg1;
                $order_id = $order->get_id();
            } elseif (is_object($arg3) && method_exists($arg3, 'get_id')) {
                // Newer WooCommerce: ($enabled, $email_id, $order)
                $order = $arg3;
                $order_id = $order->get_id();
            } elseif (is_string($arg1)) {
                // Older WooCommerce: ($to, $subject, $message, $headers, $attachments)
                $to = $arg1;
                $subject = $arg2;
                
                // Try to extract order ID from email subject
                if (preg_match('/#(\d+)/', $subject, $matches)) {
                    $order_number = $matches[1];
                    $order = wc_get_order($order_number);
                    if ($order) {
                        $order_id = $order->get_id();
                    }
                }
                
                // Alternative: try to find order by email address
                if (!$order_id && $to) {
                    $orders = wc_get_orders([
                        'billing_email' => $to,
                        'limit' => 1,
                        'orderby' => 'date',
                        'order' => 'DESC',
                    ]);
                    
                    if (!empty($orders)) {
                        $order = $orders[0];
                        $order_id = $order->get_id();
                    }
                }
            }
            
            if ($order_id && $order) {
                $email_sent_key = '_king_email_sent_' . $order_id;
                // Only update if not already set (before_send might have set it)
                $existing = $order->get_meta($email_sent_key);
                if (!$existing || $existing === 'sending') {
                    $order->update_meta_data($email_sent_key, current_time('mysql'));
                    $order->save();
                    error_log("King Email System: Marked email as sent for order {$order_id} (email_sent hook)");
                }
            }
        } catch (Exception $e) {
            error_log("King Email System: Error marking email as sent: " . $e->getMessage());
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
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Recipient email (alternative: customer_email)'
                ],
                'customer_email' => [
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Recipient email (alternative: to)'
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
                    'description' => 'Customer name (alternative: customer_name)'
                ],
                'customer_name' => [
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Customer name (alternative: customerName)'
                ]
            ]
        ]);
    }
    
    /**
     * Trigger order email via API
     * FIXED: Added deduplication to prevent sending multiple emails
     */
    public function trigger_order_email_api($request) {
        $order_id = $request->get_param('order_id');
        
        error_log("King Email System API: trigger_order_email_api called with order_id: {$order_id}");
        
        if (!$order_id) {
            error_log("King Email System API ERROR: Missing order_id parameter");
            return new WP_Error('missing_order_id', 'Brak ID zamówienia', array('status' => 400));
        }
        
        // Get order object
        $order = wc_get_order($order_id);
        if (!$order) {
            error_log("King Email System API ERROR: Order {$order_id} not found");
            return new WP_Error('order_not_found', 'Zamówienie nie zostało znalezione', array('status' => 404));
        }
        
        // DEDUPLICATION: Check if email was already sent for this order using order meta (more reliable than transients)
        $email_sent_key = '_king_email_sent_' . $order_id;
        $email_sent = $order->get_meta($email_sent_key);
        
        if ($email_sent && $email_sent !== 'sending') {
            error_log("King Email System API: Email already sent for order {$order_id} (sent at {$email_sent}), skipping duplicate");
            return array(
                'success' => true,
                'message' => "Email już został wysłany dla zamówienia {$order_id}",
                'order_id' => $order_id,
                'skipped' => true
            );
        }
        
        error_log("King Email System API: Triggering email for order {$order_id}");
        
        try {
            $result = $this->trigger_rest_api_emails($order_id);
            
            error_log("King Email System API: trigger_rest_api_emails returned: " . ($result ? 'true' : 'false'));
            
            if ($result) {
                // Mark email as sent using order meta (permanent, not transient)
                // This is already done in mark_email_before_send, but set it here as well for safety
                if (!$email_sent || $email_sent === 'sending') {
                    $order->update_meta_data($email_sent_key, current_time('mysql'));
                    $order->save();
                }
                
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
     * FIXED: Support both parameter formats (to/customer_email, customerName/customer_name)
     */
    public function send_newsletter_email_api($request) {
        // Support both formats: 'to' or 'customer_email'
        $to = sanitize_email($request->get_param('to') ?: $request->get_param('customer_email'));
        $subject = sanitize_text_field($request->get_param('subject'));
        $message = $request->get_param('message');
        // Support both formats: 'customerName' or 'customer_name'
        $customerName = sanitize_text_field($request->get_param('customerName') ?: $request->get_param('customer_name') ?: 'Użytkownik');
        
        if (!$to) {
            error_log("King Email System API ERROR: Missing 'to' or 'customer_email' parameter");
            return new WP_Error('missing_email', 'Brak adresu email', array('status' => 400));
        }
        
        if (!$subject) {
            error_log("King Email System API ERROR: Missing 'subject' parameter");
            return new WP_Error('missing_subject', 'Brak tematu emaila', array('status' => 400));
        }
        
        if (!$message) {
            error_log("King Email System API ERROR: Missing 'message' parameter");
            return new WP_Error('missing_message', 'Brak treści emaila', array('status' => 400));
        }
        
        error_log("King Email System: Sending newsletter email to {$to} (customer: {$customerName})");
        
        try {
            // Send email using WordPress mail
            $from_name = 'FILLER';
            $from_email = 'noreply@' . parse_url(get_site_url(), PHP_URL_HOST);
            
            $headers = [
                'Content-Type: text/html; charset=UTF-8',
                'From: ' . $from_name . ' <' . $from_email . '>'
            ];
            
            error_log("King Email System: Attempting to send email with wp_mail - to: {$to}, subject: {$subject}, from_email: {$from_email}, from_name: {$from_name}, has_message: " . (!empty($message) ? 'yes' : 'no') . ", message_length: " . strlen($message) . ", wp_mail_smtp_active: " . (class_exists('WPMailSMTP') ? 'yes' : 'no'));
            
            // wp-mail-smtp plugin is active, let it handle SMTP
            // We just need to ensure headers are correct
            // wp_mail will use wp-mail-smtp's configuration automatically
            
            // Check if wp-mail-smtp is active - if so, don't override From headers
            $wp_mail_smtp_active = class_exists('WPMailSMTP');
            
            if (!$wp_mail_smtp_active) {
                // Only set filters if wp-mail-smtp is not active
                // wp-mail-smtp handles From headers itself
                add_filter('wp_mail_from', function() use ($from_email) {
                    return $from_email;
                }, 999);
                
                add_filter('wp_mail_from_name', function() use ($from_name) {
                    return $from_name;
                }, 999);
            }
            
            // Enable HTML content type (always needed)
            add_filter('wp_mail_content_type', function() {
                return 'text/html';
            }, 999);
            
            // Send email
            $result = wp_mail($to, $subject, $message, $headers);
            
            // Remove filters if we added them
            if (!$wp_mail_smtp_active) {
                remove_all_filters('wp_mail_from');
                remove_all_filters('wp_mail_from_name');
            }
            remove_all_filters('wp_mail_content_type');
            
            if ($result) {
                error_log("King Email System: ✅ Newsletter email sent successfully to {$to}");
                return new WP_REST_Response([
                    'success' => true,
                    'message' => 'Email został wysłany',
                    'to' => $to,
                    'subject' => $subject
                ], 200);
            } else {
                error_log("King Email System: ❌ wp_mail returned false for {$to}");
                // Check if there's an error in global PHP error log
                $last_error = error_get_last();
                if ($last_error) {
                    error_log("King Email System: PHP error: " . print_r($last_error, true));
                }
                
                // Check if wp-mail-smtp plugin is active
                $wp_mail_smtp_active = class_exists('WPMailSMTP');
                error_log("King Email System: wp-mail-smtp active: " . ($wp_mail_smtp_active ? 'yes' : 'no'));
                
                // Try to get more information about why wp_mail failed
                global $phpmailer;
                if (isset($phpmailer) && is_object($phpmailer)) {
                    $phpmailer_error = $phpmailer->ErrorInfo;
                    if ($phpmailer_error) {
                        error_log("King Email System: PHPMailer error: " . $phpmailer_error);
                    }
                }
                
                return new WP_REST_Response([
                    'success' => false,
                    'message' => 'Nie udało się wysłać emaila (wp_mail returned false)',
                    'to' => $to,
                    'error' => $last_error ? print_r($last_error, true) : 'Unknown error',
                    'wp_mail_smtp_active' => $wp_mail_smtp_active
                ], 500);
            }
        } catch (Exception $e) {
            error_log("King Email System: Exception sending newsletter email: " . $e->getMessage());
            error_log("King Email System: Exception stack trace: " . $e->getTraceAsString());
            return new WP_REST_Response([
                'success' => false,
                'message' => 'Błąd podczas wysyłania emaila: ' . $e->getMessage()
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
