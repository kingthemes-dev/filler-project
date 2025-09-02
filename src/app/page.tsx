import { Suspense } from 'react';
import KingProductGrid from '@/components/king-product-grid';
import KingCategoryGrid from '@/components/king-category-grid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Star, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-background via-muted/20 to-background py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Witaj w <span className="text-primary">King Store</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Odkryj nasze ekskluzywne produkty w eleganckim, monochromatycznym designie
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/produkty">
                Zobacz produkty
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/kategorie">
                Przeglądaj kategorie
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Popularne kategorie
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Odkryj nasze najpopularniejsze kategorie produktów
            </p>
          </div>
          
          <Suspense fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
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
          }>
            <KingCategoryGrid 
              variant="featured" 
              gridCols={4} 
              limit={4}
            />
          </Suspense>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Polecane produkty
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sprawdź nasze najpopularniejsze i najlepiej oceniane produkty
            </p>
          </div>
          
          <Suspense fallback={
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
          }>
            <KingProductGrid 
              featured={true} 
              variant="featured"
              gridCols={4}
              showFilters={false}
              showPagination={false}
            />
          </Suspense>
          
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" asChild>
              <Link href="/produkty?featured=true">
                Zobacz wszystkie polecane
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* On Sale Products */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="w-8 h-8 text-primary" />
              <h2 className="text-3xl font-bold text-foreground">
                Promocje i wyprzedaże
              </h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nie przegap okazji! Sprawdź nasze produkty w atrakcyjnych cenach
            </p>
          </div>
          
          <Suspense fallback={
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
          }>
            <KingProductGrid 
              onSale={true} 
              variant="default"
              gridCols={4}
              showFilters={false}
              showPagination={false}
            />
          </Suspense>
          
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" asChild>
              <Link href="/produkty?on_sale=true">
                Zobacz wszystkie promocje
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Dlaczego warto wybrać nasz sklep?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Oferujemy najlepsze produkty z najwyższą jakością obsługi
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl mb-3">Najwyższa jakość</CardTitle>
              <p className="text-muted-foreground">
                Wszystkie nasze produkty przechodzą rygorystyczną kontrolę jakości
              </p>
            </Card>
            
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl mb-3">Szybka dostawa</CardTitle>
              <p className="text-muted-foreground">
                Gwarantujemy szybką i bezpieczną dostawę do Twojego domu
              </p>
            </Card>
            
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl mb-3">Obsługa 24/7</CardTitle>
              <p className="text-muted-foreground">
                Nasz zespół jest dostępny 24/7, aby Ci pomóc
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Bądź na bieżąco
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Zapisz się do naszego newslettera i otrzymuj informacje o nowych produktach i promocjach
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Twój adres email"
              className="flex-1 px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button size="lg">
              Zapisz się
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
