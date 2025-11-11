import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { cache } from '@/lib/cache';
import { z } from 'zod';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';
import { env } from '@/config/env';
import { checkEndpointRateLimit } from '@/utils/rate-limiter';
import { getClientIP } from '@/utils/client-ip';

const cachePurgeSchema = z
  .object({
    pattern: z.string().min(1, 'Wymagany pattern do czyszczenia cache').optional(),
    all: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.pattern && !value.all) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Należy podać pattern lub ustawić all=true',
        path: ['pattern'],
      });
    }
    if (value.pattern && value.all) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nie można jednocześnie użyć pattern i all=true',
        path: ['all'],
      });
    }
  });

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (before auth to avoid wasting resources)
    const clientIp = getClientIP(request);
    const path = request.nextUrl.pathname;
    const rateLimitResult = await checkEndpointRateLimit(path, clientIp);
    
    if (!rateLimitResult.allowed) {
      logger.warn('Cache purge: Rate limit exceeded', {
        ip: clientIp,
        remaining: rateLimitResult.remaining,
      });
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter || 60) } }
      );
    }
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.headers.get('x-admin-token');
    const expectedToken = env.ADMIN_CACHE_TOKEN || process.env.ADMIN_CACHE_TOKEN;
    
    if (!token || !expectedToken || token !== expectedToken) {
      logger.warn('Cache purge: Unauthorized attempt', {
        hasToken: !!token,
        hasExpectedToken: !!expectedToken,
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const rawBody = await request.json().catch(() => ({}));
    const sanitizedBody = validateApiInput(rawBody);
    const validationResult = cachePurgeSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError('Nieprawidłowe dane do czyszczenia cache', validationResult.error.errors),
        { endpoint: 'cache/purge', method: 'POST' }
      );
    }

    const { pattern, all } = validationResult.data;

    let deleted = 0;
    let message = '';

    if (all) {
      await cache.clear();
      deleted = -1; // Special value for "all"
      message = 'All cache cleared';
    } else if (pattern) {
      deleted = await cache.purge(pattern);
      message = `Cache purged for pattern: ${pattern}`;
    } else {
      return NextResponse.json(
        { error: 'Missing pattern or all flag' },
        { status: 400 }
      );
    }

    const stats = cache.getStats();

    return NextResponse.json({
      success: true,
      message,
      deleted,
      stats
    });

  } catch (error) {
    logger.error('Cache purge error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting (before auth to avoid wasting resources)
    const clientIp = getClientIP(request);
    const path = request.nextUrl.pathname;
    const rateLimitResult = await checkEndpointRateLimit(path, clientIp);
    
    if (!rateLimitResult.allowed) {
      logger.warn('Cache purge GET: Rate limit exceeded', {
        ip: clientIp,
        remaining: rateLimitResult.remaining,
      });
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter || 60) } }
      );
    }
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.headers.get('x-admin-token');
    const expectedToken = env.ADMIN_CACHE_TOKEN || process.env.ADMIN_CACHE_TOKEN;
    
    if (!token || !expectedToken || token !== expectedToken) {
      logger.warn('Cache purge GET: Unauthorized attempt', {
        hasToken: !!token,
        hasExpectedToken: !!expectedToken,
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = cache.getStats();

    return NextResponse.json({
      success: true,
      stats,
      info: {
        maxMemoryEntries: 1000,
        defaultTtl: 60000,
        rateLimitWindow: 60000,
        rateLimitMax: 100
      }
    });

  } catch (error) {
    console.error('Cache stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

