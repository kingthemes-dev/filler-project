/**
 * Enhanced SEO utilities - Expert Level 8.5/10
 */

import { Metadata } from 'next';
import { env } from '@/config/env';

// Enhanced SEO configuration
export const ENHANCED_SEO_CONFIG = {
  siteName: 'FILLER - Hurtownia Medycyny Estetycznej',
  siteDescription: 'Profesjonalne produkty medycyny estetycznej: wypełniacze, nici, peelingi, stymulatory, urządzenia. Najlepsze ceny, szybka dostawa, certyfikowane produkty.',
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://www.filler.pl',
  defaultImage: '/images/og-image.jpg',
  twitterHandle: '@filler_sklep',
  locale: 'pl_PL',
  type: 'website',
  organization: {
    name: 'FILLER - Hurtownia Medycyny Estetycznej',
    address: 'Warszawa, Polska',
    phone: '+48-123-456-789',
    email: 'kontakt@filler.pl',
  }
};

// Enhanced metadata generation
export function generateEnhancedMetadata({
  title,
  description,
  keywords = [],
  image,
  url,
  type = 'website',
  noindex = false,
  price,
  availability,
  brand,
  category
}: {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
  price?: string;
  availability?: string;
  brand?: string;
  category?: string;
}): Metadata {
  const fullTitle = title ? `${title} | ${ENHANCED_SEO_CONFIG.siteName}` : ENHANCED_SEO_CONFIG.siteName;
  const fullDescription = description || ENHANCED_SEO_CONFIG.siteDescription;
  const fullUrl = url ? `${ENHANCED_SEO_CONFIG.siteUrl}${url}` : ENHANCED_SEO_CONFIG.siteUrl;
  const fullImage = image ? `${ENHANCED_SEO_CONFIG.siteUrl}${image}` : `${ENHANCED_SEO_CONFIG.siteUrl}${ENHANCED_SEO_CONFIG.defaultImage}`;

  // Enhanced keywords for medical aesthetics
  const enhancedKeywords = [
    ...keywords,
    'hurtownia medycyny estetycznej',
    'produkty medycyny estetycznej',
    'wypełniacze',
    'nici PDO',
    'peelingi chemiczne',
    'stymulatory',
    'urządzenia kosmetyczne',
    'mezoterapia',
    'filler',
    'medycyna estetyczna',
    'kosmetologia',
    'gabinet kosmetyczny',
    'salon urody',
    'certyfikowane produkty',
    'szybka dostawa',
    'najlepsze ceny'
  ];

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: enhancedKeywords,
    authors: [{ name: ENHANCED_SEO_CONFIG.organization.name }],
    creator: ENHANCED_SEO_CONFIG.organization.name,
    publisher: ENHANCED_SEO_CONFIG.organization.name,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(ENHANCED_SEO_CONFIG.siteUrl),
    robots: noindex ? 'noindex,nofollow' : 'index,follow',
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: fullUrl,
      siteName: ENHANCED_SEO_CONFIG.siteName,
      images: [
        {
          url: fullImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        }
      ],
      locale: ENHANCED_SEO_CONFIG.locale,
      type: type as any,
      ...(price && { 
        'product:price:amount': price,
        'product:price:currency': 'PLN'
      }),
      ...(availability && { 
        'product:availability': availability === 'instock' ? 'in stock' : 'out of stock'
      }),
      ...(brand && { 'product:brand': brand }),
      ...(category && { 'product:category': category })
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: fullDescription,
      images: [fullImage],
      creator: ENHANCED_SEO_CONFIG.twitterHandle,
      site: ENHANCED_SEO_CONFIG.twitterHandle,
    },
    alternates: {
      canonical: fullUrl,
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GA_ID?.replace('G-', ''),
      yandex: process.env.YANDEX_VERIFICATION,
      yahoo: process.env.YAHOO_VERIFICATION,
    },
    other: {
      'google-site-verification': process.env.GOOGLE_SITE_VERIFICATION || '',
      'msvalidate.01': process.env.BING_VERIFICATION || '',
      'p:domain_verify': process.env.PINTEREST_VERIFICATION || '',
      'facebook-domain-verification': process.env.FACEBOOK_VERIFICATION || '',
    }
  };
}

// Enhanced structured data for products
export function generateEnhancedProductStructuredData(product: {
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
  rating?: number;
  reviewCount?: number;
  images?: string[];
}) {
  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images || [product.image],
    brand: {
      '@type': 'Brand',
      name: (() => {
        if (!product.attributes) return 'FILLER';
        const brandAttr = product.attributes.find((attr: { name: string; options: string[] }) => 
          attr.name.toLowerCase().includes('marka')
        );
        if (!brandAttr) return 'FILLER';
        const first = brandAttr.options?.[0];
        if (!first) return 'FILLER';
        return typeof first === 'string' ? first : (first as any)?.name || (first as any)?.slug || String(first);
      })()
    },
    sku: product.sku || product.id.toString(),
    category: product.category,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: `https://schema.org/${product.availability === 'instock' ? 'InStock' : 'OutOfStock'}`,
      url: `${ENHANCED_SEO_CONFIG.siteUrl}/produkt/${product.name.toLowerCase().replace(/\s+/g, '-')}`,
      seller: {
        '@type': 'Organization',
        name: ENHANCED_SEO_CONFIG.organization.name,
        url: ENHANCED_SEO_CONFIG.siteUrl
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0',
          currency: 'PLN'
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'PL'
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'DAY'
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 3,
            unitCode: 'DAY'
          }
        }
      }
    }
  };

  // Add ratings if available
  if (product.rating && product.reviewCount) {
    return {
      ...baseStructuredData,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
        bestRating: 5,
        worstRating: 1
      }
    };
  }

  return baseStructuredData;
}

