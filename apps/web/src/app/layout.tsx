import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Header from '@/components/ui/header';
import DeferClientUI from '@/components/defer-client-ui';
import FreeShippingBanner from '@/components/ui/free-shipping-banner';
import { generateOrganizationStructuredData, generateWebsiteStructuredData, DEFAULT_ORGANIZATION } from '@/utils/structured-data';
import { initializeSearchConsoleAnalytics } from '@/utils/search-console-analytics';

// Expert Level 9.6/10 - Free Implementation
import { errorTracker, analytics, performanceMonitor } from '@headless-woo/shared';


const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  title: "FILLER: Hurtownia Medycyny Estetycznej Gdańsk, Gdynia, Pomorskie",
  description: "Filler to miejsce gdzie znajdziesz profesjonalne produkty medycyny estetycznej. Najlepsze ceny. Sprawdź nas.",
  keywords: ["hurtownia medycyny estetycznej", "produkty medycyny estetycznej", "filler", "kosmetyki profesjonalne", "mezoterapia", "nici", "peelingi", "stymulatory", "urządzenia", "wypełniacz"],
  authors: [{ name: "FILLER Team" }],
  creator: "FILLER",
  publisher: "FILLER",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_WORDPRESS_URL || 'http://localhost:3001'),
  openGraph: {
    title: "FILLER: Hurtownia Medycyny Estetycznej Gdańsk, Gdynia, Pomorskie",
    description: "Filler to miejsce gdzie znajdziesz profesjonalne produkty medycyny estetycznej. Najlepsze ceny. Sprawdź nas.",
    type: "website",
    locale: "pl_PL",
  },
  twitter: {
    card: "summary_large_image",
    title: "FILLER: Hurtownia Medycyny Estetycznej Gdańsk, Gdynia, Pomorskie",
    description: "Filler to miejsce gdzie znajdziesz profesjonalne produkty medycyny estetycznej. Najlepsze ceny. Sprawdź nas.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GA_ID?.replace('G-', ''),
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Filler.pl',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Changed from 1 to 5 for accessibility compliance (WCAG 2.1 AAA)
  userScalable: true, // Changed from false to true for accessibility
  themeColor: '#000000',
  // Fix for iPhone 14 Pro horizontal scroll
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Debug environment variables
  console.log('🔍 GTM ID:', process.env.NEXT_PUBLIC_GTM_ID);
  console.log('🔍 GA4 ID:', process.env.NEXT_PUBLIC_GA4_ID);

  return (
    <html lang="pl" data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Consent-gated loading for GTM/GA to reduce unused JS and improve LCP */}
        <Script id="consent-gated-analytics" strategy="afterInteractive" dangerouslySetInnerHTML={{__html: `
          try {
            var prefs = localStorage.getItem('cookie_preferences');
            var parsed = prefs ? JSON.parse(prefs) : null;
            var allowAnalytics = parsed && parsed.analytics;
            if (allowAnalytics) {
              // Load GTM
              ${process.env.NEXT_PUBLIC_GTM_ID ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id=${process.env.NEXT_PUBLIC_GTM_ID}'+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer');` : ''}

              // Load GA4
              ${(process.env.NEXT_PUBLIC_GA4_ID ? `
                var gaScript = document.createElement('script');
                gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA4_ID}';
                gaScript.async = true;document.head.appendChild(gaScript);
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);} 
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA4_ID}', { anonymize_ip: true });
              ` : '')}
            }
          } catch(e) { /* noop */ }
        `}} />
        {/* Preconnect to WordPress for faster API calls */}
        <link rel="preconnect" href="https://qvwltjhdjw.cfolks.pl" crossOrigin="" />
        <link rel="dns-prefetch" href="https://qvwltjhdjw.cfolks.pl" />
        {/* Preconnect to external services for better performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="" />
        <link rel="preconnect" href="https://www.google-analytics.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        {/* next/font Montserrat already in use; remove external CSS to avoid render-blocking */}
        {/* Preload hero image for faster LCP - highest priority (ensure correct file) */}
        <link rel="preload" as="image" href="/images/hero/hero-bg.webp" type="image/webp" fetchPriority="high" imageSrcSet="/images/hero/hero-bg.webp 1920w" imageSizes="100vw" />
        {/* Preload critical CSS inline */}
        <style dangerouslySetInnerHTML={{__html: `
          .text-white{color:#fff}
          .font-bold{font-weight:700}
          .leading-tight{line-height:1.25}
        `}} />
        {/* Structured Data - Organization */}
        <Script
          id="organization-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateOrganizationStructuredData(DEFAULT_ORGANIZATION))
          }}
        />
        {/* Structured Data - Website */}
        <Script
          id="website-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateWebsiteStructuredData(
              process.env.NEXT_PUBLIC_BASE_URL || 'https://filler.pl',
              'FILLER - Hurtownia Medycyny Estetycznej'
            ))
          }}
        />
      </head>
                        <body
                    className={`${montserrat.variable} antialiased bg-background text-foreground font-sans`}
                    suppressHydrationWarning={true}
                  >
                        {/* Google Tag Manager (noscript) */}
                        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TJSTQLNM" height="0" width="0" style={{display:'none',visibility:'hidden'}}></iframe></noscript>
                          {/* Place banner above header to avoid overlap */}
                          <FreeShippingBanner />
                          <Header />
                          <DeferClientUI>
                            {children}
                          </DeferClientUI>
                        
                        {/* PWA Service Worker Registration */}
                        <Script
                          id="pwa-sw-register"
                          strategy="afterInteractive"
                          dangerouslySetInnerHTML={{
                            __html: `
                              if ('serviceWorker' in navigator) {
                                window.addEventListener('load', function() {
                                  navigator.serviceWorker.register('/sw.js')
                                    .then(function(registration) {
                                      console.log('SW registered: ', registration);
                                    })
                                    .catch(function(registrationError) {
                                      console.log('SW registration failed: ', registrationError);
                                    });
                                });
                              }
                            `,
                          }}
                        />
                        
                        {/* PWA Install Prompt - idle callback to avoid impacting FCP */}
                        <Script
                          id="pwa-install-prompt"
                          strategy="afterInteractive"
                          dangerouslySetInnerHTML={{
                            __html: `requestIdleCallback?.(() => {
                              let deferredPrompt;
                              window.addEventListener('beforeinstallprompt', (e) => {
                                e.preventDefault();
                                deferredPrompt = e;
                              });
                            });`,
                          }}
                        />
                        
                        {/* Expert monitoring only if explicitly enabled via env */}
                        {process.env.NEXT_PUBLIC_EXPERT_MONITORING === 'true' && (
                          <Script
                            id="expert-monitoring-init"
                            strategy="afterInteractive"
                            dangerouslySetInnerHTML={{
                              __html: `requestIdleCallback?.(() => {
                                window.performanceMonitor?.getStats?.();
                              });`,
                            }}
                          />
                        )}
              </body>
            </html>
          );
}
