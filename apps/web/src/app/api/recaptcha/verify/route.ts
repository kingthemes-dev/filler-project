import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { recaptchaVerifySchema } from '@/lib/schemas/internal';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { checkApiSecurity, addSecurityHeaders } from '@/utils/api-security';

/**
 * Verify reCAPTCHA token on server
 * FIX: Server-side verification of reCAPTCHA v3 tokens
 */
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
    const sanitizedBody = validateApiInput(body);
    const validationResult = recaptchaVerifySchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Brak lub nieprawidłowy token reCAPTCHA',
          validationResult.error.errors
        ),
        { endpoint: 'recaptcha/verify', method: 'POST' }
      );
    }

    const { token } = validationResult.data;

    const secretKey = env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      logger.warn('reCAPTCHA: Secret key not configured');
      // In development, allow without verification
      if (process.env.NODE_ENV === 'development') {
        const response = NextResponse.json({ success: true, score: 1.0 });
        return addSecurityHeaders(response);
      }
      const errorResponse = NextResponse.json(
        { success: false, error: 'reCAPTCHA not configured' },
        { status: 500 }
      );
      return addSecurityHeaders(errorResponse);
    }

    // Verify with Google reCAPTCHA API
    const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      logger.warn('reCAPTCHA verification failed', {
        errors: data['error-codes'],
      });
      const errorResponse = NextResponse.json({
        success: false,
        score: 0,
        errors: data['error-codes'],
      });
      return addSecurityHeaders(errorResponse);
    }

    // Return score (0.0 = bot, 1.0 = human)
    const successResponse = NextResponse.json({
      success: true,
      score: data.score || 0,
      action: data.action,
      challenge_ts: data.challenge_ts,
      hostname: data.hostname,
    });
    return addSecurityHeaders(successResponse);
  } catch (error) {
    logger.error('reCAPTCHA verification error', { error });
    const errorResponse = NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(errorResponse);
  }
}
