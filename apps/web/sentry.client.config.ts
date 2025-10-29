import * as Sentry from '@sentry/nextjs';

// Tymczasowo wyłącz Sentry dla lokalnego rozwoju
if (process.env.NODE_ENV === 'development' && process.env.DISABLE_SENTRY === 'true') {
  console.log('🔧 Sentry wyłączony dla lokalnego rozwoju');
} else {
  Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
  replaysOnErrorSampleRate: 1.0,
  
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.1,
  
  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Performance Monitoring
  beforeSend(event, hint) {
    // Filter out non-critical errors in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send network errors
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error && error.message.includes('fetch')) {
          return null;
        }
      }
    }
    return event;
  },
  
  // Set user context
  beforeSendTransaction(event) {
    // Add custom tags
    event.tags = {
      ...event.tags,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    };
    return event;
  },
});
}

