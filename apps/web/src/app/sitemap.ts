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
    // Fetch products with better error handling
    const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl'}/wp-json/wc/v3/products?per_page=100&status=publish`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString('base64')}`,
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (productsResponse.ok) {
      const contentType = productsResponse.headers.get('content-type')
      const responseText = await productsResponse.text()
      // Try strict JSON first, then fallback to regex extraction if HTML/noise is present
      if (!contentType || contentType.includes('application/json')) {
        try {
          const products = JSON.parse(responseText)
          if (Array.isArray(products)) {
            dynamicPages = products.map((product: any) => ({
              url: `${baseUrl}/produkt/${product.slug}`,
              lastModified: new Date(product.date_modified || product.date_created),
              changeFrequency: 'weekly' as const,
              priority: 0.7,
            }))
          }
        } catch {
          try {
            // Extract the first JSON array from the response as a fallback
            const match = responseText.match(/\[[\s\S]*\]/)
            if (match) {
              const products = JSON.parse(match[0])
              if (Array.isArray(products)) {
                dynamicPages = products.map((product: any) => ({
                  url: `${baseUrl}/produkt/${product.slug}`,
                  lastModified: new Date(product.date_modified || product.date_created),
                  changeFrequency: 'weekly' as const,
                  priority: 0.7,
                }))
              }
            }
          } catch {
            console.error('Error parsing products JSON (fallback)')
            console.error('Response text preview:', responseText.substring(0, 500))
            // Fallback: keep only static pages
          }
        }
      } else {
        console.error('Products API returned non-JSON response:', contentType)
        // Fallback: return static pages only
      }
    } else {
      console.error('Products API request failed:', productsResponse.status, productsResponse.statusText)
      // Fallback: return static pages only
    }
  } catch (error) {
    console.error('Error fetching products for sitemap:', error)
    // Fallback: return static pages only
  }

  // Fetch categories with better error handling
  try {
    const categoriesResponse = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_URL || 'https://qvwltjhdjw.cfolks.pl'}/wp-json/wc/v3/products/categories?per_page=100&hide_empty=true`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`).toString('base64')}`,
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (categoriesResponse.ok) {
      const contentType = categoriesResponse.headers.get('content-type')
      const responseText = await categoriesResponse.text()
      if (!contentType || contentType.includes('application/json')) {
        try {
          const categories = JSON.parse(responseText)
          if (Array.isArray(categories)) {
            const categoryPages = categories.map((category: any) => ({
              url: `${baseUrl}/sklep?kategoria=${category.slug}`,
              lastModified: new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.6,
            }))
            dynamicPages = [...dynamicPages, ...categoryPages]
          }
        } catch {
          try {
            const match = responseText.match(/\[[\s\S]*\]/)
            if (match) {
              const categories = JSON.parse(match[0])
              if (Array.isArray(categories)) {
                const categoryPages = categories.map((category: any) => ({
                  url: `${baseUrl}/sklep?kategoria=${category.slug}`,
                  lastModified: new Date(),
                  changeFrequency: 'weekly' as const,
                  priority: 0.6,
                }))
                dynamicPages = [...dynamicPages, ...categoryPages]
              }
            }
          } catch {
            console.error('Error parsing categories JSON (fallback):')
            console.error('Response text preview:', responseText.substring(0, 500))
            // Continue with existing dynamicPages (products)
          }
        }
      } else {
        console.error('Categories API returned non-JSON response:', contentType)
        // Continue with existing dynamicPages (products)
      }
    } else {
      console.error('Categories API request failed:', categoriesResponse.status, categoriesResponse.statusText)
      // Continue with existing dynamicPages (products)
    }
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error)
    // Continue with existing dynamicPages (products)
  }

  return [...staticPages, ...dynamicPages]
}
