import { MetadataRoute } from 'next';
import { env } from '@/config/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = env.NEXT_PUBLIC_BASE_URL || 'https://filler.pl';

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/sklep`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/polityka-prywatnosci`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
  ];

  // TODO: Add dynamic product pages
  // This would require fetching products from WooCommerce API
  // Example:
  // const products = await fetchProducts();
  // const productPages = products.map(product => ({
  //   url: `${baseUrl}/produkt/${product.slug}`,
  //   lastModified: product.modified_date,
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.8,
  // }));

  return [...staticPages];
}
