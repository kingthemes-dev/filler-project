import { z } from 'zod';
import { sanitizeString, sanitizeEmail } from '@/utils/input-validation';

const sanitizedString = (min = 0, max = 500) =>
  z
    .string({ invalid_type_error: 'Pole musi być tekstem' })
    .min(min, { message: `Pole musi mieć co najmniej ${min} znaków` })
    .max(max, { message: `Pole może mieć maksymalnie ${max} znaków` })
    .transform((value) => sanitizeString(value));

const optionalSanitizedString = (max = 500) =>
  z
    .string({ invalid_type_error: 'Pole musi być tekstem' })
    .max(max, { message: `Pole może mieć maksymalnie ${max} znaków` })
    .transform((value) => sanitizeString(value))
    .optional();

const emailField = () =>
  z
    .string({ required_error: 'Email jest wymagany', invalid_type_error: 'Email musi być tekstem' })
    .email('Nieprawidłowy adres email')
    .transform((value) => sanitizeEmail(value));

const optionalEmailField = () =>
  z
    .string({ invalid_type_error: 'Email musi być tekstem' })
    .email('Nieprawidłowy adres email')
    .transform((value) => sanitizeEmail(value))
    .optional();

const numericString = () =>
  z
    .union([
      z.number({ invalid_type_error: 'Pole musi być liczbą' }),
      z
        .string({ invalid_type_error: 'Pole musi być tekstem' })
        .regex(/^[0-9.,-]+$/, 'Pole musi być liczbą')
        .transform((value) => sanitizeString(value)),
    ])
    .transform((value) => (typeof value === 'number' ? value : value));

const invoiceItemSchema = z
  .object({
    name: sanitizedString(1, 200),
    quantity: z
      .union([
        z.number({ invalid_type_error: 'Ilość musi być liczbą' }),
        z
          .string({ invalid_type_error: 'Ilość musi być liczbą' })
          .regex(/^[0-9]+$/, 'Ilość musi być liczbą całkowitą')
          .transform((value) => parseInt(value, 10)),
      ])
      .refine((value) => Number.isFinite(value) && value > 0, { message: 'Ilość musi być dodatnia' }),
    price: numericString().optional(),
    total: numericString().optional(),
  })
  .strict();

export const adminAuthSchema = z
  .object({
    token: z
      .string({ required_error: 'Token jest wymagany', invalid_type_error: 'Token musi być tekstem' })
      .min(10, 'Token jest zbyt krótki')
      .max(256, 'Token jest zbyt długi')
      .transform((value) => sanitizeString(value)),
  })
  .strict();

export const sendEmailSchema = z
  .object({
    type: optionalSanitizedString(100),
    order_id: z
      .union([
        z.number({ invalid_type_error: 'ID zamówienia musi być liczbą' }),
        z
          .string({ invalid_type_error: 'ID zamówienia musi być tekstem' })
          .min(1, 'ID zamówienia jest wymagane')
          .max(50, 'ID zamówienia jest zbyt długie')
          .transform((value) => sanitizeString(value)),
      ])
      .optional(),
    orderId: z
      .union([
        z.number({ invalid_type_error: 'ID zamówienia musi być liczbą' }),
        z
          .string({ invalid_type_error: 'ID zamówienia musi być tekstem' })
          .min(1, 'ID zamówienia jest wymagane')
          .max(50, 'ID zamówienia jest zbyt długie')
          .transform((value) => sanitizeString(value)),
      ])
      .optional(),
    order_number: optionalSanitizedString(50),
    orderNumber: optionalSanitizedString(50),
    customer_email: optionalEmailField(),
    customerEmail: optionalEmailField(),
    to: optionalEmailField(),
    customer_name: optionalSanitizedString(150),
    customerName: optionalSanitizedString(150),
    total: numericString().optional(),
    items: z.array(invoiceItemSchema).optional(),
    message: optionalSanitizedString(5000),
    subject: optionalSanitizedString(150),
  })
  .strict()
  .superRefine((data, ctx) => {
    const recipient = data.customer_email || data.customerEmail || data.to;
    if (!recipient) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customer_email'],
        message: 'Adres email odbiorcy jest wymagany',
      });
    }
  });

