/**
 * Error tracking API endpoint
 * Collects and processes error data for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { logger } from '@/utils/logger';
import { redisCache } from '@/lib/redis';
import { errorsSchema, type ErrorPayload } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';

type ErrorSummary = {
  total_errors: number;
  errors_by_type: Record<string, number>;
  errors_by_severity: Record<string, number>;
  errors_by_component: Record<string, number>;
  last_updated: string;
  error_rate?: number;
  top_error_types?: Array<{ name: string; count: number }>;
  top_error_components?: Array<{ name: string; count: number }>;
  severity_distribution?: Record<string, number>;
};

type StoredError = Pick<
  ErrorPayload,
  'error_id' | 'message' | 'severity' | 'timestamp' | 'type' | 'component'
>;

// Error processing
export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();
    const sanitized = validateApiInput(errorData);
    const validationResult = errorsSchema.safeParse(sanitized);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Nieprawidłowe dane błędu',
          validationResult.error.errors
        ),
        { endpoint: 'errors', method: 'POST' }
      );
    }

    const errorPayload = validationResult.data;

    // Process error
    await processError(errorPayload);

    // Log error collection
    logger.error('Error tracked via API', {
      message: errorPayload.message,
      type: errorPayload.type,
      severity: errorPayload.severity,
      component: errorPayload.component,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error tracking API error', { error });
    return NextResponse.json(
      { error: 'Failed to process error' },
      { status: 500 }
    );
  }
}

// Process error data
async function processError(errorData: ErrorPayload) {
  // Store error in Redis for real-time monitoring
  await storeErrorInRedis(errorData);

  // Update error metrics
  await updateErrorMetrics(errorData);

  // Send critical errors to external services
  if (errorData.severity === 'critical' || errorData.severity === 'high') {
    await sendCriticalErrorAlert(errorData);
  }
}

// Store error in Redis
async function storeErrorInRedis(errorData: ErrorPayload) {
  try {
    const errorId = errorData.error_id || generateErrorId();
    const redisKey = `errors:${errorId}`;

    const errorRecord = {
      ...errorData,
      error_id: errorId,
      processed_at: new Date().toISOString(),
    };

    await redisCache.set(redisKey, errorRecord, 604800);

    const errorsListKey = 'errors:list';
    const errorsList =
      (await redisCache.get<StoredError[]>(errorsListKey)) || [];
    errorsList.push({
      error_id: errorId,
      message: errorData.message,
      severity: errorData.severity,
      timestamp: errorData.timestamp,
      type: errorData.type,
    });

    if (errorsList.length > 1000) {
      errorsList.splice(0, errorsList.length - 1000);
    }

    await redisCache.set(errorsListKey, errorsList, 604800);
  } catch (error) {
    logger.error('Failed to store error in Redis', { error });
  }
}

// Update error metrics
async function updateErrorMetrics(errorData: ErrorPayload) {
  try {
    const metricsKey = 'errors:metrics';
    const metrics = (await redisCache.get<ErrorSummary>(metricsKey)) || {
      total_errors: 0,
      errors_by_type: {},
      errors_by_severity: {},
      errors_by_component: {},
      last_updated: new Date().toISOString(),
    };

    metrics.total_errors += 1;
    metrics.last_updated = new Date().toISOString();

    const type = errorData.type || 'unknown';
    metrics.errors_by_type[type] = (metrics.errors_by_type[type] || 0) + 1;

    const severity = errorData.severity || 'medium';
    metrics.errors_by_severity[severity] =
      (metrics.errors_by_severity[severity] || 0) + 1;

    if (errorData.component) {
      const component = errorData.component;
      metrics.errors_by_component[component] =
        (metrics.errors_by_component[component] || 0) + 1;
    }

    await redisCache.set(metricsKey, metrics, 86400);
  } catch (error) {
    logger.error('Failed to update error metrics', { error });
  }
}

// Send critical error alert
async function sendCriticalErrorAlert(errorData: ErrorPayload) {
  try {
    const alertData = {
      title: `Critical Error Alert - ${errorData.service || 'headless-woo'}`,
      message: errorData.message,
      severity: errorData.severity,
      component: errorData.component,
      timestamp: errorData.timestamp,
      url: errorData.url,
      stack: errorData.stack,
    };

    logger.error('CRITICAL ERROR ALERT', alertData);
  } catch (error) {
    logger.error('Failed to send critical error alert', { error });
  }
}

// Get error data endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const severity = searchParams.get('severity') || undefined;
    const component = searchParams.get('component') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    switch (type) {
      case 'summary':
        return await getErrorSummary();
      case 'list':
        return await getErrorList(severity, component, limit);
      case 'metrics':
        return await getErrorMetrics();
      default:
        return NextResponse.json(
          { error: 'Invalid error type' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error GET error', { error });
    return NextResponse.json(
      { error: 'Failed to get error data' },
      { status: 500 }
    );
  }
}

// Get error summary
async function getErrorSummary() {
  try {
    const metricsKey = 'errors:metrics';
    const metrics = (await redisCache.get<ErrorSummary>(metricsKey)) || {
      total_errors: 0,
      errors_by_type: {},
      errors_by_severity: {},
      errors_by_component: {},
      last_updated: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to get error summary', { error });
    return NextResponse.json(
      { error: 'Failed to get error summary' },
      { status: 500 }
    );
  }
}

// Get error list
async function getErrorList(
  severity?: string,
  component?: string,
  limit: number = 50
) {
  try {
    const errorsListKey = 'errors:list';
    const errorsList =
      (await redisCache.get<StoredError[]>(errorsListKey)) || [];

    let filteredErrors = errorsList;

    if (severity) {
      filteredErrors = filteredErrors.filter(
        error => error.severity === severity
      );
    }

    if (component) {
      filteredErrors = filteredErrors.filter(
        error => error.component === component
      );
    }

    filteredErrors.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const limited = filteredErrors.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: limited,
      total: limited.length,
    });
  } catch (error) {
    logger.error('Failed to get error list', { error });
    return NextResponse.json(
      { error: 'Failed to get error list' },
      { status: 500 }
    );
  }
}

// Get error metrics
async function getErrorMetrics() {
  try {
    const metricsKey = 'errors:metrics';
    const metrics = (await redisCache.get<ErrorSummary>(metricsKey)) || {
      total_errors: 0,
      errors_by_type: {},
      errors_by_severity: {},
      errors_by_component: {},
      last_updated: new Date().toISOString(),
    };

    const additionalMetrics = {
      error_rate: calculateErrorRate(metrics),
      top_error_types: getTopErrors(metrics.errors_by_type),
      top_error_components: getTopErrors(metrics.errors_by_component),
      severity_distribution: metrics.errors_by_severity,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        ...additionalMetrics,
      },
    });
  } catch (error) {
    logger.error('Failed to get error metrics', { error });
    return NextResponse.json(
      { error: 'Failed to get error metrics' },
      { status: 500 }
    );
  }
}

// Helper functions
function generateErrorId(): string {
  return `error_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function calculateErrorRate(metrics: ErrorSummary): number {
  // Calculate error rate based on total errors and time period
  // This is a simplified calculation
  return metrics.total_errors || 0;
}

function getTopErrors(
  errorCounts: Record<string, number>,
  limit: number = 5
): Array<{ type: string; count: number }> {
  return Object.entries(errorCounts || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([type, count]) => ({ type, count }));
}
