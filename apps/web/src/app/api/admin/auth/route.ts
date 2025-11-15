import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';
import { adminAuthSchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError, InternalError } from '@/lib/errors';
import { logger } from '@/utils/logger';
import { checkApiSecurity, addSecurityHeaders } from '@/utils/api-security';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Security check: rate limiting and CSRF protection (strict for admin)
  const securityCheck = await checkApiSecurity(request, {
    enforceRateLimit: true,
    enforceCSRF: true,
  });
  
  if (!securityCheck.allowed) {
    return securityCheck.response || NextResponse.json(
      { success: false, error: 'Security check failed' },
      { status: 403 }
    );
  }
  
  try {
    const payload = await request.json();
    const sanitized = validateApiInput(payload);
    const parsed = adminAuthSchema.safeParse(sanitized);

    if (!parsed.success) {
      return createErrorResponse(
        new ValidationError('Nieprawidłowy token administracyjny', {
          issues: parsed.error.errors,
        }),
        { endpoint: 'admin/auth', method: 'POST' }
      );
    }

    const { token } = parsed.data;

    const expected = env.ADMIN_CACHE_TOKEN || process.env.ADMIN_TOKEN || '';

    if (expected && token === expected) {
      const response = NextResponse.json({ success: true });
      return addSecurityHeaders(response);
    }

    const errorResponse = NextResponse.json(
      { success: false, error: 'Nieprawidłowy token' },
      { status: 401 }
    );
    return addSecurityHeaders(errorResponse);
  } catch (error) {
    // Mask secrets in error before logging
    const isProduction = process.env.NODE_ENV === 'production';
    const errorMessage = error instanceof Error ? error.message : String(error);
    const maskedMessage = isProduction
      ? errorMessage.replace(/token|password|secret|key/gi, '***masked***')
      : errorMessage;
    
    logger.error('Admin auth error', {
      error: isProduction ? maskedMessage : error,
    });
    
    // Use createErrorResponse for consistent error handling (masks secrets in production)
    const errorResponse = createErrorResponse(
      new InternalError(
        'Błąd serwera',
        isProduction ? undefined : { originalError: errorMessage }
      ),
      { endpoint: 'admin/auth', method: 'POST' }
    );
    return addSecurityHeaders(errorResponse);
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok' });
}
