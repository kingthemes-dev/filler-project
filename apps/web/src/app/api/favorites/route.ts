import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { getFavoritesQuerySchema, addFavoriteSchema, deleteFavoriteQuerySchema, type AddFavorite } from '@/lib/schemas/favorites';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';

type FavoriteProduct = AddFavorite['product'];

// In-memory store (mock DB)
const favoritesDB: Record<string, FavoriteProduct[]> = {};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryResult = getFavoritesQuerySchema.safeParse({
      userId: searchParams.get('userId'),
    });
    
    if (!queryResult.success) {
      return createErrorResponse(
        new ValidationError('Invalid query parameters', queryResult.error.errors),
        { endpoint: 'favorites', method: 'GET' }
      );
    }
    
    const { userId } = queryResult.data;
    
    // Pobierz ulubione dla użytkownika
    const favorites = favoritesDB[userId] || [];

    return NextResponse.json({
      success: true,
      data: favorites,
      count: favorites.length
    });
  } catch (error) {
    logger.error('Favorites GET error', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body with Zod
    const validationResult = addFavoriteSchema.safeParse(body);
    
    if (!validationResult.success) {
      return createErrorResponse(
        new ValidationError('Invalid favorite data', validationResult.error.errors),
        { endpoint: 'favorites', method: 'POST' }
      );
    }
    
    const { userId, product } = validationResult.data;
    
    // Inicjalizuj tablicę jeśli nie istnieje
    favoritesDB[userId] = favoritesDB[userId] || [];

    const alreadyExists = favoritesDB[userId].some(fav => fav.id === product.id);

    if (!alreadyExists) {
      favoritesDB[userId].push(product);
      logger.info('Favorite added', { userId, productId: product.id });
    } else {
      logger.debug('Favorite already exists', { userId, productId: product.id });
    }

    return NextResponse.json({
      success: true,
      message: alreadyExists ? 'Product already in favorites' : 'Product added to favorites',
      data: favoritesDB[userId],
      count: favoritesDB[userId].length
    });
  } catch (error) {
    logger.error('Favorites POST error', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to add to favorites' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryResult = deleteFavoriteQuerySchema.safeParse({
      userId: searchParams.get('userId'),
      productId: searchParams.get('productId'),
    });
    
    if (!queryResult.success) {
      return createErrorResponse(
        new ValidationError('Invalid query parameters', queryResult.error.errors),
        { endpoint: 'favorites', method: 'DELETE' }
      );
    }
    
    const { userId, productId } = queryResult.data;
    
    if (!favoritesDB[userId]) {
      return NextResponse.json({
        success: true,
        message: 'No favorites found',
        data: [],
        count: 0
      });
    }
    logger.info('Removing product from favorites', { userId, productId });

    const initialLength = favoritesDB[userId].length;
    favoritesDB[userId] = favoritesDB[userId].filter(fav => fav.id !== productId);
    
    const removed = initialLength > favoritesDB[userId].length;
    
    return NextResponse.json({
      success: true,
      message: removed ? 'Product removed from favorites' : 'Product not found in favorites',
      data: favoritesDB[userId],
      count: favoritesDB[userId].length
    });
  } catch (error) {
    logger.error('Favorites DELETE error', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to remove from favorites' },
      { status: 500 }
    );
  }
}
