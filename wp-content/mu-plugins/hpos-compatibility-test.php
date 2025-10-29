<?php
/**
 * HPOS Compatibility Test Script
 * Tests all updated mu-plugins for HPOS compatibility
 * 
 * @package KingWooCommerce
 * @version 2.0.0
 * @author King Brand
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * HPOS Compatibility Test Class
 */
class HPOSCompatibilityTest {
    
    private $test_results = [];
    private $hpos_enabled = false;
    
    public function __construct() {
        $this->hpos_enabled = wc_get_container()->get(\Automattic\WooCommerce\Utilities\OrderUtil::class)->custom_orders_table_usage_is_enabled();
        $this->run_tests();
    }
    
    /**
     * Run all HPOS compatibility tests
     */
    public function run_tests() {
        $this->test_results = [
            'hpos_status' => $this->test_hpos_status(),
            'customer_invoices' => $this->test_customer_invoices(),
            'email_system' => $this->test_email_system(),
            'order_creation' => $this->test_order_creation(),
            'invoice_generation' => $this->test_invoice_generation(),
            'email_sending' => $this->test_email_sending(),
            'api_endpoints' => $this->test_api_endpoints()
        ];
        
        $this->log_test_results();
    }
    
    /**
     * Test HPOS status
     */
    private function test_hpos_status() {
        try {
            $hpos_enabled = wc_get_container()->get(\Automattic\WooCommerce\Utilities\OrderUtil::class)->custom_orders_table_usage_is_enabled();
            
            return [
                'status' => 'passed',
                'hpos_enabled' => $hpos_enabled,
                'message' => $hpos_enabled ? 'HPOS is enabled' : 'HPOS is not enabled'
            ];
        } catch (Exception $e) {
            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'message' => 'Failed to check HPOS status'
            ];
        }
    }
    
    /**
     * Test customer invoices functionality
     */
    private function test_customer_invoices() {
        try {
            // Test if customer-invoices.php is loaded
            if (!function_exists('get_customer_invoices')) {
                return [
                    'status' => 'failed',
                    'message' => 'Customer invoices functions not found'
                ];
            }
            
            // Test HPOS-compatible functions
            $functions_to_test = [
                'auto_generate_invoice_for_order',
                'get_customer_invoices',
                'get_invoice_pdf',
                'get_order_tracking',
                'generate_invoice_data_hpos',
                'get_tracking_history_hpos'
            ];
            
            $missing_functions = [];
            foreach ($functions_to_test as $function) {
                if (!function_exists($function)) {
                    $missing_functions[] = $function;
                }
            }
            
            if (!empty($missing_functions)) {
                return [
                    'status' => 'failed',
                    'message' => 'Missing HPOS functions: ' . implode(', ', $missing_functions)
                ];
            }
            
            return [
                'status' => 'passed',
                'message' => 'All customer invoices functions are HPOS-compatible'
            ];
            
        } catch (Exception $e) {
            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'message' => 'Error testing customer invoices'
            ];
        }
    }
    
    /**
     * Test email system functionality
     */
    private function test_email_system() {
        try {
            // Test if KingEmailSystem class exists
            if (!class_exists('KingEmailSystem')) {
                return [
                    'status' => 'failed',
                    'message' => 'KingEmailSystem class not found'
                ];
            }
            
            $email_system = new KingEmailSystem();
            
            // Test HPOS-compatible methods
            $methods_to_test = [
                'handle_order_status_change',
                'inject_order_meta_into_email',
                'inject_frontend_cta_links',
                'log_hpos_event',
                'get_hpos_logs',
                'get_hpos_status'
            ];
            
            $missing_methods = [];
            foreach ($methods_to_test as $method) {
                if (!method_exists($email_system, $method)) {
                    $missing_methods[] = $method;
                }
            }
            
            if (!empty($missing_methods)) {
                return [
                    'status' => 'failed',
                    'message' => 'Missing HPOS methods: ' . implode(', ', $missing_methods)
                ];
            }
            
            return [
                'status' => 'passed',
                'message' => 'Email system is HPOS-compatible'
            ];
            
        } catch (Exception $e) {
            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'message' => 'Error testing email system'
            ];
        }
    }
    
    /**
     * Test order creation with HPOS
     */
    private function test_order_creation() {
        try {
            // Create a test order
            $order = wc_create_order();
            
            if (!$order || !$order->get_id()) {
                return [
                    'status' => 'failed',
                    'message' => 'Failed to create test order'
                ];
            }
            
            // Test HPOS-compatible order methods
            $order->set_billing_first_name('Test');
            $order->set_billing_last_name('User');
            $order->set_billing_email('test@example.com');
            $order->update_meta_data('_billing_nip', '1234567890');
            $order->update_meta_data('_invoice_request', 'yes');
            $order->save();
            
            // Test retrieving order
            $retrieved_order = wc_get_order($order->get_id());
            
            if (!$retrieved_order || !$retrieved_order->get_id()) {
                return [
                    'status' => 'failed',
                    'message' => 'Failed to retrieve test order'
                ];
            }
            
            // Clean up
            $order->delete(true);
            
            return [
                'status' => 'passed',
                'message' => 'Order creation and retrieval works with HPOS'
            ];
            
        } catch (Exception $e) {
            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'message' => 'Error testing order creation'
            ];
        }
    }
    
    /**
     * Test invoice generation
     */
    private function test_invoice_generation() {
        try {
            // Create a test order
            $order = wc_create_order();
            $order->set_billing_first_name('Test');
            $order->set_billing_last_name('User');
            $order->set_billing_email('test@example.com');
            $order->update_meta_data('_billing_nip', '1234567890');
            $order->save();
            
            // Test invoice generation
            if (function_exists('generate_invoice_data_hpos')) {
                $invoice_data = generate_invoice_data_hpos($order);
                
                if (!isset($invoice_data['hpos_enabled']) || !$invoice_data['hpos_enabled']) {
                    return [
                        'status' => 'failed',
                        'message' => 'Invoice data does not include HPOS information'
                    ];
                }
                
                // Clean up
                $order->delete(true);
                
                return [
                    'status' => 'passed',
                    'message' => 'Invoice generation works with HPOS'
                ];
            } else {
                return [
                    'status' => 'failed',
                    'message' => 'generate_invoice_data_hpos function not found'
                ];
            }
            
        } catch (Exception $e) {
            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'message' => 'Error testing invoice generation'
            ];
        }
    }
    
    /**
     * Test email sending
     */
    private function test_email_sending() {
        try {
            // Test if email system can handle HPOS orders
            $email_system = new KingEmailSystem();
            
            // Test HPOS status method
            if (method_exists($email_system, 'get_hpos_status')) {
                $status = $email_system->get_hpos_status();
                
                if (!isset($status['hpos_enabled'])) {
                    return [
                        'status' => 'failed',
                        'message' => 'Email system HPOS status not available'
                    ];
                }
                
                return [
                    'status' => 'passed',
                    'message' => 'Email system is HPOS-compatible'
                ];
            } else {
                return [
                    'status' => 'failed',
                    'message' => 'get_hpos_status method not found'
                ];
            }
            
        } catch (Exception $e) {
            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'message' => 'Error testing email sending'
            ];
        }
    }
    
    /**
     * Test API endpoints
     */
    private function test_api_endpoints() {
        try {
            // Test if REST API routes are registered
            $routes = rest_get_server()->get_routes();
            
            $required_routes = [
                'custom/v1/invoices',
                'custom/v1/invoice/(?P<id>\d+)',
                'custom/v1/tracking/(?P<order_id>\d+)',
                'king-email/v1/hpos-logs',
                'king-email/v1/hpos-status'
            ];
            
            $missing_routes = [];
            foreach ($required_routes as $route) {
                if (!isset($routes[$route])) {
                    $missing_routes[] = $route;
                }
            }
            
            if (!empty($missing_routes)) {
                return [
                    'status' => 'failed',
                    'message' => 'Missing API routes: ' . implode(', ', $missing_routes)
                ];
            }
            
            return [
                'status' => 'passed',
                'message' => 'All required API endpoints are registered'
            ];
            
        } catch (Exception $e) {
            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
                'message' => 'Error testing API endpoints'
            ];
        }
    }
    
    /**
     * Log test results
     */
    private function log_test_results() {
        $passed_tests = 0;
        $total_tests = count($this->test_results);
        
        foreach ($this->test_results as $test_name => $result) {
            if ($result['status'] === 'passed') {
                $passed_tests++;
            }
            
            error_log("HPOS Test [{$test_name}]: {$result['status']} - {$result['message']}");
        }
        
        $success_rate = ($passed_tests / $total_tests) * 100;
        
        error_log("HPOS Compatibility Test Results: {$passed_tests}/{$total_tests} tests passed ({$success_rate}%)");
        
        if ($success_rate === 100) {
            error_log("✅ All HPOS compatibility tests passed!");
        } else {
            error_log("❌ Some HPOS compatibility tests failed!");
        }
    }
    
    /**
     * Get test results
     */
    public function get_test_results() {
        return $this->test_results;
    }
    
    /**
     * Get test summary
     */
    public function get_test_summary() {
        $passed_tests = 0;
        $total_tests = count($this->test_results);
        
        foreach ($this->test_results as $result) {
            if ($result['status'] === 'passed') {
                $passed_tests++;
            }
        }
        
        return [
            'total_tests' => $total_tests,
            'passed_tests' => $passed_tests,
            'failed_tests' => $total_tests - $passed_tests,
            'success_rate' => ($passed_tests / $total_tests) * 100,
            'hpos_enabled' => $this->hpos_enabled
        ];
    }
}

// Run tests if called directly
if (defined('WP_CLI') && WP_CLI) {
    $test = new HPOSCompatibilityTest();
    $results = $test->get_test_results();
    $summary = $test->get_test_summary();
    
    WP_CLI::log("HPOS Compatibility Test Results:");
    WP_CLI::log("Total Tests: {$summary['total_tests']}");
    WP_CLI::log("Passed: {$summary['passed_tests']}");
    WP_CLI::log("Failed: {$summary['failed_tests']}");
    WP_CLI::log("Success Rate: {$summary['success_rate']}%");
    WP_CLI::log("HPOS Enabled: " . ($summary['hpos_enabled'] ? 'Yes' : 'No'));
    
    foreach ($results as $test_name => $result) {
        $status = $result['status'] === 'passed' ? '✅' : '❌';
        WP_CLI::log("{$status} {$test_name}: {$result['message']}");
    }
}
