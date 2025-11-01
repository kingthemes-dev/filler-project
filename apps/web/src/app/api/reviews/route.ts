import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

// PRO Architecture: Use custom WordPress King Reviews API
const WORDPRESS_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';
const KING_REVIEWS_API = `${WORDPRESS_BASE_URL}/wp-json/king-reviews/v1/reviews`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    console.log('🔍 Fetching reviews for product:', productId);
    
    // PRO: Use King Reviews API endpoint
    const url = `${KING_REVIEWS_API}?product_id=${productId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Filler-Store/1.0'
      },
      cache: 'no-store' // Always get fresh reviews
    });

    if (!response.ok) {
      console.error('❌ Reviews API error:', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reviews = await response.json();
    console.log('✅ Reviews fetched:', reviews.length, 'reviews');
    
    return NextResponse.json(reviews, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, review, reviewer, reviewer_email, rating } = body;

    console.log('📝 Creating review:', { product_id, reviewer, rating });

    // Validate required fields
    if (!product_id || !review || !reviewer || !reviewer_email || !rating) {
      return NextResponse.json({ 
        error: 'Missing required fields: product_id, review, reviewer, reviewer_email, rating' 
      }, { status: 400 });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ 
        error: 'Rating must be between 1 and 5' 
      }, { status: 400 });
    }

    const reviewData = {
      product_id: parseInt(product_id),
      review,
      reviewer,
      reviewer_email,
      rating: parseInt(rating)
    };

    // PRO: Use King Reviews API endpoint
    const response = await fetch(KING_REVIEWS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Filler-Store/1.0'
      },
      body: JSON.stringify(reviewData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error creating review:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const newReview = await response.json();
    console.log('✅ Review created successfully:', newReview.id);
    
    return NextResponse.json(newReview, { 
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
      }
    });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create review' 
    }, { status: 500 });
  }
}
