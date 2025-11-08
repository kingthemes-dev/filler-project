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
        // CORS is now handled centrally in headless-config.php
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
                ),
                'images' => array(
                    'required' => false,
                    'type' => 'array',
                    'description' => 'Array of image attachment IDs or URLs'
                ),
                'videos' => array(
                    'required' => false,
                    'type' => 'array',
                    'description' => 'Array of video URLs (YouTube, Vimeo, etc.)'
                )
            )
        ));
        
        // Register image upload endpoint
        register_rest_route('king-reviews/v1', '/upload-image', array(
            'methods' => 'POST',
            'callback' => array($this, 'upload_review_image'),
            'permission_callback' => '__return_true',
            'args' => array()
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
            $review_images = get_comment_meta($review->comment_ID, 'review_images', false);
            $review_videos = get_comment_meta($review->comment_ID, 'review_videos', false);
            
            // Format images - ensure array format
            $images = array();
            if (!empty($review_images)) {
                // Handle both single and multiple images
                $images_raw = is_array($review_images) && count($review_images) === 1 && is_array($review_images[0])
                    ? $review_images[0]
                    : $review_images;
                    
                foreach ((array)$images_raw as $image) {
                    if (is_numeric($image)) {
                        // If it's an attachment ID, get the URL
                        $image_url = wp_get_attachment_image_url($image, 'full');
                        if ($image_url) {
                            $images[] = array(
                                'id' => intval($image),
                                'url' => $image_url,
                                'thumbnail' => wp_get_attachment_image_url($image, 'thumbnail'),
                                'medium' => wp_get_attachment_image_url($image, 'medium'),
                                'large' => wp_get_attachment_image_url($image, 'large')
                            );
                        }
                    } elseif (is_string($image) && filter_var($image, FILTER_VALIDATE_URL)) {
                        // If it's already a URL
                        $images[] = array(
                            'url' => $image,
                            'thumbnail' => $image,
                            'medium' => $image,
                            'large' => $image
                        );
                    }
                }
            }
            
            // Format videos - ensure array format
            $videos = array();
            if (!empty($review_videos)) {
                $videos_raw = is_array($review_videos) && count($review_videos) === 1 && is_array($review_videos[0])
                    ? $review_videos[0]
                    : $review_videos;
                    
                foreach ((array)$videos_raw as $video) {
                    if (is_string($video) && filter_var($video, FILTER_VALIDATE_URL)) {
                        $videos[] = $video;
                    }
                }
            }
            
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
                ),
                'images' => $images,
                'videos' => $videos
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
        
        // Handle image attachments if provided
        $image_urls = $request->get_param('images');
        if (!empty($image_urls) && is_array($image_urls)) {
            // Store image URLs as comment meta (array of URLs)
            // Images are already uploaded via separate endpoint and converted to attachment IDs
            add_comment_meta($comment_id, 'review_images', $image_urls, false);
        }
        
        // Handle video URLs if provided (YouTube, Vimeo, etc.)
        $video_urls = $request->get_param('videos');
        if (!empty($video_urls) && is_array($video_urls)) {
            add_comment_meta($comment_id, 'review_videos', $video_urls, false);
        }
        
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
            'message' => 'Review created successfully',
            'images' => !empty($image_urls) ? $image_urls : array(),
            'videos' => !empty($video_urls) ? $video_urls : array()
        ), 201);
    }
    
    /**
     * Upload image for review
     * Handles file upload and returns attachment ID and URLs
     */
    public function upload_review_image($request) {
        // Check if file was uploaded
        if (empty($_FILES['image'])) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'No file uploaded'
            ), 400);
        }
        
        $file = $_FILES['image'];
        
        // Validate file type (only images)
        $allowed_types = array('image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp');
        $file_type = wp_check_filetype($file['name']);
        
        if (!in_array($file['type'], $allowed_types) && !in_array($file_type['type'], $allowed_types)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.'
            ), 400);
        }
        
        // Validate file size (max 5MB)
        $max_size = 5 * 1024 * 1024; // 5MB
        if ($file['size'] > $max_size) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'File too large. Maximum size is 5MB.'
            ), 400);
        }
        
        // Include WordPress file handling functions
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/media.php');
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        
        // Handle file upload
        $upload = wp_handle_upload($file, array('test_form' => false));
        
        if (isset($upload['error'])) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => $upload['error']
            ), 400);
        }
        
        // Create attachment
        $attachment_data = array(
            'post_mime_type' => $upload['type'],
            'post_title' => sanitize_file_name(pathinfo($file['name'], PATHINFO_FILENAME)),
            'post_content' => '',
            'post_status' => 'inherit'
        );
        
        $attachment_id = wp_insert_attachment($attachment_data, $upload['file']);
        
        if (is_wp_error($attachment_id)) {
            return new WP_REST_Response(array(
                'success' => false,
                'error' => 'Failed to create attachment'
            ), 500);
        }
        
        // Generate attachment metadata and thumbnails
        $attach_data = wp_generate_attachment_metadata($attachment_id, $upload['file']);
        wp_update_attachment_metadata($attachment_id, $attach_data);
        
        // Return attachment ID and URLs
        return new WP_REST_Response(array(
            'success' => true,
            'attachment_id' => $attachment_id,
            'url' => wp_get_attachment_image_url($attachment_id, 'full'),
            'thumbnail' => wp_get_attachment_image_url($attachment_id, 'thumbnail'),
            'medium' => wp_get_attachment_image_url($attachment_id, 'medium'),
            'large' => wp_get_attachment_image_url($attachment_id, 'large')
        ), 200);
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

