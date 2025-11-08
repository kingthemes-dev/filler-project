/**
 * Zod schemas for Favorites API endpoints
 */

import { z } from 'zod';

// ============================================
// GET /api/favorites - Query Parameters
// ============================================

export const getFavoritesQuerySchema = z.object({
  userId: z.string().optional().default('anonymous'),
});

// ============================================
// POST /api/favorites
// ============================================

export const addFavoriteSchema = z.object({
  userId: z.string().optional().default('anonymous'),
  product: z.object({
    id: z.number().int().positive('Product ID must be a positive integer'),
    name: z.string().min(1, 'Product name is required'),
    slug: z.string().optional(),
    price: z.string().optional(),
    images: z.array(z.object({
      id: z.number().optional(),
      src: z.string().url().optional(),
      alt: z.string().optional(),
    }).passthrough()).optional(),
    // Allow other product fields
  }).passthrough(),
});

// ============================================
// DELETE /api/favorites - Query Parameters
// ============================================

export const deleteFavoriteQuerySchema = z.object({
  userId: z.string().optional().default('anonymous'),
  productId: z.string().min(1, 'Product ID is required').transform((val) => parseInt(val, 10)),
});

// ============================================
// Type exports
// ============================================

export type GetFavoritesQuery = z.infer<typeof getFavoritesQuerySchema>;
export type AddFavorite = z.infer<typeof addFavoriteSchema>;
export type DeleteFavoriteQuery = z.infer<typeof deleteFavoriteQuerySchema>;

export const syncFavoritesSchema = z.object({
  userId: z.string().optional().default('anonymous'),
  favorites: z.array(addFavoriteSchema.shape.product),
});

export type SyncFavorites = z.infer<typeof syncFavoritesSchema>;

