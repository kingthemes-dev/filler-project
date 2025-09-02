import { Suspense } from 'react';
import Image from 'next/image';
import KingProductTabs from '@/components/king-product-tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[450px] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero/home.webp"
            alt="Filler - hurtownia medycyny estetycznej"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center flex flex-col items-center justify-center h-full">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-6">
            <span className="text-primary">Filler</span> - hurtownia medycyny estetycznej
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Profesjonalne produkty do medycyny estetycznej, mezoterapii i zabiegów kosmetycznych. 
            Najwyższa jakość, certyfikowane preparaty, kompleksowa obsługa.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-white">
              <Link href="/sklep">
                Zobacz produkty
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="border-white text-white hover:bg-white hover:text-black">
              <Link href="/kontakt">
                Skontaktuj się z nami
              </Link>
            </Button>
          </div>
        </div>
      </section>



      {/* Product Tabs */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Suspense fallback={
            <div className="space-y-8">
              {/* Tabs skeleton */}
              <div className="flex items-center justify-between">
                <div className="flex gap-8">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 w-20 bg-muted rounded animate-pulse" />
                  ))}
                </div>
                <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              </div>
              {/* Products skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-0">
                      <div className="aspect-square bg-muted rounded-lg" />
                    </CardHeader>
                    <CardContent className="pt-3">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          }>
            <KingProductTabs />
          </Suspense>
        </div>
      </section>



      {/* Newsletter Section */}
      <section className="relative py-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero/newslettter.webp"
            alt="Newsletter - bądź na bieżąco"
            fill
            className="object-cover object-center"
            sizes="100vw"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Zapisz się i odbierz 10% zniżki na pierwsze zakupy
          </h2>
          <p className="text-white/90 mb-8 max-w-2xl mx-auto">
            Zapisz się do naszego newslettera i otrzymuj informacje o nowych produktach i promocjach
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Twój adres email"
              className="flex-1 px-4 py-3 border border-white/30 rounded-lg bg-white/90 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
            />
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white border-2 border-white h-12">
              Zapisz się
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Quality */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center group-hover:border-black transition-colors duration-300">
                  <Star className="w-8 h-8 text-gray-600 group-hover:text-black transition-colors duration-300" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Najwyższa jakość
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Wszystkie nasze produkty przechodzą rygorystyczną kontrolę jakości
              </p>
            </div>
            
            {/* Delivery */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center group-hover:border-black transition-colors duration-300">
                  <TrendingUp className="w-8 h-8 text-gray-600 group-hover:text-black transition-colors duration-300" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Szybka dostawa
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Gwarantujemy szybką i bezpieczną dostawę do Twojego domu
              </p>
            </div>
            
            {/* Support */}
            <div className="text-center group">
              <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-gray-300 rounded-full flex items-center justify-center group-hover:border-black transition-colors duration-300">
                  <Zap className="w-8 h-8 text-gray-600 group-hover:text-black transition-colors duration-300" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Obsługa 24/7
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Nasz zespół jest dostępny 24/7, aby Ci pomóc
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
