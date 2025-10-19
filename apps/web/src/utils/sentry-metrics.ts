/**
 * Sentry Custom Metrics Integration
 * Advanced monitoring and analytics for WooCommerce
 */

import * as Sentry from '@sentry/nextjs';

interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}

interface PerformanceMetric extends MetricData {
  type: 'performance';
  category: 'api' | 'cache' | 'database' | 'frontend';
}

interface BusinessMetric extends MetricData {
  type: 'business';
  category: 'sales' | 'users' | 'products' | 'orders';
}

interface ErrorMetric extends MetricData {
  type: 'error';
  category: 'api_error' | 'validation_error' | 'timeout' | 'circuit_breaker';
}

type CustomMetric = PerformanceMetric | BusinessMetric | ErrorMetric;

class SentryMetricsCollector {
  private static instance: SentryMetricsCollector;
  private metrics: CustomMetric[] = [];
  private flushInterval = 30000; // 30 seconds
  private maxMetrics = 1000;

  static getInstance(): SentryMetricsCollector {
    if (!SentryMetricsCollector.instance) {
      SentryMetricsCollector.instance = new SentryMetricsCollector();
    }
    return SentryMetricsCollector.instance;
  }

  constructor() {
    this.startPeriodicFlush();
  }

  /**
   * Record performance metric
   */
  recordPerformance(
    name: string,
    value: number,
    category: PerformanceMetric['category'],
    tags?: Record<string, string>
  ): void {
    this.addMetric({
      type: 'performance',
      name,
      value,
      category,
      tags,
      timestamp: new Date()
    });
  }

  /**
   * Record business metric
   */
  recordBusiness(
    name: string,
    value: number,
    category: BusinessMetric['category'],
    tags?: Record<string, string>
  ): void {
    this.addMetric({
      type: 'business',
      name,
      value,
      category,
      tags,
      timestamp: new Date()
    });
  }

  /**
   * Record error metric
   */
  recordError(
    name: string,
    value: number,
    category: ErrorMetric['category'],
    tags?: Record<string, string>
  ): void {
    this.addMetric({
      type: 'error',
      name,
      value,
      category,
      tags,
      timestamp: new Date()
    });
  }

  /**
   * Record API response time
   */
  recordApiResponse(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    tags?: Record<string, string>
  ): void {
    this.recordPerformance(
      'api_response_time',
      responseTime,
      'api',
      {
        endpoint,
        method,
        status_code: statusCode.toString(),
        ...tags
      }
    );
  }

