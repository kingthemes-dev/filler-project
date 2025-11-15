/**
 * HPOS-Compatible Webhooks Handler
 * Handles WooCommerce webhooks with HPOS support
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hposCache } from '@/lib/hpos-cache';
import { orderLimitHandler } from '@/services/order-limit-handler';
import { logger } from '@/utils/logger';
import { z } from 'zod';
import { validateApiInput } from '@/utils/request-validation';
import { addSecurityHeaders } from '@/utils/api-security';

type RedisClient = import('ioredis').Redis;
type WebhookData = Record<string, unknown>;

interface WebhookPayload {
  id: number;
  type: string;
  action: string;
  data: WebhookData;
  timestamp: string;
  hpos_enabled?: boolean;
}

// Redis client for idempotency (optional, lazy-loaded)
let redisClient: RedisClient | null = null;
let redisInitialized = false;

/**
 * Initialize Redis for idempotency (lazy)
 */
async function initializeRedis(): Promise<void> {
  if (redisInitialized) return;
  redisInitialized = true;

  if (typeof window !== 'undefined') return;

  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      logger.debug(
        'WebhookHandler: Redis not configured for idempotency, using in-memory store'
      );
      return;
    }

    const Redis = (await import('ioredis')).default;
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
      enableReadyCheck: false,
    });

    redisClient.on('connect', () => {
      logger.info('WebhookHandler: Redis connected for idempotency');
    });

    redisClient.on('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        'WebhookHandler: Redis connection failed, using in-memory idempotency',
        { error: message }
      );
      redisClient = null;
    });

    await redisClient.connect().catch(() => {
      redisClient = null;
    });
  } catch (error) {
    logger.warn('WebhookHandler: Failed to initialize Redis for idempotency', {
      error,
    });
    redisClient = null;
  }
}

// In-memory idempotency store (fallback)
const processedWebhooks = new Map<string, number>(); // deliveryId -> timestamp
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if webhook was already processed (idempotency)
 */
async function isWebhookProcessed(deliveryId: string): Promise<boolean> {
  await initializeRedis();

  if (redisClient) {
    try {
      const key = `webhook:idempotency:${deliveryId}`;
      const exists = await redisClient.exists(key);
      return exists === 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        'WebhookHandler: Redis idempotency check failed, falling back to memory',
        { error: message }
      );
    }
  }

  // Fallback to in-memory
  const processed = processedWebhooks.get(deliveryId);
  if (!processed) return false;

  // Clean expired entries
  const now = Date.now();
  if (processed + IDEMPOTENCY_TTL < now) {
    processedWebhooks.delete(deliveryId);
    return false;
  }

  return true;
}

/**
 * Mark webhook as processed (idempotency)
 */
async function markWebhookProcessed(deliveryId: string): Promise<void> {
  await initializeRedis();

  if (redisClient) {
    try {
      const key = `webhook:idempotency:${deliveryId}`;
      const ttlSeconds = Math.ceil(IDEMPOTENCY_TTL / 1000);
      await redisClient.setex(key, ttlSeconds, '1');
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(
        'WebhookHandler: Redis idempotency mark failed, falling back to memory',
        { error: message }
      );
    }
  }

  // Fallback to in-memory
  processedWebhooks.set(deliveryId, Date.now());

  // Clean old entries periodically (every 1000 webhooks)
  if (processedWebhooks.size > 1000 && Math.random() < 0.001) {
    const now = Date.now();
    for (const [id, timestamp] of processedWebhooks.entries()) {
      if (timestamp + IDEMPOTENCY_TTL < now) {
        processedWebhooks.delete(id);
      }
    }
  }
}

function extractNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function extractString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getNumericField(data: WebhookData, key: string): number | undefined {
  return extractNumber(data[key]);
}

function getStringField(data: WebhookData, key: string): string | undefined {
  return extractString(data[key]);
}

function normalizeWebhookPayload(
  raw: z.infer<typeof webhookPayloadSchema>
): WebhookPayload | null {
  const id = extractNumber(raw.id);
  if (id === undefined) {
    return null;
  }
  const data =
    raw.data && typeof raw.data === 'object' && raw.data !== null
      ? (raw.data as WebhookData)
      : {};
  const timestamp = extractString(raw.timestamp) ?? new Date().toISOString();
  return {
    id,
    type: raw.type,
    action: raw.action,
    data,
    timestamp,
    hpos_enabled: raw.hpos_enabled,
  };
}

const webhookHeadersSchema = z.object({
  signature: z.string().min(1, 'Missing signature'),
  topic: z.string().min(1, 'Missing topic'),
  deliveryId: z.string().optional(),
  source: z.string().optional(),
});

const webhookPayloadSchema = z.object({
  id: z.union([z.number(), z.string()]),
  type: z.string().min(1),
  action: z.string().min(1),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().optional(),
  hpos_enabled: z.boolean().optional(),
});

