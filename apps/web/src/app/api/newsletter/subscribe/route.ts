import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { env } from '@/config/env';
import { newsletterSubscribeSchema } from '@/lib/schemas/newsletter';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';
import { sendinBlueAPI } from '@/utils/api-helpers';
import { checkApiSecurity, addSecurityHeaders } from '@/utils/api-security';

// Generate unique discount code and create WooCommerce coupon
async function generateDiscountCode(
  email: string,
  source: string
): Promise<string> {
  const timestamp = Date.now().toString().slice(-4);
  const emailPrefix = email.split('@')[0].slice(0, 3).toUpperCase();
  const sourcePrefix = source === 'registration' ? 'REG' : 'NEWS';
  const code = `${sourcePrefix}${emailPrefix}${timestamp}`;

  // Create coupon in WooCommerce
  try {
    const WC_URL = env.NEXT_PUBLIC_WC_URL;
    const CK = env.WC_CONSUMER_KEY;
    const CS = env.WC_CONSUMER_SECRET;

    if (WC_URL && CK && CS) {
      const couponData = {
        code: code,
        discount_type: 'percent',
        amount: '10', // 10% discount
        individual_use: true,
        usage_limit: 1,
        usage_limit_per_user: 1,
        limit_usage_to_x_items: null,
        free_shipping: false,
        product_ids: [],
        exclude_product_ids: [],
        product_categories: [],
        exclude_product_categories: [],
        minimum_amount: '50.00', // Minimum 50 PLN
        maximum_amount: '',
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0], // 30 days
        customer_email: [email],
        meta_data: [
          {
            key: 'newsletter_subscriber',
            value: email,
          },
          {
            key: 'created_from_newsletter',
            value: 'true',
          },
          {
            key: 'source',
            value: source,
          },
        ],
      };

      const response = await fetch(`${WC_URL}/coupons`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${CK}:${CS}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(couponData),
      });

      if (response.ok) {
        const createdCoupon = await response.json();
        logger.info('Created WooCommerce coupon', {
          code,
          email,
          couponId: createdCoupon?.id,
        });
      } else {
        const errorText = await response.text();
        logger.error('Failed to create WooCommerce coupon', {
          code,
          email,
          status: response.status,
          error: errorText?.slice(0, 500) ?? 'unknown',
        });
      }
    }
  } catch (error) {
    logger.error('Error creating WooCommerce coupon', {
      email,
      code,
      message: (error as Error)?.message,
    });
  }

  return code;
}

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

    // Validate request body with Zod
    const validationResult = newsletterSubscribeSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Invalid newsletter subscription data',
          validationResult.error.errors
        ),
        { endpoint: 'newsletter/subscribe', method: 'POST' }
      );
    }

    const { email, name: firstName, source, consent } = validationResult.data;
    const lastName = ''; // Newsletter schema doesn't include lastName

    // SendinBlue (Brevo) integration
    const sendinblueApiKey = env.SENDINBLUE_API_KEY;
    const sendinblueListId = parseInt(env.SENDINBLUE_LIST_ID || '1');

    // Check if contact already exists in Brevo
    if (sendinblueApiKey) {
      const contactCheck = await sendinBlueAPI.checkContactExists(email);
      
      if (contactCheck.exists) {
        logger.info('Contact already exists in Brevo', {
          email,
          contactId: contactCheck.contact?.id,
          source,
        });
        
        // If source is 'registration', allow it - user is registering, they might already be in newsletter
        // If source is 'homepage', return error - user is trying to subscribe again
        if (source === 'homepage' || !source) {
          return NextResponse.json(
            {
              success: false,
              message: 'Ten email jest już zapisany do newslettera',
            },
            { status: 409 } // Conflict status
          );
        }
        
        // For registration source - check if contact has discount code
        // If not, generate one and send email
        const existingDiscountCode = contactCheck.contact?.attributes?.DISCOUNT_CODE as string | undefined;
        
        if (!existingDiscountCode) {
          // Contact exists but no discount code - generate one and send email
          logger.info('Contact exists but no discount code, generating new one', {
            email,
            source,
          });
          // Continue with normal flow to generate code and send email
        } else {
          // Contact exists and has discount code - just return success without generating new code
          logger.info('Contact exists with discount code, skipping code generation', {
            email,
            existingCode: existingDiscountCode,
            source,
          });
          return NextResponse.json({
            success: true,
            message:
              source === 'registration'
                ? 'Zarejestrowano pomyślnie! Kod rabatowy został już wcześniej wysłany na ten email.'
                : 'Zapisano do newslettera!',
            discountCode: existingDiscountCode,
          });
        }
      }
    }

    // Contact doesn't exist - proceed with subscription
    // Generate discount code for new subscribers
    const discountCode = await generateDiscountCode(
      email,
      source || 'newsletter'
    );

    if (!sendinblueApiKey) {
      logger.info('Newsletter subscription stored locally', {
        email,
        firstName,
        lastName,
        source,
        consent,
        discountCode,
        timestamp: new Date().toISOString(),
      });

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      // Real SendinBlue API call - add new contact using helper method
      try {
        await sendinBlueAPI.addContact({
          email: email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          attributes: {
            SOURCE: source || 'website',
            CONSENT: consent ? 'yes' : 'no',
            DISCOUNT_CODE: discountCode,
            DISCOUNT_VALUE: '10%',
          },
        });

        logger.info('Newsletter subscription via SendinBlue', {
          email,
          source,
          consent,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('SendinBlue API error', {
          email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new Error('Newsletter service error');
      }
    }

    // Send discount code email via WordPress endpoint
    try {
      const wordpressUrl =
        env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';
      const customerName =
        firstName && lastName
          ? `${firstName} ${lastName}`
          : firstName || 'Użytkownik';

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
            <a href="${wordpressUrl}/sklep" 
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

      logger.info('Sending newsletter discount email', {
        email,
        discountCode,
        source,
        customerName,
        wordpressUrl,
        endpoint: `${wordpressUrl}/wp-json/king-email/v1/send-newsletter-email`,
      });

      // Call WordPress endpoint with timeout
      const endpoint = `${wordpressUrl}/wp-json/king-email/v1/send-newsletter-email`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const emailResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            subject: subject,
            message: htmlContent,
            customerName: customerName,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        logger.info('WordPress email endpoint response', {
          email,
          status: emailResponse.status,
          statusText: emailResponse.statusText,
          ok: emailResponse.ok,
        });

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json();
          logger.info('Discount email sent after newsletter signup', {
            email,
            discountCode,
            result: emailResult,
          });
        } else {
          const errorText = await emailResponse.text().catch(() => 'Failed to read error response');
          logger.error('Failed to send discount email after newsletter signup', {
            email,
            status: emailResponse.status,
            statusText: emailResponse.statusText,
            error: errorText?.slice(0, 500) ?? 'unknown',
          });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          logger.error('Email sending timeout', {
            email,
            discountCode,
            timeout: '10 seconds',
          });
        } else {
          throw fetchError; // Re-throw to be caught by outer catch
        }
      }
    } catch (emailError) {
      logger.error('Error sending discount email', {
        email,
        discountCode,
        message:
          emailError instanceof Error ? emailError.message : 'Unknown error',
        stack: emailError instanceof Error ? emailError.stack : undefined,
      });
    }

    const response = NextResponse.json({
      success: true,
      message:
        source === 'registration'
          ? 'Zarejestrowano i zapisano do newslettera! Kod rabatowy 10% został wysłany na email.'
          : 'Zapisano do newslettera! Kod rabatowy 10% został wysłany na email.',
      discountCode: discountCode,
    });
    
    // Add security headers
    return addSecurityHeaders(response);
  } catch (error) {
    // Mask secrets in error before logging
    const isProduction = process.env.NODE_ENV === 'production';
    const err =
      error instanceof Error
        ? error
        : new Error('Newsletter subscription error');
    const errorMessage = err.message;
    const maskedMessage = isProduction
      ? errorMessage.replace(/token|password|secret|key|api.*key/gi, '***masked***')
      : errorMessage;
    
    logger.error('Newsletter subscription error', {
      message: isProduction ? maskedMessage : errorMessage,
      stack: isProduction ? undefined : err.stack, // Hide stack in production
    });
    
    // Use createErrorResponse for consistent error handling (masks secrets in production)
    const { createErrorResponse, InternalError } = await import('@/lib/errors');
    const errorResponse = createErrorResponse(
      new InternalError(
        'Wystąpił błąd podczas zapisywania',
        isProduction ? undefined : { originalError: errorMessage }
      ),
      { endpoint: 'newsletter/subscribe', method: 'POST' }
    );
    return addSecurityHeaders(errorResponse);
  }
}
