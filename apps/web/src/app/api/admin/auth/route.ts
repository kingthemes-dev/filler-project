import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token jest wymagany' },
        { status: 400 }
      );
    }

    // Validate admin token
    const validToken = process.env.ADMIN_TOKEN || 'admin-2024-secure-token';
    
    if (token !== validToken) {
      return NextResponse.json(
        { error: 'Nieprawidłowy token administratora' },
        { status: 401 }
      );
    }

    // Log successful admin login
    console.log('✅ Admin login successful:', {
      timestamp: new Date().toISOString(),
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Autoryzacja pomyślna' 
    });

  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Błąd serwera podczas autoryzacji' },
      { status: 500 }
    );
  }
}
