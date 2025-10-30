import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { token } = await request.json();

    if (typeof token !== 'string' || token.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Brak tokena' }, { status: 400 });
    }

    const expected = env.ADMIN_CACHE_TOKEN || process.env.ADMIN_TOKEN || '';

    if (expected && token === expected) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Nieprawidłowy token' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok' });
}
