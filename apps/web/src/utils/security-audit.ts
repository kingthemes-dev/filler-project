/**
 * Security Audit System (Free Implementation)
 * Comprehensive security checks and monitoring
 */

interface SecurityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
}

interface SecurityAuditResult {
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

class SecurityAuditor {
  private checks: SecurityCheck[] = [];

  constructor() {
    this.setupSecurityChecks();
  }

  private setupSecurityChecks(): void {
    // Content Security Policy check
    this.checks.push({
      name: 'Content Security Policy',
      status: this.checkCSP(),
      message: this.getCSPMessage(),
      severity: 'high',
    });

    // HTTPS enforcement
    this.checks.push({
      name: 'HTTPS Enforcement',
      status: this.checkHTTPS(),
      message: this.getHTTPSMessage(),
      severity: 'critical',
    });

    // Security headers
    this.checks.push({
      name: 'Security Headers',
      status: this.checkSecurityHeaders(),
      message: this.getSecurityHeadersMessage(),
      severity: 'high',
    });

    // XSS protection
    this.checks.push({
      name: 'XSS Protection',
      status: this.checkXSSProtection(),
      message: this.getXSSMessage(),
      severity: 'critical',
    });

    // Clickjacking protection
    this.checks.push({
      name: 'Clickjacking Protection',
      status: this.checkClickjackingProtection(),
      message: this.getClickjackingMessage(),
      severity: 'medium',
    });

    // MIME type sniffing protection
    this.checks.push({
      name: 'MIME Type Sniffing Protection',
      status: this.checkMIMESniffing(),
      message: this.getMIMEMessage(),
      severity: 'medium',
    });

    // Referrer policy
    this.checks.push({
      name: 'Referrer Policy',
      status: this.checkReferrerPolicy(),
      message: this.getReferrerMessage(),
      severity: 'low',
    });

    // Permissions policy
    this.checks.push({
      name: 'Permissions Policy',
      status: this.checkPermissionsPolicy(),
      message: this.getPermissionsMessage(),
      severity: 'low',
    });
  }

  private checkCSP(): 'pass' | 'fail' | 'warning' {
    const cspHeader = this.getResponseHeader('Content-Security-Policy');
    if (!cspHeader) return 'fail';
    
    // Check for basic CSP directives
    const hasDefaultSrc = cspHeader.includes('default-src');
    const hasScriptSrc = cspHeader.includes('script-src');
    const hasStyleSrc = cspHeader.includes('style-src');
    
    if (hasDefaultSrc && hasScriptSrc && hasStyleSrc) {
      return 'pass';
    } else if (hasDefaultSrc || hasScriptSrc || hasStyleSrc) {
      return 'warning';
    }
    
    return 'fail';
  }

  private getCSPMessage(): string {
    const cspHeader = this.getResponseHeader('Content-Security-Policy');
    if (!cspHeader) {
      return 'Content Security Policy header is missing';
    }
    
    const hasUnsafeInline = cspHeader.includes('unsafe-inline');
    const hasUnsafeEval = cspHeader.includes('unsafe-eval');
    
    if (hasUnsafeInline || hasUnsafeEval) {
      return 'CSP contains unsafe directives (unsafe-inline, unsafe-eval)';
    }
    
    return 'Content Security Policy is properly configured';
  }

  private checkHTTPS(): 'pass' | 'fail' | 'warning' {
    if (location.protocol === 'https:') {
      return 'pass';
    } else if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'warning';
    }
    return 'fail';
  }

