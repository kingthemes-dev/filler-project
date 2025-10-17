import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',
  
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
  
  // Set server context
  beforeSendTransaction(event) {
    // Add custom tags
    event.tags = {
      ...event.tags,
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      server: true,
    };
    return event;
  },
});

