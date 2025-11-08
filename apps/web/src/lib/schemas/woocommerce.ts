/**
 * Zod schemas for WooCommerce API endpoints
 */

import { z } from 'zod';

// ============================================
// GET /api/woocommerce - Query Parameters
// ============================================

export const woocommerceQuerySchema = z.object({
  endpoint: z.string().min(1, 'Endpoint is required'),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  per_page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  customer: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  status: z.string().optional(),
  search: z.string().optional(),
  category: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  orderby: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  cache: z.enum(['on', 'off']).optional(),
  // Product-specific
  slug: z.string().optional(),
  include: z.string().optional(), // Comma-separated IDs
  // Order-specific
  after: z.string().optional(),
  before: z.string().optional(),
});

// ============================================
// POST /api/woocommerce?endpoint=orders
// ============================================

export const orderLineItemSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  variation_id: z.number().int().nonnegative().optional(), // 0 means no variation
  meta_data: z.array(z.any()).optional(),
});

export const billingAddressSchema = z.object({
  first_name: z.string().min(1, 'Imię jest wymagane'),
  last_name: z.string().min(1, 'Nazwisko jest wymagane'),
  company: z.string().optional(),
  address_1: z.string().min(1, 'Adres jest wymagany'),
  address_2: z.string().optional(),
  city: z.string().min(1, 'Miasto jest wymagane'),
  state: z.string().optional(),
  postcode: z.string().min(1, 'Kod pocztowy jest wymagany'),
  country: z.string().length(2, 'Kraj musi być kodem 2-znakowym (np. PL)'),
  email: z.string().email('Nieprawidłowy email').optional(),
  phone: z.string().optional(),
  customer_id: z.number().int().positive().optional(),
});

export const shippingAddressSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  company: z.string().optional(),
  address_1: z.string().min(1),
  address_2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postcode: z.string().min(1),
  country: z.string().length(2),
});

export const orderSchema = z.object({
  customer_id: z.number().int().positive().optional(),
  billing: billingAddressSchema,
  shipping: shippingAddressSchema.optional().nullable(),
  line_items: z.array(orderLineItemSchema).min(1, 'At least one line item is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  payment_method_title: z.string().optional(),
  set_paid: z.boolean().optional(),
  meta_data: z.array(z.any()).optional(),
  coupon_lines: z.array(z.object({
    code: z.string().min(1),
  })).optional(),
  shipping_lines: z.array(z.object({
    method_id: z.string().min(1),
    method_title: z.string().optional(),
    total: z.string().optional(),
  })).optional(),
});

// ============================================
// POST /api/woocommerce?endpoint=customers/password-reset
// ============================================

export const passwordResetSchema = z.object({
  email: z.string().email('Nieprawidłowy email'),
});

// ============================================
// POST /api/woocommerce?endpoint=customers/reset-password
// ============================================

export const resetPasswordSchema = z.object({
  key: z.string().min(10, 'Nieprawidłowy klucz'),
  login: z.string().min(1, 'Login jest wymagany'),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
});

// ============================================
// POST /api/woocommerce?endpoint=customer/update-profile
// ============================================

export const updateProfileSchema = z.object({
  customer_id: z.number().int().positive(),
  profile_data: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    billing: z.object({
      company: z.string().trim().optional().default(''),
      nip: z.string().trim().optional().default(''),
      invoiceRequest: z.union([z.boolean(), z.string()]).optional(),
      address: z.string().trim().min(1),
      city: z.string().trim().min(1),
      postcode: z.string().trim().min(2),
      country: z.string().length(2),
      phone: z.string().trim().min(5),
    }),
    shipping: z.object({
      company: z.string().trim().optional().default(''),
      address: z.string().trim().min(1),
      city: z.string().trim().min(1),
      postcode: z.string().trim().min(2),
      country: z.string().length(2),
    }).nullable().optional(),
  }),
});

// ============================================
// POST /api/woocommerce?endpoint=customer/change-password
// ============================================

export const changePasswordSchema = z.object({
  customer_id: z.number().int().positive(),
  current_password: z.string().min(8),
  new_password: z.string().min(8),
});

// ============================================
// Type exports
// ============================================

export type WooCommerceQuery = z.infer<typeof woocommerceQuerySchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderLineItem = z.infer<typeof orderLineItemSchema>;
export type BillingAddress = z.infer<typeof billingAddressSchema>;
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;

