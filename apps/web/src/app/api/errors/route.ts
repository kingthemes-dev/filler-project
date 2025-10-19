/**
 * Error tracking API endpoint
 * Collects and processes error data for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { redisCache } from '@/lib/redis';

// Error data interface
interface ErrorData {
  message: string;
  stack?: string;
  component?: string;
  type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  url?: string;
  user_agent?: string;
  timestamp: string;
  error_id?: string;
  service?: string;
  version?: string;
  session_id?: string;
  user_id?: string;
}

// Error processing
export async function POST(request: NextRequest) {
  try {
    const errorData: ErrorData = await request.json();
    
    // Validate error data
    if (!errorData.message || !errorData.timestamp) {
      return NextResponse.json(
        { error: 'Invalid error data' },
        { status: 400 }
      );
    }

    // Process error
    await processError(errorData);

    // Log error collection
    logger.error('Error tracked via API', {
      message: errorData.message,
      type: errorData.type,
      severity: errorData.severity,
      component: errorData.component
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
async function processError(errorData: ErrorData) {
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
async function storeErrorInRedis(errorData: ErrorData) {
  try {
    const errorId = errorData.error_id || generateErrorId();
    const redisKey = `errors:${errorId}`;
    
    const errorRecord = {
      ...errorData,
      error_id: errorId,
      processed_at: new Date().toISOString()
    };

    // Store error with 7 days TTL
    await redisCache.set(redisKey, errorRecord, 604800);

    // Store in errors list for quick access
    const errorsListKey = 'errors:list';
    const errorsList = await redisCache.get(errorsListKey) as any[] || [];
    errorsList.push({
      error_id: errorId,
      message: errorData.message,
      severity: errorData.severity,
      timestamp: errorData.timestamp,
      type: errorData.type
    });

    // Keep only last 1000 errors
    if (errorsList.length > 1000) {
      errorsList.splice(0, errorsList.length - 1000);
    }

    await redisCache.set(errorsListKey, errorsList, 604800);

  } catch (error) {
    logger.error('Failed to store error in Redis', { error });
  }
}

// Update error metrics
async function updateErrorMetrics(errorData: ErrorData) {
  try {
    const metricsKey = 'errors:metrics';
    const metrics = await redisCache.get(metricsKey) as any || {
      total_errors: 0,
      errors_by_type: {},
      errors_by_severity: {},
      errors_by_component: {},
      last_updated: new Date().toISOString()
    };

    // Update total count
    metrics.total_errors++;
    metrics.last_updated = new Date().toISOString();

    // Update type count
    const type = errorData.type || 'unknown';
    metrics.errors_by_type[type] = (metrics.errors_by_type[type] || 0) + 1;

    // Update severity count
    const severity = errorData.severity || 'medium';
    metrics.errors_by_severity[severity] = (metrics.errors_by_severity[severity] || 0) + 1;

    // Update component count
    if (errorData.component) {
      metrics.errors_by_component[errorData.component] = (metrics.errors_by_component[errorData.component] || 0) + 1;
    }

    await redisCache.set(metricsKey, metrics, 86400); // 24 hours TTL

  } catch (error) {
    logger.error('Failed to update error metrics', { error });
  }
}

// Send critical error alert
async function sendCriticalErrorAlert(errorData: ErrorData) {
  try {
    // In a real implementation, you would send alerts to:
    // - Slack/Discord webhooks
    // - Email notifications
    // - SMS alerts
    // - External monitoring services

    const alertData = {
      title: `Critical Error Alert - ${errorData.service || 'headless-woo'}`,
      message: errorData.message,
      severity: errorData.severity,
      component: errorData.component,
      timestamp: errorData.timestamp,
      url: errorData.url,
      stack: errorData.stack
    };

    // Log critical error for now
    logger.error('CRITICAL ERROR ALERT', alertData);

    // Example: Send to Slack webhook
    // if (process.env.SLACK_WEBHOOK_URL) {
    //   await fetch(process.env.SLACK_WEBHOOK_URL, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       text: `🚨 Critical Error in ${errorData.service}`,
    //       attachments: [{
    //         color: 'danger',
    //         fields: [
    //           { title: 'Message', value: errorData.message, short: false },
    //           { title: 'Component', value: errorData.component || 'Unknown', short: true },
    //           { title: 'Severity', value: errorData.severity || 'Unknown', short: true },
    //           { title: 'Timestamp', value: errorData.timestamp, short: true }
    //         ]
    //       }]
    //     })
    //   });
    // }

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
    const metrics = await redisCache.get(metricsKey) as any || {
      total_errors: 0,
      errors_by_type: {},
      errors_by_severity: {},
      errors_by_component: {},
      last_updated: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: metrics
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
async function getErrorList(severity?: string, component?: string, limit: number = 50) {
  try {
    const errorsListKey = 'errors:list';
    const errorsList = await redisCache.get(errorsListKey) as any[] || [];

    // Filter errors
    let filteredErrors = errorsList;
    
    if (severity) {
      filteredErrors = filteredErrors.filter((error: any) => error.severity === severity);
    }
    
    if (component) {
      filteredErrors = filteredErrors.filter((error: any) => error.component === component);
    }

    // Sort by timestamp (newest first)
    filteredErrors.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limit results
    filteredErrors = filteredErrors.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: filteredErrors,
      total: filteredErrors.length
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
    const metrics = await redisCache.get(metricsKey) as any || {};

    // Calculate additional metrics
    const additionalMetrics = {
      error_rate: calculateErrorRate(metrics),
      top_error_types: getTopErrors(metrics.errors_by_type),
      top_error_components: getTopErrors(metrics.errors_by_component),
      severity_distribution: metrics.errors_by_severity
    };

    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        ...additionalMetrics
      }
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

function calculateErrorRate(metrics: any): number {
  // Calculate error rate based on total errors and time period
  // This is a simplified calculation
  return metrics.total_errors || 0;
}

function getTopErrors(errorCounts: Record<string, number>, limit: number = 5): Array<{type: string, count: number}> {
  return Object.entries(errorCounts || {})
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([type, count]) => ({ type, count }));
}
