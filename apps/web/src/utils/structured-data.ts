/**
 * Structured Data (JSON-LD) utilities for SEO
 */

export interface ProductStructuredData {
  name: string;
  description: string;
  image: string[];
  brand: {
    name: string;
  };
  offers: {
    price: string;
    priceCurrency: string;
    availability: string;
    url: string;
  };
  sku?: string;
  gtin?: string;
  category?: string;
}

export interface OrganizationStructuredData {
  name: string;
  url: string;
  logo: string;
  description: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressCountry: string;
  };
  contactPoint: {
    telephone: string;
    contactType: string;
    email: string;
  };
  sameAs: string[];
}

export interface BreadcrumbStructuredData {
  itemListElement: Array<{
    position: number;
    name: string;
    item: string;
  }>;
}

export interface FAQStructuredData {
  mainEntity: Array<{
    name: string;
    acceptedAnswer: {
      text: string;
    };
  }>;
}

/**
 * Generate Product JSON-LD
 */
export function generateProductStructuredData(product: ProductStructuredData): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    brand: {
      "@type": "Brand",
      name: product.brand.name
    },
    offers: {
      "@type": "Offer",
      price: product.offers.price,
      priceCurrency: product.offers.priceCurrency,
      availability: product.offers.availability,
      url: product.offers.url
    },
    ...(product.sku && { sku: product.sku }),
    ...(product.gtin && { gtin: product.gtin }),
    ...(product.category && { category: product.category })
  };
}

/**
 * Generate Organization JSON-LD
 */
export function generateOrganizationStructuredData(org: OrganizationStructuredData): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    url: org.url,
    logo: org.logo,
    description: org.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: org.address.streetAddress,
      addressLocality: org.address.addressLocality,
      postalCode: org.address.postalCode,
      addressCountry: org.address.addressCountry
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: org.contactPoint.telephone,
      contactType: org.contactPoint.contactType,
      email: org.contactPoint.email
    },
    sameAs: org.sameAs
  };
}

/**
 * Generate Breadcrumb JSON-LD
 */
export function generateBreadcrumbStructuredData(breadcrumb: BreadcrumbStructuredData): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumb.itemListElement.map(item => ({
      "@type": "ListItem",
      position: item.position,
      name: item.name,
      item: item.item
    }))
  };
}

/**
 * Generate FAQ JSON-LD
 */
export function generateFAQStructuredData(faq: FAQStructuredData): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.mainEntity.map(item => ({
      "@type": "Question",
      name: item.name,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.acceptedAnswer.text
      }
    }))
  };
}

/**
 * Generate Website JSON-LD
 */
export function generateWebsiteStructuredData(siteUrl: string, siteName: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/wyszukiwanie?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
}

/**
 * Generate LocalBusiness JSON-LD
 */
export function generateLocalBusinessStructuredData(business: {
  name: string;
  description: string;
  url: string;
  telephone: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressCountry: string;
  };
  openingHours: string[];
  priceRange: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.description,
    url: business.url,
    telephone: business.telephone,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.streetAddress,
      addressLocality: business.address.addressLocality,
      postalCode: business.address.postalCode,
      addressCountry: business.address.addressCountry
    },
    openingHours: business.openingHours,
    priceRange: business.priceRange
  };
}

/**
 * Generate WebPage JSON-LD
 */
export function generateWebPageStructuredData(page: {
  name: string;
  description: string;
  url: string;
  isPartOf: string;
  breadcrumb?: BreadcrumbStructuredData;
  mainEntity?: any;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.name,
    description: page.description,
    url: page.url,
    isPartOf: {
      "@type": "WebSite",
      name: "FILLER",
      url: page.isPartOf
    },
    ...(page.breadcrumb && { breadcrumb: generateBreadcrumbStructuredData(page.breadcrumb) }),
    ...(page.mainEntity && { mainEntity: page.mainEntity })
  };
}

/**
 * Convert structured data to JSON-LD script tag
 */
export function structuredDataToScript(data: object): string {
  return `<script type="application/ld+json">${JSON.stringify(data, null, 2)}</script>`;
}

/**
 * Default organization data for FILLER
 */
export const DEFAULT_ORGANIZATION: OrganizationStructuredData = {
  name: "FILLER",
  url: "https://filler.pl",
  logo: "https://filler.pl/logo.png",
  description: "Hurtownia Medycyny Estetycznej - TOP Produkty",
  address: {
    streetAddress: "ul. Przykładowa 123",
    addressLocality: "Warszawa",
    postalCode: "00-000",
    addressCountry: "PL"
  },
  contactPoint: {
    telephone: "+48 123 456 789",
    contactType: "customer service",
    email: "kontakt@filler.pl"
  },
  sameAs: [
    "https://www.facebook.com/filler",
    "https://www.instagram.com/filler",
    "https://www.linkedin.com/company/filler"
  ]
};
