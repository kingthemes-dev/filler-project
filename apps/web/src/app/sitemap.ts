import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://filler.pl'
  
  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/sklep`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/o-nas`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/kontakt`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/polityka-prywatnosci`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/regulamin`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
  ]

  // Dynamic pages - fetch from API
  let dynamicPages: MetadataRoute.Sitemap = []
  
  try {
    // Fetch products
    const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl'}/wp-json/wc/v3/products?per_page=100&status=publish`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString('base64')}`,
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (productsResponse.ok) {
      const products = await productsResponse.json()
      dynamicPages = products.map((product: any) => ({
        url: `${baseUrl}/produkt/${product.slug}`,
        lastModified: new Date(product.date_modified || product.date_created),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    }
  } catch (error) {
    console.error('Error fetching products for sitemap:', error)
  }

  // Fetch categories
  try {
    const categoriesResponse = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl'}/wp-json/wc/v3/products/categories?per_page=100&hide_empty=true`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString('base64')}`,
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (categoriesResponse.ok) {
      const categories = await categoriesResponse.json()
      const categoryPages = categories.map((category: any) => ({
        url: `${baseUrl}/sklep?kategoria=${category.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
      dynamicPages = [...dynamicPages, ...categoryPages]
    }
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error)
  }

  return [...staticPages, ...dynamicPages]
}
