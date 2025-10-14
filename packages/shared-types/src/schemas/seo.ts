import { z } from 'zod';

// SEO schema for meta data and structured data
export const SEOSchema = z.object({
  global: z.object({
    siteName: z.string(),
    siteDescription: z.string(),
    siteUrl: z.string().url(),
    defaultLanguage: z.string().length(2),
    supportedLanguages: z.array(z.string().length(2)),
    robots: z.object({
      index: z.boolean(),
      follow: z.boolean(),
      noarchive: z.boolean(),
      nosnippet: z.boolean(),
      noimageindex: z.boolean(),
    }),
    canonicalUrl: z.string().url().optional(),
  }),
  pages: z.array(z.object({
    path: z.string(),
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string()),
    image: z.string().url().optional(),
    noindex: z.boolean(),
    nofollow: z.boolean(),
    canonicalUrl: z.string().url().optional(),
    alternateLanguages: z.array(z.object({
      language: z.string().length(2),
      url: z.string().url(),
    })),
    structuredData: z.record(z.any()).optional(),
  })),
  social: z.object({
    openGraph: z.object({
      title: z.string(),
      description: z.string(),
      image: z.string().url(),
      imageWidth: z.number(),
      imageHeight: z.number(),
      type: z.enum(['website', 'article', 'product']),
      siteName: z.string(),
      locale: z.string(),
    }),
    twitter: z.object({
      card: z.enum(['summary', 'summary_large_image', 'app', 'player']),
      site: z.string().optional(),
      creator: z.string().optional(),
      title: z.string(),
      description: z.string(),
      image: z.string().url().optional(),
    }),
    facebook: z.object({
      appId: z.string().optional(),
      admins: z.array(z.string()).optional(),
    }),
  }),
  schema: z.object({
    organization: z.object({
      name: z.string(),
      url: z.string().url(),
      logo: z.string().url(),
      description: z.string(),
      contactPoint: z.object({
        telephone: z.string(),
        contactType: z.string(),
        email: z.string().email(),
      }),
      address: z.object({
        streetAddress: z.string(),
        addressLocality: z.string(),
        addressRegion: z.string(),
        postalCode: z.string(),
        addressCountry: z.string(),
      }),
      sameAs: z.array(z.string().url()),
    }),
    website: z.object({
      name: z.string(),
      url: z.string().url(),
      description: z.string(),
      inLanguage: z.string(),
      isAccessibleForFree: z.boolean(),
      potentialAction: z.object({
        target: z.string().url(),
        'query-input': z.string(),
      }),
    }),
    breadcrumb: z.array(z.object({
      name: z.string(),
      url: z.string().url(),
    })),
  }),
  analytics: z.object({
    googleAnalytics: z.object({
      measurementId: z.string(),
      config: z.record(z.any()),
    }),
    googleTagManager: z.object({
      containerId: z.string(),
    }),
    facebookPixel: z.object({
      pixelId: z.string(),
    }),
  }),
  sitemap: z.object({
    enabled: z.boolean(),
    priority: z.number().min(0).max(1),
    changeFrequency: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']),
    lastModified: z.string().datetime(),
  }),
  robots: z.object({
    userAgent: z.string(),
    allow: z.array(z.string()),
    disallow: z.array(z.string()),
    sitemap: z.string().url(),
  }),
});

export type SEO = z.infer<typeof SEOSchema>;

// Structured data schemas
export const ProductSchemaSchema = z.object({
  '@context': z.literal('https://schema.org'),
  '@type': z.literal('Product'),
  name: z.string(),
  description: z.string(),
  image: z.array(z.string().url()),
  brand: z.object({
    '@type': z.literal('Organization'),
    name: z.string(),
  }),
  offers: z.object({
    '@type': z.literal('Offer'),
    url: z.string().url(),
    priceCurrency: z.string(),
    price: z.string(),
    availability: z.string().url(),
    seller: z.object({
      '@type': z.literal('Organization'),
      name: z.string(),
    }),
  }),
  aggregateRating: z.object({
    '@type': z.literal('AggregateRating'),
    ratingValue: z.number(),
    reviewCount: z.number(),
  }).optional(),
  review: z.array(z.object({
    '@type': z.literal('Review'),
    author: z.object({
      '@type': z.literal('Person'),
      name: z.string(),
    }),
    datePublished: z.string().datetime(),
    reviewBody: z.string(),
    reviewRating: z.object({
      '@type': z.literal('Rating'),
      ratingValue: z.number(),
      bestRating: z.number(),
      worstRating: z.number(),
    }),
  })).optional(),
});

export const ArticleSchemaSchema = z.object({
  '@context': z.literal('https://schema.org'),
  '@type': z.literal('Article'),
  headline: z.string(),
  description: z.string(),
  image: z.string().url(),
  datePublished: z.string().datetime(),
  dateModified: z.string().datetime(),
  author: z.object({
    '@type': z.literal('Person'),
    name: z.string(),
    url: z.string().url().optional(),
  }),
  publisher: z.object({
    '@type': z.literal('Organization'),
    name: z.string(),
    logo: z.object({
      '@type': z.literal('ImageObject'),
      url: z.string().url(),
    }),
  }),
});

export type ProductSchema = z.infer<typeof ProductSchemaSchema>;
export type ArticleSchema = z.infer<typeof ArticleSchemaSchema>;