class WebhookHandler {
  private webhookSecret: string;

  constructor() {
    // FIX: Użyj WOOCOMMERCE_WEBHOOK_SECRET zamiast WEBHOOK_SECRET (zgodnie z env.ts)
    this.webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET || '';
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      logger.warn('WebhookHandler: No webhook secret configured');
      return false;
    }
    if (!signature) {
      logger.warn('WebhookHandler: Missing webhook signature header');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('base64');

      const providedBuffer = Buffer.from(signature, 'base64');
      const expectedBuffer = Buffer.from(expectedSignature, 'base64');

      if (providedBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('WebhookHandler: Signature verification failed', {
        error: message,
      });
      return false;
    }
  }

  /**
   * Handle order webhooks
   */
  private async handleOrderWebhook(payload: WebhookPayload): Promise<void> {
    const { id, action, data, hpos_enabled: hposEnabled } = payload;

    logger.info('WebhookHandler: Processing order webhook', {
      orderId: id,
      action,
      hposEnabled,
    });

    switch (action) {
      case 'created':
        await this.handleOrderCreated(data);
        break;
      case 'updated':
        await this.handleOrderUpdated(data);
        break;
      case 'deleted':
        await this.handleOrderDeleted(data);
        break;
      case 'status_changed':
        await this.handleOrderStatusChanged(data);
        break;
      case 'payment_complete':
        await this.handleOrderPaymentComplete(data);
        break;
      case 'refunded':
        await this.handleOrderRefunded(data);
        break;
      default:
        logger.warn('WebhookHandler: Unknown order action', { action });
    }
  }

  /**
   * Handle product webhooks
   */
  private async handleProductWebhook(payload: WebhookPayload): Promise<void> {
    const { id, action, data } = payload;

    logger.info('WebhookHandler: Processing product webhook', {
      productId: id,
      action,
    });

    // Invalidate product cache
    await hposCache.invalidateByTag('products');

    switch (action) {
      case 'created':
        await this.handleProductCreated(data);
        break;
      case 'updated':
        await this.handleProductUpdated(data);
        break;
      case 'deleted':
        await this.handleProductDeleted(data);
        break;
      default:
        logger.warn('WebhookHandler: Unknown product action', { action });
    }
  }

  /**
   * Handle customer webhooks
   */
  private async handleCustomerWebhook(payload: WebhookPayload): Promise<void> {
    const { id, action, data } = payload;

    logger.info('WebhookHandler: Processing customer webhook', {
      customerId: id,
      action,
    });

    // Invalidate customer cache
    await hposCache.invalidateByTag('customers');

    switch (action) {
      case 'created':
        await this.handleCustomerCreated(data);
        break;
      case 'updated':
        await this.handleCustomerUpdated(data);
        break;
      case 'deleted':
        await this.handleCustomerDeleted(data);
        break;
      default:
        logger.warn('WebhookHandler: Unknown customer action', { action });
    }
  }

  // Order webhook handlers
  private async handleOrderCreated(order: WebhookData): Promise<void> {
    const orderId = getNumericField(order, 'id');
    logger.info('WebhookHandler: Order created', { orderId });

    // Invalidate order cache
    await hposCache.invalidateByTag('orders');

    // Reset order attempts for customer
    const customerId = getNumericField(order, 'customer_id');
    if (typeof customerId === 'number') {
      await orderLimitHandler.resetCustomerAttempts(customerId);
    }
  }

  private async handleOrderUpdated(order: WebhookData): Promise<void> {
    const orderId = getNumericField(order, 'id');
    logger.info('WebhookHandler: Order updated', { orderId });

    // Invalidate order cache
    await hposCache.invalidateByTag('orders');
  }

  private async handleOrderDeleted(order: WebhookData): Promise<void> {
    const orderId = getNumericField(order, 'id');
    logger.info('WebhookHandler: Order deleted', { orderId });

    // Invalidate order cache
    await hposCache.invalidateByTag('orders');
  }

  private async handleOrderStatusChanged(order: WebhookData): Promise<void> {
    const orderId = getNumericField(order, 'id');
    const status = getStringField(order, 'status');
    logger.info('WebhookHandler: Order status changed', {
      orderId,
      status,
    });

    // Invalidate order cache
    await hposCache.invalidateByTag('orders');
  }

  private async handleOrderPaymentComplete(order: WebhookData): Promise<void> {
    const orderId = getNumericField(order, 'id');
    logger.info('WebhookHandler: Order payment complete', { orderId });

    // Invalidate order cache
    await hposCache.invalidateByTag('orders');
  }

  private async handleOrderRefunded(order: WebhookData): Promise<void> {
    const orderId = getNumericField(order, 'id');
    logger.info('WebhookHandler: Order refunded', { orderId });

    // Invalidate order cache
    await hposCache.invalidateByTag('orders');
  }

