import { NextRequest, NextResponse } from 'next/server';

// Generate unique discount code and create WooCommerce coupon
async function generateDiscountCode(email: string, source: string): Promise<string> {
  const timestamp = Date.now().toString().slice(-4);
  const emailPrefix = email.split('@')[0].slice(0, 3).toUpperCase();
  const sourcePrefix = source === 'registration' ? 'REG' : 'NEWS';
  const code = `${sourcePrefix}${emailPrefix}${timestamp}`;
  
  // Create coupon in WooCommerce
  try {
    const WC_URL = process.env.NEXT_PUBLIC_WC_URL;
    const CK = process.env.WC_CONSUMER_KEY;
    const CS = process.env.WC_CONSUMER_SECRET;
    
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
        console.log(`✅ Created WooCommerce coupon: ${code} for ${email}`, createdCoupon);
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to create WooCommerce coupon: ${code}`, errorText);
      }
    }
  } catch (error) {
    console.error('Error creating WooCommerce coupon:', error);
  }
  
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, source, consent } = body;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Nieprawidłowy adres email' },
        { status: 400 }
      );
    }

    // Check consent
    if (!consent) {
      return NextResponse.json(
        { message: 'Wymagana zgoda na przetwarzanie danych' },
        { status: 400 }
      );
    }

    // TODO: Integrate with newsletter service (Mailchimp, SendinBlue, etc.)
    // SendinBlue (Brevo) integration
    const sendinblueApiKey = process.env.SENDINBLUE_API_KEY;
    const sendinblueListId = parseInt(process.env.SENDINBLUE_LIST_ID || '1');

    // Generate discount code for new subscribers
    const discountCode = await generateDiscountCode(email, source);
    
    if (!sendinblueApiKey) {
      console.log('📧 Newsletter subscription (no API key):', {
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
        console.error('SendinBlue API error:', errorData);
        throw new Error('Newsletter service error');
      }

      console.log('📧 Newsletter subscription successful via SendinBlue:', {
        email,
        source,
        consent,
        timestamp: new Date().toISOString()
      });
    }

    // Send discount code email
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/api/send-newsletter-email`, {
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
        console.log(`✅ Discount email sent to ${email} with code ${discountCode}`);
      } else {
        console.error(`❌ Failed to send discount email to ${email}`);
      }
    } catch (emailError) {
      console.error('Error sending discount email:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: source === 'registration' 
        ? 'Zarejestrowano i zapisano do newslettera! Kod rabatowy 10% został wysłany na email.'
        : 'Zapisano do newslettera! Kod rabatowy 10% został wysłany na email.',
      discountCode: discountCode
    });

  } catch (error: any) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { message: 'Wystąpił błąd podczas zapisywania' },
      { status: 500 }
    );
  }
}
