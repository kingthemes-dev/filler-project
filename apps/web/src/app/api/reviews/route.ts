import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { getReviewsQuerySchema, createReviewSchema } from '@/lib/schemas/reviews';
import { createErrorResponse, ValidationError } from '@/lib/errors';
import { logger } from '@/utils/logger';

// PRO Architecture: Use custom WordPress King Reviews API
const WORDPRESS_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';
const KING_REVIEWS_API = `${WORDPRESS_BASE_URL}/wp-json/king-reviews/v1/reviews`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryResult = getReviewsQuerySchema.safeParse({
      product_id: searchParams.get('product_id'),
    });
    
    if (!queryResult.success) {
      return createErrorResponse(
        new ValidationError('Invalid query parameters', queryResult.error.errors),
        { endpoint: 'reviews', method: 'GET' }
      );
    }
    
    const { product_id } = queryResult.data;

    logger.debug('Fetching reviews for product', { productId: product_id });
    
    // PRO: Use King Reviews API endpoint
    const url = `${KING_REVIEWS_API}?product_id=${product_id}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Filler-Store/1.0'
      },
      cache: 'no-store' // Always get fresh reviews
    });

    if (!response.ok) {
      logger.error('Reviews API error', { status: response.status, productId: product_id });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reviews = await response.json();
    logger.info('Reviews fetched', { productId: product_id, count: Array.isArray(reviews) ? reviews.length : 0 });
    
    return NextResponse.json(reviews, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Failed to fetch reviews');
    logger.error('Error fetching reviews', {
      message: err.message,
      productId: request.nextUrl?.searchParams.get('product_id') ?? 'unknown'
    });
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validationResult = createReviewSchema.safeParse(body);
    
    if (!validationResult.success) {
      logger.warn('Review payload validation error', {
        issues: validationResult.error.errors
      });
      return createErrorResponse(
        new ValidationError('Invalid review data', validationResult.error.errors),
        { endpoint: 'reviews', method: 'POST' }
      );
    }

    const reviewData = validationResult.data;
    logger.info('Creating review', {
      productId: reviewData.product_id,
      reviewer: reviewData.reviewer,
      rating: reviewData.rating
    });

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
      logger.error('Error creating review', {
        status: response.status,
        error: errorData
      });
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const newReview = await response.json();
    logger.info('Review created successfully', {
      reviewId: newReview?.id,
      productId: reviewData.product_id
    });
    
    return NextResponse.json(newReview, { 
      status: 201,
      headers: {
        'Cache-Control': 'no-store',
      }
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Failed to create review');
    logger.error('Error creating review', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    return NextResponse.json({ 
      error: err.message 
    }, { status: 500 });
  }
}
