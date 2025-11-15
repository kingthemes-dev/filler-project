/**
 * OpenTelemetry implementation for advanced monitoring
 * Free and open-source observability framework
 */

import { logger } from './logger';

type MetricTags = Record<string, string>;
type BusinessMetadata = Record<string, string | number | boolean | undefined>;
type ErrorContext = Record<string, string | number | boolean | undefined>;

interface MetricSummary {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

// OpenTelemetry configuration
export const TELEMETRY_CONFIG = {
  enabled: process.env.NODE_ENV === 'production',
  serviceName: 'headless-woo',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
};

// Performance metrics tracking
export class TelemetryTracker {
  private metrics: Map<string, number[]> = new Map();
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = TELEMETRY_CONFIG.enabled;
    this.initialize();
  }

  private initialize() {
    if (!this.isEnabled) return;

    logger.info('OpenTelemetry initialized', {
      serviceName: TELEMETRY_CONFIG.serviceName,
      environment: TELEMETRY_CONFIG.environment,
    });
  }

  // Track custom metrics
  trackMetric(name: string, value: number, tags?: MetricTags) {
    if (!this.isEnabled) return;

    const metricKey = `${name}_${JSON.stringify(tags || {})}`;
    if (!this.metrics.has(metricKey)) {
      this.metrics.set(metricKey, []);
    }

    this.metrics.get(metricKey)!.push(value);

    // Log metric for external collection
    logger.info('Metric tracked', {
      name,
      value,
      tags,
      timestamp: new Date().toISOString(),
    });
  }

  // Track performance timing
  trackTiming(name: string, startTime: number, endTime?: number) {
    const duration = endTime ? endTime - startTime : Date.now() - startTime;
    this.trackMetric(`timing.${name}`, duration, {
      unit: 'milliseconds',
    });
  }

  // Track API calls
  trackApiCall(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number
  ) {
    this.trackMetric('api.calls', 1, {
      method,
      endpoint: endpoint.replace(/\d+/g, ':id'), // Anonymize IDs
      status_code: statusCode.toString(),
      status_class: Math.floor(statusCode / 100).toString() + 'xx',
    });

    this.trackMetric('api.duration', duration, {
      method,
      endpoint: endpoint.replace(/\d+/g, ':id'),
      status_code: statusCode.toString(),
    });
  }

  // Track database queries
  trackDatabaseQuery(query: string, duration: number, rowCount?: number) {
    this.trackMetric('database.queries', 1, {
      query_type: this.getQueryType(query),
      table: this.getTableName(query),
    });

    this.trackMetric('database.duration', duration, {
      query_type: this.getQueryType(query),
    });

    if (rowCount !== undefined) {
      this.trackMetric('database.rows', rowCount, {
        query_type: this.getQueryType(query),
      });
    }
  }

  // Track cache operations
  trackCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    key: string,
    duration?: number
  ) {
    this.trackMetric('cache.operations', 1, {
      operation,
      key_prefix: key.split(':')[0],
    });

    if (duration !== undefined) {
      this.trackMetric('cache.duration', duration, {
        operation,
      });
    }
  }

  // Track business metrics
  trackBusinessMetric(
    event: string,
    value: number,
    metadata?: BusinessMetadata
  ) {
    this.trackMetric(`business.${event}`, value, {
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  // Track errors
  trackError(error: Error, context?: ErrorContext) {
    this.trackMetric('errors.count', 1, {
      error_type: error.constructor.name,
      error_message: error.message.substring(0, 100),
      ...context,
    });

    logger.error('Error tracked', {
      error: error.message,
      stack: error.stack,
      context,
    });
  }

  // Track user actions
  trackUserAction(
    action: string,
    userId?: string,
    metadata?: BusinessMetadata
  ) {
    this.trackMetric('user.actions', 1, {
      action,
      user_id: userId || 'anonymous',
      ...metadata,
    });
  }

  // Get metrics summary
  getMetricsSummary(): Record<string, MetricSummary> {
    const summary: Record<string, MetricSummary> = {};

    for (const [key, values] of this.metrics.entries()) {
      if (values.length === 0) continue;

      summary[key] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        p50: this.percentile(values, 0.5),
        p95: this.percentile(values, 0.95),
        p99: this.percentile(values, 0.99),
      };
    }

    return summary;
  }

  // Helper methods
  private getQueryType(query: string): string {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.startsWith('select')) return 'select';
    if (trimmed.startsWith('insert')) return 'insert';
    if (trimmed.startsWith('update')) return 'update';
    if (trimmed.startsWith('delete')) return 'delete';
    return 'other';
  }

  private getTableName(query: string): string {
    const match = query.match(/from\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  // Export metrics for external monitoring
  exportMetrics(): string {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        service: TELEMETRY_CONFIG.serviceName,
        version: TELEMETRY_CONFIG.serviceVersion,
        environment: TELEMETRY_CONFIG.environment,
        metrics: this.getMetricsSummary(),
      },
      null,
      2
    );
  }
}

// Create singleton instance
export const telemetry = new TelemetryTracker();

// Performance decorator
export function trackPerformance(name: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    _target: object,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value;
    if (!method) return descriptor;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const startTime = Date.now();
      try {
        const result = await method.apply(this, args);
        telemetry.trackTiming(name, startTime);
        return result;
      } catch (error) {
        telemetry.trackTiming(name, startTime);
        telemetry.trackError(error as Error, { method: name });
        throw error;
      }
    } as T;
    return descriptor;
  };
}

// API call tracker
export function trackApiCall(method: string, endpoint: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    _target: object,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const startTime = Date.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        telemetry.trackApiCall(method, endpoint, 200, duration);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const statusCode =
          (error as { status?: number; statusCode?: number })?.status ||
          (error as { status?: number; statusCode?: number })?.statusCode ||
          500;
        telemetry.trackApiCall(method, endpoint, statusCode, duration);
        telemetry.trackError(error as Error, { method, endpoint });
        throw error;
      }
    } as T;
    return descriptor;
  };
}

// Business metrics tracker
export function trackBusinessMetric(event: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    _target: object,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return descriptor;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      try {
        const result = await originalMethod.apply(this, args);
        telemetry.trackBusinessMetric(event, 1, { success: true });
        return result;
      } catch (error) {
        telemetry.trackBusinessMetric(event, 1, {
          success: false,
          error: (error as Error).message,
        });
        throw error;
      }
    } as T;
    return descriptor;
  };
}

export default telemetry;
