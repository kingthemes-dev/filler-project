module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000',
        'http://localhost:3000/sklep',
        'http://localhost:3000/produkt/aesplla',
        'http://localhost:3000/koszyk',
      ],
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
        preset: 'perf', // Mobile-like performance preset
        // Skip authentication-required pages
        skipAudits: ['uses-http2'],
        // Throttling settings for mobile
        throttling: {
          rttMs: 40,
          throughputKbps: 10 * 1024,
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      // Assertions for mobile
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance - slightly lower threshold for CI
        'categories:performance': ['error', { minScore: 0.90 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        
        // Core Web Vitals - critical metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'link-name': 'error',
        'button-name': 'error',
        
        // SEO
        'meta-description': 'warn',
        'document-title': 'error',
        'html-has-lang': 'error',
        'canonical': 'warn',
        
        // Best Practices
        'uses-https': 'error',
        'no-vulnerable-libraries': 'warn',
        'js-libraries': 'warn',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    server: {
      port: 9001,
      storage: {
        storageMethod: 'filesystem',
        storagePath: '.lighthouseci',
      },
    },
  },
};

