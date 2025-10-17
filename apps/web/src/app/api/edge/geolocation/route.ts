import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    // Get user's country from Cloudflare headers
    const country = (request as any).geo?.country || 'US';
    const city = (request as any).geo?.city || 'Unknown';
    const region = (request as any).geo?.region || 'Unknown';
    const timezone = (request as any).geo?.timezone || 'UTC';

    // Get user's IP
    const ip = (request as any).ip || request.headers.get('x-forwarded-for') || 'Unknown';

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Get language preferences
    const acceptLanguage = request.headers.get('accept-language') || 'en';

    const geolocationData = {
      country,
      city,
      region,
      timezone,
      ip,
      userAgent,
      acceptLanguage,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(geolocationData, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'CDN-Cache-Control': 'max-age=3600',
        'Vercel-CDN-Cache-Control': 'max-age=3600',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get geolocation data' },
      { status: 500 }
    );
  }
}
