#!/usr/bin/env k6 run
/**
 * k6 load testing script for API endpoints
 * Baseline load test for RPS, p95/p99, TTFB
 * 
 * Usage:
 *   k6 run scripts/perf-k6.js
 *   k6 run scripts/perf-k6.js --vus 20 --duration 30s
 *   k6 run scripts/perf-k6.js --env BASE_URL=https://api.example.com
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
const p95TTFB = new Trend('p95_ttfb');
const p99TTFB = new Trend('p99_ttfb');
const errorRate = new Rate('errors');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const VUS = __ENV.VUS || 10; // Virtual users
const DURATION = __ENV.DURATION || '30s';
const RAMP_UP = __ENV.RAMP_UP || '5s';

// Test scenarios
export const options = {
  stages: [
    { duration: RAMP_UP, target: VUS }, // Ramp up
    { duration: DURATION, target: VUS }, // Stay at VUS
    { duration: '5s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<600', 'p(99)<1000'], // p95 < 600ms, p99 < 1000ms
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    errors: ['rate<0.01'],
  },
};

// Test endpoints
const endpoints = [
  {
    name: 'Home Feed',
    path: '/api/home-feed',
    method: 'GET',
    expectedP95: 300,
    expectedP99: 500,
  },
  {
    name: 'Products List',
    path: '/api/woocommerce?endpoint=products&per_page=24&page=1',
    method: 'GET',
    expectedP95: 600,
    expectedP99: 1000,
  },
  {
    name: 'Single Product',
    path: '/api/woocommerce?endpoint=products/123',
    method: 'GET',
    expectedP95: 400,
    expectedP99: 700,
  },
  {
    name: 'Orders List',
    path: '/api/woocommerce?endpoint=orders&customer=1&per_page=20',
    method: 'GET',
    expectedP95: 600,
    expectedP99: 1000,
  },
  {
    name: 'Categories',
    path: '/api/woocommerce?endpoint=products/categories',
    method: 'GET',
    expectedP95: 400,
    expectedP99: 700,
  },
  {
    name: 'Reviews',
    path: '/api/reviews?product_id=123',
    method: 'GET',
    expectedP95: 300,
    expectedP99: 500,
  },
  {
    name: 'Health Check',
    path: '/api/health',
    method: 'GET',
    expectedP95: 200,
    expectedP99: 300,
  },
];

// Test function
export default function () {
  // Random endpoint selection (weighted towards P0 endpoints)
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const url = `${BASE_URL}${endpoint.path}`;

  const params = {
    headers: {
      'User-Agent': 'k6/performance-test',
      'Accept': 'application/json',
      'X-Performance-Test': 'true',
    },
    tags: {
      name: endpoint.name,
      endpoint: endpoint.path,
    },
  };

  // Make request
  const response = http.get(url, params);

  // Calculate TTFB (Time To First Byte)
  const ttfb = response.timings.waiting;

  // Record metrics
  p95TTFB.add(ttfb);
  p99TTFB.add(ttfb);

  // Check response
  const checks = {
    'status is 200': response.status === 200,
    'response time < 1000ms': response.timings.duration < 1000,
    'has body': response.body.length > 0,
  };

  // Check if response is JSON
  try {
    JSON.parse(response.body);
    checks['valid JSON'] = true;
  } catch (e) {
    checks['valid JSON'] = false;
  }

  // Record errors
  if (response.status !== 200) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  // Assert expectations
  check(response, checks, {
    name: endpoint.name,
  });

  // Small random sleep to simulate real user behavior
  sleep(Math.random() * 2);
}

// Setup function (runs once before all VUs)
export function setup() {
  console.log(`🚀 k6 Load Test`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   VUs: ${VUS}`);
  console.log(`   Duration: ${DURATION}`);
  console.log(`   Endpoints: ${endpoints.length}`);
  console.log('');

  // Optional: Warm up the server
  console.log('🔥 Warming up server...');
  for (const endpoint of endpoints.slice(0, 3)) {
    const url = `${BASE_URL}${endpoint.path}`;
    const response = http.get(url, {
      headers: {
        'User-Agent': 'k6/warmup',
        'Accept': 'application/json',
      },
    });
    console.log(`   ${endpoint.name}: ${response.status}`);
  }
  console.log('');

  return { timestamp: new Date().toISOString() };
}

// Teardown function (runs once after all VUs)
export function teardown(data) {
  console.log(`\n✅ Test completed at ${data.timestamp}`);
}

// Handle summary
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    metrics: {
      http_req_duration: {
        avg: data.metrics.http_req_duration.values.avg,
        min: data.metrics.http_req_duration.values.min,
        max: data.metrics.http_req_duration.values.max,
        p95: data.metrics.http_req_duration.values['p(95)'],
        p99: data.metrics.http_req_duration.values['p(99)'],
      },
      http_req_failed: {
        rate: data.metrics.http_req_failed.values.rate,
      },
      http_reqs: {
        count: data.metrics.http_reqs.values.count,
        rate: data.metrics.http_reqs.values.rate,
      },
    },
    thresholds: {},
  };

  // Check thresholds
  if (data.metrics.http_req_duration) {
    summary.thresholds.p95 = data.metrics.http_req_duration.values['p(95)'] < 600;
    summary.thresholds.p99 = data.metrics.http_req_duration.values['p(99)'] < 1000;
  }

  if (data.metrics.http_req_failed) {
    summary.thresholds.errorRate = data.metrics.http_req_failed.values.rate < 0.01;
  }

  // Save summary to file (k6 doesn't support fs in handleSummary, use --out json instead)
  // Summary is saved via --out json flag in k6 run command

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'performance-results-k6.json': JSON.stringify(summary, null, 2),
  };
}

// Helper function for text summary (simplified version)
function textSummary(data, options) {
  const indent = options.indent || ' ';
  const lines = [];
  
  lines.push('📊 k6 Performance Test Summary');
  lines.push('='.repeat(60));
  lines.push('');
  
  if (data.metrics.http_req_duration) {
    const duration = data.metrics.http_req_duration.values;
    lines.push(`${indent}Duration:`);
    lines.push(`${indent}  avg: ${duration.avg.toFixed(2)}ms`);
    lines.push(`${indent}  min: ${duration.min.toFixed(2)}ms`);
    lines.push(`${indent}  max: ${duration.max.toFixed(2)}ms`);
    lines.push(`${indent}  p95: ${duration['p(95)'].toFixed(2)}ms`);
    lines.push(`${indent}  p99: ${duration['p(99)'].toFixed(2)}ms`);
    lines.push('');
  }
  
  if (data.metrics.http_reqs) {
    const reqs = data.metrics.http_reqs.values;
    lines.push(`${indent}Requests:`);
    lines.push(`${indent}  total: ${reqs.count}`);
    lines.push(`${indent}  rate: ${reqs.rate.toFixed(2)}/s (RPS)`);
    lines.push('');
  }
  
  if (data.metrics.http_req_failed) {
    const failed = data.metrics.http_req_failed.values;
    lines.push(`${indent}Errors:`);
    lines.push(`${indent}  rate: ${(failed.rate * 100).toFixed(2)}%`);
    lines.push('');
  }
  
  return lines.join('\n');
}

