import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { sendEmailSchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';
import { checkApiSecurity, addSecurityHeaders } from '@/utils/api-security';

export async function POST(request: NextRequest) {
  // Security check: rate limiting and CSRF protection
  const securityCheck = await checkApiSecurity(request, {
    enforceRateLimit: true,
    enforceCSRF: true,
  });
  
  if (!securityCheck.allowed) {
    return securityCheck.response || NextResponse.json(
      { error: 'Security check failed' },
      { status: 403 }
    );
  }
  
  try {
    const rawBody = await request.json();
    const sanitizedBody = validateApiInput(rawBody);
    const validationResult = sendEmailSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Nieprawidłowe dane do wysyłki emaila',
          validationResult.error.errors
        ),
        { endpoint: 'send-email', method: 'POST' }
      );
    }

    const {
      type,
      order_id,
      orderId,
      order_number,
      orderNumber,
      customer_email,
      customerEmail,
      to,
      customer_name,
      customerName,
      total,
      items,
      message,
      subject,
    } = validationResult.data;

    const recipientEmail = customer_email || customerEmail || to;
    const normalizedOrderId =
      typeof order_id !== 'undefined' ? order_id : orderId;
    const normalizedOrderNumber = order_number || orderNumber;
    const normalizedCustomerName = customer_name || customerName;

    logger.info('Email send requested', {
      type,
      orderId: normalizedOrderId,
      recipient: recipientEmail,
      hasItems: Array.isArray(items) && items.length > 0,
    });

    const wpUrl =
      process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';
    let primaryAttemptSuccessful = false;

    if (
      typeof normalizedOrderId !== 'undefined' &&
      normalizedOrderId !== null
    ) {
      const wpOrderId =
        typeof normalizedOrderId === 'string'
          ? parseInt(normalizedOrderId, 10)
          : normalizedOrderId;

      if (Number.isFinite(wpOrderId)) {
        const emailUrl = `${wpUrl}/wp-json/king-email/v1/trigger-order-email`;
        logger.debug('Email primary endpoint', { url: emailUrl });

        const response = await fetch(emailUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: wpOrderId,
            type: type || undefined,
          }),
        });

        if (response.ok) {
          logger.info('Email sent via WooCommerce API', {
            orderId: wpOrderId,
            type,
          });
          primaryAttemptSuccessful = true;
        } else {
          const errorText = await response.text();
          logger.warn('WooCommerce email API failed', {
            status: response.status,
            error: errorText?.slice(0, 500) ?? 'unknown',
          });
        }
      }
    }

    if (!primaryAttemptSuccessful) {
      logger.info('Falling back to direct email API', {
        type,
        orderId: normalizedOrderId,
      });
      const fallbackResponse = await fetch(
        `${wpUrl}/wp-json/king-email/v1/send-direct-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            order_id: normalizedOrderId ?? null,
            order_number: normalizedOrderNumber ?? null,
            customer_email: recipientEmail,
            customer_name: normalizedCustomerName ?? 'Klient',
            total: total ?? null,
            items: items ?? [],
            subject: subject ?? undefined,
            message: message ?? undefined,
          }),
        }
      );

        if (fallbackResponse.ok) {
          logger.info('Email sent via fallback API', {
            type,
            orderId: normalizedOrderId,
          });
          const response = NextResponse.json({
            success: true,
            message: 'Email wysłany (fallback)',
          });
          return addSecurityHeaders(response);
        } else {
          const fallbackErrorText = await fallbackResponse.text();
          logger.error('Fallback email API failed', {
            status: fallbackResponse.status,
            error: fallbackErrorText?.slice(0, 500) ?? 'unknown',
          });
          if (process.env.NODE_ENV !== 'production') {
            logger.warn('Dev mode email fallback override', {
              reason: 'fallback-failure',
            });
            const response = NextResponse.json({
              success: true,
              message: 'Dev: Email zarejestrowany (no-op)',
            });
            return addSecurityHeaders(response);
          }
          const errorResponse = NextResponse.json(
            {
              success: false,
              message: 'Nie udało się wysłać emaila',
            },
            { status: 500 }
          );
          return addSecurityHeaders(errorResponse);
        }
    }

    const response = NextResponse.json({
      success: true,
      message: 'Email wysłany pomyślnie',
    });
    return addSecurityHeaders(response);
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Email API error');
    logger.error('Email API error', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    const errorResponse = NextResponse.json(
      {
        success: false,
        message: err.message || 'Błąd wysyłania emaila',
      },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}
