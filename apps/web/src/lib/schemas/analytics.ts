/**
 * Zod schemas for Analytics API endpoints
 */

import { z } from 'zod';

// ============================================
// POST /api/analytics
// ============================================

export const analyticsEventSchema = z.object({
  event_type: z.string().min(1, 'Event type is required'),
  properties: z.record(z.any()).default({}),
  session_id: z.string().min(1, 'Session ID is required'),
  user_id: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export const analyticsRequestSchema = z.object({
  events: z
    .array(analyticsEventSchema)
    .min(1, 'At least one event is required'),
  session_id: z.string().min(1, 'Session ID is required'),
  user_id: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

// ============================================
// GET /api/analytics - Query Parameters
// ============================================

export const getAnalyticsQuerySchema = z.object({
  session_id: z.string().optional(),
  user_id: z.string().optional(),
  event_type: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined)),
  offset: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : undefined)),
});

// ============================================
// Type exports
// ============================================

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
export type AnalyticsRequest = z.infer<typeof analyticsRequestSchema>;
export type GetAnalyticsQuery = z.infer<typeof getAnalyticsQuerySchema>;
