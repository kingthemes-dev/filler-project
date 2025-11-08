import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { logger } from '@/utils/logger';

// PRO Architecture: Use custom WordPress King Reviews API for image upload
const WORDPRESS_BASE_URL = process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';
const KING_REVIEWS_UPLOAD_API = `${WORDPRESS_BASE_URL}/wp-json/king-reviews/v1/upload-image`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Create FormData for WordPress
    const wpFormData = new FormData();
    wpFormData.append('image', file);

    // Upload to WordPress
    const response = await fetch(KING_REVIEWS_UPLOAD_API, {
      method: 'POST',
      body: wpFormData,
      headers: {
        'User-Agent': 'Filler-Store/1.0'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Error uploading review image', {
        status: response.status,
        error: errorData
      });
      return NextResponse.json(
        { success: false, error: errorData.error || `HTTP error! status: ${response.status}` },
        { status: response.status }
      );
    }

    const uploadResult = await response.json();
    logger.info('Review image uploaded', {
      attachmentId: uploadResult?.attachment_id,
      size: uploadResult?.size
    });

    return NextResponse.json(uploadResult, { status: 200 });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown image upload error');
    logger.error('Error uploading review image', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

