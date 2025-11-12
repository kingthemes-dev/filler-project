import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// Extended NextRequest type for Edge Runtime with geo and ip properties
type NextRequestWithGeo = NextRequest & {
  geo?: {
    country?: string;
    city?: string;
    region?: string;
    timezone?: string;
  };
  ip?: string;
};

export async function GET(request: NextRequest) {
  try {
    // Type assertion for Edge Runtime properties
    const requestWithGeo = request as NextRequestWithGeo;
    
    // Get user's country from Cloudflare/Vercel headers
    const country = 
      requestWithGeo.geo?.country ?? 
      request.headers.get('x-vercel-ip-country') ?? 
      request.headers.get('cf-ipcountry') ?? 
      'US';
    
    const city = 
      requestWithGeo.geo?.city ?? 
      request.headers.get('x-vercel-ip-city') ?? 
      'Unknown';
    
    const region = 
      requestWithGeo.geo?.region ?? 
      request.headers.get('x-vercel-ip-region') ?? 
      'Unknown';
    
    const timezone = 
      requestWithGeo.geo?.timezone ?? 
      request.headers.get('x-vercel-ip-timezone') ?? 
      'UTC';

    // Get user's IP
    const ip = 
      requestWithGeo.ip ?? 
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 
      request.headers.get('x-real-ip') ?? 
      request.headers.get('x-vercel-ip') ?? 
      request.headers.get('cf-connecting-ip') ?? 
      'Unknown';

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
  } catch {
    return NextResponse.json(
      { error: 'Failed to get geolocation data' },
      { status: 500 }
    );
  }
}
