import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import {
  syncFavoritesSchema,
  type SyncFavorites,
} from '@/lib/schemas/favorites';
import { validateApiInput } from '@/utils/request-validation';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';
import { checkApiSecurity, addSecurityHeaders } from '@/utils/api-security';

// Mock database - replace with persistent store if needed
const favoritesDB: Record<string, SyncFavorites['favorites']> = {};

export async function POST(request: NextRequest) {
  // Security check: rate limiting and CSRF protection
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
    const rawBody = await request.json();
    const sanitizedBody = validateApiInput(rawBody);
    const validationResult = syncFavoritesSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError(
          'Nieprawidłowe dane synchronizacji ulubionych',
          validationResult.error.errors
        ),
        { endpoint: 'favorites/sync', method: 'POST' }
      );
    }

    const { userId, favorites } = validationResult.data;

    // Zastąp ulubione użytkownika nowymi danymi
    favoritesDB[userId] = favorites;
    logger.info('Favorites synchronized', { userId, count: favorites.length });

    const response = NextResponse.json({
      success: true,
      message: 'Favorites synchronized successfully',
      data: favoritesDB[userId],
      count: favoritesDB[userId].length,
    });
    
    // Add security headers
    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('Favorites sync error', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to synchronize favorites' },
      { status: 500 }
    );
  }
}
