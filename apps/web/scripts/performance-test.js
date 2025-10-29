#!/usr/bin/env node

/**
 * Performance Testing Script
 * Tests CLS, LCP, and other performance metrics
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  CLS: 0.1,
  LCP: 2500,
  FID: 100,
  TTFB: 600,
  PageLoad: 3000,
};

// Test URLs
const TEST_URLS = [
  'http://localhost:3000/sklep',
  'http://localhost:3000/produkt/krem-do-twarzy',
  'http://localhost:3000/koszyk',
];

class PerformanceTester {
  constructor() {
    this.browser = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Starting Performance Testing...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async testPage(url) {
    console.log(`\n📊 Testing: ${url}`);
    
    const page = await this.browser.newPage();
    
    // Enable performance monitoring
    await page.evaluateOnNewDocument(() => {
      // Override performance observer to capture metrics
      window.performanceMetrics = {
        lcp: 0,
        cls: 0,
        fid: 0,
        ttfb: 0,
        loadTime: 0,
      };

      // LCP observer
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          window.performanceMetrics.lcp = lastEntry.startTime;
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // CLS observer
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        window.performanceMetrics.cls = clsValue;
      }).observe({ entryTypes: ['layout-shift'] });

      // FID observer
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.performanceMetrics.fid = entry.processingStart - entry.startTime;
        }
      }).observe({ entryTypes: ['first-input'] });
    });

    // Navigate to page
    const startTime = Date.now();
    await page.goto(url, { waitUntil: 'networkidle0' });
    const loadTime = Date.now() - startTime;

    // Get TTFB
    const navigationEntry = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return nav ? nav.responseStart - nav.requestStart : 0;
    });

    // Wait for metrics to stabilize
    await page.waitForTimeout(2000);

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      return window.performanceMetrics || {};
    });

    // Add additional metrics
    metrics.ttfb = navigationEntry;
    metrics.loadTime = loadTime;

    // Evaluate results
    const results = this.evaluateMetrics(url, metrics);
    
    await page.close();
    return results;
  }

  evaluateMetrics(url, metrics) {
    const results = {
      url,
      metrics,
      passed: true,
      failures: [],
      warnings: [],
    };

    // Check each metric
    Object.entries(PERFORMANCE_THRESHOLDS).forEach(([metric, threshold]) => {
      const value = metrics[metric.toLowerCase()] || 0;
      
      if (value > threshold) {
        results.passed = false;
        results.failures.push({
          metric,
          value,
          threshold,
          severity: 'error',
        });
      } else if (value > threshold * 0.8) {
        results.warnings.push({
          metric,
          value,
          threshold,
          severity: 'warning',
        });
      }
    });

    return results;
  }

  async runTests() {
    for (const url of TEST_URLS) {
      try {
        const result = await this.testPage(url);
        this.results.push(result);
        
        // Log results
        console.log(`✅ ${result.passed ? 'PASSED' : 'FAILED'}`);
        
        if (result.failures.length > 0) {
          console.log('❌ Failures:');
          result.failures.forEach(failure => {
            console.log(`   ${failure.metric}: ${failure.value} > ${failure.threshold}`);
          });
        }
        
        if (result.warnings.length > 0) {
          console.log('⚠️  Warnings:');
          result.warnings.forEach(warning => {
            console.log(`   ${warning.metric}: ${warning.value} (${warning.threshold * 0.8}-${warning.threshold})`);
          });
        }
        
      } catch (error) {
        console.error(`❌ Error testing ${url}:`, error.message);
        this.results.push({
          url,
          error: error.message,
          passed: false,
        });
      }
    }
  }

  generateReport() {
    console.log('\n📋 Performance Test Report');
    console.log('='.repeat(50));
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    // Detailed results
    this.results.forEach(result => {
      console.log(`\n📄 ${result.url}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
        return;
      }
      
      console.log(`   Status: ${result.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`   Metrics:`);
      Object.entries(result.metrics).forEach(([metric, value]) => {
        const threshold = PERFORMANCE_THRESHOLDS[metric.toUpperCase()];
        const status = value <= threshold ? '✅' : '❌';
        console.log(`     ${metric.toUpperCase()}: ${value} ${status}`);
      });
    });
    
    // Save report to file
    const reportPath = path.join(process.cwd(), 'performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📁 Report saved to: ${reportPath}`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI interface
async function main() {
  const tester = new PerformanceTester();
  
  try {
    await tester.init();
    await tester.runTests();
    tester.generateReport();
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = PerformanceTester;
