/**
 * Zod schemas for Webhooks API endpoints
 */

import { z } from 'zod';

// ============================================
// POST /api/webhooks - Headers
// ============================================

export const webhookHeadersSchema = z.object({
  'x-wc-webhook-signature': z.string().min(1, 'Webhook signature is required'),
  'x-wc-webhook-topic': z.string().min(1, 'Webhook topic is required'),
  'x-wc-webhook-delivery-id': z.string().min(1, 'Webhook delivery ID is required'),
  'x-wc-webhook-source': z.string().url('Invalid webhook source URL'),
});

// ============================================
// POST /api/webhooks - Payload
// ============================================

export const webhookPayloadSchema = z.object({
  id: z.number().int().positive(),
  type: z.enum(['order', 'product', 'customer']),
  action: z.string().min(1),
  data: z.any(), // WooCommerce webhook data structure
  timestamp: z.string().datetime().optional(),
  hpos_enabled: z.boolean().optional(),
});

// ============================================
// Type exports
// ============================================

export type WebhookHeaders = z.infer<typeof webhookHeadersSchema>;
export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;

