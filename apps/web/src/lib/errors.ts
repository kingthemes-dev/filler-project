/**
 * Unified Error Handling System
 * 
 * Provides typed errors and consistent error response formats
 */

import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/nextjs';

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  TIMEOUT = 'TIMEOUT_ERROR',
  CIRCUIT_BREAKER = 'CIRCUIT_BREAKER_ERROR',
  CACHE = 'CACHE_ERROR',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Base error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly details?: any;
  public readonly retryable: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number = 500,
    options: {
      severity?: ErrorSeverity;
      code?: string;
      details?: any;
      retryable?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.code = options.code || type;
    this.details = options.details;
    this.retryable = options.retryable ?? false;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      error: {
        message: this.message,
        type: this.type,
        code: this.code,
        statusCode: this.statusCode,
        severity: this.severity,
        retryable: this.retryable,
        timestamp: this.timestamp,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.VALIDATION, 400, {
      severity: ErrorSeverity.LOW,
      code: 'VALIDATION_ERROR',
      details,
      retryable: false,
    });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, ErrorType.AUTHENTICATION, 401, {
      severity: ErrorSeverity.MEDIUM,
      code: 'AUTH_REQUIRED',
      details,
      retryable: false,
    });
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(message, ErrorType.AUTHORIZATION, 403, {
      severity: ErrorSeverity.MEDIUM,
      code: 'FORBIDDEN',
      details,
      retryable: false,
    });
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, ErrorType.NOT_FOUND, 404, {
      severity: ErrorSeverity.LOW,
      code: 'NOT_FOUND',
      details,
      retryable: false,
    });
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, ErrorType.RATE_LIMIT, 429, {
      severity: ErrorSeverity.MEDIUM,
      code: 'RATE_LIMIT_EXCEEDED',
      details: retryAfter ? { retryAfter } : undefined,
      retryable: true,
    });
    this.name = 'RateLimitError';
  }
}

export class ExternalApiError extends AppError {
  constructor(
    message: string,
    statusCode: number = 502,
    details?: any,
    retryable: boolean = true
  ) {
    super(message, ErrorType.EXTERNAL_API, statusCode, {
      severity: statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM,
      code: 'EXTERNAL_API_ERROR',
      details,
      retryable,
    });
    this.name = 'ExternalApiError';
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'Request timeout', details?: any) {
    super(message, ErrorType.TIMEOUT, 504, {
      severity: ErrorSeverity.MEDIUM,
      code: 'TIMEOUT',
      details,
      retryable: true,
    });
    this.name = 'TimeoutError';
  }
}

export class CircuitBreakerError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: any) {
    super(message, ErrorType.CIRCUIT_BREAKER, 503, {
      severity: ErrorSeverity.HIGH,
      code: 'CIRCUIT_BREAKER_OPEN',
      details,
      retryable: true,
    });
    this.name = 'CircuitBreakerError';
  }
}

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, ErrorType.INTERNAL, 500, {
      severity: ErrorSeverity.CRITICAL,
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'production' ? undefined : details, // Hide details in production
      retryable: false,
    });
    this.name = 'InternalError';
  }
}

// Error response helper
export function createErrorResponse(error: unknown, context?: { endpoint?: string; method?: string; requestId?: string }): NextResponse {
  // Handle AppError instances
  if (error instanceof AppError) {
    logger.error(`[${error.type}] ${error.message}`, {
      code: error.code,
      statusCode: error.statusCode,
      severity: error.severity,
      retryable: error.retryable,
      ...context,
      ...(error.details && { details: error.details }),
    });

    // Send to Sentry based on severity
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      Sentry.captureException(error, {
        level: error.severity === ErrorSeverity.CRITICAL ? 'fatal' : 'error',
        tags: {
          error_type: error.type,
          error_code: error.code,
          endpoint: context?.endpoint || 'unknown',
          method: context?.method || 'unknown',
        },
        contexts: {
          error: {
            type: error.type,
            code: error.code,
            statusCode: error.statusCode,
            retryable: error.retryable,
            ...(error.details && { details: error.details }),
          },
        },
        extra: {
          requestId: context?.requestId,
        },
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Error-Type': error.type,
      'X-Error-Code': error.code,
    };

    // Add retry-after header for rate limit errors
    if (error instanceof RateLimitError && error.details?.retryAfter) {
      headers['Retry-After'] = String(error.details.retryAfter);
    }

    // Add retryable header
    if (error.retryable) {
      headers['X-Retryable'] = 'true';
    }

    return NextResponse.json(error.toJSON(), {
      status: error.statusCode,
      headers,
    });
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    logger.error('Unhandled error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const internalError = new InternalError(
      isProduction ? 'Internal server error' : error.message,
      isProduction ? undefined : { stack: error.stack }
    );

    return NextResponse.json(internalError.toJSON(), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Error-Type': ErrorType.INTERNAL,
        'X-Error-Code': 'INTERNAL_ERROR',
      },
    });
  }

  // Handle unknown error types
  logger.error('Unknown error type', {
    error,
    ...context,
  });

  const unknownError = new InternalError('An unknown error occurred');
  return NextResponse.json(unknownError.toJSON(), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Type': ErrorType.INTERNAL,
      'X-Error-Code': 'INTERNAL_ERROR',
    },
  });
}

// Success response helper (for consistency)
export function createSuccessResponse(
  data: any,
  statusCode: number = 200,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    { success: true, data },
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    }
  );
}

// Retry helper with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryable?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryable = (error) => {
      if (error instanceof AppError) {
        return error.retryable;
      }
      // Retry on network errors and 5xx status codes
      if (error instanceof Error) {
        return error.message.includes('fetch') || error.message.includes('network');
      }
      return false;
    },
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!retryable(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt >= maxAttempts) {
        break;
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

// Error boundary helper for async route handlers
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  context?: { endpoint?: string; method?: string }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error, context);
    }
  }) as T;
}

