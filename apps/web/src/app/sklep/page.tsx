import ShopClient from './shop-client';

// PRO: Dynamic rendering - fetch data client-side for better performance during build
export const dynamic = 'force-dynamic';

export default function ShopPage() {
  // Client-side data fetching - no server-side fetch during build
  return <ShopClient />;
}