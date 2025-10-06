/**
 * Centralized error handling utilities
 */

import { NextResponse } from 'next/server';

export interface AppError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
  timestamp: string;
}

export class CustomError extends Error {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'CustomError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Predefined error types
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // API errors
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Business logic errors
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  
  // System errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

// Error handler for API routes
export function handleApiError(error: unknown): NextResponse {
  console.error('🚨 API Error:', error);

  let appError: AppError;

  if (error instanceof CustomError) {
    appError = {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      timestamp: new Date().toISOString()
    };
  } else if (error instanceof Error) {
    appError = {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: process.env.NODE_ENV === 'production' 
        ? 'Wystąpił nieoczekiwany błąd' 
        : error.message,
      statusCode: 500,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };
  } else {
    appError = {
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: 'Wystąpił nieoczekiwany błąd',
      statusCode: 500,
      timestamp: new Date().toISOString()
    };
  }

  return NextResponse.json(
    { 
      success: false, 
      error: appError.message,
      code: appError.code,
      timestamp: appError.timestamp,
      ...(process.env.NODE_ENV === 'development' && { details: appError.details })
    },
    { status: appError.statusCode }
  );
}

// Error handler for client-side
export function handleClientError(error: unknown): string {
  console.error('🚨 Client Error:', error);

  if (error instanceof CustomError) {
    return error.message;
  } else if (error instanceof Error) {
    return process.env.NODE_ENV === 'production' 
      ? 'Wystąpił nieoczekiwany błąd' 
      : error.message;
  } else {
    return 'Wystąpił nieoczekiwany błąd';
  }
}

// Validation error creator
export function createValidationError(message: string, field?: string): CustomError {
  return new CustomError(
    message,
    ERROR_CODES.VALIDATION_ERROR,
    400,
    field ? { field } : undefined
  );
}

// API error creator
export function createApiError(message: string, statusCode: number = 500): CustomError {
  return new CustomError(
    message,
    ERROR_CODES.API_ERROR,
    statusCode
  );
}

// Network error handler
export async function handleNetworkRequest<T>(
  requestFn: () => Promise<T>,
  errorMessage: string = 'Błąd sieci'
): Promise<T> {
  try {
    return await requestFn();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        throw new CustomError(
          'Błąd połączenia z serwerem',
          ERROR_CODES.NETWORK_ERROR,
          503
        );
      }
      if (error.message.includes('timeout')) {
        throw new CustomError(
          'Przekroczono limit czasu',
          ERROR_CODES.TIMEOUT_ERROR,
          408
        );
      }
    }
    
    throw new CustomError(
      errorMessage,
      ERROR_CODES.API_ERROR,
      500,
      error instanceof Error ? error.message : undefined
    );
  }
}

// Input sanitization
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}

// Rate limiting helper (simple in-memory)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = identifier;
  const current = requestCounts.get(key);

  if (!current || now > current.resetTime) {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count++;
  return true;
}
