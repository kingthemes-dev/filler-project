#!/usr/bin/env node

/**
 * Performance testing script using autocannon
 * Tests key API endpoints with warm/cold scenarios
 * 
 * Usage:
 *   node scripts/perf-autocannon.mjs --warm
 *   node scripts/perf-autocannon.mjs --cold
 *   node scripts/perf-autocannon.mjs --all
 */

import autocannon from 'autocannon';
import { spawn } from 'child_process';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DURATION = parseInt(process.env.DURATION || '30', 10); // seconds
const CONNECTIONS = parseInt(process.env.CONNECTIONS || '10', 10);
const PIPELINING = parseInt(process.env.PIPELINING || '1', 10);

// Key endpoints to test
const ENDPOINTS = [
  {
    name: 'Home Feed',
    path: '/api/home-feed',
    method: 'GET',
    priority: 'P0',
    expectedP95: 300, // ms (edge)
    expectedP99: 500,
  },
  {
    name: 'Products List',
    path: '/api/woocommerce?endpoint=products&per_page=24&page=1',
    method: 'GET',
    priority: 'P0',
    expectedP95: 600, // ms (server)
    expectedP99: 1000,
  },
  {
    name: 'Single Product',
    path: '/api/woocommerce?endpoint=products/123',
    method: 'GET',
    priority: 'P0',
    expectedP95: 400,
    expectedP99: 700,
  },
  {
    name: 'Orders List',
    path: '/api/woocommerce?endpoint=orders&customer=1&per_page=20',
    method: 'GET',
    priority: 'P0',
    expectedP95: 600,
    expectedP99: 1000,
  },
  {
    name: 'Categories',
    path: '/api/woocommerce?endpoint=products/categories',
    method: 'GET',
    priority: 'P1',
    expectedP95: 400,
    expectedP99: 700,
  },
  {
    name: 'Reviews',
    path: '/api/reviews?product_id=123',
    method: 'GET',
    priority: 'P1',
    expectedP95: 300,
    expectedP99: 500,
  },
  {
    name: 'Health Check',
    path: '/api/health',
    method: 'GET',
    priority: 'P2',
    expectedP95: 200,
    expectedP99: 300,
  },
];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logResult(endpoint, result, scenario) {
  const { name, expectedP95, expectedP99 } = endpoint;
  const p95 = result.latency.p95;
  const p99 = result.latency.p99;
  const rps = result.requests.average;
  const errors = result.errors;

  const p95Status = p95 <= expectedP95 ? '✅' : '❌';
  const p99Status = p99 <= expectedP99 ? '✅' : '❌';

  log(`\n${name} (${scenario})`, 'cyan');
  log('─'.repeat(60), 'reset');
  log(`  p95: ${p95}ms (expected: ${expectedP95}ms) ${p95Status}`, p95 <= expectedP95 ? 'green' : 'red');
  log(`  p99: ${p99}ms (expected: ${expectedP99}ms) ${p99Status}`, p99 <= expectedP99 ? 'green' : 'red');
  log(`  RPS: ${rps.toFixed(2)}`, 'reset');
  log(`  Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`, 'reset');
  log(`  Errors: ${errors}`, errors > 0 ? 'red' : 'green');
  log(`  Status codes:`, 'reset');
  Object.entries(result.statusCodeStats).forEach(([code, count]) => {
    log(`    ${code}: ${count}`, code.startsWith('2') ? 'green' : 'red');
  });

  return {
    endpoint: name,
    scenario,
    p95,
    p99,
    rps,
    errors,
    passed: p95 <= expectedP95 && p99 <= expectedP99 && errors === 0,
  };
}

async function testEndpoint(endpoint, scenario = 'warm') {
  const url = `${BASE_URL}${endpoint.path}`;
  
  log(`\n🧪 Testing ${endpoint.name} (${scenario})...`, 'blue');
  log(`   URL: ${url}`, 'reset');

  // For cold scenario, wait a bit to ensure cache is cold
  if (scenario === 'cold') {
    log('   ⏳ Waiting 5s for cold cache...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const instance = autocannon({
    url,
    method: endpoint.method,
    connections: CONNECTIONS,
    pipelining: PIPELINING,
    duration: DURATION,
    headers: {
      'User-Agent': 'autocannon/performance-test',
      'Accept': 'application/json',
    },
  });

  return new Promise((resolve, reject) => {
    const results = [];
    
    instance.on('tick', () => {
      // Optional: log progress
    });

    instance.on('done', (result) => {
      const testResult = logResult(endpoint, result, scenario);
      results.push(testResult);
      resolve(testResult);
    });

    instance.on('error', (error) => {
      log(`   ❌ Error: ${error.message}`, 'red');
      reject(error);
    });

    // Optional: print progress
    autocannon.track(instance, {
      renderLatencyTable: false,
      renderProgressBar: true,
    });
  });
}

