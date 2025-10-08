<?php
/**
 * Plugin Name: King Reviews API
 * Description: PRO Architecture - Custom reviews API endpoints with auto-approval for headless WooCommerce
 * Version: 1.0.0
 * Author: King
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class KingReviewsAPI {
    
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
        add_action('rest_api_init', array($this, 'add_cors_support'));
    }
    
    /**
     * Add CORS support for REST API
     */
    public function add_cors_support() {
        add_filter('rest_pre_serve_request', array($this, 'add_cors_headers'));
    }
    
    /**
     * Add custom CORS headers
     */
    public function add_cors_headers($value) {
        $origin = get_http_origin();
        $allowed_origins = array(
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'https://www.filler.pl',
            'https://filler.pl'
        );
        
        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce');
        header('Access-Control-Allow-Credentials: true');
        
        return $value;
    }
    
    /**
     * Register REST API routes
     */
    public function register_routes() {
        // Get product reviews
        register_rest_route('king-reviews/v1', '/reviews', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_product_reviews'),
            'permission_callback' => '__return_true',
            'args' => array(
                'product_id' => array(
                    'required' => true,
                    'type' => 'integer',
                    'description' => 'Product ID'
                )
            )
        ));
        
        // Create product review - PRO: Auto-approve for better UX
        register_rest_route('king-reviews/v1', '/reviews', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_product_review'),
            'permission_callback' => '__return_true',
            'args' => array(
                'product_id' => array(
                    'required' => true,
                    'type' => 'integer',
                    'description' => 'Product ID'
                ),
                'review' => array(
                    'required' => true,
                    'type' => 'string',
                    'description' => 'Review content'
                ),
                'reviewer' => array(
                    'required' => true,
                    'type' => 'string',
                    'description' => 'Reviewer name'
                ),
                'reviewer_email' => array(
                    'required' => true,
                    'type' => 'string',
                    'description' => 'Reviewer email'
                ),
                'rating' => array(
                    'required' => true,
                    'type' => 'integer',
                    'description' => 'Rating (1-5)'
                )
            )
        ));
    }
    
    /**
     * Get product reviews - PRO Architecture
     */
    public function get_product_reviews($request) {
        $product_id = $request->get_param('product_id');
        
        if (!$product_id) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Product ID is required'
            ), 400);
        }
        
        // Verify product exists
        $product = wc_get_product($product_id);
        if (!$product) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Product not found'
            ), 404);
        }
        
        // Get all approved reviews for this product
        $reviews = get_comments(array(
            'post_id' => $product_id,
            'type' => 'review',
            'status' => 'approve',
            'orderby' => 'comment_date',
            'order' => 'DESC'
        ));
        
        $formatted_reviews = array();
        foreach ($reviews as $review) {
            $rating = get_comment_meta($review->comment_ID, 'rating', true);
            
            $formatted_reviews[] = array(
                'id' => $review->comment_ID,
                'product_id' => $review->comment_post_ID,
                'reviewer' => $review->comment_author,
                'reviewer_email' => $review->comment_author_email,
                'review' => $review->comment_content,
                'rating' => intval($rating),
                'date_created' => $review->comment_date,
                'date_created_gmt' => $review->comment_date_gmt,
                'status' => $review->comment_approved,
                'reviewer_avatar_urls' => array(
                    '96' => get_avatar_url($review->comment_author_email, array('size' => 96))
                )
            );
        }
        
        return new WP_REST_Response($formatted_reviews, 200);
    }
    
    /**
     * Create product review - PRO: Auto-approve for better UX
     */
    public function create_product_review($request) {
        $product_id = $request->get_param('product_id');
        $review = $request->get_param('review');
        $reviewer = $request->get_param('reviewer');
        $reviewer_email = $request->get_param('reviewer_email');
        $rating = $request->get_param('rating');
        
        // Validate required fields
        if (!$product_id || !$review || !$reviewer || !$reviewer_email || !$rating) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Missing required fields'
            ), 400);
        }
        
        // Validate rating
        if ($rating < 1 || $rating > 5) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Rating must be between 1 and 5'
            ), 400);
        }
        
        // Validate email
        if (!is_email($reviewer_email)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Invalid email address'
            ), 400);
        }
        
        // Verify product exists
        $product = wc_get_product($product_id);
        if (!$product) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Product not found'
            ), 404);
        }
        
        // PRO: Auto-approve reviews for better UX (can be changed to 0 for moderation)
        $comment_approved = 1; // 1 = approved, 0 = pending moderation
        
        // Insert the review
        $comment_data = array(
            'comment_post_ID' => $product_id,
            'comment_author' => sanitize_text_field($reviewer),
            'comment_author_email' => sanitize_email($reviewer_email),
            'comment_content' => sanitize_textarea_field($review),
            'comment_type' => 'review',
            'comment_approved' => $comment_approved,
            'comment_parent' => 0,
            'user_id' => 0 // Guest review
        );
        
        $comment_id = wp_insert_comment($comment_data);
        
        if (!$comment_id) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Failed to create review'
            ), 500);
        }
        
        // Add rating meta
        add_comment_meta($comment_id, 'rating', intval($rating), true);
        
        // Update product rating
        $this->update_product_rating($product_id);
        
        // Clear product cache
        wc_delete_product_transients($product_id);
        
        // Get the created review
        $created_review = get_comment($comment_id);
        
        return new WP_REST_Response(array(
            'success' => true,
            'id' => $comment_id,
            'product_id' => $product_id,
            'reviewer' => $created_review->comment_author,
            'reviewer_email' => $created_review->comment_author_email,
            'review' => $created_review->comment_content,
            'rating' => intval($rating),
            'date_created' => $created_review->comment_date,
            'date_created_gmt' => $created_review->comment_date_gmt,
            'status' => $created_review->comment_approved,
            'message' => 'Review created successfully'
        ), 201);
    }
    
    /**
     * Update product rating after new review
     */
    private function update_product_rating($product_id) {
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
            
            // Update WooCommerce product object
            $product->set_average_rating($average_rating);
            $product->set_rating_counts(array());
            $product->set_review_count($review_count);
            $product->save();
        }
    }
}

// Initialize the plugin
new KingReviewsAPI();

