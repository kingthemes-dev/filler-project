import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.event || !body.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: event, timestamp' },
        { status: 400 }
      );
    }

    // Get user context from headers
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const referer = request.headers.get('referer') || 'Direct';
    const country = (request as any).geo?.country || 'Unknown';
    const city = (request as any).geo?.city || 'Unknown';

    // Create analytics event
    const analyticsEvent = {
      ...body,
      userAgent,
      referer,
      country,
      city,
      ip: (request as any).ip || request.headers.get('x-forwarded-for') || 'Unknown',
      timestamp: new Date().toISOString(),
    };

    // In a real implementation, you would send this to your analytics service
    // For now, we'll just log it
    console.log('Analytics Event:', JSON.stringify(analyticsEvent, null, 2));

    return NextResponse.json(
      { success: true, eventId: `evt_${Date.now()}` },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process analytics event' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get analytics summary (mock data for edge function)
    const summary = {
      totalEvents: 1234,
      uniqueUsers: 567,
      topCountries: [
        { country: 'PL', count: 456 },
        { country: 'DE', count: 234 },
        { country: 'US', count: 123 },
      ],
      topEvents: [
        { event: 'page_view', count: 789 },
        { event: 'product_view', count: 234 },
        { event: 'add_to_cart', count: 123 },
      ],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'CDN-Cache-Control': 'max-age=300',
        'Vercel-CDN-Cache-Control': 'max-age=300',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get analytics summary' },
      { status: 500 }
    );
  }
}
