<?php
/**
 * Plugin Name: King Webhooks
 * Description: WooCommerce webhooks configuration for headless integration
 * Version: 1.0.0
 * Author: King
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KingWebhooks {
    
    private static $instance = null;
    
    private $webhook_url;
    private $webhook_secret;
    private $table_name;
    private $max_retry_attempts = 3;
    private $db_version = '1.0.0';
    
    public function __construct() {
        global $wpdb;
        
        self::$instance = $this;
        
        $this->webhook_url = get_option('king_webhook_url', '');
        $this->webhook_secret = get_option('king_webhook_secret', '');
        $this->table_name = $wpdb->prefix . 'king_webhook_logs';
        
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('king_webhook_retry_event', array($this, 'process_retry_event'), 10, 1);
        add_action('admin_post_king_webhook_clear_logs', array($this, 'handle_clear_logs'));
    }
    
    public static function get_instance() {
        return self::$instance;
    }
    
    public function init() {
        $this->maybe_create_logs_table();
        
        // Register webhooks if configured
        if ($this->webhook_url && $this->webhook_secret) {
            $this->register_webhooks();
        }
        
        // Hook into WooCommerce webhook delivery lifecycle
        add_action('woocommerce_webhook_delivery', array($this, 'handle_webhook_delivery'), 10, 3);
        add_action('woocommerce_webhook_delivery_failed', array($this, 'handle_webhook_delivery_failed'), 10, 4);
    }
    
    /**
     * Register WooCommerce webhooks with HPOS compatibility
     */
    private function register_webhooks() {
        // Avoid duplicate registration within same request
        remove_action('woocommerce_webhook_delivery', array($this, 'handle_webhook_delivery'), 10);
        add_action('woocommerce_webhook_delivery', array($this, 'handle_webhook_delivery'), 10, 3);
        remove_action('woocommerce_webhook_delivery_failed', array($this, 'handle_webhook_delivery_failed'), 10);
        add_action('woocommerce_webhook_delivery_failed', array($this, 'handle_webhook_delivery_failed'), 10, 4);
        
        // Product webhooks
        $this->create_webhook('product.created', 'Product Created');
        $this->create_webhook('product.updated', 'Product Updated');
        $this->create_webhook('product.deleted', 'Product Deleted');
        
        // Order webhooks with HPOS support
        $this->create_webhook('order.created', 'Order Created');
        $this->create_webhook('order.updated', 'Order Updated');
        $this->create_webhook('order.deleted', 'Order Deleted');
        $this->create_webhook('order.status_changed', 'Order Status Changed');
        $this->create_webhook('order.payment_complete', 'Order Payment Complete');
        
        // Customer webhooks
        $this->create_webhook('customer.created', 'Customer Created');
        $this->create_webhook('customer.updated', 'Customer Updated');
        $this->create_webhook('customer.deleted', 'Customer Deleted');
        
        // Category webhooks
        $this->create_webhook('product_cat.created', 'Product Category Created');
        $this->create_webhook('product_cat.updated', 'Product Category Updated');
        $this->create_webhook('product_cat.deleted', 'Product Category Deleted');
        
        // HPOS-specific webhooks
        $this->create_webhook('order.refunded', 'Order Refunded');
        $this->create_webhook('order.note_added', 'Order Note Added');
    }
    
    /**
     * Create webhook with HPOS compatibility
     */
    private function create_webhook($topic, $name) {
        $webhook_id = 'king_' . str_replace('.', '_', $topic);
        
        // Check if webhook already exists
        $existing_webhook = get_posts(array(
            'post_type' => 'shop_webhook',
            'meta_key' => '_webhook_topic',
            'meta_value' => $topic,
            'posts_per_page' => 1,
        ));
        
        if (!empty($existing_webhook)) {
            return $existing_webhook[0]->ID;
        }
        
        // Create webhook with HPOS-specific settings
        $webhook_id = wp_insert_post(array(
            'post_type' => 'shop_webhook',
            'post_title' => $name,
            'post_status' => 'publish',
            'meta_input' => array(
                '_webhook_topic' => $topic,
                '_webhook_delivery_url' => $this->webhook_url,
                '_webhook_secret' => $this->webhook_secret,
                '_webhook_status' => 'active',
                '_webhook_version' => '2',
                '_webhook_api_version' => '3',
                '_webhook_hpos_enabled' => 'true', // HPOS compatibility flag
                '_webhook_delivery_timeout' => 30, // Increased timeout for HPOS
                '_webhook_retry_count' => 3, // Retry count for reliability
            ),
        ));
        
        return $webhook_id;
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_submenu_page(
            'woocommerce',
            'King Webhooks',
            'Webhooks',
            'manage_woocommerce',
            'king-webhooks',
            array($this, 'admin_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('king_webhooks', 'king_webhook_url');
        register_setting('king_webhooks', 'king_webhook_secret');
        
        if (isset($_POST['king_webhook_url'])) {
            $this->webhook_url = sanitize_text_field($_POST['king_webhook_url']);
        }
        if (isset($_POST['king_webhook_secret'])) {
            $this->webhook_secret = sanitize_text_field($_POST['king_webhook_secret']);
        }
        
        add_settings_section(
            'king_webhooks_section',
            'Webhook Configuration',
            array($this, 'settings_section_callback'),
            'king_webhooks'
        );
        
        add_settings_field(
            'king_webhook_url',
            'Webhook URL',
            array($this, 'webhook_url_callback'),
            'king_webhooks',
            'king_webhooks_section'
        );
        
        add_settings_field(
            'king_webhook_secret',
            'Webhook Secret',
            array($this, 'webhook_secret_callback'),
            'king_webhooks',
            'king_webhooks_section'
        );
    }
    
    /**
     * Settings section callback
     */
    public function settings_section_callback() {
        echo '<p>Configure webhooks for headless integration with Next.js frontend.</p>';
    }
    
    /**
     * Webhook URL callback
     */
    public function webhook_url_callback() {
        $value = get_option('king_webhook_url', '');
        echo '<input type="url" name="king_webhook_url" value="' . esc_attr($value) . '" class="regular-text" placeholder="https://your-domain.com/api/webhooks" />';
        echo '<p class="description">URL where webhooks will be sent (e.g., https://your-domain.com/api/webhooks)</p>';
    }
    
    /**
     * Webhook secret callback
     */
    public function webhook_secret_callback() {
        $value = get_option('king_webhook_secret', '');
        echo '<input type="password" name="king_webhook_secret" value="' . esc_attr($value) . '" class="regular-text" />';
        echo '<p class="description">Secret key for webhook authentication</p>';
    }
    
    /**
     * Admin page
     */
    public function admin_page() {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('Brak uprawnień.', 'king'));
        }
        
        if (!empty($_GET['king_webhook_cleared'])) {
            echo '<div class="notice notice-success"><p>' . esc_html__('Logi webhooków zostały usunięte.', 'king') . '</p></div>';
        }
        if (!empty($_GET['king_webhook_retry_scheduled'])) {
            echo '<div class="notice notice-info"><p>' . esc_html__('Zaplanowano ponowną próbę wysyłki webhooków.', 'king') . '</p></div>';
        }
        $test_nonce = wp_create_nonce('king_webhook_test');
        ?>
        <div class="wrap">
            <h1>King Webhooks</h1>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('king_webhooks');
                do_settings_sections('king_webhooks');
                submit_button();
                ?>
            </form>
            
            <h2>Active Webhooks</h2>
            <?php $this->display_webhooks(); ?>
            
            <h2><?php esc_html_e('Webhook Logs', 'king'); ?></h2>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="margin-bottom: 20px;">
                <?php wp_nonce_field('king_webhook_clear_logs'); ?>
                <input type="hidden" name="action" value="king_webhook_clear_logs" />
                <?php submit_button(__('Wyczyść logi', 'king'), 'delete', 'king_clear_webhook_logs', false); ?>
            </form>
            <?php $this->display_logs(); ?>
            
            <h2>Test Webhook</h2>
            <p>
                <button type="button" class="button" onclick="testWebhook()">Test Webhook</button>
                <span id="webhook-test-result"></span>
            </p>
            
            <script>
            function testWebhook() {
                const result = document.getElementById('webhook-test-result');
                result.innerHTML = 'Testing...';
                
                // FIX: Use esc_js() for JavaScript escaping
                const ajaxUrl = <?php echo wp_json_encode(admin_url('admin-ajax.php')); ?>;
                const nonce = <?php echo wp_json_encode($test_nonce); ?>;
                
                fetch(ajaxUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'action=test_king_webhook&_ajax_nonce=' + encodeURIComponent(nonce)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        result.innerHTML = '<span style="color: green;">✓ Webhook test successful</span>';
                    } else {
                        result.innerHTML = '<span style="color: red;">✗ Webhook test failed: ' + data.message + '</span>';
                    }
                })
                .catch(error => {
                    result.innerHTML = '<span style="color: red;">✗ Webhook test error: ' + error.message + '</span>';
                });
            }
            </script>
        </div>
        <?php
    }
    
    /**
     * Display active webhooks
     */
    private function display_webhooks() {
        $webhooks = get_posts(array(
            'post_type' => 'shop_webhook',
            'posts_per_page' => -1,
            'meta_query' => array(
                array(
                    'key' => '_webhook_delivery_url',
                    'value' => $this->webhook_url,
                    'compare' => '='
                )
            )
        ));
        
        if (empty($webhooks)) {
            echo '<p>No webhooks configured for this URL.</p>';
            return;
        }
        
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead><tr><th>Name</th><th>Topic</th><th>Status</th><th>Last Delivery</th></tr></thead>';
        echo '<tbody>';
        
        foreach ($webhooks as $webhook) {
            $topic = get_post_meta($webhook->ID, '_webhook_topic', true);
            $status = get_post_meta($webhook->ID, '_webhook_status', true);
            $last_delivery = get_post_meta($webhook->ID, '_webhook_last_delivery', true);
            
            echo '<tr>';
            echo '<td>' . esc_html($webhook->post_title) . '</td>';
            echo '<td>' . esc_html($topic) . '</td>';
            echo '<td>' . esc_html($status) . '</td>';
            echo '<td>' . esc_html($last_delivery ? date('Y-m-d H:i:s', $last_delivery) : 'Never') . '</td>';
            echo '</tr>';
        }
        
        echo '</tbody></table>';
    }
    
    /**
     * Display webhook logs
     */
    private function display_logs() {
        global $wpdb;
        
        if (!$this->webhook_url || !$this->table_exists()) {
            echo '<p>' . esc_html__('Brak logów lub tabela logów nie istnieje.', 'king') . '</p>';
            return;
        }
        
        $limit = apply_filters('king_webhook_logs_limit', 50);
        $logs = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$this->table_name} ORDER BY id DESC LIMIT %d", $limit));
        
        if (empty($logs)) {
            echo '<p>' . esc_html__('Brak zarejestrowanych logów dla konfiguracji webhooków.', 'king') . '</p>';
            return;
        }
        
        echo '<table class="wp-list-table widefat fixed striped">';
        echo '<thead><tr><th>' . esc_html__('ID', 'king') . '</th><th>' . esc_html__('Topic', 'king') . '</th><th>' . esc_html__('Status', 'king') . '</th><th>' . esc_html__('Kod odpowiedzi', 'king') . '</th><th>' . esc_html__('Próby', 'king') . '</th><th>' . esc_html__('Ostatnia próba', 'king') . '</th><th>' . esc_html__('Komunikat', 'king') . '</th></tr></thead>';
        echo '<tbody>';
        foreach ($logs as $log) {
            echo '<tr>';
            echo '<td>' . esc_html($log->id) . '</td>';
            echo '<td>' . esc_html($log->topic) . '</td>';
            echo '<td>' . esc_html($log->status) . '</td>';
            echo '<td>' . esc_html($log->response_code) . '</td>';
            echo '<td>' . esc_html($log->attempts) . '</td>';
            echo '<td>' . esc_html($log->last_attempt) . '</td>';
            echo '<td>' . esc_html(wp_trim_words($log->error_message, 20, '…')) . '</td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
    }
    
    /**
     * Ensure logs table exists
     */
    private function maybe_create_logs_table() {
        global $wpdb;
        
        $installed_version = get_option('king_webhook_logs_db_version');
        if ($installed_version === $this->db_version && $this->table_exists()) {
            return;
        }
        
        $charset_collate = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE {$this->table_name} (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            webhook_id BIGINT(20) UNSIGNED NULL,
            topic VARCHAR(190) NOT NULL,
            delivery_url TEXT NOT NULL,
            status VARCHAR(30) NOT NULL,
            response_code VARCHAR(20) NULL,
            attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
            payload LONGTEXT NULL,
            headers LONGTEXT NULL,
            error_message TEXT NULL,
            scheduled_at DATETIME NULL,
            last_attempt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            secret VARCHAR(255) NULL,
            PRIMARY KEY  (id),
            KEY webhook_id (webhook_id),
            KEY status (status)
        ) $charset_collate;";
        
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
        
        update_option('king_webhook_logs_db_version', $this->db_version, false);
    }
    
    private function table_exists() {
        global $wpdb;
        $table = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $this->table_name));
        return $table === $this->table_name;
    }
    
    /**
     * Handle webhook delivery success
     */
    public function handle_webhook_delivery($delivery, $webhook, $request_args) {
        if (!$this->table_exists()) {
            return;
        }
        
        $payload = $this->extract_payload($request_args);
        $headers = $this->extract_headers($request_args);
        $response_code = null;
        if (is_array($delivery) && isset($delivery['response']['code'])) {
            $response_code = (int) $delivery['response']['code'];
        } elseif (is_object($delivery) && isset($delivery->response['code'])) {
            $response_code = (int) $delivery->response['code'];
        }
        
        $this->insert_log(array(
            'webhook_id' => method_exists($webhook, 'get_id') ? $webhook->get_id() : null,
            'topic' => method_exists($webhook, 'get_topic') ? $webhook->get_topic() : '',
            'delivery_url' => method_exists($webhook, 'get_delivery_url') ? $webhook->get_delivery_url() : $this->webhook_url,
            'status' => 'success',
            'response_code' => $response_code,
            'attempts' => 1,
            'payload' => $payload,
            'headers' => $headers,
            'error_message' => '',
            'scheduled_at' => null,
            'secret' => $this->webhook_secret,
        ));
    }
    
    /**
     * Handle webhook delivery failure
     */
    public function handle_webhook_delivery_failed($delivery, $webhook, $request_args, $error) {
        if (!$this->table_exists()) {
            return;
        }
        
        $payload = $this->extract_payload($request_args);
        $headers = $this->extract_headers($request_args);
        $error_message = is_wp_error($error) ? $error->get_error_message() : (is_string($error) ? $error : __('Nieznany błąd', 'king'));
        
        $log_id = $this->insert_log(array(
            'webhook_id' => method_exists($webhook, 'get_id') ? $webhook->get_id() : null,
            'topic' => method_exists($webhook, 'get_topic') ? $webhook->get_topic() : '',
            'delivery_url' => method_exists($webhook, 'get_delivery_url') ? $webhook->get_delivery_url() : $this->webhook_url,
            'status' => 'failed',
            'response_code' => null,
            'attempts' => 1,
            'payload' => $payload,
            'headers' => $headers,
            'error_message' => $error_message,
            'scheduled_at' => null,
            'secret' => $this->webhook_secret,
        ));
        
        if ($log_id) {
            $this->schedule_retry($log_id, 1);
        }
    }
    
    /**
     * Process retry event
     */
    public function process_retry_event($log_id) {
        if (!$this->table_exists()) {
            return;
        }
        
        $log = $this->get_log($log_id);
        if (!$log || $log->status === 'success') {
            return;
        }
        
        $attempts = (int) $log->attempts + 1;
        if ($attempts > $this->max_retry_attempts) {
            $this->update_log($log_id, array(
                'status' => 'failed',
                'error_message' => __('Osiągnięto maksymalną liczbę prób.', 'king'),
                'attempts' => $attempts,
                'scheduled_at' => null,
                'last_attempt' => current_time('mysql'),
            ));
            return;
        }
        
        $response = $this->resend_webhook($log);
        $response_code = wp_remote_retrieve_response_code($response);
        if (!is_wp_error($response) && $response_code >= 200 && $response_code < 300) {
            $this->update_log($log_id, array(
                'status' => 'success',
                'response_code' => $response_code,
                'attempts' => $attempts,
                'error_message' => '',
                'scheduled_at' => null,
                'last_attempt' => current_time('mysql'),
            ));
        } else {
            $error_message = is_wp_error($response) ? $response->get_error_message() : sprintf(__('Błąd: %s', 'king'), $response_code);
            $this->update_log($log_id, array(
                'status' => 'failed',
                'response_code' => $response_code,
                'attempts' => $attempts,
                'error_message' => $error_message,
                'scheduled_at' => null,
                'last_attempt' => current_time('mysql'),
            ));
            
            if ($attempts < $this->max_retry_attempts) {
                $this->schedule_retry($log_id, $attempts);
            }
        }
    }
    
    /**
     * Handle clear logs request
     */
    public function handle_clear_logs() {
        if (!current_user_can('manage_woocommerce')) {
            wp_die(__('Brak uprawnień.', 'king'));
        }
        check_admin_referer('king_webhook_clear_logs');
        
        if ($this->table_exists()) {
            global $wpdb;
            $wpdb->query("TRUNCATE TABLE {$this->table_name}");
        }
        
        wp_safe_redirect(add_query_arg('king_webhook_cleared', '1', admin_url('admin.php?page=king-webhooks')));
        exit;
    }
    
    /**
     * Log manual test request
     */
    public function log_manual_test($status, $response_code = null, $message = '') {
        if (!$this->table_exists()) {
            return;
        }
        
        $this->insert_log(array(
            'webhook_id' => null,
            'topic' => 'manual_test',
            'delivery_url' => $this->webhook_url,
            'status' => $status,
            'response_code' => $response_code,
            'attempts' => 1,
            'payload' => wp_json_encode(array('type' => 'manual_test')),
            'headers' => '',
            'error_message' => $message,
            'scheduled_at' => null,
            'secret' => $this->webhook_secret,
        ));
    }
    
    /**
     * Check manual test rate limit
     */
    public function check_manual_test_rate_limit($user_id, $limit = 5, $window = 900) {
        $key = 'king_webhook_test_' . $user_id;
        $data = get_transient($key);
        $now = time();
        
        if (empty($data) || !isset($data['expires']) || $data['expires'] <= $now) {
            $data = array(
                'count' => 1,
                'expires' => $now + $window,
            );
            set_transient($key, $data, $window);
            return array('allowed' => true, 'retry_after' => 0);
        }
        
        if ($data['count'] >= $limit) {
            $retry_after = $data['expires'] - $now;
            return array('allowed' => false, 'retry_after' => max(0, $retry_after));
        }
        
        $data['count']++;
        set_transient($key, $data, $data['expires'] - $now);
        return array('allowed' => true, 'retry_after' => 0);
    }
    
    private function insert_log($data) {
        global $wpdb;
        $defaults = array(
            'webhook_id' => null,
            'topic' => '',
            'delivery_url' => '',
            'status' => 'unknown',
            'response_code' => null,
            'attempts' => 0,
            'payload' => '',
            'headers' => '',
            'error_message' => '',
            'scheduled_at' => null,
            'secret' => '',
        );
        $data = wp_parse_args($data, $defaults);
        $data['payload'] = maybe_serialize($data['payload']);
        $data['headers'] = maybe_serialize($data['headers']);
        $data['last_attempt'] = current_time('mysql');
        $data['created_at'] = current_time('mysql');
        
        $wpdb->insert($this->table_name, $data);
        return $wpdb->insert_id;
    }
    
    private function update_log($id, $data) {
        global $wpdb;
        $data['last_attempt'] = isset($data['last_attempt']) ? $data['last_attempt'] : current_time('mysql');
        return $wpdb->update($this->table_name, $data, array('id' => $id));
    }
    
    private function get_log($id) {
        global $wpdb;
        return $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->table_name} WHERE id = %d", $id));
    }
    
    private function schedule_retry($log_id, $attempt) {
        $delay = max(60, $attempt * 5 * MINUTE_IN_SECONDS);
        $timestamp = time() + $delay;
        wp_schedule_single_event($timestamp, 'king_webhook_retry_event', array($log_id));
        $this->update_log($log_id, array(
            'status' => 'retry',
            'scheduled_at' => gmdate('Y-m-d H:i:s', $timestamp),
        ));
    }
    
    private function resend_webhook($log) {
        $body = maybe_unserialize($log->payload);
        if (is_array($body) || is_object($body)) {
            $body = wp_json_encode($body);
        }
        $headers = maybe_unserialize($log->headers);
        if (!is_array($headers)) {
            $headers = array();
        }
        $headers['Content-Type'] = 'application/json';
        
        $secret = !empty($log->secret) ? $log->secret : $this->webhook_secret;
        if (!empty($secret) && !empty($body)) {
            $headers['X-WC-Webhook-Signature'] = base64_encode(hash_hmac('sha256', $body, $secret, true));
        }
        
        return wp_remote_post($log->delivery_url, array(
            'body' => $body,
            'headers' => $headers,
            'timeout' => 20,
        ));
    }
    
    private function extract_payload($request_args) {
        if (isset($request_args['body'])) {
            return $request_args['body'];
        }
        return '';
    }
    
    private function extract_headers($request_args) {
        if (isset($request_args['headers'])) {
            return $request_args['headers'];
        }
        return array();
    }
}

