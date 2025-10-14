import { z } from 'zod';

// Newsletter schema for Brevo integration
export const NewsletterSchema = z.object({
  settings: z.object({
    enabled: z.boolean(),
    apiKey: z.string(),
    listId: z.string(),
    webhookUrl: z.string().url(),
    doubleOptIn: z.boolean(),
    templateId: z.string().optional(),
    retryPolicy: z.object({
      maxRetries: z.number(),
      retryDelay: z.number(),
    }),
  }),
  templates: z.object({
    welcome: z.object({
      id: z.string(),
      subject: z.string(),
      content: z.string(),
      language: z.enum(['pl', 'en', 'de', 'es']),
    }),
    coupon: z.object({
      id: z.string(),
      subject: z.string(),
      content: z.string(),
      language: z.enum(['pl', 'en', 'de', 'es']),
    }),
    unsubscribe: z.object({
      id: z.string(),
      subject: z.string(),
      content: z.string(),
      language: z.enum(['pl', 'en', 'de', 'es']),
    }),
  }),
  coupon: z.object({
    enabled: z.boolean(),
    type: z.enum(['percentage', 'fixed_amount']),
    value: z.number(),
    expiry: z.number(), // days
    minimumAmount: z.number().optional(),
    oneTime: z.boolean(),
    excludeCategories: z.array(z.string()),
    codePrefix: z.string(),
    language: z.enum(['pl', 'en', 'de', 'es']),
  }),
  gdpr: z.object({
    enabled: z.boolean(),
    consentText: z.string(),
    privacyPolicyUrl: z.string().url(),
    termsUrl: z.string().url(),
    logConsent: z.boolean(),
    consentFields: z.array(z.object({
      name: z.string(),
      required: z.boolean(),
      purpose: z.string(),
    })),
  }),
  forms: z.array(z.object({
    id: z.string(),
    name: z.string(),
    title: z.string(),
    description: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['email', 'text', 'select', 'checkbox']),
      label: z.string(),
      placeholder: z.string().optional(),
      required: z.boolean(),
      options: z.array(z.string()).optional(),
    })),
    buttonText: z.string(),
    successMessage: z.string(),
    errorMessage: z.string(),
    position: z.enum(['header', 'footer', 'sidebar', 'popup', 'inline']),
    active: z.boolean(),
  })),
  campaigns: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['welcome', 'abandoned_cart', 'winback', 'promotional']),
    subject: z.string(),
    content: z.string(),
    language: z.enum(['pl', 'en', 'de', 'es']),
    schedule: z.object({
      type: z.enum(['immediate', 'scheduled', 'triggered']),
      date: z.string().datetime().optional(),
      trigger: z.string().optional(),
    }),
    audience: z.object({
      listId: z.string(),
      segments: z.array(z.string()),
      excludeSegments: z.array(z.string()),
    }),
    active: z.boolean(),
  })),
  analytics: z.object({
    openRate: z.number(),
    clickRate: z.number(),
    unsubscribeRate: z.number(),
    conversionRate: z.number(),
    revenue: z.number(),
    lastUpdated: z.string().datetime(),
  }),
  webhooks: z.object({
    subscribe: z.string().url(),
    unsubscribe: z.string().url(),
    update: z.string().url(),
    complaint: z.string().url(),
  }),
});

export type Newsletter = z.infer<typeof NewsletterSchema>;

// Brevo webhook schemas
export const BrevoWebhookSchema = z.object({
  event: z.enum(['subscribe', 'unsubscribe', 'update', 'complaint', 'bounce']),
  email: z.string().email(),
  listId: z.string(),
  date: z.string().datetime(),
  attributes: z.record(z.any()).optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});

export type BrevoWebhook = z.infer<typeof BrevoWebhookSchema>;

// Newsletter subscription schema
export const NewsletterSubscriptionSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  listId: z.string(),
  attributes: z.record(z.any()).optional(),
  doubleOptIn: z.boolean(),
  consent: z.object({
    marketing: z.boolean(),
    privacy: z.boolean(),
    timestamp: z.string().datetime(),
    ip: z.string(),
    userAgent: z.string().optional(),
  }),
  language: z.enum(['pl', 'en', 'de', 'es']),
  source: z.string(),
});

export type NewsletterSubscription = z.infer<typeof NewsletterSubscriptionSchema>;

// A/B test schema for newsletter campaigns
export const NewsletterABTestSchema = z.object({
  id: z.string(),
  name: z.string(),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    subject: z.string(),
    content: z.string(),
    weight: z.number().min(0).max(1),
  })),
  metrics: z.object({
    openRate: z.number(),
    clickRate: z.number(),
    conversionRate: z.number(),
    revenue: z.number(),
  }),
  status: z.enum(['draft', 'running', 'completed', 'paused']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  winner: z.string().optional(),
});

export type NewsletterABTest = z.infer<typeof NewsletterABTestSchema>;
