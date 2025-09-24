import { NextRequest, NextResponse } from 'next/server';

// Generate unique discount code
function generateDiscountCode(email: string, source: string): string {
  const timestamp = Date.now().toString().slice(-4);
  const emailPrefix = email.split('@')[0].slice(0, 3).toUpperCase();
  const sourcePrefix = source === 'registration' ? 'REG' : 'NEWS';
  return `${sourcePrefix}${emailPrefix}${timestamp}`;
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
    const discountCode = generateDiscountCode(email, source);
    
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
