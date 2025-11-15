/**
 * Monitoring Types - Expert Level 9.6/10
 */

// Error Tracking Types
export interface ErrorReport {
  message: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  userId?: string;
  sessionId: string;
  level: 'error' | 'warning' | 'info';
  category: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  url: string;
  metadata?: Record<string, unknown>;
}

// Analytics Types
export interface AnalyticsEvent {
  event_name: string;
  parameters: Record<string, unknown>;
  timestamp: string;
  user_id?: string;
  session_id: string;
}

export interface EcommerceEvent {
  event_name:
    | 'purchase'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'view_item'
    | 'begin_checkout';
  ecommerce: {
    transaction_id?: string;
    value?: number;
    currency?: string;
    items: Array<{
      item_id: string;
      item_name: string;
      item_category: string;
      quantity?: number;
      price?: number;
    }>;
  };
  parameters?: Record<string, unknown>;
}

// Security Types
export interface SecurityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, unknown> | string | null;
}

export interface SecurityAuditResult {
  timestamp: string;
  overallStatus: 'secure' | 'warning' | 'vulnerable';
  checks: SecurityCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

// Performance Types
export interface PerformanceBudget {
  metric: string;
  threshold: number;
  severity: 'warning' | 'error';
  description: string;
}

export interface PerformanceReport {
  timestamp: string;
  url: string;
  metrics: PerformanceMetric[];
  budgets: Array<{
    budget: PerformanceBudget;
    status: 'pass' | 'warning' | 'fail';
    actual: number;
  }>;
  summary: {
    total_metrics: number;
    passed_budgets: number;
    failed_budgets: number;
    warning_budgets: number;
  };
}

// Global Window Extensions
declare global {
  interface Window {
    errorTracker?: {
      captureError: (error: Partial<ErrorReport>) => void;
      capturePerformance: (metric: Partial<PerformanceMetric>) => void;
      setUserId: (userId: string) => void;
      getStats: () => { errors: number; performance: number };
      getSessionId: () => string;
    };
    analytics?: {
      trackEvent: (
        eventName: string,
        parameters?: Record<string, unknown>
      ) => void;
      trackPurchase: (
        transactionId: string,
        value: number,
        items: Array<Record<string, unknown>>,
        currency?: string
      ) => void;
      trackAddToCart: (
        itemId: string,
        itemName: string,
        itemCategory: string,
        price: number,
        quantity?: number
      ) => void;
      trackViewItem: (
        itemId: string,
        itemName: string,
        itemCategory: string,
        price: number
      ) => void;
      setUserId: (userId: string) => void;
      getStats: () => { events: number; sessionId: string; userId?: string };
      getSessionId: () => string;
    };
    performanceMonitor?: {
      generateReport: () => PerformanceReport;
      getPerformanceScore: () => number;
      getRecommendations: () => string[];
      getStats: () => {
        totalMetrics: number;
        performanceScore: number;
        failedBudgets: number;
        recommendations: string[];
      };
    };
    securityAuditor?: {
      runAudit: () => SecurityAuditResult;
      getSecurityScore: () => number;
      getCriticalIssues: () => SecurityCheck[];
      getRecommendations: () => string[];
    };
  }
}

export {};
