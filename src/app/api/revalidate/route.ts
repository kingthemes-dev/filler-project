import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, tag } = body;

    // Verify secret to prevent unauthorized revalidation
    if (secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }

    // Revalidate specific tag
    if (tag) {
      revalidateTag(tag);
      return NextResponse.json({ 
        revalidated: true, 
        tag,
        now: Date.now() 
      });
    }

    // Revalidate home-feed by default
    revalidateTag('home-feed');
    
    return NextResponse.json({ 
      revalidated: true, 
      tag: 'home-feed',
      now: Date.now() 
    });

  } catch (error) {
    console.error('Revalidation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to revalidate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
