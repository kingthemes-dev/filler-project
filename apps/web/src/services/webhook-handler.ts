/**
 * HPOS-Compatible Webhooks Handler
 * Handles WooCommerce webhooks with HPOS support
 */

import { NextRequest, NextResponse } from 'next/server';
import { hposCache } from '@/lib/hpos-cache';
import { orderLimitHandler } from '@/services/order-limit-handler';
import { logger } from '@/utils/logger';

interface WebhookPayload {
  id: number;
  type: string;
  action: string;
  data: any;
  timestamp: string;
  hpos_enabled?: boolean;
}

interface WebhookHeaders {
  'x-wc-webhook-signature': string;
  'x-wc-webhook-topic': string;
  'x-wc-webhook-delivery-id': string;
  'x-wc-webhook-source': string;
}

class WebhookHandler {
  private webhookSecret: string;

  constructor() {
    this.webhookSecret = process.env.WEBHOOK_SECRET || '';
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      logger.warn('WebhookHandler: No webhook secret configured');
      return false;
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('WebhookHandler: Signature verification failed', { error });
      return false;
    }
  }

  /**
   * Handle order webhooks
   */
  private async handleOrderWebhook(payload: WebhookPayload): Promise<void> {
    const { id, action, data } = payload;

    logger.info('WebhookHandler: Processing order webhook', {
      orderId: id,
      action,
      hposEnabled: payload.hpos_enabled,
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
  private async handleOrderCreated(order: any): Promise<void> {
    logger.info('WebhookHandler: Order created', { orderId: order.id });
    
    // Invalidate order cache
    await hposCache.invalidateByTag('orders');
    
    // Reset order attempts for customer
    if (order.customer_id) {
      await orderLimitHandler.resetCustomerAttempts(order.customer_id);
    }
  }

  private async handleOrderUpdated(order: any): Promise<void> {
    logger.info('WebhookHandler: Order updated', { orderId: order.id });
    
    // Invalidate order cache
    await hposCache.invalidateByTag('orders');
  }

  private async handleOrderDeleted(order: any): Promise<void> {
    logger.info('WebhookHandler: Order deleted', { orderId: order.id });
    
    // Invalidate order cache
    await hposCache.invalidateByTag('orders');
  }

  private async handleOrderStatusChanged(order: any): Promise<void> {
    logger.info('WebhookHandler: Order status changed', { 
      orderId: order.id, 
      status: order.status 
    });
    
    // Invalidate order cache
    await hposCache.invalidateByTag('orders');
  }

  private async handleOrderPaymentComplete(order: any): Promise<void> {
    logger.info('WebhookHandler: Order payment complete', { orderId: order.id });
    
    // Invalidate order cache
    await hposCache.invalidateByTag('orders');
  }

  private async handleOrderRefunded(order: any): Promise<void> {
    logger.info('WebhookHandler: Order refunded', { orderId: order.id });
    
    // Invalidate order cache
    await hposCache.invalidateByTag('orders');
  }

  // Product webhook handlers
  private async handleProductCreated(product: any): Promise<void> {
    logger.info('WebhookHandler: Product created', { productId: product.id });
  }

  private async handleProductUpdated(product: any): Promise<void> {
    logger.info('WebhookHandler: Product updated', { productId: product.id });
  }

  private async handleProductDeleted(product: any): Promise<void> {
    logger.info('WebhookHandler: Product deleted', { productId: product.id });
  }

  // Customer webhook handlers
  private async handleCustomerCreated(customer: any): Promise<void> {
    logger.info('WebhookHandler: Customer created', { customerId: customer.id });
  }

  private async handleCustomerUpdated(customer: any): Promise<void> {
    logger.info('WebhookHandler: Customer updated', { customerId: customer.id });
  }

  private async handleCustomerDeleted(customer: any): Promise<void> {
    logger.info('WebhookHandler: Customer deleted', { customerId: customer.id });
  }

  /**
   * Process webhook
   */
  async processWebhook(req: NextRequest): Promise<NextResponse> {
    try {
      const body = await req.text();
      const headers = Object.fromEntries(req.headers.entries()) as any as WebhookHeaders;
      
      // Verify signature
      if (!this.verifySignature(body, headers['x-wc-webhook-signature'])) {
        logger.warn('WebhookHandler: Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      const payload: WebhookPayload = JSON.parse(body);
      const topic = headers['x-wc-webhook-topic'];

      logger.info('WebhookHandler: Processing webhook', {
        topic,
        deliveryId: headers['x-wc-webhook-delivery-id'],
        source: headers['x-wc-webhook-source'],
      });

      // Route to appropriate handler
      if (topic.startsWith('order.')) {
        await this.handleOrderWebhook(payload);
      } else if (topic.startsWith('product.')) {
        await this.handleProductWebhook(payload);
      } else if (topic.startsWith('customer.')) {
        await this.handleCustomerWebhook(payload);
      } else {
        logger.warn('WebhookHandler: Unknown webhook topic', { topic });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error('WebhookHandler: Error processing webhook', { error });
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}

// Export handler instance
export const webhookHandler = new WebhookHandler();
