import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopBar from '@/components/ui/top-bar';
import Header from '@/components/ui/header';
import Footer from '@/components/ui/footer';
import CartDrawer from '@/components/ui/cart-drawer';
import AuthModalManager from '@/components/ui/auth/auth-modal-manager';
import FavoritesModal from '@/components/ui/favorites-modal';
import ErrorBoundary from '@/components/error-boundary';
import ReactQueryProvider from './providers/react-query-provider';


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  fallback: ['system-ui', 'arial'],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Hurtownia Medycyny Estetycznej - TOP Produkty - FILLER",
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
    title: "Hurtownia Medycyny Estetycznej - TOP Produkty - FILLER",
    description: "Filler to miejsce gdzie znajdziesz profesjonalne produkty medycyny estetycznej. Najlepsze ceny. Sprawdź nas.",
    type: "website",
    locale: "pl_PL",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hurtownia Medycyny Estetycznej - TOP Produkty - FILLER",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="pl" data-scroll-behavior="smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Cookiebot */}
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="fa168711-f44f-4971-91cf-f37e7337d834"
          data-blockingmode="auto"
          strategy="beforeInteractive"
        />
        {/* Google Tag Manager */}
        <Script id="gtm" strategy="afterInteractive" dangerouslySetInnerHTML={{__html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-TJSTQLNM');
        `}} />
        {/* Preconnect to WordPress for faster API calls */}
        <link rel="preconnect" href="https://qvwltjhdjw.cfolks.pl" crossOrigin="" />
        <link rel="dns-prefetch" href="https://qvwltjhdjw.cfolks.pl" />
        {/* Preload hero image for faster LCP - highest priority */}
        <link rel="preload" as="image" href="/images/hero/home.webp" type="image/webp" fetchPriority="high" imageSrcSet="/images/hero/home.webp 1920w" imageSizes="100vw" />
        {/* Preload critical CSS inline */}
        <style dangerouslySetInnerHTML={{__html: `
          .text-white{color:#fff}
          .font-bold{font-weight:700}
          .leading-tight{line-height:1.25}
          @font-face{font-family:'Geist';font-style:normal;font-weight:400;font-display:swap;src:local('Geist')}
        `}} />
      </head>
                        <body
                    className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
                    suppressHydrationWarning={true}
                  >
                        {/* Google Tag Manager (noscript) */}
                        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TJSTQLNM" height="0" width="0" style={{display:'none',visibility:'hidden'}}></iframe></noscript>
                        <ErrorBoundary>
                          <TopBar />
                          <Header />
                          <ReactQueryProvider>
                            <main>
                              {children}
                            </main>
                          </ReactQueryProvider>
                          <AuthModalManager />
                          <FavoritesModal />
                          <Footer />
                          <CartDrawer />
                        </ErrorBoundary>
              </body>
            </html>
          );
}
