import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { WooProduct } from '@/types/woocommerce';

// Mock database - w prawdziwej aplikacji używałbyś bazy danych
const favoritesDB: { [userId: string]: WooProduct[] } = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'anonymous', favorites } = body;
    
    if (!Array.isArray(favorites)) {
      return NextResponse.json(
        { success: false, error: 'Favorites must be an array' },
        { status: 400 }
      );
    }
    
    // Zastąp ulubione użytkownika nowymi danymi
    favoritesDB[userId] = favorites;
    
    return NextResponse.json({
      success: true,
      message: 'Favorites synchronized successfully',
      data: favoritesDB[userId],
      count: favoritesDB[userId].length
    });
  } catch (error) {
    console.error('Error synchronizing favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to synchronize favorites' },
      { status: 500 }
    );
  }
}
