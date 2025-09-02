'use client';

import { useState, useEffect } from 'react';
import { WooProduct, WooProductQuery } from '@/types/woocommerce';
import { wooCommerceService } from '@/services/woocommerce';
import KingProductCard from './king-product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search, Filter, Grid3X3, List, SlidersHorizontal } from 'lucide-react';

interface KingProductGridProps {
  categoryId?: number;
  featured?: boolean;
  onSale?: boolean;
  searchTerm?: string;
  initialProducts?: WooProduct[];
  showFilters?: boolean;
  showPagination?: boolean;
  gridCols?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: 'default' | 'compact' | 'featured';
}

export default function KingProductGrid({
  categoryId,
  featured = false,
  onSale = false,
  searchTerm = '',
  initialProducts,
  showFilters = true,
  showPagination = true,
  gridCols = 4,
  variant = 'default'
}: KingProductGridProps) {
  const [products, setProducts] = useState<WooProduct[]>(initialProducts || []);
  const [loading, setLoading] = useState(!initialProducts);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });

  // Grid columns configuration
  const gridColsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
    6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6'
  };

  // Fetch products
  const fetchProducts = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const query: WooProductQuery = {
        page,
        per_page: 12,
        status: 'publish',
        orderby: sortBy,
        order: sortOrder,
      };

      // Add filters
      if (categoryId) {
        query.category = categoryId.toString();
      }
      if (featured) {
        query.featured = true;
      }
      if (onSale) {
        query.on_sale = true;
      }
      if (searchTerm) {
        query.search = searchTerm;
      }
      if (priceRange.min) {
        query.min_price = priceRange.min;
      }
      if (priceRange.max) {
        query.max_price = priceRange.max;
      }

      const response = await wooCommerceService.getProducts(query);
      
      setProducts(response.data);
      setTotalPages(response.totalPages);
      setTotalProducts(response.total);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas ładowania produktów');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!initialProducts) {
      fetchProducts();
    }
  }, [categoryId, featured, onSale, searchTerm, sortBy, sortOrder, priceRange.min, priceRange.max]);

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    const [field, order] = value.split('-');
    setSortBy(field);
    setSortOrder(order as 'asc' | 'desc');
  };

  // Handle price range change
  const handlePriceRangeChange = (type: 'min' | 'max', value: string) => {
    setPriceRange(prev => ({ ...prev, [type]: value }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchProducts(page);
  };

  // Render loading state
  if (loading && !products.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Ładowanie produktów...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !products.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => fetchProducts()} variant="outline">
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj produktów..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sortuj według" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Najnowsze</SelectItem>
                  <SelectItem value="date-asc">Najstarsze</SelectItem>
                  <SelectItem value="price-asc">Cena: od najniższej</SelectItem>
                  <SelectItem value="price-desc">Cena: od najwyższej</SelectItem>
                  <SelectItem value="name-asc">Nazwa: A-Z</SelectItem>
                  <SelectItem value="name-desc">Nazwa: Z-A</SelectItem>
                  <SelectItem value="popularity-desc">Popularność</SelectItem>
                  <SelectItem value="rating-desc">Ocena</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Cena:</span>
              <Input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                className="w-20"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">zł</span>
            </div>
          </div>
        </Card>
      )}

      {/* Products Grid */}
      {products.length > 0 ? (
        <>
          <div className={`grid gap-6 ${viewMode === 'list' ? 'grid-cols-1' : gridColsClasses[gridCols]}`}>
            {products.map((product) => (
              <KingProductCard
                key={product.id}
                product={product}
                variant={variant}
                showActions={true}
              />
            ))}
          </div>

          {/* Pagination */}
          {showPagination && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Poprzednia
              </Button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Następna
              </Button>
            </div>
          )}

          {/* Results Info */}
          <div className="text-center text-sm text-muted-foreground">
            Pokazano {products.length} z {totalProducts} produktów
            {totalPages > 1 && ` (strona ${currentPage} z ${totalPages})`}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">Nie znaleziono produktów</p>
          <p className="text-muted-foreground">Spróbuj zmienić filtry lub wyszukiwanie</p>
        </div>
      )}
    </div>
  );
}
