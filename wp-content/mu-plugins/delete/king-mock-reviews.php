<?php
/**
 * Plugin Name: King Mock Reviews
 * Description: Dodaje mock opinie do produktów WooCommerce dla testów frontend
 * Version: 1.0.0
 * Author: King Brand
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KingMockReviews {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_ajax_king_generate_mock_reviews', array($this, 'generate_mock_reviews'));
        add_action('wp_ajax_nopriv_king_generate_mock_reviews', array($this, 'generate_mock_reviews'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
    }
    
    public function init() {
        // Hook into WooCommerce
        if (class_exists('WooCommerce')) {
            // Add mock reviews on product creation (for testing)
            add_action('woocommerce_new_product', array($this, 'maybe_add_mock_reviews'));
        }
    }
    
    public function add_admin_menu() {
        add_submenu_page(
            'woocommerce',
            'King Mock Reviews',
            'Mock Reviews',
            'manage_woocommerce',
            'king-mock-reviews',
            array($this, 'admin_page')
        );
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>King Mock Reviews</h1>
            <p>Generuj mock opinie dla produktów WooCommerce</p>
            
            <div class="card">
                <h2>Generuj Mock Opinie</h2>
                <p>Kliknij poniższy przycisk, aby dodać mock opinie do wszystkich produktów.</p>
                
                <button id="generate-mock-reviews" class="button button-primary">
                    Generuj Mock Opinie
                </button>
                
                <div id="mock-reviews-result" style="margin-top: 20px;"></div>
            </div>
            
            <script>
            document.getElementById('generate-mock-reviews').addEventListener('click', function() {
                const button = this;
                const result = document.getElementById('mock-reviews-result');
                
                button.disabled = true;
                button.textContent = 'Generowanie...';
                result.innerHTML = '<p>Generowanie opinii...</p>';
                
                fetch(ajaxurl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: 'action=king_generate_mock_reviews&nonce=' + '<?php echo wp_create_nonce('king_mock_reviews'); ?>'
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        result.innerHTML = '<div class="notice notice-success"><p>' + data.data.message + '</p></div>';
                    } else {
                        result.innerHTML = '<div class="notice notice-error"><p>Błąd: ' + data.data + '</p></div>';
                    }
                })
                .catch(error => {
                    result.innerHTML = '<div class="notice notice-error"><p>Błąd: ' + error.message + '</p></div>';
                })
                .finally(() => {
                    button.disabled = false;
                    button.textContent = 'Generuj Mock Opinie';
                });
            });
            </script>
        </div>
        <?php
    }
    
    public function generate_mock_reviews() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'king_mock_reviews')) {
            wp_die('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_woocommerce')) {
            wp_die('Insufficient permissions');
        }
        
        $products = wc_get_products(array(
            'limit' => -1,
            'status' => 'publish'
        ));
        
        $total_reviews = 0;
        
        foreach ($products as $product) {
            $reviews_added = $this->add_mock_reviews_to_product($product->get_id());
            $total_reviews += $reviews_added;
        }
        
        wp_send_json_success(array(
            'message' => sprintf('Dodano %d mock opinii do %d produktów.', $total_reviews, count($products))
        ));
    }
    
    public function add_mock_reviews_to_product($product_id) {
        // Check if product already has reviews
        $existing_reviews = get_comments(array(
            'post_id' => $product_id,
            'type' => 'review',
            'count' => true
        ));
        
        if ($existing_reviews > 0) {
            return 0; // Skip if already has reviews
        }
        
        $mock_reviews = $this->get_mock_reviews_data();
        $reviews_added = 0;
        
        foreach ($mock_reviews as $review_data) {
            $comment_id = wp_insert_comment(array(
                'comment_post_ID' => $product_id,
                'comment_author' => $review_data['author'],
                'comment_author_email' => $review_data['email'],
                'comment_content' => $review_data['content'],
                'comment_type' => 'review',
                'comment_approved' => 1,
                'comment_meta' => array(
                    'rating' => $review_data['rating']
                )
            ));
            
            if ($comment_id) {
                $reviews_added++;
            }
        }
        
        // Update product rating
        if ($reviews_added > 0) {
            $this->update_product_rating($product_id);
        }
        
        return $reviews_added;
    }
    
    public function get_mock_reviews_data() {
        return array(
            array(
                'author' => 'Anna Kowalska',
                'email' => 'anna.kowalska@example.com',
                'rating' => 5,
                'content' => 'Świetny produkt! Działa dokładnie tak jak opisano. Polecam każdemu, kto szuka wysokiej jakości.'
            ),
            array(
                'author' => 'Michał Nowak',
                'email' => 'michal.nowak@example.com',
                'rating' => 4,
                'content' => 'Bardzo dobry produkt, szybka dostawa. Jedyny minus to cena, ale jakość rekompensuje.'
            ),
            array(
                'author' => 'Katarzyna Wiśniewska',
                'email' => 'katarzyna.wisniewska@example.com',
                'rating' => 5,
                'content' => 'Kupuję już drugi raz. Produkt spełnia wszystkie moje oczekiwania. Obsługa klienta na najwyższym poziomie.'
            ),
            array(
                'author' => 'Piotr Zieliński',
                'email' => 'piotr.zielinski@example.com',
                'rating' => 3,
                'content' => 'Produkt w porządku, ale mógłby być lepszy. Opakowanie mogłoby być bardziej ekologiczne.'
            ),
            array(
                'author' => 'Magdalena Dąbrowska',
                'email' => 'magdalena.dabrowska@example.com',
                'rating' => 5,
                'content' => 'Fantastyczny produkt! Używam go od miesiąca i jestem bardzo zadowolona. Na pewno zamówię ponownie.'
            ),
            array(
                'author' => 'Tomasz Lewandowski',
                'email' => 'tomasz.lewandowski@example.com',
                'rating' => 4,
                'content' => 'Dobra jakość w rozsądnej cenie. Szybka realizacja zamówienia. Polecam!'
            ),
            array(
                'author' => 'Agnieszka Kamińska',
                'email' => 'agnieszka.kaminska@example.com',
                'rating' => 5,
                'content' => 'Produkt zgodny z opisem. Wysoka jakość wykonania. Obsługa bardzo miła i pomocna.'
            ),
            array(
                'author' => 'Marcin Szymański',
                'email' => 'marcin.szymanski@example.com',
                'rating' => 2,
                'content' => 'Niestety produkt nie spełnił moich oczekiwań. Jakość mogłaby być lepsza za taką cenę.'
            )
        );
    }
    
    public function update_product_rating($product_id) {
        $product = wc_get_product($product_id);
        if (!$product) {
            return;
        }
        
        // Get all approved reviews
        $reviews = get_comments(array(
            'post_id' => $product_id,
            'type' => 'review',
            'status' => 'approve'
        ));
        
        if (empty($reviews)) {
            return;
        }
        
        $total_rating = 0;
        $review_count = 0;
        
        foreach ($reviews as $review) {
            $rating = get_comment_meta($review->comment_ID, 'rating', true);
            if ($rating) {
                $total_rating += intval($rating);
                $review_count++;
            }
        }
        
        if ($review_count > 0) {
            $average_rating = $total_rating / $review_count;
            
            // Update product meta
            update_post_meta($product_id, '_wc_average_rating', $average_rating);
            update_post_meta($product_id, '_wc_review_count', $review_count);
            
            // Clear cache
            wc_delete_product_transients($product_id);
        }
    }
    
    public function maybe_add_mock_reviews($product_id) {
        // Only add mock reviews in development/testing environment
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $this->add_mock_reviews_to_product($product_id);
        }
    }
}

// Initialize the plugin
new KingMockReviews();

