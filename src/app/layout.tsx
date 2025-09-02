import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopBar from '@/components/ui/top-bar';
import Header from '@/components/ui/header';
import Footer from '@/components/ui/footer';
import CartDrawer from '@/components/ui/cart-drawer';
import AuthProvider from '@/components/ui/auth/auth-provider';
import AuthModalManager from '@/components/ui/auth/auth-modal-manager';
import EmailNotificationCenter from '@/components/ui/email/email-notification-center';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FILLER - Profesjonalne kosmetyki i urządzenia",
  description: "Sklep z profesjonalnymi kosmetykami koreańskimi, mezoterapią, nićmi, peelingami, stymulatorami, urządzeniami i wypełniaczami. Najwyższa jakość w najlepszych cenach.",
  keywords: ["kosmetyki koreańskie", "mezoterapia", "nici", "peelingi", "stymulatory", "urządzenia", "wypełniacz", "kosmetyki profesjonalne"],
  authors: [{ name: "FILLER Team" }],
  creator: "FILLER",
  publisher: "FILLER",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_WORDPRESS_URL || 'http://localhost:3000'),
  openGraph: {
    title: "FILLER - Profesjonalne kosmetyki i urządzenia",
    description: "Sklep z profesjonalnymi kosmetykami koreańskimi, mezoterapią, nićmi, peelingami, stymulatorami, urządzeniami i wypełniaczami.",
    type: "website",
    locale: "pl_PL",
  },
  twitter: {
    card: "summary_large_image",
    title: "FILLER - Profesjonalne kosmetyki i urządzenia",
    description: "Sklep z profesjonalnymi kosmetykami koreańskimi, mezoterapią, nićmi, peelingami, stymulatorami, urządzeniami i wypełniaczami.",
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
    <html lang="pl" className="scroll-smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
                        <body
                    className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
                  >
                    <TopBar />
                    <Header />
                    <main>
                      {children}
                    </main>
                    <Footer />
                    <CartDrawer />
                    <AuthProvider />
                    <AuthModalManager />
                    <EmailNotificationCenter />
              </body>
            </html>
          );
}
