import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { syncFavoritesSchema, type SyncFavorites } from '@/lib/schemas/favorites';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';
import { checkEndpointRateLimit } from '@/utils/rate-limiter';
import { getClientIP } from '@/utils/client-ip';
import { RateLimitError } from '@/lib/errors';

// Mock database - replace with persistent store if needed
const favoritesDB: Record<string, SyncFavorites['favorites']> = {};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIP(request);
    const path = request.nextUrl.pathname;
    const rateLimitResult = await checkEndpointRateLimit(path, clientIp);
    
    if (!rateLimitResult.allowed) {
      logger.warn('Favorites sync: Rate limit exceeded', {
        ip: clientIp,
        remaining: rateLimitResult.remaining,
      });
      return createErrorResponse(
        new RateLimitError(
          'Rate limit exceeded for favorites sync',
          rateLimitResult.retryAfter
        ),
        { endpoint: 'favorites/sync', method: 'POST' }
      );
    }
    
    const rawBody = await request.json();
    const sanitizedBody = validateApiInput(rawBody);
    const validationResult = syncFavoritesSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError('Nieprawidłowe dane synchronizacji ulubionych', validationResult.error.errors),
        { endpoint: 'favorites/sync', method: 'POST' }
      );
    }

    const { userId, favorites } = validationResult.data;
    
    // Zastąp ulubione użytkownika nowymi danymi
    favoritesDB[userId] = favorites;
    logger.info('Favorites synchronized', { userId, count: favorites.length });
    
    return NextResponse.json({
      success: true,
      message: 'Favorites synchronized successfully',
      data: favoritesDB[userId],
      count: favoritesDB[userId].length
    });
  } catch (error) {
    logger.error('Favorites sync error', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to synchronize favorites' },
      { status: 500 }
    );
  }
}
