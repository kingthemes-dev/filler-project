<?php
/**
 * Plugin Name: King Optimized API
 * Description: Custom optimized API endpoints with Redis caching for headless WooCommerce
 * Version: 1.0.0
 * Author: King
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KingOptimizedAPI {
    
    private $cache_duration = 24 * 60 * 60; // 24 hours
    private $redis_available = false;
    
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
        
        // Check if Redis is available
        if (class_exists('Redis')) {
            $this->redis_available = true;
        }
    }
    
    /**
     * Register REST API routes
     */
    public function register_routes() {
        // Homepage data - all tabs in one request
        register_rest_route('king-optimized/v1', '/homepage', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_homepage_data'),
            'permission_callback' => '__return_true'
        ));
        
        // Shop data - optimized product list
        register_rest_route('king-optimized/v1', '/shop', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_shop_data'),
            'permission_callback' => '__return_true',
            'args' => array(
                'page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 1,
                    'description' => 'Page number'
                ),
                'per_page' => array(
                    'required' => false,
                    'type' => 'integer',
                    'default' => 12,
                    'description' => 'Products per page'
                ),
                'category' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Category slug'
                )
            )
        ));
        
        // Product data - single product with variations
        register_rest_route('king-optimized/v1', '/product/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_product_data'),
            'permission_callback' => '__return_true'
        ));
        
        // Product by slug
        register_rest_route('king-optimized/v1', '/product-slug/(?P<slug>[a-zA-Z0-9-]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_product_by_slug'),
            'permission_callback' => '__return_true'
        ));
    }
    
    /**
     * Get homepage data - all tabs in one request
     */
    public function get_homepage_data($request) {
        $cache_key = 'king_homepage_data';
        
        // Try to get from Redis cache first
        $cached_data = $this->get_from_cache($cache_key);
        if ($cached_data !== false) {
            // Add cache headers
            $this->add_cache_headers(true);
            return $cached_data;
        }
        
        // Get data from WooCommerce
        $data = array(
            'nowosci' => $this->get_products_by_tab('nowosci'),
            'promocje' => $this->get_products_by_tab('promocje'),
            'polecane' => $this->get_products_by_tab('polecane'),
            'bestsellery' => $this->get_products_by_tab('bestsellery')
        );
        
        // Cache in Redis
        $this->set_cache($cache_key, $data);
        
        // Add cache headers
        $this->add_cache_headers(false);
        
        return $data;
    }
    
    /**
     * Get shop data - optimized product list
     */
    public function get_shop_data($request) {
        $page = $request->get_param('page');
        $per_page = $request->get_param('per_page');
        $category = $request->get_param('category');
        
        $cache_key = 'king_shop_data_' . $page . '_' . $per_page . '_' . $category;
        
        // Try to get from cache
        $cached_data = wp_cache_get($cache_key, 'king_optimized');
        if ($cached_data !== false) {
            return $cached_data;
        }
        
        // Get products from WooCommerce
        $args = array(
            'status' => 'publish',
            'per_page' => $per_page,
            'page' => $page,
            'orderby' => 'date',
            'order' => 'desc'
        );
        
        if ($category) {
            $args['category'] = $category;
        }
        
        $products = wc_get_products($args);
        $formatted_products = array();
        
        foreach ($products as $product) {
            $formatted_products[] = $this->format_product($product);
        }
        
        $data = array(
            'products' => $formatted_products,
            'total' => wp_count_posts('product')->publish,
            'page' => $page,
            'per_page' => $per_page
        );
        
        // Cache for 24 hours
        wp_cache_set($cache_key, $data, 'king_optimized', $this->cache_duration);
        
        return $data;
    }
    
    /**
     * Get single product data
     */
    public function get_product_data($request) {
        $product_id = $request->get_param('id');
        $cache_key = 'king_product_data_' . $product_id;
        
        // Try to get from cache
        $cached_data = wp_cache_get($cache_key, 'king_optimized');
        if ($cached_data !== false) {
            return $cached_data;
        }
        
        $product = wc_get_product($product_id);
        if (!$product) {
            return new WP_Error('product_not_found', 'Product not found', array('status' => 404));
        }
        
        $data = $this->format_product_detailed($product);
        
        // Cache for 24 hours
        wp_cache_set($cache_key, $data, 'king_optimized', $this->cache_duration);
        
        return $data;
    }
    
    /**
     * Get product by slug
     */
    public function get_product_by_slug($request) {
        $slug = $request->get_param('slug');
        $cache_key = 'king_product_slug_' . $slug;
        
        // Try to get from cache
        $cached_data = wp_cache_get($cache_key, 'king_optimized');
        if ($cached_data !== false) {
            return $cached_data;
        }
        
        $product = get_page_by_path($slug, OBJECT, 'product');
        if (!$product) {
            return new WP_Error('product_not_found', 'Product not found', array('status' => 404));
        }
        
        $wc_product = wc_get_product($product->ID);
        if (!$wc_product) {
            return new WP_Error('product_not_found', 'Product not found', array('status' => 404));
        }
        
        $data = $this->format_product_detailed($wc_product);
        
        // Cache for 24 hours
        wp_cache_set($cache_key, $data, 'king_optimized', $this->cache_duration);
        
        return $data;
    }
    
    /**
     * Get products by tab type
     */
    private function get_products_by_tab($tab_type) {
        $args = array(
            'status' => 'publish',
            'per_page' => 4,
            'orderby' => 'date',
            'order' => 'desc',
            'fields' => 'ids' // Only get IDs for better performance
        );
        
        switch ($tab_type) {
            case 'nowosci':
                $args['orderby'] = 'date';
                $args['order'] = 'desc';
                break;
            case 'promocje':
                $args['on_sale'] = true;
                break;
            case 'polecane':
                $args['featured'] = true;
                break;
            case 'bestsellery':
                $args['orderby'] = 'popularity';
                break;
        }
        
        $product_ids = wc_get_products($args);
        $formatted_products = array();
        
        foreach ($product_ids as $product_id) {
            $product = wc_get_product($product_id);
            if ($product) {
                $formatted_products[] = $this->format_product($product);
            }
        }
        
        return $formatted_products;
    }
    
    /**
     * Format product for list view - optimized with only essential fields
     */
    private function format_product($product) {
        return array(
            'id' => $product->get_id(),
            'name' => $product->get_name(),
            'slug' => $product->get_slug(),
            'price' => $product->get_price(),
            'regular_price' => $product->get_regular_price(),
            'sale_price' => $product->get_sale_price(),
            'on_sale' => $product->is_on_sale(),
            'featured' => $product->is_featured(),
            'image' => wp_get_attachment_image_url($product->get_image_id(), 'medium'),
            'stock_status' => $product->get_stock_status(),
            'type' => $product->get_type()
        );
    }
    
    /**
     * Format product for detailed view
     */
    private function format_product_detailed($product) {
        $data = $this->format_product($product);
        
        // Add detailed information
        $data['description'] = $product->get_description();
        $data['short_description'] = $product->get_short_description();
        $data['images'] = array();
        $data['variations'] = array();
        $data['attributes'] = array();
        
        // Get gallery images
        $gallery_ids = $product->get_gallery_image_ids();
        foreach ($gallery_ids as $gallery_id) {
            $data['images'][] = wp_get_attachment_image_url($gallery_id, 'large');
        }
        
        // Get variations for variable products
        if ($product->is_type('variable')) {
            $variations = $product->get_available_variations();
            foreach ($variations as $variation) {
                $data['variations'][] = array(
                    'id' => $variation['variation_id'],
                    'price' => $variation['display_price'],
                    'attributes' => $variation['attributes'],
                    'stock_status' => $variation['is_in_stock'] ? 'instock' : 'outofstock'
                );
            }
        }
        
        // Get attributes
        $attributes = $product->get_attributes();
        foreach ($attributes as $attribute) {
            $data['attributes'][] = array(
                'name' => $attribute->get_name(),
                'options' => $attribute->get_options()
            );
        }
        
        return $data;
    }
    
    /**
     * Get data from Redis cache
     */
    private function get_from_cache($key) {
        if (!$this->redis_available) {
            return wp_cache_get($key, 'king_optimized');
        }
        
        try {
            $redis = new Redis();
            $redis->connect('127.0.0.1', 6379);
            $data = $redis->get('king_optimized:' . $key);
            $redis->close();
            
            return $data ? json_decode($data, true) : false;
        } catch (Exception $e) {
            // Fallback to WordPress cache
            return wp_cache_get($key, 'king_optimized');
        }
    }
    
    /**
     * Set data in Redis cache
     */
    private function set_cache($key, $data) {
        if (!$this->redis_available) {
            wp_cache_set($key, $data, 'king_optimized', $this->cache_duration);
            return;
        }
        
        try {
            $redis = new Redis();
            $redis->connect('127.0.0.1', 6379);
            $redis->setex('king_optimized:' . $key, $this->cache_duration, json_encode($data));
            $redis->close();
        } catch (Exception $e) {
            // Fallback to WordPress cache
            wp_cache_set($key, $data, 'king_optimized', $this->cache_duration);
        }
    }
    
    /**
     * Add cache headers for better performance
     */
    private function add_cache_headers($is_hit = false) {
        header('Cache-Control: public, s-maxage=300, stale-while-revalidate=86400');
        header('X-Cache-Status: ' . ($is_hit ? 'HIT' : 'MISS'));
        header('X-Redis-Available: ' . ($this->redis_available ? 'true' : 'false'));
    }
    
    /**
     * Clear cache when products are updated
     */
    public function clear_cache($post_id) {
        if (get_post_type($post_id) === 'product') {
            wp_cache_delete('king_homepage_data', 'king_optimized');
            wp_cache_delete('king_shop_data_*', 'king_optimized');
            wp_cache_delete('king_product_data_' . $post_id, 'king_optimized');
        }
    }
}

// Initialize the optimized API
$king_optimized_api = new KingOptimizedAPI();

// Clear cache when products are updated
add_action('save_post', array($king_optimized_api, 'clear_cache'));
add_action('delete_post', array($king_optimized_api, 'clear_cache'));
