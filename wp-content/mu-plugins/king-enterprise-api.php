<?php
/**
 * Plugin Name: King Enterprise API
 * Description: Enterprise-level consolidated API for headless WooCommerce - single endpoint for all data
 * Version: 2.0.0
 * Author: King Enterprise
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KingEnterpriseAPI {
    
    private $cache_duration = 24 * 60 * 60; // 24 hours
    private $redis_available = false;
    private $cache_prefix = 'king_enterprise_';
    
    public function __construct() {
        // Check if Redis is available
        if (class_exists('Redis')) {
            $this->redis_available = true;
        }
        
        add_action('rest_api_init', array($this, 'register_routes'));
        
        // Clear cache when products are updated
        add_action('woocommerce_update_product', array($this, 'clear_all_cache'));
        add_action('woocommerce_new_product', array($this, 'clear_all_cache'));
        add_action('woocommerce_delete_product', array($this, 'clear_all_cache'));
        add_action('created_product_cat', array($this, 'clear_all_cache'));
        add_action('edited_product_cat', array($this, 'clear_all_cache'));
        add_action('delete_product_cat', array($this, 'clear_all_cache'));
    }
    
    /**
     * Register REST API routes - ENTERPRISE CONSOLIDATION
     */
    public function register_routes() {
        // SINGLE ENTERPRISE ENDPOINT - Everything in one request
        register_rest_route('king-enterprise/v1', '/data', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_enterprise_data'),
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
                    'description' => 'Category slug or comma-separated slugs'
                ),
                'search' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Search query'
                ),
                'min_price' => array(
                    'required' => false,
                    'type' => 'number',
                    'description' => 'Minimum price'
                ),
                'max_price' => array(
                    'required' => false,
                    'type' => 'number',
                    'description' => 'Maximum price'
                ),
                'on_sale' => array(
                    'required' => false,
                    'type' => 'boolean',
                    'description' => 'Show only products on sale'
                ),
                'featured' => array(
                    'required' => false,
                    'type' => 'boolean',
                    'description' => 'Show only featured products'
                ),
                'stock_status' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Stock status filter'
                ),
                'orderby' => array(
                    'required' => false,
                    'type' => 'string',
                    'default' => 'menu_order',
                    'description' => 'Order by field'
                ),
                'order' => array(
                    'required' => false,
                    'type' => 'string',
                    'default' => 'ASC',
                    'description' => 'Order direction'
                ),
                'include_categories' => array(
                    'required' => false,
                    'type' => 'boolean',
                    'default' => true,
                    'description' => 'Include categories data'
                ),
                'include_attributes' => array(
                    'required' => false,
                    'type' => 'boolean',
                    'default' => true,
                    'description' => 'Include attributes data'
                ),
                'include_products' => array(
                    'required' => false,
                    'type' => 'boolean',
                    'default' => true,
                    'description' => 'Include products data'
                )
            )
        ));
    }
    
    /**
     * ENTERPRISE DATA ENDPOINT - Single request for everything
     */
    public function get_enterprise_data($request) {
        $start_time = microtime(true);
        
        // Extract parameters
        $page = $request->get_param('page') ?: 1;
        $per_page = $request->get_param('per_page') ?: 12;
        $category = $request->get_param('category');
        $search = $request->get_param('search');
        $min_price = $request->get_param('min_price');
        $max_price = $request->get_param('max_price');
        $on_sale = $request->get_param('on_sale');
        $featured = $request->get_param('featured');
        $stock_status = $request->get_param('stock_status');
        $orderby = $request->get_param('orderby') ?: 'menu_order';
        $order = $request->get_param('order') ?: 'ASC';
        $include_categories = $request->get_param('include_categories') !== false;
        $include_attributes = $request->get_param('include_attributes') !== false;
        $include_products = $request->get_param('include_products') !== false;
        
        // Generate cache key
        $cache_key = $this->cache_prefix . 'enterprise_' . md5(serialize($request->get_params()));
        
        // Check cache first
        $cached_data = $this->get_cache($cache_key);
        if ($cached_data !== false) {
            error_log('King Enterprise API - Cache HIT for enterprise data');
            return $cached_data;
        }
        
        $response_data = array(
            'success' => true,
            'timestamp' => current_time('mysql'),
            'cache_hit' => false,
            'performance' => array()
        );
        
        // 1. CATEGORIES - Always include for navigation
        if ($include_categories) {
            $cat_start = microtime(true);
            $categories = $this->get_optimized_categories();
            $response_data['categories'] = $categories;
            $response_data['performance']['categories_ms'] = round((microtime(true) - $cat_start) * 1000, 2);
        }
        
        // 2. ATTRIBUTES - Always include for filters
        if ($include_attributes) {
            $attr_start = microtime(true);
            $attributes = $this->get_optimized_attributes();
            $response_data['attributes'] = $attributes;
            $response_data['performance']['attributes_ms'] = round((microtime(true) - $attr_start) * 1000, 2);
        }
        
        // 3. PRODUCTS - Only if requested
        if ($include_products) {
            $prod_start = microtime(true);
            $products_data = $this->get_optimized_products($request);
            $response_data = array_merge($response_data, $products_data);
            $response_data['performance']['products_ms'] = round((microtime(true) - $prod_start) * 1000, 2);
        }
        
        // Performance metrics
        $response_data['performance']['total_ms'] = round((microtime(true) - $start_time) * 1000, 2);
        $response_data['performance']['memory_usage'] = memory_get_usage(true);
        $response_data['performance']['memory_peak'] = memory_get_peak_usage(true);
        
        // Cache the response
        $this->set_cache($cache_key, $response_data, $this->cache_duration);
        
        error_log('King Enterprise API - Data generated in ' . $response_data['performance']['total_ms'] . 'ms');
        
        return $response_data;
    }
    
    /**
     * OPTIMIZED CATEGORIES - Hierarchical with counts
     */
    private function get_optimized_categories() {
        $categories = get_terms(array(
            'taxonomy' => 'product_cat',
            'hide_empty' => true,
            'orderby' => 'name',
            'order' => 'ASC',
            'number' => 100
        ));
        
        if (is_wp_error($categories)) {
            return array();
        }
        
        $formatted_categories = array();
        $category_hierarchy = array();
        
        foreach ($categories as $cat) {
            $category_data = array(
                'id' => $cat->term_id,
                'name' => $cat->name,
                'slug' => $cat->slug,
                'count' => $cat->count,
                'parent' => $cat->parent,
                'description' => $cat->description,
                'image' => $this->get_category_image($cat->term_id),
                'children' => array()
            );
            
            $formatted_categories[] = $category_data;
            
            if ($cat->parent == 0) {
                $category_hierarchy[$cat->term_id] = $category_data;
            }
        }
        
        // Build hierarchy
        foreach ($formatted_categories as $cat) {
            if ($cat['parent'] != 0 && isset($category_hierarchy[$cat['parent']])) {
                $category_hierarchy[$cat['parent']]['children'][] = $cat;
            }
        }
        
        return array(
            'all' => $formatted_categories,
            'hierarchy' => array_values($category_hierarchy),
            'total' => count($formatted_categories)
        );
    }
    
    /**
     * OPTIMIZED ATTRIBUTES - Only used attributes with counts
     */
    private function get_optimized_attributes() {
        global $wpdb;
        
        // Get only attributes that are actually used
        $used_attributes = $wpdb->get_results("
            SELECT DISTINCT pa.attribute_name, pa.attribute_label, pa.attribute_type
            FROM {$wpdb->prefix}woocommerce_attribute_taxonomies pa
            INNER JOIN {$wpdb->prefix}term_taxonomy tt ON tt.taxonomy = CONCAT('pa_', pa.attribute_name)
            WHERE tt.count > 0
            ORDER BY pa.attribute_name
        ");
        
        $attributes = array();
        
        foreach ($used_attributes as $attr) {
            $taxonomy = 'pa_' . $attr->attribute_name;
            $terms = get_terms(array(
                'taxonomy' => $taxonomy,
                'hide_empty' => true,
                'orderby' => 'name',
                'order' => 'ASC'
            ));
            
            if (!is_wp_error($terms) && !empty($terms)) {
                $attribute_data = array(
                    'id' => $attr->attribute_name,
                    'name' => $attr->attribute_label,
                    'slug' => $attr->attribute_name,
                    'type' => $attr->attribute_type,
                    'terms' => array()
                );
                
                foreach ($terms as $term) {
                    $attribute_data['terms'][] = array(
                        'id' => $term->term_id,
                        'name' => $term->name,
                        'slug' => $term->slug,
                        'count' => $term->count
                    );
                }
                
                $attributes[] = $attribute_data;
            }
        }
        
        return array(
            'all' => $attributes,
            'total' => count($attributes)
        );
    }
    
    /**
     * OPTIMIZED PRODUCTS - Only essential fields
     */
    private function get_optimized_products($request) {
        $page = $request->get_param('page') ?: 1;
        $per_page = $request->get_param('per_page') ?: 12;
        $category = $request->get_param('category');
        $search = $request->get_param('search');
        $min_price = $request->get_param('min_price');
        $max_price = $request->get_param('max_price');
        $on_sale = $request->get_param('on_sale');
        $featured = $request->get_param('featured');
        $stock_status = $request->get_param('stock_status');
        $orderby = $request->get_param('orderby') ?: 'menu_order';
        $order = $request->get_param('order') ?: 'ASC';
        
        // Build WP_Query args
        $args = array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => $per_page,
            'paged' => $page,
            'orderby' => $orderby,
            'order' => $order,
            'meta_query' => array(),
            'tax_query' => array()
        );
        
        // Add category filter
        if ($category) {
            if (strpos($category, ',') !== false) {
                $category_slugs = array_filter(array_map('trim', explode(',', $category)));
                $args['tax_query'][] = array(
                    'taxonomy' => 'product_cat',
                    'field' => 'slug',
                    'terms' => $category_slugs,
                    'operator' => 'IN'
                );
            } else {
                $args['tax_query'][] = array(
                    'taxonomy' => 'product_cat',
                    'field' => 'slug',
                    'terms' => $category
                );
            }
        }
        
        // Add search
        if ($search) {
            $args['s'] = $search;
        }
        
        // Add price filters
        if ($min_price !== null || $max_price !== null) {
            $price_query = array(
                'key' => '_price',
                'type' => 'NUMERIC'
            );
            if ($min_price !== null) {
                $price_query['value'] = $min_price;
                $price_query['compare'] = '>=';
            }
            if ($max_price !== null) {
                $price_query['value'] = $max_price;
                $price_query['compare'] = '<=';
            }
            $args['meta_query'][] = $price_query;
        }
        
        // Add on sale filter
        if ($on_sale) {
            $args['meta_query'][] = array(
                'key' => '_sale_price',
                'value' => '',
                'compare' => '!='
            );
        }
        
        // Add featured filter
        if ($featured) {
            $args['meta_query'][] = array(
                'key' => '_featured',
                'value' => 'yes'
            );
        }
        
        // Add stock status filter
        if ($stock_status) {
            $args['meta_query'][] = array(
                'key' => '_stock_status',
                'value' => $stock_status
            );
        }
        
        $query = new WP_Query($args);
        $products = array();
        
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $product = wc_get_product(get_the_ID());
                
                if ($product) {
                    $products[] = $this->format_product_for_api($product);
                }
            }
        }
        
        wp_reset_postdata();
        
        return array(
            'products' => $products,
            'total' => $query->found_posts,
            'total_pages' => $query->max_num_pages,
            'current_page' => $page,
            'per_page' => $per_page
        );
    }
    
    /**
     * FORMAT PRODUCT FOR API - Only essential fields
     */
    private function format_product_for_api($product) {
        $image_id = $product->get_image_id();
        $image_url = $image_id ? wp_get_attachment_image_url($image_id, 'medium') : wc_placeholder_img_src('medium');
        
        return array(
            'id' => $product->get_id(),
            'name' => $product->get_name(),
            'slug' => $product->get_slug(),
            'price' => $product->get_price(),
            'regular_price' => $product->get_regular_price(),
            'sale_price' => $product->get_sale_price(),
            'on_sale' => $product->is_on_sale(),
            'featured' => $product->is_featured(),
            'image' => $image_url,
            'stock_status' => $product->get_stock_status(),
            'type' => $product->get_type(),
            'short_description' => $product->get_short_description(),
            'categories' => wp_get_post_terms($product->get_id(), 'product_cat', array('fields' => 'names')),
            'rating' => $product->get_average_rating(),
            'rating_count' => $product->get_rating_count()
        );
    }
    
    /**
     * GET CATEGORY IMAGE
     */
    private function get_category_image($category_id) {
        $thumbnail_id = get_term_meta($category_id, 'thumbnail_id', true);
        if ($thumbnail_id) {
            $image_url = wp_get_attachment_image_url($thumbnail_id, 'medium');
            return $image_url ?: '';
        }
        return '';
    }
    
    /**
     * CACHE METHODS
     */
    private function get_cache($key) {
        if (!$this->redis_available) {
            return get_transient($key);
        }
        
        try {
            $redis = new Redis();
            $redis->connect('127.0.0.1', 6379);
            $data = $redis->get($key);
            $redis->close();
            return $data ? unserialize($data) : false;
        } catch (Exception $e) {
            return get_transient($key);
        }
    }
    
    private function set_cache($key, $data, $duration) {
        if (!$this->redis_available) {
            set_transient($key, $data, $duration);
            return;
        }
        
        try {
            $redis = new Redis();
            $redis->connect('127.0.0.1', 6379);
            $redis->setex($key, $duration, serialize($data));
            $redis->close();
        } catch (Exception $e) {
            set_transient($key, $data, $duration);
        }
    }
    
    /**
     * CLEAR ALL CACHE
     */
    public function clear_all_cache() {
        if (!$this->redis_available) {
            global $wpdb;
            $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_king_enterprise_%'");
            return;
        }
        
        try {
            $redis = new Redis();
            $redis->connect('127.0.0.1', 6379);
            $keys = $redis->keys($this->cache_prefix . '*');
            if (!empty($keys)) {
                $redis->del($keys);
            }
            $redis->close();
        } catch (Exception $e) {
            // Ignore Redis errors
        }
    }
}

// Initialize the enterprise API
new KingEnterpriseAPI();
