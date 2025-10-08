<?php
/**
 * Plugin Name: King Shop API
 * Description: Optimized shop page API with Redis caching - products, categories, attributes in one request
 * Version: 1.0.0
 * Author: King
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KingShopAPI {
    
    private $cache_duration = 24 * 60 * 60; // 24 hours
    private $redis_available = false;
    
    public function __construct() {
        // Check if Redis is available
        if (class_exists('Redis')) {
            $this->redis_available = true;
        }
        
        add_action('rest_api_init', array($this, 'register_routes'));
        
        // Clear cache when products are updated
        add_action('woocommerce_update_product', array($this, 'clear_shop_cache'));
        add_action('woocommerce_new_product', array($this, 'clear_shop_cache'));
        add_action('woocommerce_delete_product', array($this, 'clear_shop_cache'));
    }
    
    /**
     * Register REST API routes
     */
    public function register_routes() {
        // Shop data - everything in one request
        register_rest_route('king-shop/v1', '/data', array(
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
                    'description' => 'Category slug or ID'
                ),
                'search' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Search term'
                ),
                'orderby' => array(
                    'required' => false,
                    'type' => 'string',
                    'default' => 'date',
                    'description' => 'Order by field'
                ),
                'order' => array(
                    'required' => false,
                    'type' => 'string',
                    'default' => 'desc',
                    'description' => 'Order direction'
                ),
                'on_sale' => array(
                    'required' => false,
                    'type' => 'boolean',
                    'default' => false,
                    'description' => 'Show only on sale products'
                ),
                'featured' => array(
                    'required' => false,
                    'type' => 'boolean',
                    'default' => false,
                    'description' => 'Show only featured products'
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
                'attributes' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Attribute filters (JSON)'
                )
            )
        ));
        
        // Dynamic attributes endpoint - PRO Architecture
        register_rest_route('king-shop/v1', '/attributes', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_dynamic_attributes'),
            'permission_callback' => '__return_true',
            'args' => array(
                'category' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Category slug or comma-separated slugs for filtering attributes'
                ),
                'search' => array(
                    'required' => false,
                    'type' => 'string',
                    'description' => 'Search term for additional filtering'
                ),
                'min_price' => array(
                    'required' => false,
                    'type' => 'number',
                    'description' => 'Minimum price for filtering'
                ),
                'max_price' => array(
                    'required' => false,
                    'type' => 'number',
                    'description' => 'Maximum price for filtering'
                )
            )
        ));
    }
    
    /**
     * Get complete shop data - products, categories, attributes in one request
     */
    public function get_shop_data($request) {
        $page = $request->get_param('page');
        $per_page = $request->get_param('per_page');
        $category = $request->get_param('category');
        $search = $request->get_param('search');
        $orderby = $request->get_param('orderby');
        $order = $request->get_param('order');
        $on_sale = $request->get_param('on_sale');
        $featured = $request->get_param('featured');
        $min_price = $request->get_param('min_price');
        $max_price = $request->get_param('max_price');
        $attributes = $request->get_param('attributes');
        // New: attribute shortcuts via comma-separated slugs
        $capacities = $request->get_param('capacities'); // e.g. "30ml,50ml"
        $brands = $request->get_param('brands'); // e.g. "bidalli,filler"
        $cache_param = $request->get_param('cache');
        $bypass_cache = ($cache_param === 'off' || $cache_param === '0');
        
        // Create cache key
        $cache_key = 'king_shop_data_' . md5(serialize(array(
            $page, $per_page, $category, $search, $orderby, $order,
            $on_sale, $featured, $min_price, $max_price, $attributes,
            $capacities, $brands, $request->get_params()
        )));
        
        // Try Redis cache first
        if (!$bypass_cache && $this->redis_available) {
            $cached_data = $this->get_redis_cache($cache_key);
            if ($cached_data !== false) {
                return $cached_data;
            }
        }
        
        // Try WordPress cache
        if (!$bypass_cache) {
            $cached_data = wp_cache_get($cache_key, 'king_shop');
            if ($cached_data !== false) {
                return $cached_data;
            }
        }
        
        // Build WooCommerce query args
        $args = array(
            'status'   => 'publish',
            'limit'    => (int) $per_page,
            'page'     => (int) $page,
            'orderby'  => $orderby,
            'order'    => $order,
            'return'   => 'objects' // Return full objects
        );
        
        // Add filters
        if ($category) {
            // Handle multiple categories (comma-separated)
            if (strpos($category, ',') !== false) {
                $category_slugs = array_filter(array_map('trim', explode(',', $category)));
                $args['category'] = $category_slugs;
            } else {
                if (is_numeric($category)) {
                    $args['category'] = array($category);
                } else {
                    $args['category'] = array($category);
                }
            }
        }
        
        if ($search) {
            $args['search'] = $search;
        }
        
        if ($on_sale) {
            // Force hard SQL fallback for on_sale - use meta_query instead of on_sale
            if (!isset($args['meta_query'])) $args['meta_query'] = array('relation' => 'AND');
            $args['meta_query'][] = array(
                'relation' => 'OR',
                array(
                    'key' => '_sale_price',
                    'value' => '',
                    'compare' => '!=',
                ),
                array(
                    'key' => '_sale_price',
                    'value' => 0,
                    'compare' => '>',
                    'type' => 'NUMERIC',
                )
            );
            // Remove on_sale from args as we're using meta_query
            unset($args['on_sale']);
        }
        
        if ($featured) {
            $args['featured'] = true;
        }
        
        // Force hard SQL fallback for price range - use meta_query instead of min_price/max_price
        if ($min_price !== null && $min_price !== '') {
            error_log('King Shop API Debug - Adding min_price meta_query: ' . $min_price);
            if (!isset($args['meta_query'])) $args['meta_query'] = array('relation' => 'AND');
            $args['meta_query'][] = array(
                'key' => '_price',
                'value' => (float) $min_price,
                'compare' => '>=',
                'type' => 'NUMERIC',
            );
            // Remove min_price from args as we're using meta_query
            unset($args['min_price']);
        }
        if ($max_price !== null && $max_price !== '') {
            error_log('King Shop API Debug - Adding max_price meta_query: ' . $max_price);
            if (!isset($args['meta_query'])) $args['meta_query'] = array('relation' => 'AND');
            $args['meta_query'][] = array(
                'key' => '_price',
                'value' => (float) $max_price,
                'compare' => '<=',
                'type' => 'NUMERIC',
            );
            // Remove max_price from args as we're using meta_query
            unset($args['max_price']);
        }
        
        // Handle attribute filters
        if ($attributes) {
            $attr_filters = json_decode($attributes, true);
            if (is_array($attr_filters)) {
                $args['tax_query'] = array('relation' => 'AND');
                foreach ($attr_filters as $attr_name => $terms) {
                    if (!empty($terms)) {
                        $args['tax_query'][] = array(
                            'taxonomy' => 'pa_' . $attr_name,
                            'field' => 'term_id',
                            'terms' => $terms,
                            'operator' => 'IN'
                        );
                    }
                }
            }
        }

        // New: capacities filter via slugs
        if (!empty($capacities)) {
            if (!isset($args['tax_query'])) {
                $args['tax_query'] = array('relation' => 'AND');
            }
            $capacity_slugs = array_filter(array_map('sanitize_title', explode(',', (string)$capacities)));
            if (!empty($capacity_slugs)) {
                $args['tax_query'][] = array(
                    'taxonomy' => 'pa_pojemnosc',
                    'field' => 'slug',
                    'terms' => $capacity_slugs,
                    'operator' => 'IN'
                );
            }
        }

        // New: brands filter via slugs
        if (!empty($brands)) {
            if (!isset($args['tax_query'])) {
                $args['tax_query'] = array('relation' => 'AND');
            }
            $brand_slugs = array_filter(array_map('sanitize_title', explode(',', (string)$brands)));
            if (!empty($brand_slugs)) {
                $args['tax_query'][] = array(
                    'taxonomy' => 'pa_marka',
                    'field' => 'slug',
                    'terms' => $brand_slugs,
                    'operator' => 'IN'
                );
            }
        }

        // New: pa_* attribute filters (e.g., pa_pojemnosc, pa_marka, pa_zastosowanie)
        $pa_filters = array();
        foreach ($request->get_params() as $param_name => $param_value) {
            if (strpos($param_name, 'pa_') === 0 && !empty($param_value)) {
                $pa_filters[$param_name] = $param_value;
            }
        }
        
        if (!empty($pa_filters)) {
            if (!isset($args['tax_query'])) {
                $args['tax_query'] = array('relation' => 'AND');
            }
            foreach ($pa_filters as $attr_name => $attr_values) {
                $attr_slugs = array_filter(array_map('sanitize_title', explode(',', (string)$attr_values)));
                if (!empty($attr_slugs)) {
                    $args['tax_query'][] = array(
                        'taxonomy' => $attr_name,
                        'field' => 'slug',
                        'terms' => $attr_slugs,
                        'operator' => 'IN'
                    );
                }
            }
        }
        
        // PRO: attribute_* filters for tree-like recalculation (e.g., attribute_pojemnosc, attribute_marka)
        $attribute_filters = array();
        foreach ($request->get_params() as $param_name => $param_value) {
            if (strpos($param_name, 'attribute_') === 0 && !empty($param_value)) {
                $attr_name = 'pa_' . str_replace('attribute_', '', $param_name);
                error_log("King Shop API Debug - Processing attribute filter: {$param_name} = {$param_value} -> {$attr_name}");
                if (!isset($attribute_filters[$attr_name])) {
                    $attribute_filters[$attr_name] = array();
                }
                // PRO: Handle comma-separated values (multiple selections)
                $values = is_array($param_value) ? $param_value : explode(',', $param_value);
                foreach ($values as $value) {
                    $attribute_filters[$attr_name][] = sanitize_title(trim($value));
                }
            }
        }
        
        if (!empty($attribute_filters)) {
            if (!isset($args['tax_query'])) {
                $args['tax_query'] = array('relation' => 'AND');
            }
            foreach ($attribute_filters as $attr_name => $attr_values) {
                if (!empty($attr_values)) {
                    // Remove duplicates
                    $attr_values = array_unique($attr_values);
                    $args['tax_query'][] = array(
                        'taxonomy' => $attr_name,
                        'field' => 'slug',
                        'terms' => $attr_values,
                        'operator' => 'IN'
                    );
                }
            }
        }
        
        // Get products with pagination - use WP_Query for better meta_query support
        $wp_query_args = array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => (int) $per_page,
            'paged' => (int) $page,
            'orderby' => $orderby,
            'order' => $order,
            'meta_query' => isset($args['meta_query']) ? $args['meta_query'] : array(),
            'tax_query' => isset($args['tax_query']) ? $args['tax_query'] : array(),
        );
        
        // Add search
        if ($search) {
            $wp_query_args['s'] = $search;
        }
        
        // Add category filter - PRO Architecture: Handle multiple categories with OR logic
        if ($category) {
            error_log('King Shop API Debug - Category filter: ' . $category);
            // Handle multiple categories (comma-separated) - use OR logic
            if (strpos($category, ',') !== false) {
                $category_slugs = array_filter(array_map('trim', explode(',', $category)));
                error_log('King Shop API Debug - Multiple categories: ' . print_r($category_slugs, true));
                $wp_query_args['tax_query'][] = array(
                    'taxonomy' => 'product_cat',
                    'field' => 'slug',
                    'terms' => $category_slugs,
                    'operator' => 'IN'
                );
            } else {
                if (is_numeric($category)) {
                    $wp_query_args['tax_query'][] = array(
                        'taxonomy' => 'product_cat',
                        'field' => 'term_id',
                        'terms' => array($category),
                    );
                } else {
                    $wp_query_args['tax_query'][] = array(
                        'taxonomy' => 'product_cat',
                        'field' => 'slug',
                        'terms' => array($category),
                    );
                }
            }
        }
        
        // Add featured filter
        if ($featured) {
            $wp_query_args['meta_query'][] = array(
                'key' => '_featured',
                'value' => 'yes',
                'compare' => '=',
            );
        }
        
        // PRO Architecture: Set proper tax_query relation
        // Multiple tax_query conditions should use AND relation (different taxonomies)
        if (count($wp_query_args['tax_query']) > 1) {
            $wp_query_args['tax_query']['relation'] = 'AND';
        }
        
        // Debug: Log final tax_query structure
        error_log('King Shop API Debug - Final tax_query: ' . print_r($wp_query_args['tax_query'], true));
        
        $wp_query = new WP_Query($wp_query_args);
        $product_ids = array();
        
        error_log('King Shop API Debug - WP_Query args: ' . print_r($wp_query_args, true));
        error_log('King Shop API Debug - WP_Query found posts: ' . $wp_query->found_posts);
        error_log('King Shop API Debug - WP_Query post count: ' . $wp_query->post_count);
        
        if ($wp_query->have_posts()) {
            while ($wp_query->have_posts()) {
                $wp_query->the_post();
                $product_ids[] = get_the_ID();
            }
            wp_reset_postdata();
        }
        
        // Debug: log query args and results
        error_log('King Shop API Debug - Query args: ' . print_r($args, true));
        error_log('King Shop API Debug - On sale param: ' . ($on_sale ? 'true' : 'false'));
        error_log('King Shop API Debug - Min price: ' . $min_price);
        error_log('King Shop API Debug - Max price: ' . $max_price);
        error_log('King Shop API Debug - Product IDs count: ' . count($product_ids));

        // Compute total count with the same filters (without pagination)
        $count_args = $args;
        unset($count_args['limit']);
        unset($count_args['page']);
        if ($on_sale) {
            // Force hard SQL fallback for on_sale count - same as main query
            if (!isset($count_args['meta_query'])) $count_args['meta_query'] = array('relation' => 'AND');
            $count_args['meta_query'][] = array(
                'relation' => 'OR',
                array(
                    'key' => '_sale_price',
                    'value' => '',
                    'compare' => '!=',
                ),
                array(
                    'key' => '_sale_price',
                    'value' => 0,
                    'compare' => '>',
                    'type' => 'NUMERIC',
                )
            );
            // Remove on_sale from count_args as we're using meta_query
            unset($count_args['on_sale']);
        }
        // Use WP_Query for count too
        $count_wp_query_args = $wp_query_args;
        unset($count_wp_query_args['posts_per_page']);
        unset($count_wp_query_args['paged']);
        $count_wp_query = new WP_Query($count_wp_query_args);
        $total_products = $count_wp_query->found_posts;
        wp_reset_postdata();

        // Remove old PHP fallback - now using hard SQL meta_query
        
        // Format products
        $formatted_products = array();
        foreach ($product_ids as $product_id) {
            $product = wc_get_product($product_id);
            if ($product) {
                $formatted_products[] = $this->format_product($product);
            }
        }
        
        // Get categories
        $categories = get_terms(array(
            'taxonomy' => 'product_cat',
            'hide_empty' => true,
            'orderby' => 'name',
            'order' => 'ASC',
            'number' => 50 // Limit for performance
        ));
        
        $formatted_categories = array();
        foreach ($categories as $cat) {
            $formatted_categories[] = array(
                'id' => $cat->term_id,
                'name' => $cat->name,
                'slug' => $cat->slug,
                'count' => $cat->count
            );
        }
        
        // Prepare base args for counting (same filters, no pagination)
        $base_count_args = $args;
        unset($base_count_args['per_page']);
        unset($base_count_args['page']);

        // Get capacity attribute terms
        $capacity_terms = get_terms(array(
            'taxonomy' => 'pa_pojemnosc',
            'hide_empty' => true,
            'orderby' => 'name',
            'order' => 'ASC'
        ));
        
        $capacities = array();
        foreach ($capacity_terms as $term) {
            // Count products for this capacity with current filters
            $cap_args = $base_count_args;
            if (!isset($cap_args['tax_query'])) {
                $cap_args['tax_query'] = array('relation' => 'AND');
            }
            $cap_args['tax_query'][] = array(
                'taxonomy' => 'pa_pojemnosc',
                'field' => 'term_id',
                'terms' => array($term->term_id),
                'operator' => 'IN'
            );
            $cap_products = wc_get_products($cap_args);
            $cap_count = count($cap_products);

            $capacities[] = array(
                'id' => $term->term_id,
                'name' => $term->name,
                'slug' => $term->slug,
                'count' => (int) $cap_count
            );
        }
        
        // Get brand attribute terms
        $brand_terms = get_terms(array(
            'taxonomy' => 'pa_marka',
            'hide_empty' => true,
            'orderby' => 'name',
            'order' => 'ASC'
        ));
        
        $brands = array();
        foreach ($brand_terms as $term) {
            // Count products for this brand with current filters
            $brand_args = $base_count_args;
            if (!isset($brand_args['tax_query'])) {
                $brand_args['tax_query'] = array('relation' => 'AND');
            }
            $brand_args['tax_query'][] = array(
                'taxonomy' => 'pa_marka',
                'field' => 'term_id',
                'terms' => array($term->term_id),
                'operator' => 'IN'
            );
            $brand_products = wc_get_products($brand_args);
            $brand_count = count($brand_products);

            $brands[] = array(
                'id' => $term->term_id,
                'name' => $term->name,
                'slug' => $term->slug,
                'count' => (int) $brand_count
            );
        }
        
        // Build response
        $data = array(
            'success' => true,
            'products' => $formatted_products,
            'total' => $total_products,
            'page' => $page,
            'per_page' => $per_page,
            'total_pages' => ceil($total_products / $per_page),
            'categories' => $formatted_categories,
            'attributes' => array(
                'capacities' => $capacities,
                'brands' => $brands
            ),
            'filters' => array(
                'search' => $search,
                'category' => $category,
                'orderby' => $orderby,
                'order' => $order,
                'on_sale' => $on_sale,
                'featured' => $featured,
                'min_price' => $min_price,
                'max_price' => $max_price
            )
        );
        
        // Cache the result
        if (!$bypass_cache) {
            if ($this->redis_available) {
                $this->set_redis_cache($cache_key, $data, $this->cache_duration);
            }
            wp_cache_set($cache_key, $data, 'king_shop', $this->cache_duration);
        }
        
        return $data;
    }
    
    /**
     * Format product for list view
     */
    private function format_product($product) {
        $image_id = $product->get_image_id();
        $image_url = $image_id ? wp_get_attachment_image_url($image_id, 'woocommerce_thumbnail') : wc_placeholder_img_src('woocommerce_thumbnail');
        
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
            'images' => array($image_url), // For compatibility
            'categories' => wp_get_post_terms($product->get_id(), 'product_cat', array('fields' => 'names')),
            'stock_status' => $product->get_stock_status(),
            'type' => $product->get_type(),
            'short_description' => $product->get_short_description(),
            'description' => $product->get_description(),
            'attributes' => $this->get_product_attributes($product)
        );
    }
    
    /**
     * Get product attributes
     */
    private function get_product_attributes($product) {
        $attributes = array();
        $product_attributes = $product->get_attributes();
        
        foreach ($product_attributes as $attribute) {
            $attribute_name = $attribute->get_name();
            $attribute_slug = str_replace('pa_', '', $attribute_name);
            
            if ($attribute->is_taxonomy()) {
                $terms = wp_get_post_terms($product->get_id(), $attribute_name, array('fields' => 'all'));
                $options = array();
                foreach ($terms as $term) {
                    $options[] = array(
                        'id' => $term->term_id,
                        'name' => $term->name,
                        'slug' => $term->slug
                    );
                }
            } else {
                $options = $attribute->get_options();
            }
            
            $attributes[] = array(
                'name' => $attribute_name,
                'slug' => $attribute_slug,
                'options' => $options
            );
        }
        
        return $attributes;
    }
    
    /**
     * Redis cache methods
     */
    private function get_redis_cache($key) {
        if (!$this->redis_available) return false;
        
        try {
            $redis = new Redis();
            $redis->connect('127.0.0.1', 6379);
            $data = $redis->get($key);
            $redis->close();
            
            return $data ? json_decode($data, true) : false;
        } catch (Exception $e) {
            return false;
        }
    }
    
    private function set_redis_cache($key, $data, $duration) {
        if (!$this->redis_available) return false;
        
        try {
            $redis = new Redis();
            $redis->connect('127.0.0.1', 6379);
            $redis->setex($key, $duration, json_encode($data));
            $redis->close();
            
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Get dynamic attributes based on current filters - PRO Architecture
     */
    public function get_dynamic_attributes($request) {
        $category = $request->get_param('category');
        $search = $request->get_param('search');
        $min_price = $request->get_param('min_price');
        $max_price = $request->get_param('max_price');
        
        // Create cache key for attributes
        $cache_key = 'king_attributes_' . md5(serialize(array(
            $category, $search, $min_price, $max_price
        )));
        
        // TEMPORARY: Skip cache to debug
        // TODO: Re-enable cache after fixing the issue
        
        // Build query to get products that match current filters
        $wp_query_args = array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => -1, // Get all products to count attributes
            'meta_query' => array(),
            'tax_query' => array()
        );
        
        // Add search
        if ($search) {
            $wp_query_args['s'] = $search;
        }
        
        // Add category filter
        if ($category) {
            if (strpos($category, ',') !== false) {
                $category_slugs = array_filter(array_map('trim', explode(',', $category)));
                $wp_query_args['tax_query'][] = array(
                    'taxonomy' => 'product_cat',
                    'field' => 'slug',
                    'terms' => $category_slugs,
                    'operator' => 'IN'
                );
            } else {
                if (is_numeric($category)) {
                    $wp_query_args['tax_query'][] = array(
                        'taxonomy' => 'product_cat',
                        'field' => 'term_id',
                        'terms' => array($category),
                    );
                } else {
                    $wp_query_args['tax_query'][] = array(
                        'taxonomy' => 'product_cat',
                        'field' => 'slug',
                        'terms' => array($category),
                    );
                }
            }
        }
        
        // Add price filters
        if ($min_price !== null && $min_price !== '') {
            $wp_query_args['meta_query'][] = array(
                'key' => '_price',
                'value' => (float) $min_price,
                'compare' => '>=',
                'type' => 'NUMERIC',
            );
        }
        if ($max_price !== null && $max_price !== '') {
            $wp_query_args['meta_query'][] = array(
                'key' => '_price',
                'value' => (float) $max_price,
                'compare' => '<=',
                'type' => 'NUMERIC',
            );
        }
        
        // Set tax_query relation
        if (count($wp_query_args['tax_query']) > 1) {
            $wp_query_args['tax_query']['relation'] = 'AND';
        }
        
        $wp_query = new WP_Query($wp_query_args);
        $product_ids = array();
        
        if ($wp_query->have_posts()) {
            while ($wp_query->have_posts()) {
                $wp_query->the_post();
                $product_ids[] = get_the_ID();
            }
            wp_reset_postdata();
        }
        
        // Get all product attributes
        $attributes = array();
        
        if (!empty($product_ids)) {
            // Get all attribute taxonomies
            $attribute_taxonomies = wc_get_attribute_taxonomies();
            
            foreach ($attribute_taxonomies as $attribute) {
                $taxonomy = 'pa_' . $attribute->attribute_name;
                
                // Get terms for this attribute that are used by filtered products
                $terms = wp_get_object_terms($product_ids, $taxonomy, array(
                    'hide_empty' => true
                ));
                
                if (!is_wp_error($terms) && !empty($terms)) {
                    $attribute_data = array(
                        'id' => $attribute->attribute_id,
                        'name' => $attribute->attribute_label,
                        'slug' => $attribute->attribute_name,
                        'type' => $attribute->attribute_type,
                        'order_by' => $attribute->attribute_orderby,
                        'has_archives' => $attribute->attribute_public,
                        'terms' => array()
                    );
                    
                    foreach ($terms as $term) {
                        // Count how many products have this term
                        $count = 0;
                        foreach ($product_ids as $product_id) {
                            if (has_term($term->term_id, $taxonomy, $product_id)) {
                                $count++;
                            }
                        }
                        
                        if ($count > 0) {
                            $attribute_data['terms'][] = array(
                                'id' => $term->term_id,
                                'name' => $term->name,
                                'slug' => $term->slug,
                                'count' => $count
                            );
                        }
                    }
                    
                    if (!empty($attribute_data['terms'])) {
                        $attributes[$attribute->attribute_name] = $attribute_data;
                    }
                }
            }
        }
        
        $response_data = array(
            'success' => true,
            'attributes' => $attributes,
            'total_products' => count($product_ids)
        );
        
        // TEMPORARY: Skip cache to debug
        // TODO: Re-enable cache after fixing the issue
        
        return new WP_REST_Response($response_data, 200);
    }
    
    /**
     * Clear shop cache when products are updated
     */
    public function clear_shop_cache() {
        // Clear WordPress cache
        wp_cache_flush_group('king_shop');
        
        // Clear Redis cache if available
        if ($this->redis_available) {
            try {
                $redis = new Redis();
                $redis->connect('127.0.0.1', 6379);
                $keys = $redis->keys('king_shop_data_*');
                if (!empty($keys)) {
                    $redis->del($keys);
                }
                $redis->close();
            } catch (Exception $e) {
                // Ignore Redis errors
            }
        }
    }
}

// Initialize the shop API
new KingShopAPI();
