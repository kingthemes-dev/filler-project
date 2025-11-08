import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';
import { adminAuthSchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await request.json();
    const sanitized = validateApiInput(payload);
    const parsed = adminAuthSchema.safeParse(sanitized);

    if (!parsed.success) {
      return createErrorResponse(
        new ValidationError('Nieprawidłowy token administracyjny', parsed.error.errors),
        { endpoint: 'admin/auth', method: 'POST' }
      );
    }

    const { token } = parsed.data;

    const expected = env.ADMIN_CACHE_TOKEN || process.env.ADMIN_TOKEN || '';

    if (expected && token === expected) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Nieprawidłowy token' }, { status: 401 });
  } catch (error) {
    logger.error('Admin auth error', { error });
    return NextResponse.json({ success: false, error: 'Błąd serwera' }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok' });
}