export const sendDiscountEmailSchema = z
  .object({
    email: emailField(),
    firstName: optionalSanitizedString(150),
    lastName: optionalSanitizedString(150),
    discountCode: sanitizedString(3, 50),
    source: optionalSanitizedString(50),
  })
  .strict();

export const sendNewsletterEmailSchema = z
  .object({
    email: emailField(),
    firstName: optionalSanitizedString(150),
    lastName: optionalSanitizedString(150),
    discountCode: sanitizedString(3, 50),
    source: optionalSanitizedString(50),
  })
  .strict();

export const cartProxySchema = z
  .object({
    action: z
      .enum(['add', 'remove', 'update', 'cart'])
      .optional()
      .default('add'),
    key: optionalSanitizedString(200),
    quantity: z
      .union([
        z.number({ invalid_type_error: 'Ilość musi być liczbą' }),
        z
          .string({ invalid_type_error: 'Ilość musi być liczbą' })
          .regex(/^[0-9]+$/, 'Ilość musi być liczbą całkowitą')
          .transform((value) => parseInt(value, 10)),
      ])
      .optional(),
    product_id: z
      .union([
        z.number({ invalid_type_error: 'ID produktu musi być liczbą' }),
        z
          .string({ invalid_type_error: 'ID produktu musi być tekstem' })
          .regex(/^[0-9]+$/, 'ID produktu musi być liczbą całkowitą')
          .transform((value) => parseInt(value, 10)),
      ])
      .optional(),
    variation_id: z
      .union([
        z.number({ invalid_type_error: 'ID wariantu musi być liczbą' }),
        z
          .string({ invalid_type_error: 'ID wariantu musi być tekstem' })
          .regex(/^[0-9]+$/, 'ID wariantu musi być liczbą całkowitą')
          .transform((value) => parseInt(value, 10)),
      ])
      .optional(),
    quantity_step: z
      .union([
        z.number({ invalid_type_error: 'Krok ilości musi być liczbą' }),
        z
          .string({ invalid_type_error: 'Krok ilości musi być tekstem' })
          .regex(/^[0-9]+$/, 'Krok ilości musi być liczbą całkowitą')
          .transform((value) => parseInt(value, 10)),
      ])
      .optional(),
    attributes: z.record(optionalSanitizedString(200)).optional(),
    cart_item_data: z.record(z.any()).optional(),
  })
  .strict();

export const edgeAnalyticsEventSchema = z
  .object({
    event: sanitizedString(1, 150),
    timestamp: sanitizedString(1, 100),
    properties: z.record(z.any()).optional(),
    sessionId: optionalSanitizedString(100),
    userId: optionalSanitizedString(100),
    context: z.record(z.any()).optional(),
  })
  .strict();

export const errorTrackingSchema = z
  .object({
    type: z.enum(['errors', 'performance']),
    data: z
      .array(
        z
          .object({
            message: optionalSanitizedString(1000),
            category: optionalSanitizedString(200),
            level: optionalSanitizedString(50),
            url: optionalSanitizedString(500),
            timestamp: optionalSanitizedString(100),
            metadata: z.record(z.any()).optional(),
          })
          .strict()
      )
      .min(1, 'Lista danych nie może być pusta'),
  })
  .strict();

export const errorsSchema = z
  .object({
    message: sanitizedString(1, 1000),
    stack: optionalSanitizedString(5000),
    component: optionalSanitizedString(200),
    type: optionalSanitizedString(100),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    url: optionalSanitizedString(500),
    user_agent: optionalSanitizedString(500),
    timestamp: sanitizedString(1, 100),
    error_id: optionalSanitizedString(200),
    service: optionalSanitizedString(200),
    version: optionalSanitizedString(50),
    session_id: optionalSanitizedString(200),
    user_id: optionalSanitizedString(200),
  })
  .strict();

