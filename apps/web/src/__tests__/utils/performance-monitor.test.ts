import { PerformanceMonitor } from '@/utils/performance-monitor';

// Mock fetch
global.fetch = jest.fn();

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Performance Monitoring', () => {
    it('should generate performance report', () => {
      const report = performanceMonitor.generateReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('url');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('budgets');
      expect(report).toHaveProperty('summary');
      expect(report.summary).toHaveProperty('total_metrics');
      expect(report.summary).toHaveProperty('passed_budgets');
      expect(report.summary).toHaveProperty('failed_budgets');
      expect(report.summary).toHaveProperty('warning_budgets');
    });

    it('should calculate performance score', () => {
      const score = performanceMonitor.getPerformanceScore();

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should provide recommendations', () => {
      const recommendations = performanceMonitor.getRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });

    it('should return stats', () => {
      const stats = performanceMonitor.getStats();

      expect(stats).toHaveProperty('totalMetrics');
      expect(stats).toHaveProperty('performanceScore');
      expect(stats).toHaveProperty('failedBudgets');
      expect(stats).toHaveProperty('recommendations');
    });
  });

  describe('Performance Budgets', () => {
    it('should have performance budgets configured', () => {
      const report = performanceMonitor.generateReport();

      expect(report.budgets.length).toBeGreaterThan(0);

      const budgetNames = report.budgets.map(budget => budget.budget.metric);
      expect(budgetNames).toContain('LCP');
      expect(budgetNames).toContain('FID');
      expect(budgetNames).toContain('CLS');
      expect(budgetNames).toContain('PageLoad');
      expect(budgetNames).toContain('APIResponse');
    });

    it('should categorize budgets by severity', () => {
      const report = performanceMonitor.generateReport();

      const severities = report.budgets.map(budget => budget.budget.severity);
      expect(severities).toContain('error');
      expect(severities).toContain('warning');
    });
  });

  describe('Performance Metrics', () => {
    it('should track various performance metrics', () => {
      const report = performanceMonitor.generateReport();

      expect(Array.isArray(report.metrics)).toBe(true);
    });
  });
});
