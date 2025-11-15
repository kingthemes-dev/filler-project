import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { logger } from '@/utils/logger';
import { checkApiSecurity, addSecurityHeaders } from '@/utils/api-security';

// PRO Architecture: Use custom WordPress King Reviews API for image upload
const WORDPRESS_BASE_URL =
  process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl';
const KING_REVIEWS_UPLOAD_API = `${WORDPRESS_BASE_URL}/wp-json/king-reviews/v1/upload-image`;

export async function POST(request: NextRequest) {
  // Security check: rate limiting and CSRF protection
  const securityCheck = await checkApiSecurity(request, {
    enforceRateLimit: true,
    enforceCSRF: true,
  });
  
  if (!securityCheck.allowed) {
    return securityCheck.response || NextResponse.json(
      { error: 'Security check failed' },
      { status: 403 }
    );
  }
  
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
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.',
        },
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

    // Sanitize filename (remove path traversal, special chars, etc.)
    const sanitizeFilename = (filename: string): string => {
      // Remove path components (../, ./, etc.)
      let sanitized = filename.replace(/^.*[\\/]/, '');
      // Remove special characters, keep only alphanumeric, dots, hyphens, underscores
      sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
      // Limit filename length
      const maxLength = 255;
      if (sanitized.length > maxLength) {
        const ext = sanitized.split('.').pop() || '';
        const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
        sanitized = nameWithoutExt.substring(0, maxLength - ext.length - 1) + '.' + ext;
      }
      return sanitized || 'uploaded_image';
    };

    const sanitizedFilename = sanitizeFilename(file.name);
    
    // Create a new File with sanitized filename
    const sanitizedFile = new File([file], sanitizedFilename, {
      type: file.type,
      lastModified: file.lastModified,
    });

    // Create FormData for WordPress
    const wpFormData = new FormData();
    wpFormData.append('image', sanitizedFile);

    // Upload to WordPress
    const fetchResponse = await fetch(KING_REVIEWS_UPLOAD_API, {
      method: 'POST',
      body: wpFormData,
      headers: {
        'User-Agent': 'Filler-Store/1.0',
      },
    });

    if (!fetchResponse.ok) {
      const errorData = await fetchResponse.json().catch(() => ({}));
      logger.error('Error uploading review image', {
        status: fetchResponse.status,
        error: errorData,
      });
      return NextResponse.json(
        {
          success: false,
          error: errorData.error || `HTTP error! status: ${fetchResponse.status}`,
        },
        { status: fetchResponse.status }
      );
    }

    const uploadResult = await fetchResponse.json();
    logger.info('Review image uploaded', {
      attachmentId: uploadResult?.attachment_id,
      size: uploadResult?.size,
    });

    const response = NextResponse.json(uploadResult, { status: 200 });
    
    // Add security headers
    return addSecurityHeaders(response);
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error('Unknown image upload error');
    logger.error('Error uploading review image', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
