import ShopClient from './shop-client';

// Server-side data fetching
async function getShopData() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/woocommerce?endpoint=shop&cache=off`, {
      next: { 
        revalidate: 300, // 5 minutes
        tags: ['shop-data'] 
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching shop data:', error);
    return {
      success: false,
      products: [],
      total: 0,
      categories: [],
      attributes: {
        capacities: [],
        brands: []
      }
    };
  }
}

// ISR - Incremental Static Regeneration
export const revalidate = 300; // 5 minutes

export default async function ShopPage() {
  const shopData = await getShopData();
  console.log('🔍 ShopPage - shopData:', shopData);
  console.log('🔍 ShopPage - products count:', shopData?.products?.length);
  
  return <ShopClient initialShopData={shopData} />;
}