async function runWarmTests() {
  log('\n🔥 WARM SCENARIO - Testing with warm cache', 'bright');
  log('='.repeat(60), 'reset');

  const results = [];
  
  for (const endpoint of ENDPOINTS.filter(e => e.priority === 'P0')) {
    try {
      const result = await testEndpoint(endpoint, 'warm');
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      log(`   ❌ Failed: ${error.message}`, 'red');
      results.push({
        endpoint: endpoint.name,
        scenario: 'warm',
        passed: false,
        error: error.message,
      });
    }
  }

  return results;
}

async function runColdTests() {
  log('\n❄️  COLD SCENARIO - Testing with cold cache', 'bright');
  log('='.repeat(60), 'reset');

  const results = [];
  
  for (const endpoint of ENDPOINTS.filter(e => e.priority === 'P0')) {
    try {
      const result = await testEndpoint(endpoint, 'cold');
      results.push(result);
      
      // Longer delay for cold tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      log(`   ❌ Failed: ${error.message}`, 'red');
      results.push({
        endpoint: endpoint.name,
        scenario: 'cold',
        passed: false,
        error: error.message,
      });
    }
  }

  return results;
}

function generateReport(allResults) {
  log('\n📊 PERFORMANCE TEST REPORT', 'bright');
  log('='.repeat(60), 'reset');

  const warmResults = allResults.filter(r => r.scenario === 'warm');
  const coldResults = allResults.filter(r => r.scenario === 'cold');

  const passedWarm = warmResults.filter(r => r.passed).length;
  const passedCold = coldResults.filter(r => r.passed).length;

  log(`\nWarm Tests: ${passedWarm}/${warmResults.length} passed`, passedWarm === warmResults.length ? 'green' : 'yellow');
  log(`Cold Tests: ${passedCold}/${coldResults.length} passed`, passedCold === coldResults.length ? 'green' : 'yellow');

  // Find failures
  const failures = allResults.filter(r => !r.passed && !r.error);
  if (failures.length > 0) {
    log('\n❌ FAILURES:', 'red');
    failures.forEach(f => {
      log(`  ${f.endpoint} (${f.scenario}): p95=${f.p95}ms, p99=${f.p99}ms`, 'red');
    });
  }

  // Summary statistics
  log('\n📈 SUMMARY:', 'bright');
  if (warmResults.length > 0) {
    const avgP95 = warmResults.reduce((sum, r) => sum + (r.p95 || 0), 0) / warmResults.length;
    const avgP99 = warmResults.reduce((sum, r) => sum + (r.p99 || 0), 0) / warmResults.length;
    const avgRPS = warmResults.reduce((sum, r) => sum + (r.rps || 0), 0) / warmResults.length;
    
    log(`  Warm - Avg p95: ${avgP95.toFixed(2)}ms`, 'reset');
    log(`  Warm - Avg p99: ${avgP99.toFixed(2)}ms`, 'reset');
    log(`  Warm - Avg RPS: ${avgRPS.toFixed(2)}`, 'reset');
  }

  if (coldResults.length > 0) {
    const avgP95 = coldResults.reduce((sum, r) => sum + (r.p95 || 0), 0) / coldResults.length;
    const avgP99 = coldResults.reduce((sum, r) => sum + (r.p99 || 0), 0) / coldResults.length;
    const avgRPS = coldResults.reduce((sum, r) => sum + (r.rps || 0), 0) / coldResults.length;
    
    log(`  Cold - Avg p95: ${avgP95.toFixed(2)}ms`, 'reset');
    log(`  Cold - Avg p99: ${avgP99.toFixed(2)}ms`, 'reset');
    log(`  Cold - Avg RPS: ${avgRPS.toFixed(2)}`, 'reset');
  }

  // Save results to file
  const resultsFile = 'performance-results-autocannon.json';
  fs.writeFileSync(resultsFile, JSON.stringify(allResults, null, 2));
  log(`\n💾 Results saved to: ${resultsFile}`, 'cyan');

  return {
    passed: failures.length === 0,
    warmPassed: passedWarm === warmResults.length,
    coldPassed: passedCold === coldResults.length,
  };
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const scenario = args[0] || 'all';

  log('🚀 Autocannon Performance Tests', 'bright');
  log(`   Base URL: ${BASE_URL}`, 'reset');
  log(`   Duration: ${DURATION}s`, 'reset');
  log(`   Connections: ${CONNECTIONS}`, 'reset');
  log(`   Pipelining: ${PIPELINING}`, 'reset');

  let allResults = [];

  if (scenario === 'warm' || scenario === 'all') {
    const warmResults = await runWarmTests();
    allResults = [...allResults, ...warmResults];
  }

  if (scenario === 'cold' || scenario === 'all') {
    const coldResults = await runColdTests();
    allResults = [...allResults, ...coldResults];
  }

  const report = await generateReport(allResults);

  // Exit with error code if tests failed
  process.exit(report.passed ? 0 : 1);
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

