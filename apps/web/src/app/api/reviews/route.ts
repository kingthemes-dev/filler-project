import { NextRequest, NextResponse } from 'next/server';

const WOOCOMMERCE_URL = process.env.WOOCOMMERCE_URL;
const WOOCOMMERCE_CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const WOOCOMMERCE_CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');
    
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const url = `${WOOCOMMERCE_URL}/products/reviews?product=${productId}&consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reviews = await response.json();
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, review, reviewer, reviewer_email, rating } = body;

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
      rating: parseInt(rating),
      status: 'approved' // Auto-approve reviews
    };

    const url = `${WOOCOMMERCE_URL}/products/reviews?consumer_key=${WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${WOOCOMMERCE_CONSUMER_SECRET}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reviewData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error creating review:', errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const newReview = await response.json();
    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
