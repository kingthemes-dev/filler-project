import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://filler.pl'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
          '/moje-konto/',
          '/moje-zamowienia/',
          '/moje-faktury/',
          '/lista-zyczen/',
          '/koszyk/',
          '/checkout/',
          '/reset-hasla/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
          '/moje-konto/',
          '/moje-zamowienia/',
          '/moje-faktury/',
          '/lista-zyczen/',
          '/koszyk/',
          '/checkout/',
          '/reset-hasla/',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
          '/moje-konto/',
          '/moje-zamowienia/',
          '/moje-faktury/',
          '/lista-zyczen/',
          '/koszyk/',
          '/checkout/',
          '/reset-hasla/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