// Initialize
new KingWebhooks();

// AJAX handler for webhook test
add_action('wp_ajax_test_king_webhook', 'test_king_webhook');
function test_king_webhook() {
    $is_cli = (defined('WP_CLI') && WP_CLI);
    
    if (!$is_cli && !current_user_can('manage_woocommerce')) {
        wp_send_json_error(__('Brak uprawnień.', 'king'), 403);
    }
    
    if (!$is_cli && wp_doing_ajax()) {
        check_ajax_referer('king_webhook_test');
    }
    
    $webhook_url = get_option('king_webhook_url');
    $webhook_secret = get_option('king_webhook_secret');
    
    if (!$webhook_url || !$webhook_secret) {
        wp_send_json_error('Webhook URL or secret not configured');
        return;
    }
    
    $instance = KingWebhooks::get_instance();
    $user_id = get_current_user_id();
    if ($instance && !$is_cli) {
        $limit = $instance->check_manual_test_rate_limit($user_id);
        if (!$limit['allowed']) {
            wp_send_json_error(sprintf(__('Limit testów wyczerpany. Spróbuj ponownie za %s sekund.', 'king'), $limit['retry_after']), 429);
            return;
        }
    }
    
    // Create test payload
    $payload = array(
        'id' => 999999,
        'type' => 'product',
        'action' => 'test',
        'data' => array(
            'id' => 999999,
            'name' => 'Test Product',
            'status' => 'publish'
        ),
        'timestamp' => current_time('mysql')
    );
    
    // Send test webhook
    $response = wp_remote_post($webhook_url, array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'X-WC-Webhook-Signature' => base64_encode(hash_hmac('sha256', json_encode($payload), $webhook_secret, true))
        ),
        'body' => json_encode($payload),
        'timeout' => 10
    ));
    
    if (is_wp_error($response)) {
        if ($instance) {
            $instance->log_manual_test('failed', null, $response->get_error_message());
        }
        wp_send_json_error('Webhook delivery failed: ' . $response->get_error_message());
    } else {
        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code >= 200 && $response_code < 300) {
            if ($instance) {
                $instance->log_manual_test('success', $response_code, '');
            }
            wp_send_json_success('Webhook delivered successfully');
        } else {
            if ($instance) {
                $instance->log_manual_test('failed', $response_code, 'HTTP ' . $response_code);
            }
            wp_send_json_error('Webhook delivery failed with status: ' . $response_code);
        }
    }
}
