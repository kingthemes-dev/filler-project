import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { sendDiscountEmailSchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sanitizedBody = validateApiInput(body);
    const validationResult = sendDiscountEmailSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError('Nieprawidłowe dane do wysyłki kodu rabatowego', validationResult.error.errors),
        { endpoint: 'send-discount-email', method: 'POST' }
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

    const _textContent = `
${source === 'registration' ? '🎉 Witamy!' : '🎁 Dziękujemy!'}

${source === 'registration' 
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

Ten email został wysłany automatycznie.
W razie pytań: kontakt@cosmeticcream.pl
    `;

    // Send email using our email service
    logger.info('Attempting to send discount email', {
      email,
      discountCode,
      source
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
        customer_name: firstName && lastName ? `${firstName} ${lastName}` : 'Użytkownik',
        order_id: 'newsletter',
        order_number: 'NEWSLETTER',
        total: '0',
        items: [],
        type: source === 'registration' ? 'registration_discount' : 'newsletter_discount',
      }),
    });

    logger.debug('Discount email API response', { status: emailResponse.status });
    
    if (emailResponse.ok) {
      const emailResult = await emailResponse.json();
      logger.info('Discount email sent', {
        email,
        discountCode,
        result: emailResult?.success ?? undefined
      });
      return NextResponse.json({
        success: true,
        message: 'Email z kodem rabatowym został wysłany'
      });
    } else {
      const errorText = await emailResponse.text();
      logger.error('Discount email API failed', {
        email,
        status: emailResponse.status,
        error: errorText?.slice(0, 500) ?? 'unknown'
      });
      return NextResponse.json(
        { success: false, error: `Nie udało się wysłać emaila: ${errorText}` },
        { status: 500 }
      );
    }

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Error sending discount email');
    logger.error('Error sending discount email', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    return NextResponse.json(
      { success: false, error: err.message || 'Wystąpił błąd podczas wysyłania emaila' },
      { status: 500 }
    );
  }
}
