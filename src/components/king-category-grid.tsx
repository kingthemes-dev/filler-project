'use client';

import { useState, useEffect } from 'react';
import { WooCategory } from '@/types/woocommerce';
import { wooCommerceService } from '@/services/woocommerce';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronRight, FolderOpen } from 'lucide-react';
import Link from 'next/link';

interface KingCategoryGridProps {
  parentId?: number;
  showEmpty?: boolean;
  limit?: number;
  gridCols?: 2 | 3 | 4 | 5 | 6;
  variant?: 'default' | 'compact' | 'featured';
}

export default function KingCategoryGrid({
  parentId,
  showEmpty = false,
  limit,
  gridCols = 4,
  variant = 'default'
}: KingCategoryGridProps) {
  const [categories, setCategories] = useState<WooCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grid columns configuration
  const gridColsClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6'
  };

  // Fetch categories
  const fetchCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const query: any = {
        hide_empty: !showEmpty,
        orderby: 'menu_order',
        order: 'asc',
      };

      if (parentId) {
        query.parent = parentId;
      }

      if (limit) {
        query.per_page = limit;
      }

      const data = await wooCommerceService.getCategories(query);
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania kategorii');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [parentId, showEmpty, limit]);

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Ładowanie kategorii...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchCategories} variant="outline">
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render empty state
  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground text-lg">Brak kategorii</p>
        <p className="text-muted-foreground">Nie znaleziono żadnych kategorii produktów</p>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`grid gap-3 ${gridColsClasses[gridCols]}`}>
        {categories.map((category) => (
          <Link key={category.id} href={`/kategoria/${category.slug}`}>
            <Card className="group hover:shadow-md transition-all duration-200 border-border/50 cursor-pointer">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground truncate">
                      {category.name}
                    </h3>
                    {category.count > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {category.count} produktów
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  // Featured variant
  if (variant === 'featured') {
    return (
      <div className={`grid gap-6 ${gridColsClasses[gridCols]}`}>
        {categories.map((category) => (
          <Link key={category.id} href={`/kategoria/${category.slug}`}>
            <Card className="group hover:shadow-xl transition-all duration-300 border-border/50 cursor-pointer bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="p-4 pb-0">
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted/30">
                  {category.image ? (
                    <img
                      src={category.image.src}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-3">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg text-foreground line-clamp-2 flex-1">
                    {category.name}
                  </h3>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2" />
                </div>
                
                {category.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {category.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  {category.count > 0 ? (
                    <Badge variant="secondary" className="text-xs">
                      {category.count} produktów
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Brak produktów
                    </Badge>
                  )}
                  
                  <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    Zobacz produkty
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`grid gap-4 ${gridColsClasses[gridCols]}`}>
      {categories.map((category) => (
        <Link key={category.id} href={`/kategoria/${category.slug}`}>
          <Card className="group hover:shadow-lg transition-all duration-200 border-border/50 cursor-pointer">
            <CardHeader className="p-4 pb-0">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-muted/30">
                {category.image ? (
                  <img
                    src={category.image.src}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-foreground line-clamp-2 flex-1">
                  {category.name}
                </h3>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2" />
              </div>
              
              {category.count > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  {category.count} produktów
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Brak produktów
                </Badge>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
