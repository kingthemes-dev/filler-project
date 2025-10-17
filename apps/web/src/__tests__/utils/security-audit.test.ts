import { SecurityAuditor } from '@/utils/security-audit';

describe('SecurityAuditor', () => {
  let securityAuditor: SecurityAuditor;

  beforeEach(() => {
    securityAuditor = new SecurityAuditor();
  });

  describe('Security Audit', () => {
    it('should run security audit', () => {
      const result = securityAuditor.runAudit();
      
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('overallStatus');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('total');
      expect(result.summary).toHaveProperty('passed');
      expect(result.summary).toHaveProperty('failed');
      expect(result.summary).toHaveProperty('warnings');
    });

    it('should calculate security score', () => {
      const score = securityAuditor.getSecurityScore();
      
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should identify critical issues', () => {
      const criticalIssues = securityAuditor.getCriticalIssues();
      
      expect(Array.isArray(criticalIssues)).toBe(true);
      criticalIssues.forEach(issue => {
        expect(issue.status).toBe('fail');
        expect(issue.severity).toBe('critical');
      });
    });

    it('should provide recommendations', () => {
      const recommendations = securityAuditor.getRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Security Checks', () => {
    it('should have multiple security checks', () => {
      const result = securityAuditor.runAudit();
      
      expect(result.checks.length).toBeGreaterThan(5);
      
      const checkNames = result.checks.map(check => check.name);
      expect(checkNames).toContain('Content Security Policy');
      expect(checkNames).toContain('HTTPS Enforcement');
      expect(checkNames).toContain('Security Headers');
      expect(checkNames).toContain('XSS Protection');
      expect(checkNames).toContain('Clickjacking Protection');
    });

    it('should categorize checks by severity', () => {
      const result = securityAuditor.runAudit();
      
      const severities = result.checks.map(check => check.severity);
      expect(severities).toContain('critical');
      expect(severities).toContain('high');
      expect(severities).toContain('medium');
      expect(severities).toContain('low');
    });
  });
});
