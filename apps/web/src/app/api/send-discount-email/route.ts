import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { sendDiscountEmailSchema } from '@/lib/schemas/internal';
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
    const body = await request.json();
    const sanitizedBody = validateApiInput(body);
    const validationResult = sendDiscountEmailSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Nieprawidłowe dane do wysyłki kodu rabatowego',
          validationResult.error.errors
        ),
        { endpoint: 'send-discount-email', method: 'POST' }
      );
    }

    const { email, firstName, lastName, discountCode, source } =
      validationResult.data;

    // Prepare email content
    const subject =
      source === 'registration'
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
            ${
              source === 'registration'
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

        <div style="border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; text-align: center;">
          <p style="margin: 5px 0;"><strong>BEAUTYNOVA CONCEPT SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ</strong></p>
          <p style="margin: 5px 0;">ul. OBROŃCÓW WYBRZEŻA 7/6, 80-398 GDAŃSK</p>
          <p style="margin: 5px 0;">NIP: 5842849201</p>
          <p style="margin: 5px 0;">Telefon: <a href="tel:+48535956932" style="color: #667eea; text-decoration: none;">+48 535 956 932</a></p>
          <p style="margin: 5px 0;">Email: <a href="mailto:kontakt@filler.pl" style="color: #667eea; text-decoration: none;">kontakt@filler.pl</a></p>
          <p style="margin: 5px 0;">Nr konta bankowego: PL 150 1090 1098 0000 0001 5775 9475</p>
          <p style="margin: 15px 0 5px 0; font-size: 11px; color: #999;">
            <a href="https://qvwltjhdjw.cfolks.pl/wp-json/newsletter/v1/unsubscribe?email=${encodeURIComponent(email)}" 
               style="color: #999; text-decoration: underline;">
              Wypisz się z newslettera
            </a>
          </p>
          <p style="margin: 5px 0; font-size: 11px; color: #999;">Ten email został wysłany automatycznie.</p>
        </div>
      </body>
      </html>
    `;

    const _textContent = `
${source === 'registration' ? '🎉 Witamy!' : '🎁 Dziękujemy!'}

${
  source === 'registration'
    ? 'Cieszmy się, że dołączyłeś do naszej społeczności!'
    : 'Dziękujemy za zapisanie się do naszego newslettera!'
}

Twój kod rabatowy: ${discountCode}
Rabat: 10% na wszystkie produkty

Warunki promocji:
- Minimalna wartość zamówienia: 50 PLN
- Kod ważny przez 30 dni
- Jednorazowe użycie

Zrób zakupy: ${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl'}/sklep

BEAUTYNOVA CONCEPT SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ
ul. OBROŃCÓW WYBRZEŻA 7/6, 80-398 GDAŃSK
NIP: 5842849201
Telefon: +48 535 956 932
Email: kontakt@filler.pl
Nr konta bankowego: PL 150 1090 1098 0000 0001 5775 9475

Wypisz się z newslettera: https://qvwltjhdjw.cfolks.pl/wp-json/newsletter/v1/unsubscribe?email=${encodeURIComponent(email)}

Ten email został wysłany automatycznie.
    `;

    // Send email using our email service
    logger.info('Attempting to send discount email', {
      email,
      discountCode,
      source,
    });

    // Use our existing send-email API endpoint
    const emailUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/api/send-email`;
    logger.debug('Discount email API endpoint', { emailUrl });

    const emailResponse = await fetch(emailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_email: email,
        subject,
        message: htmlContent,
        customer_name:
          firstName && lastName ? `${firstName} ${lastName}` : 'Użytkownik',
        order_id: 'newsletter',
        order_number: 'NEWSLETTER',
        total: '0',
        items: [],
        type:
          source === 'registration'
            ? 'registration_discount'
            : 'newsletter_discount',
      }),
    });

    logger.debug('Discount email API response', {
      status: emailResponse.status,
    });

    if (emailResponse.ok) {
      const emailResult = await emailResponse.json();
      logger.info('Discount email sent', {
        email,
        discountCode,
        result: emailResult?.success ?? undefined,
      });
      const response = NextResponse.json({
        success: true,
        message: 'Email z kodem rabatowym został wysłany',
      });
      return addSecurityHeaders(response);
    } else {
      const errorText = await emailResponse.text();
      logger.error('Discount email API failed', {
        email,
        status: emailResponse.status,
        error: errorText?.slice(0, 500) ?? 'unknown',
      });
      const errorResponse = NextResponse.json(
        { success: false, error: `Nie udało się wysłać emaila: ${errorText}` },
        { status: 500 }
      );
      return addSecurityHeaders(errorResponse);
    }
  } catch (error) {
    const err =
      error instanceof Error
        ? error
        : new Error('Error sending discount email');
    logger.error('Error sending discount email', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    const errorResponse = NextResponse.json(
      {
        success: false,
        error: err.message || 'Wystąpił błąd podczas wysyłania emaila',
      },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}
