import { WooProduct } from '@/types/woocommerce';

/**
 * 🚀 LCP Optimization: Server-side helper to get first product image URL
 * Używane w page.tsx dla server-side preload
 */
export function getFirstProductImageUrl(products: WooProduct[]): string | null {
  if (!products || products.length === 0) return null;

  const firstProduct = products[0];
  if (!firstProduct.images || firstProduct.images.length === 0) return null;

  const image = firstProduct.images[0];
  let imageUrl = '';

  // Handle both string array format and object format
  if (typeof image === 'string') {
    imageUrl = image;
  } else if (typeof image === 'object' && image.src) {
    imageUrl = image.src;
  } else {
    return null;
  }

  // Convert to higher quality image (600x600) for better LCP
  if (imageUrl.includes('-300x300.')) {
    imageUrl = imageUrl.replace('-300x300.', '-600x600.');
  } else if (imageUrl.includes('-150x150.')) {
    imageUrl = imageUrl.replace('-150x150.', '-600x600.');
  } else if (imageUrl.includes('-100x100.')) {
    imageUrl = imageUrl.replace('-100x100.', '-600x600.');
  }

  // Skip placeholder images
  if (imageUrl.includes('placeholder')) return null;

  return imageUrl;
}