  // Product webhook handlers
  private async handleProductCreated(product: WebhookData): Promise<void> {
    const productId = getNumericField(product, 'id');
    logger.info('WebhookHandler: Product created', { productId });
  }

  private async handleProductUpdated(product: WebhookData): Promise<void> {
    const productId = getNumericField(product, 'id');
    logger.info('WebhookHandler: Product updated', { productId });
  }

  private async handleProductDeleted(product: WebhookData): Promise<void> {
    const productId = getNumericField(product, 'id');
    logger.info('WebhookHandler: Product deleted', { productId });
  }

  // Customer webhook handlers
  private async handleCustomerCreated(customer: WebhookData): Promise<void> {
    const customerId = getNumericField(customer, 'id');
    logger.info('WebhookHandler: Customer created', { customerId });
  }

  private async handleCustomerUpdated(customer: WebhookData): Promise<void> {
    const customerId = getNumericField(customer, 'id');
    logger.info('WebhookHandler: Customer updated', { customerId });
  }

  private async handleCustomerDeleted(customer: WebhookData): Promise<void> {
    const customerId = getNumericField(customer, 'id');
    logger.info('WebhookHandler: Customer deleted', { customerId });
  }

  /**
   * Process webhook
   */
  async processWebhook(req: NextRequest): Promise<NextResponse> {
    try {
      const rawHeaders = {
        signature: req.headers.get('x-wc-webhook-signature') ?? '',
        topic: req.headers.get('x-wc-webhook-topic') ?? '',
        deliveryId: req.headers.get('x-wc-webhook-delivery-id') ?? undefined,
        source: req.headers.get('x-wc-webhook-source') ?? undefined,
      };
      const headersResult = webhookHeadersSchema.safeParse(rawHeaders);
      if (!headersResult.success) {
        logger.warn('WebhookHandler: Invalid headers', {
          errors: headersResult.error.flatten(),
        });
        const errorResponse = NextResponse.json(
          { error: 'Invalid webhook headers' },
          { status: 400 }
        );
        return addSecurityHeaders(errorResponse);
      }
      const headers = headersResult.data;

      const payloadBody = await req.text();

      if (!this.verifySignature(payloadBody, headers.signature)) {
        const errorResponse = NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
        return addSecurityHeaders(errorResponse);
      }

      const { deliveryId } = headers;

      if (deliveryId) {
        const alreadyProcessed = await isWebhookProcessed(deliveryId);
        if (alreadyProcessed) {
          logger.info(
            'WebhookHandler: Webhook already processed (idempotency)',
            {
              deliveryId,
              topic: headers.topic,
            }
          );
          const response = NextResponse.json({
            success: true,
            message: 'Webhook already processed',
            idempotent: true,
          });
          return addSecurityHeaders(response);
        }
      }

      let parsedPayload: unknown;
      try {
        parsedPayload = JSON.parse(payloadBody);
      } catch (parseError) {
        const message =
          parseError instanceof Error ? parseError.message : String(parseError);
        logger.warn('WebhookHandler: Failed to parse webhook payload', {
          error: message,
        });
        const errorResponse = NextResponse.json(
          { error: 'Invalid webhook payload' },
          { status: 400 }
        );
        return addSecurityHeaders(errorResponse);
      }

      const sanitizedPayload = validateApiInput(parsedPayload);
      const payloadResult = webhookPayloadSchema.safeParse(sanitizedPayload);
      if (!payloadResult.success) {
        logger.warn('WebhookHandler: Payload validation failed', {
          errors: payloadResult.error.flatten(),
        });
        const errorResponse = NextResponse.json(
          { error: 'Invalid webhook payload' },
          { status: 400 }
        );
        return addSecurityHeaders(errorResponse);
      }

      const payload = normalizeWebhookPayload(payloadResult.data);
      if (!payload) {
        logger.warn('WebhookHandler: Invalid webhook payload structure');
        const errorResponse = NextResponse.json(
          { error: 'Invalid webhook payload' },
          { status: 400 }
        );
        return addSecurityHeaders(errorResponse);
      }

      const topic = headers.topic;

      logger.info('WebhookHandler: Processing webhook', {
        topic,
        deliveryId,
        source: headers.source,
      });

      if (topic.startsWith('order.')) {
        await this.handleOrderWebhook(payload);
      } else if (topic.startsWith('product.')) {
        await this.handleProductWebhook(payload);
      } else if (topic.startsWith('customer.')) {
        await this.handleCustomerWebhook(payload);
      } else {
        logger.warn('WebhookHandler: Unknown webhook topic', { topic });
      }

      if (deliveryId) {
        await markWebhookProcessed(deliveryId);
      }

      const response = NextResponse.json({ success: true });
      return addSecurityHeaders(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('WebhookHandler: Error processing webhook', {
        error: message,
      });
      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
      return addSecurityHeaders(errorResponse);
    }
  }
}

// Export handler instance
export const webhookHandler = new WebhookHandler();