const metricObjectSchema = z
  .object({
    name: sanitizedString(1, 100),
    value: z.number({ invalid_type_error: 'Wartość musi być liczbą' }),
    timestamp: optionalSanitizedString(100),
    url: optionalSanitizedString(500),
    metadata: z.record(z.any()).optional(),
  })
  .strict();

export const performanceMetricsSchema = z
  .object({
    metrics: z
      .union([
        z.array(metricObjectSchema),
        z.record(z.any()),
      ])
      .optional(),
    lcpTime: z.number().optional(),
    clsScore: z.number().optional(),
    fidTime: z.number().optional(),
    ttfbTime: z.number().optional(),
    loadTime: z.number().optional(),
    timestamp: optionalSanitizedString(100),
    url: optionalSanitizedString(500),
    metadata: z.record(z.any()).optional(),
  })
  .strict();

export const performanceReportSchema = z
  .object({
    type: z.literal('performance'),
    data: z
      .array(
        z
          .object({
            name: sanitizedString(1, 100),
            value: z.number({ invalid_type_error: 'Wartość musi być liczbą' }),
            url: optionalSanitizedString(500),
            timestamp: optionalSanitizedString(100),
            metadata: z.record(z.any()).optional(),
          })
          .strict()
      )
      .min(1, 'Lista metryk nie może być pusta'),
  })
  .strict();

export const recaptchaVerifySchema = z
  .object({
    token: sanitizedString(10, 200),
  })
  .strict();

/**
 * Revalidate schema for ISR revalidation endpoint
 */
export const revalidateSchema = z
  .object({
    paths: z
      .array(sanitizedString(1, 500))
      .max(100, 'Maximum 100 paths allowed')
      .optional(),
    tags: z
      .array(sanitizedString(1, 500))
      .max(100, 'Maximum 100 tags allowed')
      .optional(),
  })
  .strict()
  .refine(
    (data) => (data.paths && data.paths.length > 0) || (data.tags && data.tags.length > 0),
    {
      message: 'At least one path or tag is required',
      path: ['paths'],
    }
  );

export const customerUpdateProfileSchema = z
  .object({
    customer_id: z
      .union([
        z.number({ invalid_type_error: 'ID klienta musi być liczbą' }),
        z
          .string({ invalid_type_error: 'ID klienta musi być tekstem' })
          .regex(/^[0-9]+$/, 'ID klienta musi być liczbą całkowitą')
          .transform((value) => parseInt(value, 10)),
      ])
      .optional(),
    profile_data: z.record(z.any()).optional(),
  })
  .strict();

export const discountCodeSchema = z
  .object({
    email: emailField(),
    firstName: optionalSanitizedString(150),
    lastName: optionalSanitizedString(150),
    source: optionalSanitizedString(50),
  })
  .strict();

export type AdminAuthPayload = z.infer<typeof adminAuthSchema>;
export type SendEmailPayload = z.infer<typeof sendEmailSchema>;
export type SendDiscountEmailPayload = z.infer<typeof sendDiscountEmailSchema>;
export type SendNewsletterEmailPayload = z.infer<typeof sendNewsletterEmailSchema>;
export type CartProxyPayload = z.infer<typeof cartProxySchema>;
export type EdgeAnalyticsPayload = z.infer<typeof edgeAnalyticsEventSchema>;
export type ErrorTrackingPayload = z.infer<typeof errorTrackingSchema>;
export type ErrorPayload = z.infer<typeof errorsSchema>;
export type PerformanceMetricsPayload = z.infer<typeof performanceMetricsSchema>;
export type PerformanceReportPayload = z.infer<typeof performanceReportSchema>;
export type RecaptchaVerifyPayload = z.infer<typeof recaptchaVerifySchema>;
