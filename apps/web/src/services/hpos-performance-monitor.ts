/**
 * HPOS Performance Monitoring
 * Tracks performance metrics for HPOS implementation
 */

import { logger } from '@/utils/logger';

interface PerformanceMetrics {
  apiCalls: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    hposEnabled: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    compressionEnabled: boolean;
  };
  orders: {
    created: number;
    failed: number;
    limitExceeded: number;
    averageProcessingTime: number;
  };
  sessions: {
    created: number;
    cleaned: number;
    active: number;
  };
  webhooks: {
    received: number;
    processed: number;
    failed: number;
  };
}

interface MetricEntry {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

class HPOSPerformanceMonitor {
  private metrics: PerformanceMetrics;
  private timeSeries: Map<string, MetricEntry[]> = new Map();
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      apiCalls: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        hposEnabled: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        compressionEnabled: false,
      },
      orders: {
        created: 0,
        failed: 0,
        limitExceeded: 0,
        averageProcessingTime: 0,
      },
      sessions: {
        created: 0,
        cleaned: 0,
        active: 0,
      },
      webhooks: {
        received: 0,
        processed: 0,
        failed: 0,
      },
    };

    // Start periodic reporting
    this.startPeriodicReporting();
  }

  private startPeriodicReporting(): void {
    // Report metrics every 5 minutes
    setInterval(() => {
      this.reportMetrics();
    }, 5 * 60 * 1000);
  }

  private addTimeSeriesData(key: string, value: number, metadata?: Record<string, any>): void {
    const entry: MetricEntry = {
      timestamp: Date.now(),
      value,
      metadata,
    };

    if (!this.timeSeries.has(key)) {
      this.timeSeries.set(key, []);
    }

    const series = this.timeSeries.get(key)!;
    series.push(entry);

    // Keep only last 1000 entries per series
    if (series.length > 1000) {
      series.shift();
    }
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // API Call Metrics
  recordApiCall(success: boolean, responseTime: number, hposEnabled: boolean = true): void {
    this.metrics.apiCalls.total++;
    
    if (success) {
      this.metrics.apiCalls.successful++;
    } else {
      this.metrics.apiCalls.failed++;
    }

    if (hposEnabled) {
      this.metrics.apiCalls.hposEnabled++;
    }

    // Update average response time
    const totalTime = this.metrics.apiCalls.averageResponseTime * (this.metrics.apiCalls.total - 1) + responseTime;
    this.metrics.apiCalls.averageResponseTime = totalTime / this.metrics.apiCalls.total;

    this.addTimeSeriesData('api_response_time', responseTime, { success, hposEnabled });
  }

  // Cache Metrics
  recordCacheHit(): void {
    this.metrics.cache.hits++;
    this.updateCacheHitRate();
    this.addTimeSeriesData('cache_hits', 1);
  }

  recordCacheMiss(): void {
    this.metrics.cache.misses++;
    this.updateCacheHitRate();
    this.addTimeSeriesData('cache_misses', 1);
  }

  private updateCacheHitRate(): void {
    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  setCompressionEnabled(enabled: boolean): void {
    this.metrics.cache.compressionEnabled = enabled;
  }

  // Order Metrics
  recordOrderCreated(processingTime: number): void {
    this.metrics.orders.created++;
    
    // Update average processing time
    const totalTime = this.metrics.orders.averageProcessingTime * (this.metrics.orders.created - 1) + processingTime;
    this.metrics.orders.averageProcessingTime = totalTime / this.metrics.orders.created;

    this.addTimeSeriesData('order_created', 1, { processingTime });
  }

  recordOrderFailed(): void {
    this.metrics.orders.failed++;
    this.addTimeSeriesData('order_failed', 1);
  }

  recordOrderLimitExceeded(): void {
    this.metrics.orders.limitExceeded++;
    this.addTimeSeriesData('order_limit_exceeded', 1);
  }

  // Session Metrics
  recordSessionCreated(): void {
    this.metrics.sessions.created++;
    this.metrics.sessions.active++;
    this.addTimeSeriesData('session_created', 1);
  }

  recordSessionCleaned(count: number): void {
    this.metrics.sessions.cleaned += count;
    this.metrics.sessions.active = Math.max(0, this.metrics.sessions.active - count);
    this.addTimeSeriesData('session_cleaned', count);
  }

  // Webhook Metrics
  recordWebhookReceived(): void {
    this.metrics.webhooks.received++;
    this.addTimeSeriesData('webhook_received', 1);
  }

  recordWebhookProcessed(): void {
    this.metrics.webhooks.processed++;
    this.addTimeSeriesData('webhook_processed', 1);
  }

  recordWebhookFailed(): void {
    this.metrics.webhooks.failed++;
    this.addTimeSeriesData('webhook_failed', 1);
  }

  // Reporting
  private reportMetrics(): void {
    const uptime = Date.now() - this.startTime;
    
    logger.info('HPOS Performance Metrics', {
      uptime: Math.round(uptime / 1000),
      metrics: this.metrics,
      timeSeriesKeys: Array.from(this.timeSeries.keys()),
    });
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getTimeSeriesData(key: string, timeRange?: { start: number; end: number }): MetricEntry[] {
    const series = this.timeSeries.get(key) || [];
    
    if (!timeRange) {
      return [...series];
    }

    return series.filter(entry => 
      entry.timestamp >= timeRange.start && entry.timestamp <= timeRange.end
    );
  }

  getPerformanceSummary(): {
    uptime: number;
    apiSuccessRate: number;
    cacheHitRate: number;
    orderSuccessRate: number;
    webhookSuccessRate: number;
    recommendations: string[];
  } {
    const uptime = Date.now() - this.startTime;
    const apiSuccessRate = this.metrics.apiCalls.total > 0 
      ? (this.metrics.apiCalls.successful / this.metrics.apiCalls.total) * 100 
      : 0;
    const orderSuccessRate = (this.metrics.orders.created + this.metrics.orders.failed) > 0
      ? (this.metrics.orders.created / (this.metrics.orders.created + this.metrics.orders.failed)) * 100
      : 0;
    const webhookSuccessRate = this.metrics.webhooks.received > 0
      ? (this.metrics.webhooks.processed / this.metrics.webhooks.received) * 100
      : 0;

    const recommendations: string[] = [];

    if (apiSuccessRate < 95) {
      recommendations.push('API success rate is below 95%, consider investigating failed requests');
    }

    if (this.metrics.cache.hitRate < 80) {
      recommendations.push('Cache hit rate is below 80%, consider optimizing cache strategy');
    }

    if (this.metrics.orders.limitExceeded > 0) {
      recommendations.push('Order limits are being exceeded, consider adjusting limits or investigating abuse');
    }

    if (this.metrics.apiCalls.averageResponseTime > 2000) {
      recommendations.push('Average API response time is above 2s, consider performance optimization');
    }

    return {
      uptime: Math.round(uptime / 1000),
      apiSuccessRate: Math.round(apiSuccessRate * 100) / 100,
      cacheHitRate: Math.round(this.metrics.cache.hitRate * 100) / 100,
      orderSuccessRate: Math.round(orderSuccessRate * 100) / 100,
      webhookSuccessRate: Math.round(webhookSuccessRate * 100) / 100,
      recommendations,
    };
  }

  resetMetrics(): void {
    this.metrics = {
      apiCalls: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        hposEnabled: 0,
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        compressionEnabled: false,
      },
      orders: {
        created: 0,
        failed: 0,
        limitExceeded: 0,
        averageProcessingTime: 0,
      },
      sessions: {
        created: 0,
        cleaned: 0,
        active: 0,
      },
      webhooks: {
        received: 0,
        processed: 0,
        failed: 0,
      },
    };

    this.timeSeries.clear();
    this.startTime = Date.now();
    
    logger.info('HPOS Performance Monitor: Metrics reset');
  }
}

// Export singleton instance
export const hposPerformanceMonitor = new HPOSPerformanceMonitor();
export type { PerformanceMetrics, MetricEntry };
