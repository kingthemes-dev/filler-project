import { NextRequest, NextResponse } from 'next/server';
import { WooProduct } from '@/types/woocommerce';

// Mock database - w prawdziwej aplikacji używałbyś bazy danych
let favoritesDB: { [userId: string]: WooProduct[] } = {};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'anonymous';
    
    // Pobierz ulubione dla użytkownika
    const favorites = favoritesDB[userId] || [];
    
    return NextResponse.json({
      success: true,
      data: favorites,
      count: favorites.length
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'anonymous', product } = body;
    
    if (!product || !product.id) {
      return NextResponse.json(
        { success: false, error: 'Product data is required' },
        { status: 400 }
      );
    }
    
    // Inicjalizuj tablicę jeśli nie istnieje
    if (!favoritesDB[userId]) {
      favoritesDB[userId] = [];
    }
    
    // Sprawdź czy produkt już jest w ulubionych
    const existingIndex = favoritesDB[userId].findIndex(fav => fav.id === product.id);
    
    if (existingIndex === -1) {
      // Dodaj produkt do ulubionych
      favoritesDB[userId].push(product);
      
      return NextResponse.json({
        success: true,
        message: 'Product added to favorites',
        data: favoritesDB[userId],
        count: favoritesDB[userId].length
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Product already in favorites',
        data: favoritesDB[userId],
        count: favoritesDB[userId].length
      });
    }
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to favorites' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'anonymous';
    const productId = searchParams.get('productId');
    
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }
    
    if (!favoritesDB[userId]) {
      return NextResponse.json({
        success: true,
        message: 'No favorites found',
        data: [],
        count: 0
      });
    }
    
    // Usuń produkt z ulubionych
    const initialLength = favoritesDB[userId].length;
    favoritesDB[userId] = favoritesDB[userId].filter(fav => fav.id !== parseInt(productId));
    
    const removed = initialLength > favoritesDB[userId].length;
    
    return NextResponse.json({
      success: true,
      message: removed ? 'Product removed from favorites' : 'Product not found in favorites',
      data: favoritesDB[userId],
      count: favoritesDB[userId].length
    });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove from favorites' },
      { status: 500 }
    );
  }
}
