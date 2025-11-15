/**
 * Zod schemas for Newsletter API endpoints
 */

import { z } from 'zod';

// ============================================
// POST /api/newsletter/subscribe
// ============================================

export const newsletterSubscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  source: z.string().optional(),
  consent: z.boolean().optional().default(false),
});

// ============================================
// Type exports
// ============================================

export type NewsletterSubscribe = z.infer<typeof newsletterSubscribeSchema>;
