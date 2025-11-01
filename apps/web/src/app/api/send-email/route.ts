import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, 
      order_id, 
      customer_email, 
      customer_name, 
      order_number, 
      total, 
      items 
    } = body;

    console.log('📧 Sending email:', { type, order_id, customer_email });

    // Wyślij email przez WordPress
    const wpUrl = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';
    
    // Użyj naszego mu-pluginu do wysłania emaila
    const emailUrl = `${wpUrl}/wp-json/king-email/v1/trigger-order-email`;
    console.log('📧 Email URL:', emailUrl);
    
    const response = await fetch(emailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: order_id
      }),
    });

    if (response.ok) {
      console.log('✅ Email sent successfully via WooCommerce API');
      return NextResponse.json({ 
        success: true, 
        message: 'Email wysłany pomyślnie' 
      });
    } else {
      const errorText = await response.text();
      console.log('❌ Failed to send email via WooCommerce API');
      console.log('❌ Status:', response.status);
      console.log('❌ Error:', errorText);
      
      // Fallback: użyj WordPress wp_mail bezpośrednio
      console.log('🔄 Trying fallback method...');
      const fallbackResponse = await fetch(`${wpUrl}/wp-json/king-email/v1/send-direct-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: order_id,
          customer_email: customer_email,
          customer_name: customer_name,
          order_number: order_number,
          total: total,
          items: items
        }),
      });

      if (fallbackResponse.ok) {
        console.log('✅ Email sent via fallback API');
        return NextResponse.json({ 
          success: true, 
          message: 'Email wysłany przez fallback API' 
        });
      } else {
        const fallbackErrorText = await fallbackResponse.text();
        console.log('❌ Fallback also failed');
        console.log('❌ Fallback Status:', fallbackResponse.status);
        console.log('❌ Fallback Error:', fallbackErrorText);
        // W środowisku developerskim nie wywalaj 500 – zwróć sukces, żeby nie spamować konsoli
        if (process.env.NODE_ENV !== 'production') {
          console.warn('🛠 Dev mode: returning success for /api/send-email despite failure');
          return NextResponse.json({
            success: true,
            message: 'Dev: Email zarejestrowany (no-op)'
          });
        }
        return NextResponse.json({ 
          success: false, 
          message: 'Nie udało się wysłać emaila' 
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('❌ Email API error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Błąd wysyłania emaila' 
    }, { status: 500 });
  }
}