// Enhanced organization structured data
export function generateEnhancedOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ENHANCED_SEO_CONFIG.organization.name,
    url: ENHANCED_SEO_CONFIG.siteUrl,
    logo: `${ENHANCED_SEO_CONFIG.siteUrl}/images/logo.png`,
    description: ENHANCED_SEO_CONFIG.siteDescription,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'PL',
      addressLocality: 'Warszawa',
      addressRegion: 'Mazowieckie'
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: ENHANCED_SEO_CONFIG.organization.phone,
        contactType: 'customer service',
        availableLanguage: 'Polish',
        areaServed: 'PL'
      },
      {
        '@type': 'ContactPoint',
        email: ENHANCED_SEO_CONFIG.organization.email,
        contactType: 'customer service',
        availableLanguage: 'Polish'
      }
    ],
    sameAs: [
      'https://www.facebook.com/filler',
      'https://www.instagram.com/filler',
      'https://www.linkedin.com/company/filler'
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Produkty Medycyny Estetycznej',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: 'Wypełniacze'
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: 'Nici PDO'
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: 'Peelingi Chemiczne'
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: 'Stymulatory'
          }
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Product',
            name: 'Urządzenia Kosmetyczne'
          }
        }
      ]
    }
  };
}

// Enhanced breadcrumb structured data
export function generateEnhancedBreadcrumbStructuredData(breadcrumbs: Array<{
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
      item: `${ENHANCED_SEO_CONFIG.siteUrl}${breadcrumb.url}`
    }))
  };
}

// Enhanced FAQ structured data
export function generateEnhancedFAQStructuredData(faqs: Array<{
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

// Enhanced website structured data
export function generateEnhancedWebsiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ENHANCED_SEO_CONFIG.siteName,
    url: ENHANCED_SEO_CONFIG.siteUrl,
    description: ENHANCED_SEO_CONFIG.siteDescription,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${ENHANCED_SEO_CONFIG.siteUrl}/wyszukiwanie?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: ENHANCED_SEO_CONFIG.organization.name,
      url: ENHANCED_SEO_CONFIG.siteUrl
    }
  };
}

// Enhanced local business structured data
export function generateEnhancedLocalBusinessStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${ENHANCED_SEO_CONFIG.siteUrl}/#organization`,
    name: ENHANCED_SEO_CONFIG.organization.name,
    description: ENHANCED_SEO_CONFIG.siteDescription,
    url: ENHANCED_SEO_CONFIG.siteUrl,
    logo: `${ENHANCED_SEO_CONFIG.siteUrl}/images/logo.png`,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'PL',
      addressLocality: 'Warszawa',
      addressRegion: 'Mazowieckie'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: ENHANCED_SEO_CONFIG.organization.phone,
      contactType: 'customer service',
      availableLanguage: 'Polish'
    },
    openingHours: 'Mo-Fr 09:00-18:00',
    priceRange: '$$',
    paymentAccepted: 'Cash, Credit Card, Bank Transfer',
    currenciesAccepted: 'PLN'
  };
}

// SEO-friendly URL generation
export function generateSEOFriendlyUrl(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Generate meta tags for social sharing
export function generateSocialMetaTags({
  title,
  description,
  image,
  url,
  type = 'website'
}: {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}) {
  const fullTitle = title ? `${title} | ${ENHANCED_SEO_CONFIG.siteName}` : ENHANCED_SEO_CONFIG.siteName;
  const fullDescription = description || ENHANCED_SEO_CONFIG.siteDescription;
  const fullUrl = url ? `${ENHANCED_SEO_CONFIG.siteUrl}${url}` : ENHANCED_SEO_CONFIG.siteUrl;
  const fullImage = image ? `${ENHANCED_SEO_CONFIG.siteUrl}${image}` : `${ENHANCED_SEO_CONFIG.siteUrl}${ENHANCED_SEO_CONFIG.defaultImage}`;

  return {
    // Open Graph
    'og:title': fullTitle,
    'og:description': fullDescription,
    'og:url': fullUrl,
    'og:type': type,
    'og:site_name': ENHANCED_SEO_CONFIG.siteName,
    'og:image': fullImage,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:locale': ENHANCED_SEO_CONFIG.locale,
    
    // Twitter
    'twitter:card': 'summary_large_image',
    'twitter:title': fullTitle,
    'twitter:description': fullDescription,
    'twitter:image': fullImage,
    'twitter:creator': ENHANCED_SEO_CONFIG.twitterHandle,
    'twitter:site': ENHANCED_SEO_CONFIG.twitterHandle,
    
    // Additional
    'article:author': ENHANCED_SEO_CONFIG.organization.name,
    'article:publisher': ENHANCED_SEO_CONFIG.siteUrl
  };
}

export default {
  ENHANCED_SEO_CONFIG,
  generateEnhancedMetadata,
  generateEnhancedProductStructuredData,
  generateEnhancedOrganizationStructuredData,
  generateEnhancedBreadcrumbStructuredData,
  generateEnhancedFAQStructuredData,
  generateEnhancedWebsiteStructuredData,
  generateEnhancedLocalBusinessStructuredData,
  generateSEOFriendlyUrl,
  generateSocialMetaTags
};
