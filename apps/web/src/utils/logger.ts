/**
 * Centralized logging utility
 */

// import { env } from '@/config/env';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG;
  }

  private formatMessage(level: LogLevel, message: string, context?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? this.sanitizeContext(context) : undefined,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    };
  }

  private sanitizeContext(context: any): any {
    if (typeof context !== 'object' || context === null) {
      return context;
    }

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...context };

    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeContext(sanitized[key]);
      }
    }

    return sanitized;
  }

  private getCurrentUserId(): string | undefined {
    // This would typically come from your auth context
    if (typeof window !== 'undefined') {
      try {
        const authData = localStorage.getItem('auth-store');
        if (authData) {
          const parsed = JSON.parse(authData);
          return parsed.state?.user?.id?.toString();
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }
    return undefined;
  }

  private getSessionId(): string | undefined {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('sessionId') || undefined;
      } catch (error) {
        return undefined;
      }
    }
    return undefined;
  }

  private log(level: LogLevel, message: string, context?: any): void {
    if (level > this.logLevel) return;

    const entry = this.formatMessage(level, message, context);
    const levelName = LogLevel[level];
    const emoji = this.getLevelEmoji(level);

    // Console logging with colors in development
    if (process.env.NODE_ENV === 'development') {
      const color = this.getLevelColor(level);
      console.log(
        `%c${emoji} [${levelName}] ${entry.timestamp}`,
        `color: ${color}; font-weight: bold`,
        message,
        context ? context : ''
      );
    } else {
      // Structured logging for production
      console.log(JSON.stringify(entry));
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production' && level <= LogLevel.ERROR) {
      this.sendToExternalService(entry);
    }
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '🚨';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.DEBUG: return '🐛';
      default: return '📝';
    }
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '#ef4444';
      case LogLevel.WARN: return '#f59e0b';
      case LogLevel.INFO: return '#3b82f6';
      case LogLevel.DEBUG: return '#6b7280';
      default: return '#000000';
    }
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    // TODO: Implement external logging service (Sentry, LogRocket, etc.)
    // For now, we'll just log to console in production
    try {
      // Example: Send to external service
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(entry)
      // });
    } catch (error) {
      // Don't throw errors from logging
      console.error('Failed to send log to external service:', error);
    }
  }

  // Public logging methods
  error(message: string, context?: any): void {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: any): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: any): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: any): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  // Specialized logging methods
  apiCall(method: string, url: string, status?: number, duration?: number): void {
    this.info(`API ${method} ${url}`, {
      method,
      url,
      status,
      duration: duration ? `${duration}ms` : undefined
    });
  }

  userAction(action: string, details?: any): void {
    this.info(`User action: ${action}`, details);
  }

  performance(operation: string, duration: number, details?: any): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...details
    });
  }

  security(event: string, details?: any): void {
    this.warn(`Security event: ${event}`, details);
  }
}

// Create singleton instance
export const logger = new Logger();

// Convenience exports
export const { error, warn, info, debug, apiCall, userAction, performance, security } = logger;

// Performance measurement helper
export function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  return fn().then(
    (result) => {
      const duration = Date.now() - start;
      logger.performance(operation, duration);
      return result;
    },
    (error) => {
      const duration = Date.now() - start;
      logger.error(`Performance error: ${operation}`, { duration, error: error.message });
      throw error;
    }
  );
}

// API call wrapper with logging
export async function loggedApiCall<T>(
  method: string,
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    logger.apiCall(method, url, 200, duration);
    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    const status = error.status || error.statusCode || 500;
    logger.apiCall(method, url, status, duration);
    throw error;
  }
}
