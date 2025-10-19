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
    
    private $webhook_url;
    private $webhook_secret;
    
    public function __construct() {
        $this->webhook_url = get_option('king_webhook_url', '');
        $this->webhook_secret = get_option('king_webhook_secret', '');
        
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    public function init() {
        // Register webhooks if configured
        if ($this->webhook_url && $this->webhook_secret) {
            $this->register_webhooks();
        }
    }
    
    /**
     * Register WooCommerce webhooks
     */
    private function register_webhooks() {
        // Product webhooks
        $this->create_webhook('product.created', 'Product Created');
        $this->create_webhook('product.updated', 'Product Updated');
        $this->create_webhook('product.deleted', 'Product Deleted');
        
        // Order webhooks
        $this->create_webhook('order.created', 'Order Created');
        $this->create_webhook('order.updated', 'Order Updated');
        $this->create_webhook('order.deleted', 'Order Deleted');
        
        // Customer webhooks
        $this->create_webhook('customer.created', 'Customer Created');
        $this->create_webhook('customer.updated', 'Customer Updated');
        $this->create_webhook('customer.deleted', 'Customer Deleted');
        
        // Category webhooks
        $this->create_webhook('product_cat.created', 'Product Category Created');
        $this->create_webhook('product_cat.updated', 'Product Category Updated');
        $this->create_webhook('product_cat.deleted', 'Product Category Deleted');
    }
    
    /**
     * Create webhook
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
        
        // Create webhook
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
            
            <h2>Test Webhook</h2>
            <p>
                <button type="button" class="button" onclick="testWebhook()">Test Webhook</button>
                <span id="webhook-test-result"></span>
            </p>
            
            <script>
            function testWebhook() {
                const result = document.getElementById('webhook-test-result');
                result.innerHTML = 'Testing...';
                
                fetch('<?php echo admin_url('admin-ajax.php'); ?>', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'action=test_king_webhook'
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
}

// Initialize
new KingWebhooks();

// AJAX handler for webhook test
add_action('wp_ajax_test_king_webhook', 'test_king_webhook');
function test_king_webhook() {
    $webhook_url = get_option('king_webhook_url');
    $webhook_secret = get_option('king_webhook_secret');
    
    if (!$webhook_url || !$webhook_secret) {
        wp_send_json_error('Webhook URL or secret not configured');
        return;
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
        wp_send_json_error('Webhook delivery failed: ' . $response->get_error_message());
    } else {
        $response_code = wp_remote_retrieve_response_code($response);
        if ($response_code >= 200 && $response_code < 300) {
            wp_send_json_success('Webhook delivered successfully');
        } else {
            wp_send_json_error('Webhook delivery failed with status: ' . $response_code);
        }
    }
}
