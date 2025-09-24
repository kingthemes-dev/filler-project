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
        
        // Single product with related data - SUPER OPTIMIZED
        register_rest_route('king-optimized/v1', '/product/(?P<slug>[a-zA-Z0-9-]+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_product_optimized'),
            'permission_callback' => '__return_true',
            'args' => array(
                'slug' => array(
                    'required' => true,
                    'type' => 'string',
                    'description' => 'Product slug'
                ),
            )
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
     * Get single product with all related data in ONE optimized request
     */
    public function get_product_optimized($request) {
        $slug = $request->get_param('slug');
        $cache_key = 'product_optimized_' . $slug;
        
        // Try cache first
        $cached_data = $this->get_cache($cache_key);
        if ($cached_data) {
            $this->set_cache_headers(true);
            return rest_ensure_response($cached_data);
        }
        
        global $wpdb;
        
        // Get product by slug with single query
        $product = $wpdb->get_row($wpdb->prepare("
            SELECT p.*, pm.meta_value as product_meta
            FROM {$wpdb->posts} p
            LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_product_data'
            WHERE p.post_name = %s 
            AND p.post_type = 'product' 
            AND p.post_status = 'publish'
        ", $slug));
        
        if (!$product) {
            return new WP_Error('product_not_found', 'Product not found', array('status' => 404));
        }
        
        $product_id = $product->ID;
        
        // Get all product data in parallel queries
        $product_data = array();
        $product_meta = get_post_meta($product_id);
        $product_images = wp_get_attachment_image_src(get_post_thumbnail_id($product_id), 'full');
        $gallery_images = get_post_meta($product_id, '_product_image_gallery', true);
        
        // Get categories
        $categories = wp_get_post_terms($product_id, 'product_cat', array('fields' => 'all'));
        $category_data = array();
        foreach ($categories as $cat) {
            $category_data[] = array(
                'id' => $cat->term_id,
                'name' => $cat->name,
                'slug' => $cat->slug
            );
        }
        
        // Get attributes
        $attributes = wc_get_product_attributes($product_id);
        $attribute_data = array();
        foreach ($attributes as $attribute) {
            $attribute_data[] = array(
                'name' => $attribute->get_name(),
                'options' => $attribute->get_options(),
                'visible' => $attribute->get_visible(),
                'variation' => $attribute->get_variation()
            );
        }
        
        // Get variations if variable product
        $variations = array();
        if (get_post_meta($product_id, '_product_type', true) === 'variable') {
            $variation_ids = $wpdb->get_col($wpdb->prepare("
                SELECT ID FROM {$wpdb->posts} 
                WHERE post_parent = %d AND post_type = 'product_variation' 
                AND post_status = 'publish'
            ", $product_id));
            
            foreach ($variation_ids as $variation_id) {
                $variation = wc_get_product($variation_id);
                if ($variation) {
                    $variations[] = array(
                        'id' => $variation_id,
                        'price' => $variation->get_price(),
                        'regular_price' => $variation->get_regular_price(),
                        'sale_price' => $variation->get_sale_price(),
                        'attributes' => $variation->get_attributes(),
                        'stock_status' => $variation->get_stock_status(),
                        'manage_stock' => $variation->get_manage_stock(),
                        'stock_quantity' => $variation->get_stock_quantity()
                    );
                }
            }
        }
        
        // Get related products (same category, limit 4)
        $related_products = array();
        if (!empty($categories)) {
            $related_ids = $wpdb->get_col($wpdb->prepare("
                SELECT DISTINCT p.ID FROM {$wpdb->posts} p
                INNER JOIN {$wpdb->term_relationships} tr ON p.ID = tr.object_id
                INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
                WHERE tt.term_id IN (" . implode(',', array_map('intval', wp_list_pluck($categories, 'term_id'))) . ")
                AND p.ID != %d
                AND p.post_type = 'product'
                AND p.post_status = 'publish'
                LIMIT 4
            ", $product_id));
            
            foreach ($related_ids as $related_id) {
                $related_product = wc_get_product($related_id);
                if ($related_product) {
                    $related_products[] = array(
                        'id' => $related_id,
                        'name' => $related_product->get_name(),
                        'slug' => $related_product->get_slug(),
                        'price' => $related_product->get_price(),
                        'regular_price' => $related_product->get_regular_price(),
                        'sale_price' => $related_product->get_sale_price(),
                        'image' => wp_get_attachment_image_src(get_post_thumbnail_id($related_id), 'medium')[0],
                        'stock_status' => $related_product->get_stock_status()
                    );
                }
            }
        }
        
        // Build optimized response
        $response = array(
            'id' => $product_id,
            'name' => $product->post_title,
            'slug' => $product->post_name,
            'description' => $product->post_content,
            'short_description' => $product->post_excerpt,
            'price' => get_post_meta($product_id, '_price', true),
            'regular_price' => get_post_meta($product_id, '_regular_price', true),
            'sale_price' => get_post_meta($product_id, '_sale_price', true),
            'on_sale' => get_post_meta($product_id, '_sale_price', true) ? true : false,
            'stock_status' => get_post_meta($product_id, '_stock_status', true),
            'manage_stock' => get_post_meta($product_id, '_manage_stock', true),
            'stock_quantity' => get_post_meta($product_id, '_stock_quantity', true),
            'weight' => get_post_meta($product_id, '_weight', true),
            'dimensions' => array(
                'length' => get_post_meta($product_id, '_length', true),
                'width' => get_post_meta($product_id, '_width', true),
                'height' => get_post_meta($product_id, '_height', true)
            ),
            'image' => $product_images ? $product_images[0] : '',
            'images' => array_merge(
                $product_images ? array($product_images[0]) : array(),
                $gallery_images ? array_map('wp_get_attachment_url', explode(',', $gallery_images)) : array()
            ),
            'categories' => $category_data,
            'attributes' => $attribute_data,
            'variations' => $variations,
            'related_products' => $related_products,
            'type' => get_post_meta($product_id, '_product_type', true),
            'featured' => get_post_meta($product_id, '_featured', true) === 'yes',
            'average_rating' => get_post_meta($product_id, '_wc_average_rating', true),
            'rating_count' => get_post_meta($product_id, '_wc_review_count', true)
        );
        
        // Cache for 1 hour
        $this->set_cache($cache_key, $response, 3600);
        $this->set_cache_headers(false);
        
        return rest_ensure_response($response);
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