  /**
   * Record cache hit/miss
   */
  recordCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    key: string,
    responseTime: number,
    tags?: Record<string, string>
  ): void {
    this.recordPerformance(
      'cache_operation',
      responseTime,
      'cache',
      {
        operation,
        key: key.substring(0, 50), // Truncate long keys
        ...tags
      }
    );
  }

  /**
   * Record database query
   */
  recordDatabaseQuery(
    query: string,
    responseTime: number,
    rowsAffected: number,
    tags?: Record<string, string>
  ): void {
    this.recordPerformance(
      'database_query',
      responseTime,
      'database',
      {
        query: query.substring(0, 100), // Truncate long queries
        rows_affected: rowsAffected.toString(),
        ...tags
      }
    );
  }

  /**
   * Record WooCommerce operation
   */
  recordWooCommerceOperation(
    operation: string,
    responseTime: number,
    success: boolean,
    tags?: Record<string, string>
  ): void {
    this.recordPerformance(
      'woocommerce_operation',
      responseTime,
      'api',
      {
        operation,
        success: success.toString(),
        ...tags
      }
    );
  }

  /**
   * Record user action
   */
  recordUserAction(
    action: string,
    value: number = 1,
    tags?: Record<string, string>
  ): void {
    this.recordBusiness(
      'user_action',
      value,
      'users',
      {
        action,
        ...tags
      }
    );
  }

  /**
   * Record product view
   */
  recordProductView(
    productId: string,
    productName: string,
    category?: string,
    tags?: Record<string, string>
  ): void {
    this.recordBusiness(
      'product_view',
      1,
      'products',
      {
        product_id: productId,
        product_name: productName.substring(0, 50),
        category: category || 'unknown',
        ...tags
      }
    );
  }

  /**
   * Record order event
   */
  recordOrderEvent(
    event: 'created' | 'completed' | 'cancelled' | 'refunded',
    orderId: string,
    value: number,
    tags?: Record<string, string>
  ): void {
    this.recordBusiness(
      'order_event',
      value,
      'orders',
      {
        event,
        order_id: orderId,
        ...tags
      }
    );
  }

  /**
   * Record circuit breaker state change
   */
  recordCircuitBreakerState(
    service: string,
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN',
    failureRate: number,
    tags?: Record<string, string>
  ): void {
    this.recordError(
      'circuit_breaker_state',
      failureRate,
      'circuit_breaker',
      {
        service,
        state,
        ...tags
      }
    );
  }

  /**
   * Add metric to collection
   */
  private addMetric(metric: CustomMetric): void {
    this.metrics.push(metric);

    // Remove old metrics if we have too many
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [Sentry Metrics] ${metric.type}.${metric.category}.${metric.name}:`, {
        value: metric.value,
        tags: metric.tags
      });
    }
  }

  /**
   * Flush metrics to Sentry
   */
  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    const metricsToFlush = [...this.metrics];
    this.metrics = [];

    try {
      // Group metrics by type and category
      const groupedMetrics = this.groupMetricsByType(metricsToFlush);

      // Send to Sentry
      for (const [type, categories] of Object.entries(groupedMetrics)) {
        for (const [category, metrics] of Object.entries(categories)) {
          await this.sendMetricsToSentry(type, category, metrics);
        }
      }

      console.log(`✅ Flushed ${metricsToFlush.length} metrics to Sentry`);
    } catch (error) {
      console.error('❌ Failed to flush metrics to Sentry:', error);
      // Re-add metrics to collection for retry
      this.metrics.unshift(...metricsToFlush);
    }
  }

  /**
   * Group metrics by type and category
   */
  private groupMetricsByType(metrics: CustomMetric[]): Record<string, Record<string, CustomMetric[]>> {
    const grouped: Record<string, Record<string, CustomMetric[]>> = {};

    for (const metric of metrics) {
      if (!grouped[metric.type]) {
        grouped[metric.type] = {};
      }
      if (!grouped[metric.type][metric.category]) {
        grouped[metric.type][metric.category] = [];
      }
      grouped[metric.type][metric.category].push(metric);
    }

    return grouped;
  }

  /**
   * Send metrics to Sentry
   */
  private async sendMetricsToSentry(
    type: string,
    category: string,
    metrics: CustomMetric[]
  ): Promise<void> {
    // Calculate aggregated values
    const aggregated = this.aggregateMetrics(metrics);

    // Send to Sentry as custom metrics
    Sentry.addBreadcrumb({
      category: `metrics.${type}.${category}`,
      message: `Collected ${metrics.length} metrics`,
      level: 'info',
      data: aggregated
    });

    // Send individual metrics as breadcrumbs for detailed tracking
    for (const metric of metrics.slice(0, 10)) { // Limit to 10 per batch
      Sentry.addBreadcrumb({
        category: `metric.${type}.${category}`,
        message: `${metric.name}: ${metric.value}`,
        level: 'info',
        data: {
          value: metric.value,
          tags: metric.tags,
          timestamp: metric.timestamp
        }
      });
    }
  }

  /**
   * Aggregate metrics for summary
   */
  private aggregateMetrics(metrics: CustomMetric[]): Record<string, any> {
    if (metrics.length === 0) return {};

    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: metrics.length,
      sum,
      avg: Math.round(avg * 100) / 100,
      min,
      max,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushMetrics();
    }, this.flushInterval);
  }

  /**
   * Get current metrics count
   */
  getMetricsCount(): number {
    return this.metrics.length;
  }

  /**
   * Force flush metrics
   */
  async forceFlush(): Promise<void> {
    await this.flushMetrics();
  }
}

// Export singleton instance
export const sentryMetrics = SentryMetricsCollector.getInstance();

// Export convenience functions
export const recordApiResponse = (endpoint: string, method: string, responseTime: number, statusCode: number) => {
  sentryMetrics.recordApiResponse(endpoint, method, responseTime, statusCode);
};

export const recordCacheOperation = (operation: 'hit' | 'miss' | 'set' | 'delete', key: string, responseTime: number) => {
  sentryMetrics.recordCacheOperation(operation, key, responseTime);
};

export const recordWooCommerceOperation = (operation: string, responseTime: number, success: boolean) => {
  sentryMetrics.recordWooCommerceOperation(operation, responseTime, success);
};

export const recordUserAction = (action: string, value: number = 1) => {
  sentryMetrics.recordUserAction(action, value);
};

export const recordProductView = (productId: string, productName: string, category?: string) => {
  sentryMetrics.recordProductView(productId, productName, category);
};

export const recordOrderEvent = (event: 'created' | 'completed' | 'cancelled' | 'refunded', orderId: string, value: number) => {
  sentryMetrics.recordOrderEvent(event, orderId, value);
};

export default sentryMetrics;
