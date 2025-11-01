import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { wooCommerceOptimized } from '@/services/woocommerce-optimized';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Test product API called');
    
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug') || 'aesplla';
    
    console.log(`🔍 Testing product fetch for slug: ${slug}`);
    
    const product = await wooCommerceOptimized.getProductBySlug(slug);
    
    return NextResponse.json({
      success: true,
      slug,
      product: product ? {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price
      } : null
    });
  } catch (error) {
    console.error('❌ Test product API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
