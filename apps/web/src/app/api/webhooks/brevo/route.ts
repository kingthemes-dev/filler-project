/**
 * Brevo Webhooks Handler
 * Handles webhooks from Brevo (Sendinblue) for newsletter events
 */

import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { BrevoWebhookSchema } from '@king/shared-types/src/schemas/newsletter';
import { logger } from '@/utils/logger';
import { addSecurityHeaders } from '@/utils/api-security';
import { z } from 'zod';

// Brevo webhook payload can be an array of events or a single event
const brevoWebhookPayloadSchema = z.union([
  BrevoWebhookSchema,
  z.array(BrevoWebhookSchema),
]);

/**
 * Process Brevo webhook event
 */
async function processBrevoWebhook(webhook: z.infer<typeof BrevoWebhookSchema>) {
  const { event, email, listId, attributes, date } = webhook;

  logger.info('Processing Brevo webhook', {
    event,
    email,
    listId,
    date,
  });

  switch (event) {
    case 'subscribe':
      // Contact subscribed to newsletter
      logger.info('Brevo webhook: Contact subscribed', {
        email,
        listId,
        attributes,
      });
      // TODO: Update local database if needed
      // TODO: Send welcome email if not already sent
      break;

    case 'unsubscribe':
      // Contact unsubscribed from newsletter
      logger.info('Brevo webhook: Contact unsubscribed', {
        email,
        listId,
        attributes,
      });
      // TODO: Update local database - mark as unsubscribed
      // TODO: Remove from local newsletter list if exists
      break;

    case 'update':
      // Contact attributes updated
      logger.info('Brevo webhook: Contact updated', {
        email,
        listId,
        attributes,
      });
      // TODO: Sync contact attributes with local database
      break;

    case 'complaint':
      // Contact marked email as spam
      logger.warn('Brevo webhook: Email complaint (spam)', {
        email,
        listId,
        attributes,
      });
      // TODO: Mark contact as spam in local database
      // TODO: Remove from active newsletter campaigns
      break;

    case 'bounce':
      // Email bounced (hard or soft)
      logger.warn('Brevo webhook: Email bounce', {
        email,
        listId,
        attributes,
      });
      // TODO: Mark contact as bounced in local database
      // TODO: Check bounce type (hard/soft) and handle accordingly
      break;

    default:
      logger.warn('Brevo webhook: Unknown event type', {
        event,
        email,
      });
  }
}

/**
 * Verify Brevo webhook signature (if configured)
 * Brevo can send webhooks with optional signature verification
 * Note: Brevo webhook signature verification is optional and may not be configured
 */
function verifyBrevoWebhook(
  payload: string,
  signature?: string | null
): boolean {
  // If no signature is provided, we can't verify
  // In production, you should configure webhook signature in Brevo dashboard
  if (!signature) {
    logger.debug('Brevo webhook: No signature provided, skipping verification');
    // In production, you might want to require signature
    // For now, we'll allow webhooks without signature (Brevo may not send it)
    return true;
  }

  // TODO: Implement signature verification if Brevo provides webhook secret
  // Brevo webhook signature format may vary - check Brevo documentation
  // For now, we'll log and allow (you should configure this in Brevo dashboard)
  logger.debug('Brevo webhook: Signature provided but verification not implemented', {
    signatureLength: signature.length,
  });

  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from headers (if provided by Brevo)
    const signature = request.headers.get('x-brevo-signature') ||
                     request.headers.get('x-sendinblue-signature') ||
                     request.headers.get('signature');

    // Get raw payload for signature verification
    const payloadBody = await request.text();

    // Verify webhook signature (if provided)
    if (!verifyBrevoWebhook(payloadBody, signature)) {
      logger.warn('Brevo webhook: Invalid signature', {
        signature: signature ? 'provided' : 'missing',
      });
      const errorResponse = NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
      return addSecurityHeaders(errorResponse);
    }

    // Parse webhook payload
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(payloadBody);
    } catch (parseError) {
      const message =
        parseError instanceof Error ? parseError.message : String(parseError);
      logger.warn('Brevo webhook: Failed to parse payload', {
        error: message,
      });
      const errorResponse = NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
      return addSecurityHeaders(errorResponse);
    }

    // Validate payload with Zod schema
    const validationResult = brevoWebhookPayloadSchema.safeParse(parsedPayload);

    if (!validationResult.success) {
      logger.warn('Brevo webhook: Invalid payload schema', {
        errors: validationResult.error.flatten(),
      });
      const errorResponse = NextResponse.json(
        { error: 'Invalid webhook payload schema', details: validationResult.error.flatten() },
        { status: 400 }
      );
      return addSecurityHeaders(errorResponse);
    }

    const webhookData = validationResult.data;

    // Process webhook(s) - Brevo can send single event or array of events
    const events = Array.isArray(webhookData) ? webhookData : [webhookData];

    // Process all events
    for (const event of events) {
      await processBrevoWebhook(event);
    }

    // Return success response
    const response = NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      eventsProcessed: events.length,
    });

    return addSecurityHeaders(response);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    logger.error('Brevo webhook: Error processing webhook', {
      message: err.message,
      stack: err.stack,
    });

    const errorResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}

/**
 * GET endpoint for webhook verification/health check
 */
export async function GET(): Promise<NextResponse> {
  const response = NextResponse.json({
    message: 'Brevo webhooks endpoint is active',
    timestamp: new Date().toISOString(),
    supportedEvents: ['subscribe', 'unsubscribe', 'update', 'complaint', 'bounce'],
  });
  return addSecurityHeaders(response);
}

