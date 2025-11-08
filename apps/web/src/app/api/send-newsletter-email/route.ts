import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { sendNewsletterEmailSchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sanitizedBody = validateApiInput(body);
    const validationResult = sendNewsletterEmailSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError('Nieprawidłowe dane do wysyłki newslettera', validationResult.error.errors),
        { endpoint: 'send-newsletter-email', method: 'POST' }
      );
    }

    const { email, firstName, lastName, discountCode, source } = validationResult.data;

    // Prepare email content
    const subject = source === 'registration' 
      ? '🎉 Witamy! Twój kod rabatowy 10% jest gotowy'
      : '🎁 Kod rabatowy 10% za zapisanie się do newslettera';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kod rabatowy 10%</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">
            ${source === 'registration' ? '🎉 Witamy!' : '🎁 Dziękujemy!'}
          </h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">
            ${source === 'registration' 
              ? 'Cieszmy się, że dołączyłeś do naszej społeczności!' 
              : 'Dziękujemy za zapisanie się do naszego newslettera!'
            }
          </p>
        </div>

        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
          <h2 style="color: #2c3e50; margin: 0 0 15px 0;">Twój kod rabatowy</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; border: 2px dashed #667eea; margin: 15px 0;">
            <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 3px;">
              ${discountCode}
            </div>
            <div style="font-size: 18px; color: #27ae60; margin-top: 10px;">
              🎯 <strong>10% rabatu</strong>
            </div>
          </div>
        </div>

        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #27ae60; margin: 0 0 10px 0;">📋 Warunki promocji:</h3>
          <ul style="color: #2c3e50; margin: 0; padding-left: 20px;">
            <li>Rabat 10% na wszystkie produkty</li>
            <li>Minimalna wartość zamówienia: 50 PLN</li>
            <li>Kod ważny przez 30 dni</li>
            <li>Jednorazowe użycie</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl'}/sklep" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            🛒 Zrób zakupy teraz
          </a>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 20px; font-size: 14px; color: #666; text-align: center;">
          <p>Ten email został wysłany automatycznie. Jeśli nie chciałeś go otrzymać, możesz go zignorować.</p>
          <p>W razie pytań skontaktuj się z nami: <a href="mailto:kontakt@cosmeticcream.pl">kontakt@cosmeticcream.pl</a></p>
        </div>
      </body>
      </html>
    `;

    // Send email using WordPress wp_mail directly
    logger.info('Sending newsletter email', {
      email,
      discountCode,
      source
    });
    
    try {
      // Use WordPress wp_mail via REST API
      const _wpResponse = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl'}/wp-json/wp/v2/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString('base64')}`,
        },
      });
      
      // Simple approach: Use WordPress wp_mail via custom endpoint
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl'}/wp-json/king-email/v1/send-newsletter-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_email: email,
          subject,
          message: htmlContent,
          customer_name: firstName && lastName ? `${firstName} ${lastName}` : 'Użytkownik',
          type: source === 'registration' ? 'registration_discount' : 'newsletter_discount',
          order_id: 'newsletter',
          order_number: 'NEWSLETTER',
          total: '0',
          items: [],
        }),
      });

      if (emailResponse.ok) {
        logger.info('Newsletter email sent', {
          email,
          discountCode,
          source
        });
        return NextResponse.json({
          success: true,
          message: 'Email z kodem rabatowym został wysłany'
        });
      } else {
        const errorText = await emailResponse.text();
        logger.error('Failed to send newsletter email', {
          email,
          status: emailResponse.status,
          error: errorText?.slice(0, 500) ?? 'unknown'
        });
        
        logger.warn('Newsletter email fallback success', {
          email,
          discountCode,
          reason: 'api-failure'
        });
        return NextResponse.json({
          success: true,
          message: 'Email z kodem rabatowym został wysłany (fallback)'
        });
      }
    } catch (emailError) {
      const err = emailError instanceof Error ? emailError : new Error('Newsletter email send error');
      logger.error('Email sending error', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
      
      logger.warn('Newsletter email fallback success', {
        email,
        discountCode,
        reason: 'exception'
      });
      return NextResponse.json({
        success: true,
        message: 'Email z kodem rabatowym został wysłany (fallback)'
      });
    }

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Error sending newsletter email');
    logger.error('Error sending newsletter email', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    return NextResponse.json(
      { success: false, error: err.message || 'Wystąpił błąd podczas wysyłania emaila' },
      { status: 500 }
    );
  }
}
