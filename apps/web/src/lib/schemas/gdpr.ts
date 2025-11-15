/**
 * Zod schemas for GDPR/RODO API endpoints
 */

import { z } from 'zod';

// ============================================
// Cookie Consent Schemas
// ============================================

export const cookiePreferencesSchema = z.object({
  necessary: z.boolean().default(true),
  analytics: z.boolean().default(false),
  marketing: z.boolean().default(false),
  preferences: z.boolean().default(false),
});

export const cookieConsentSchema = z.object({
  preferences: cookiePreferencesSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  version: z.string().min(1),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

// ============================================
// GDPR Request Schemas
// ============================================

export const gdprRequestTypeSchema = z.enum([
  'export',
  'delete',
  'portability',
  'restrict',
  'rectify',
]);

export const gdprRequestStatusSchema = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
]);

// ============================================
// GET /api/gdpr/export
// ============================================

export const gdprExportQuerySchema = z.object({
  format: z.enum(['json', 'pdf', 'csv']).optional().default('json'),
});

// ============================================
// POST /api/gdpr/delete
// ============================================

export const gdprDeleteRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  confirmation: z
    .boolean()
    .refine(val => val === true, 'Confirmation is required'),
  reason: z.string().max(1000, 'Reason must be less than 1000 characters').optional(),
});

// ============================================
// POST /api/gdpr/portability
// ============================================

export const gdprPortabilityRequestSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});

// ============================================
// POST /api/gdpr/restrict
// ============================================

export const gdprRestrictRequestSchema = z.object({
  categories: z
    .array(z.enum(['marketing', 'analytics', 'preferences']))
    .min(1, 'At least one category is required'),
  reason: z
    .string()
    .max(1000, 'Reason must be less than 1000 characters')
    .optional(),
});

// ============================================
// POST /api/gdpr/rectify
// ============================================

export const gdprRectifyRequestSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  old_value: z.string().optional(),
  new_value: z.string().min(1, 'New value is required'),
  reason: z
    .string()
    .max(1000, 'Reason must be less than 1000 characters')
    .optional(),
});

// ============================================
// GDPR Audit Log Schema
// ============================================

export const gdprAuditLogSchema = z.object({
  user_id: z.number().int().positive(),
  action: z.union([
    gdprRequestTypeSchema,
    z.enum(['consent_changed', 'consent_accepted', 'consent_rejected']),
  ]),
  details: z.record(z.any()).default({}),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

// ============================================
// Type exports
// ============================================

export type CookiePreferences = z.infer<typeof cookiePreferencesSchema>;
export type CookieConsent = z.infer<typeof cookieConsentSchema>;
export type GDPRRequestType = z.infer<typeof gdprRequestTypeSchema>;
export type GDPRRequestStatus = z.infer<typeof gdprRequestStatusSchema>;
export type GDPRExportQuery = z.infer<typeof gdprExportQuerySchema>;
export type GDPRDeleteRequest = z.infer<typeof gdprDeleteRequestSchema>;
export type GDPRPortabilityRequest = z.infer<
  typeof gdprPortabilityRequestSchema
>;
export type GDPRRestrictRequest = z.infer<typeof gdprRestrictRequestSchema>;
export type GDPRRectifyRequest = z.infer<typeof gdprRectifyRequestSchema>;
export type GDPRAuditLog = z.infer<typeof gdprAuditLogSchema>;

