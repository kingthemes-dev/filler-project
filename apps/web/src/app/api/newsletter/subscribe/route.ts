import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { env } from '@/config/env';
import { newsletterSubscribeSchema } from '@/lib/schemas/newsletter';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';

// Generate unique discount code and create WooCommerce coupon
async function generateDiscountCode(email: string, source: string): Promise<string> {
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
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        customer_email: [email],
        meta_data: [
          {
            key: 'newsletter_subscriber',
            value: email
          },
          {
            key: 'created_from_newsletter',
            value: 'true'
          },
          {
            key: 'source',
            value: source
          }
        ]
      };
      
      const response = await fetch(`${WC_URL}/coupons`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${CK}:${CS}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(couponData),
      });
      
      if (response.ok) {
        const createdCoupon = await response.json();
        logger.info('Created WooCommerce coupon', {
          code,
          email,
          couponId: createdCoupon?.id
        });
      } else {
        const errorText = await response.text();
        logger.error('Failed to create WooCommerce coupon', {
          code,
          email,
          status: response.status,
          error: errorText?.slice(0, 500) ?? 'unknown'
        });
      }
    }
  } catch (error) {
    logger.error('Error creating WooCommerce coupon', {
      email,
      code,
      message: (error as Error)?.message
    });
  }
  
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = newsletterSubscribeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError('Invalid newsletter subscription data', validationResult.error.errors),
        { endpoint: 'newsletter/subscribe', method: 'POST' }
      );
    }

    const { email, name: firstName, source, consent } = validationResult.data;
    const lastName = ''; // Newsletter schema doesn't include lastName

    // TODO: Integrate with newsletter service (Mailchimp, SendinBlue, etc.)
    // SendinBlue (Brevo) integration
    const sendinblueApiKey = env.SENDINBLUE_API_KEY;
    const sendinblueListId = parseInt(env.SENDINBLUE_LIST_ID || '1');

    // Generate discount code for new subscribers
    const discountCode = await generateDiscountCode(email, source || 'newsletter');
    
    if (!sendinblueApiKey) {
      logger.info('Newsletter subscription stored locally', {
        email,
        firstName,
        lastName,
        source,
        consent,
        discountCode,
        timestamp: new Date().toISOString()
      });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      // Real SendinBlue API call
      const response = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': sendinblueApiKey
        },
        body: JSON.stringify({
          email: email,
          listIds: [sendinblueListId],
          updateEnabled: true,
          attributes: {
            FIRSTNAME: firstName || '',
            LASTNAME: lastName || '',
            SOURCE: source || 'website',
            CONSENT: consent ? 'yes' : 'no',
            DISCOUNT_CODE: discountCode,
            DISCOUNT_VALUE: '10%'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('SendinBlue API error', {
          email,
          response: errorData
        });
        throw new Error('Newsletter service error');
      }

      logger.info('Newsletter subscription via SendinBlue', {
        email,
        source,
        consent,
        timestamp: new Date().toISOString()
      });
    }

    // Send discount code email
    try {
      const emailResponse = await fetch(`${env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-newsletter-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          discountCode,
          source
        }),
      });

      if (emailResponse.ok) {
        logger.info('Discount email sent after newsletter signup', {
          email,
          discountCode
        });
      } else {
        logger.error('Failed to send discount email after newsletter signup', {
          email,
          status: emailResponse.status
        });
      }
    } catch (emailError) {
      logger.error('Error sending discount email', {
        email,
        message: emailError instanceof Error ? emailError.message : 'Unknown error'
      });
    }

    return NextResponse.json({
      success: true,
      message: source === 'registration' 
        ? 'Zarejestrowano i zapisano do newslettera! Kod rabatowy 10% został wysłany na email.'
        : 'Zapisano do newslettera! Kod rabatowy 10% został wysłany na email.',
      discountCode: discountCode
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Newsletter subscription error');
    logger.error('Newsletter subscription error', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    return NextResponse.json(
      { message: err.message || 'Wystąpił błąd podczas zapisywania' },
      { status: 500 }
    );
  }
}
