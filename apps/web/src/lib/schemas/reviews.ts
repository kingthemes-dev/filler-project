/**
 * Zod schemas for Reviews API endpoints
 */

import { z } from 'zod';

// ============================================
// GET /api/reviews - Query Parameters
// ============================================

export const getReviewsQuerySchema = z.object({
  product_id: z
    .string()
    .min(1, 'Product ID is required')
    .transform(val => parseInt(val, 10)),
});

// ============================================
// POST /api/reviews
// ============================================

export const createReviewSchema = z.object({
  product_id: z
    .number()
    .int()
    .positive('Product ID must be a positive integer'),
  review: z
    .string()
    .min(10, 'Review must be at least 10 characters')
    .max(5000, 'Review must be less than 5000 characters'),
  reviewer: z
    .string()
    .min(1, 'Reviewer name is required')
    .max(100, 'Reviewer name must be less than 100 characters'),
  reviewer_email: z.string().email('Invalid email address'),
  rating: z
    .number()
    .int()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  // Optional fields
  reviewer_avatar_urls: z.record(z.string()).optional(),
  verified: z.boolean().optional(),
  images: z
    .array(z.union([z.number(), z.string().url()]))
    .max(5, 'Maximum 5 images allowed')
    .optional(),
  videos: z
    .array(z.string().url())
    .max(3, 'Maximum 3 videos allowed')
    .optional(),
});

// ============================================
// Type exports
// ============================================

export type GetReviewsQuery = z.infer<typeof getReviewsQuerySchema>;
export type CreateReview = z.infer<typeof createReviewSchema>;
