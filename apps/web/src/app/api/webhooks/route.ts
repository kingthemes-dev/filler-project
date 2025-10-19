/**
 * WooCommerce Webhooks Handler
 * Real-time sync between WordPress and Next.js
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from 'ioredis';

// Initialize Redis
let redis: Redis | null = null;

try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
    });
  }
} catch (error) {
  console.warn('Redis not available for webhooks', error);
}

interface WebhookPayload {
  id: number;
  type: string;
  data: any;
  timestamp: string;
  action: 'created' | 'updated' | 'deleted';
}

class WebhookHandler {
  private redis: Redis | null;

  constructor(redis: Redis | null) {
    this.redis = redis;
  }

  /**
   * Validate webhook signature
   */
  private validateSignature(request: NextRequest, body: string): boolean {
    const signature = request.headers.get('X-WC-Webhook-Signature');
    const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;

    if (!signature || !secret) {
      console.warn('Webhook signature validation skipped - missing signature or secret');
      return true; // Allow in development
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('base64');

    return signature === expectedSignature;
  }

  /**
   * Handle product webhooks
   */
  private async handleProductWebhook(payload: WebhookPayload): Promise<void> {
    const { id, action } = payload;

    try {
      // Invalidate product cache
      if (this.redis) {
        await this.redis.del(`product:${id}`);
        await this.redis.del(`product:slug:*`);
        await this.redis.del(`products:*`);
        await this.redis.del(`homepage:*`);
        await this.redis.del(`shop:*`);
      }

      // Log the action
      console.log(`🔄 Product ${action}: ${id} - Cache invalidated`);

      // Trigger revalidation for ISR
      if (process.env.NEXT_PUBLIC_BASE_URL) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/revalidate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.REVALIDATE_SECRET}`,
            },
            body: JSON.stringify({
              paths: [
                '/',
                '/sklep',
                `/produkt/${id}`,
                '/api/woocommerce',
              ],
            }),
          });
          console.log(`✅ ISR revalidation triggered for product ${id}`);
        } catch (error) {
          console.error('Failed to trigger ISR revalidation:', error);
        }
      }
    } catch (error) {
      console.error(`Failed to handle product webhook for ${id}:`, error);
    }
  }

  /**
   * Handle order webhooks
   */
  private async handleOrderWebhook(payload: WebhookPayload): Promise<void> {
    const { id, action } = payload;

    try {
      // Invalidate order-related cache
      if (this.redis) {
        await this.redis.del(`orders:*`);
        await this.redis.del(`user:orders:*`);
      }

      console.log(`🔄 Order ${action}: ${id} - Cache invalidated`);

      // Send real-time notification to user
      if (action === 'created' || action === 'updated') {
        await this.notifyOrderUpdate(payload);
      }
    } catch (error) {
      console.error(`Failed to handle order webhook for ${id}:`, error);
    }
  }

  /**
   * Handle customer webhooks
   */
  private async handleCustomerWebhook(payload: WebhookPayload): Promise<void> {
    const { id, action } = payload;

    try {
      // Invalidate customer-related cache
      if (this.redis) {
        await this.redis.del(`customer:${id}`);
        await this.redis.del(`user:${id}`);
        await this.redis.del(`cart:${id}`);
      }

      console.log(`🔄 Customer ${action}: ${id} - Cache invalidated`);
    } catch (error) {
      console.error(`Failed to handle customer webhook for ${id}:`, error);
    }
  }

  /**
   * Handle category webhooks
   */
  private async handleCategoryWebhook(payload: WebhookPayload): Promise<void> {
    const { id, action } = payload;

    try {
      // Invalidate category-related cache
      if (this.redis) {
        await this.redis.del(`categories:*`);
        await this.redis.del(`products:*`);
        await this.redis.del(`shop:*`);
      }

      console.log(`🔄 Category ${action}: ${id} - Cache invalidated`);
    } catch (error) {
      console.error(`Failed to handle category webhook for ${id}:`, error);
    }
  }

  /**
   * Notify order update
   */
  private async notifyOrderUpdate(payload: WebhookPayload): Promise<void> {
    try {
      // This would typically send a real-time notification
      // For now, we'll just log it
      console.log(`📧 Order notification: ${payload.action} - Order ${payload.id}`);
      
      // In a real implementation, you might:
      // - Send email notification
      // - Send push notification
      // - Update user dashboard in real-time
      // - Send SMS notification
    } catch (error) {
      console.error('Failed to send order notification:', error);
    }
  }

  /**
   * Process webhook payload
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    const { type, action } = payload;

    console.log(`🔄 Processing webhook: ${type}.${action}`);

    switch (type) {
      case 'product':
        await this.handleProductWebhook(payload);
        break;
      case 'order':
        await this.handleOrderWebhook(payload);
        break;
      case 'customer':
        await this.handleCustomerWebhook(payload);
        break;
      case 'product_cat':
        await this.handleCategoryWebhook(payload);
        break;
      default:
        console.log(`⚠️ Unknown webhook type: ${type}`);
    }
  }
}

const webhookHandler = new WebhookHandler(redis);

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    
    // Check if body is empty
    if (!body || body.trim() === '') {
      console.log('⚠️ Empty webhook body received');
      return NextResponse.json(
        { error: 'Empty payload' },
        { status: 400 }
      );
    }

    // Validate webhook signature
    if (!webhookHandler['validateSignature'](request, body)) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload with validation
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Invalid JSON payload:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }
    
    // Process webhook
    await webhookHandler.processWebhook(payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-WC-Webhook-Signature, Authorization',
    },
  });
}
