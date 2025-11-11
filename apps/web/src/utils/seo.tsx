/**
 * SEO utilities and helpers
 */

import React from 'react';
import { Metadata } from 'next';

type OpenGraphType =
  | 'website'
  | 'article'
  | 'book'
  | 'profile'
  | 'music.song'
  | 'music.album'
  | 'music.playlist'
  | 'music.radio_station'
  | 'video.movie'
  | 'video.episode'
  | 'video.tv_show'
  | 'video.other';

type StructuredData = Record<string, unknown>;
type LayoutShiftEntry = PerformanceEntry & { value?: number; hadRecentInput?: boolean };
import { env } from '@/config/env';

// Base SEO configuration
export const SEO_CONFIG = {
  siteName: 'FILLER - Profesjonalne kosmetyki i urządzenia',
  siteDescription: 'Sklep z profesjonalnymi kosmetykami koreańskimi, mezoterapią, nićmi, peelingami, stymulatorami, urządzeniami i wypełniaczami. Najwyższa jakość w najlepszych cenach.',
  siteUrl: env.NEXT_PUBLIC_BASE_URL,
  defaultImage: '/images/og-image.jpg',
  twitterHandle: '@filler_sklep',
  locale: 'pl_PL',
  type: 'website'
};

// Generate metadata for pages
export function generateMetadata({
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false
}: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: OpenGraphType;
  noindex?: boolean;
}): Metadata {
  const fullTitle = title ? `${title} | ${SEO_CONFIG.siteName}` : SEO_CONFIG.siteName;
  const fullDescription = description || SEO_CONFIG.siteDescription;
  const fullUrl = url ? `${SEO_CONFIG.siteUrl}${url}` : SEO_CONFIG.siteUrl;
  const fullImage = image ? `${SEO_CONFIG.siteUrl}${image}` : `${SEO_CONFIG.siteUrl}${SEO_CONFIG.defaultImage}`;

  return {
    title: fullTitle,
    description: fullDescription,
    robots: noindex ? 'noindex,nofollow' : 'index,follow',
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: fullUrl,
      siteName: SEO_CONFIG.siteName,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: fullTitle
        }
      ],
      locale: SEO_CONFIG.locale,
      type
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: fullDescription,
      images: [fullImage],
      creator: SEO_CONFIG.twitterHandle
    },
    alternates: {
      canonical: fullUrl
    },
    other: {
      'google-site-verification': process.env.GOOGLE_SITE_VERIFICATION || ''
    }
  };
}

// Generate structured data for products
export function generateProductStructuredData(product: {
  id: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  image: string;
  availability: string;
  brand?: string;
  sku?: string;
  category?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'FILLER'
    },
    sku: product.sku || product.id.toString(),
    category: product.category,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: `https://schema.org/${product.availability === 'instock' ? 'InStock' : 'OutOfStock'}`,
      url: `${SEO_CONFIG.siteUrl}/produkt/${product.name.toLowerCase().replace(/\s+/g, '-')}`,
      seller: {
        '@type': 'Organization',
        name: SEO_CONFIG.siteName,
        url: SEO_CONFIG.siteUrl
      }
    }
  };
}

// Generate structured data for organization
export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SEO_CONFIG.siteName,
    url: SEO_CONFIG.siteUrl,
    logo: `${SEO_CONFIG.siteUrl}/images/logo.png`,
    description: SEO_CONFIG.siteDescription,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'PL',
      addressLocality: 'Warszawa'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+48-123-456-789',
      contactType: 'customer service',
      availableLanguage: 'Polish'
    },
    sameAs: [
      'https://www.facebook.com/filler',
      'https://www.instagram.com/filler'
    ]
  };
}

// Generate structured data for breadcrumbs
export function generateBreadcrumbStructuredData(breadcrumbs: Array<{
  name: string;
  url: string;
}>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: breadcrumb.name,
      item: `${SEO_CONFIG.siteUrl}${breadcrumb.url}`
    }))
  };
}

// Generate structured data for FAQ
export function generateFAQStructuredData(faqs: Array<{
  question: string;
  answer: string;
}>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

// Generate sitemap data
export function generateSitemapData(pages: Array<{
  url: string;
  lastModified?: string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}>) {
  const baseUrl = SEO_CONFIG.siteUrl;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    ${page.lastModified ? `<lastmod>${page.lastModified}</lastmod>` : ''}
    ${page.changeFrequency ? `<changefreq>${page.changeFrequency}</changefreq>` : ''}
    ${page.priority ? `<priority>${page.priority}</priority>` : ''}
  </url>`).join('')}
</urlset>`;
}

// Generate robots.txt content
export function generateRobotsTxt(sitemapUrl?: string) {
  const baseUrl = SEO_CONFIG.siteUrl;
  const sitemap = sitemapUrl || `${baseUrl}/sitemap.xml`;
  
  return `User-agent: *
Allow: /

# Disallow admin areas
Disallow: /admin/
Disallow: /wp-admin/
Disallow: /wp-content/
Disallow: /api/
Disallow: /_next/

# Sitemap
Sitemap: ${sitemap}`;
}

// SEO-friendly URL generation
export function generateSEOFriendlyUrl(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Meta tag helpers
export function generateMetaTags({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website'
}: {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: string;
}) {
  const fullTitle = title ? `${title} | ${SEO_CONFIG.siteName}` : SEO_CONFIG.siteName;
  const fullDescription = description || SEO_CONFIG.siteDescription;
  const fullUrl = url ? `${SEO_CONFIG.siteUrl}${url}` : SEO_CONFIG.siteUrl;
  const fullImage = image ? `${SEO_CONFIG.siteUrl}${image}` : `${SEO_CONFIG.siteUrl}${SEO_CONFIG.defaultImage}`;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      {keywords && <meta name="keywords" content={keywords.join(', ')} />}
      <meta name="author" content={SEO_CONFIG.siteName} />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={fullUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SEO_CONFIG.siteName} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content={SEO_CONFIG.locale} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:creator" content={SEO_CONFIG.twitterHandle} />
      
      {/* Additional SEO */}
      <meta name="theme-color" content="#000000" />
      <meta name="msapplication-TileColor" content="#000000" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </>
  );
}

// Performance and SEO monitoring
export function trackSEOMetrics() {
  if (typeof window !== 'undefined') {
    // Track Core Web Vitals
    const trackWebVitals = () => {
      // First Contentful Paint
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            console.log('FCP:', entry.startTime);
          }
        }
      }).observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('LCP:', entry.startTime);
        }
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const eventTiming = entry as PerformanceEventTiming;
          console.log('FID:', eventTiming.processingStart - eventTiming.startTime);
        }
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as LayoutShiftEntry;
          if (!layoutShift.hadRecentInput) {
            console.log('CLS:', layoutShift.value);
          }
        }
      }).observe({ entryTypes: ['layout-shift'] });
    };

    // Track when page is fully loaded
    if (document.readyState === 'complete') {
      trackWebVitals();
    } else {
      window.addEventListener('load', trackWebVitals);
    }
  }
}

// SEO component for structured data
export function SEOStructuredData({ data }: { data: StructuredData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const seoExports = {
  SEO_CONFIG,
  generateMetadata,
  generateProductStructuredData,
  generateOrganizationStructuredData,
  generateBreadcrumbStructuredData,
  generateFAQStructuredData,
  generateSitemapData,
  generateRobotsTxt,
  generateSEOFriendlyUrl,
  generateMetaTags,
  trackSEOMetrics,
  SEOStructuredData
};
export default seoExports;