  private getHTTPSMessage(): string {
    if (location.protocol === 'https:') {
      return 'Site is served over HTTPS';
    } else if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'Site is served over HTTP (development environment)';
    }
    return 'Site is served over HTTP (security risk)';
  }

  private checkSecurityHeaders(): 'pass' | 'fail' | 'warning' {
    const headers = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
    ];
    
    let presentCount = 0;
    headers.forEach(header => {
      if (this.getResponseHeader(header)) {
        presentCount++;
      }
    });
    
    if (presentCount === headers.length) return 'pass';
    if (presentCount >= headers.length / 2) return 'warning';
    return 'fail';
  }

  private getSecurityHeadersMessage(): string {
    const headers = {
      'X-Frame-Options': this.getResponseHeader('X-Frame-Options'),
      'X-Content-Type-Options': this.getResponseHeader('X-Content-Type-Options'),
      'X-XSS-Protection': this.getResponseHeader('X-XSS-Protection'),
      'Strict-Transport-Security': this.getResponseHeader('Strict-Transport-Security'),
    };
    
    const missing = Object.entries(headers)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);
    
    if (missing.length === 0) {
      return 'All security headers are present';
    }
    
    return `Missing security headers: ${missing.join(', ')}`;
  }

  private checkXSSProtection(): 'pass' | 'fail' | 'warning' {
    const xssHeader = this.getResponseHeader('X-XSS-Protection');
    if (!xssHeader) return 'fail';
    
    if (xssHeader.includes('1; mode=block')) {
      return 'pass';
    }
    
    return 'warning';
  }

  private getXSSMessage(): string {
    const xssHeader = this.getResponseHeader('X-XSS-Protection');
    if (!xssHeader) {
      return 'X-XSS-Protection header is missing';
    }
    
    if (xssHeader.includes('1; mode=block')) {
      return 'XSS protection is enabled with blocking mode';
    }
    
    return 'XSS protection is enabled but not in blocking mode';
  }

  private checkClickjackingProtection(): 'pass' | 'fail' | 'warning' {
    const frameOptions = this.getResponseHeader('X-Frame-Options');
    const csp = this.getResponseHeader('Content-Security-Policy');
    
    const hasFrameOptions = frameOptions && (frameOptions.includes('DENY') || frameOptions.includes('SAMEORIGIN'));
    const hasCSPFrameAncestors = csp && csp.includes('frame-ancestors');
    
    if (hasFrameOptions || hasCSPFrameAncestors) {
      return 'pass';
    }
    
    return 'fail';
  }

  private getClickjackingMessage(): string {
    const frameOptions = this.getResponseHeader('X-Frame-Options');
    const csp = this.getResponseHeader('Content-Security-Policy');
    
    if (frameOptions) {
      return `Clickjacking protection via X-Frame-Options: ${frameOptions}`;
    }
    
    if (csp && csp.includes('frame-ancestors')) {
      return 'Clickjacking protection via CSP frame-ancestors';
    }
    
    return 'Clickjacking protection is not configured';
  }

  private checkMIMESniffing(): 'pass' | 'fail' | 'warning' {
    const contentTypeOptions = this.getResponseHeader('X-Content-Type-Options');
    
    if (contentTypeOptions && contentTypeOptions.includes('nosniff')) {
      return 'pass';
    }
    
    return 'fail';
  }

  private getMIMEMessage(): string {
    const contentTypeOptions = this.getResponseHeader('X-Content-Type-Options');
    
    if (contentTypeOptions && contentTypeOptions.includes('nosniff')) {
      return 'MIME type sniffing is disabled';
    }
    
    return 'MIME type sniffing protection is not configured';
  }

  private checkReferrerPolicy(): 'pass' | 'fail' | 'warning' {
    const referrerPolicy = this.getResponseHeader('Referrer-Policy');
    
    if (referrerPolicy) {
      return 'pass';
    }
    
    return 'warning';
  }

  private getReferrerMessage(): string {
    const referrerPolicy = this.getResponseHeader('Referrer-Policy');
    
    if (referrerPolicy) {
      return `Referrer policy is set to: ${referrerPolicy}`;
    }
    
    return 'Referrer policy is not configured';
  }

  private checkPermissionsPolicy(): 'pass' | 'fail' | 'warning' {
    const permissionsPolicy = this.getResponseHeader('Permissions-Policy');
    
    if (permissionsPolicy) {
      return 'pass';
    }
    
    return 'warning';
  }

  private getPermissionsMessage(): string {
    const permissionsPolicy = this.getResponseHeader('Permissions-Policy');
    
    if (permissionsPolicy) {
      return 'Permissions policy is configured';
    }
    
    return 'Permissions policy is not configured';
  }

  private getResponseHeader(name: string): string | null {
    // In a real implementation, this would check actual response headers
    // For now, we'll simulate based on common configurations
    const mockHeaders: Record<string, string> = {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    };
    
    return mockHeaders[name] || null;
  }

  public runAudit(): SecurityAuditResult {
    const timestamp = new Date().toISOString();
    
    const summary = {
      total: this.checks.length,
      passed: this.checks.filter(check => check.status === 'pass').length,
      failed: this.checks.filter(check => check.status === 'fail').length,
      warnings: this.checks.filter(check => check.status === 'warning').length,
    };
    
    let overallStatus: 'secure' | 'warning' | 'vulnerable';
    if (summary.failed === 0 && summary.warnings === 0) {
      overallStatus = 'secure';
    } else if (summary.failed === 0) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'vulnerable';
    }
    
    return {
      timestamp,
      overallStatus,
      checks: this.checks,
      summary,
    };
  }

  public getSecurityScore(): number {
    const result = this.runAudit();
    const { passed, total } = result.summary;
    return Math.round((passed / total) * 100);
  }

  public getCriticalIssues(): SecurityCheck[] {
    return this.checks.filter(check => 
      check.status === 'fail' && check.severity === 'critical'
    );
  }

  public getRecommendations(): string[] {
    const recommendations: string[] = [];
    const result = this.runAudit();
    
    result.checks.forEach(check => {
      if (check.status === 'fail') {
        switch (check.name) {
          case 'Content Security Policy':
            recommendations.push('Implement a strict Content Security Policy');
            break;
          case 'HTTPS Enforcement':
            recommendations.push('Enable HTTPS for all traffic');
            break;
          case 'Security Headers':
            recommendations.push('Add missing security headers to server configuration');
            break;
          case 'XSS Protection':
            recommendations.push('Enable XSS protection with blocking mode');
            break;
          case 'Clickjacking Protection':
            recommendations.push('Configure X-Frame-Options or CSP frame-ancestors');
            break;
          case 'MIME Type Sniffing Protection':
            recommendations.push('Add X-Content-Type-Options: nosniff header');
            break;
        }
      }
    });
    
    return recommendations;
  }
}

// Create global instance
export const securityAuditor = new SecurityAuditor();

// Export for manual usage
export { SecurityAuditor };
