'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import KingProductCard from '@/components/king-product-card';
import ShopFilters from '@/components/ui/shop-filters';
import wooSearchService, { WooSearchProduct } from '@/services/woocommerce-search';
import wooCommerceService from '@/services/woocommerce-optimized';
import { formatPrice } from '@/utils/format-price';
import { useCartStore } from '@/stores/cart-store';
import Link from 'next/link';

interface FilterState {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  onSale: boolean;
  featured: boolean;
  sortBy: string;
  sortOrder: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [products, setProducts] = useState<WooSearchProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  const productsPerPage = 9;
  
  // Cart store
  const { addItem } = useCartStore();
  
  const [filters, setFilters] = useState<FilterState>({
    search: query,
    category: '',
    minPrice: 0,
    maxPrice: 10000,
    inStock: false,
    onSale: false,
    featured: false,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch products when query or filters change
  useEffect(() => {
    if (query) {
      fetchProducts();
    }
  }, [query, filters, currentPage]);

  const fetchCategories = async () => {
    try {
      const response = await wooCommerceService.getCategories();
      const realCategories = response.data || [];

      const allCategories = realCategories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        count: cat.count || 0
      }));

      // Sortuj kategorie - "Wszystkie kategorie" na początku
      const sortedCategories = allCategories.sort((a, b) => {
        if (a.name === 'Wszystkie kategorie') return -1;
        if (b.name === 'Wszystkie kategorie') return 1;
        return a.name.localeCompare(b.name);
      });

      setCategories(sortedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await wooSearchService.searchProducts(query, 20);
      setProducts(response.products || []);
      setTotalProducts(response.total || 0);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: query,
      category: '',
      minPrice: 0,
      maxPrice: 10000,
      inStock: false,
      onSale: false,
      featured: false,
      sortBy: 'date',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  if (!query) {
    return (
      <div className="bg-white">
        <div className="max-w-[95vw] mx-auto px-6 py-8">
          <div className="text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Wprowadź wyszukiwanie
            </h1>
            <p className="text-gray-600">
              Użyj wyszukiwarki w górnej części strony, aby znaleźć produkty
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Search Header */}
      <div className="bg-gray-50 py-8 mx-6 rounded-3xl">
        <div className="max-w-[95vw] mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Wyniki wyszukiwania dla "{query}"
            </h1>
            <p className="text-lg text-gray-600">
              Znaleziono {totalProducts} produktów
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[95vw] mx-auto px-6 py-8">
        {/* Mobile Filter Toggle Button */}
        <div className="lg:hidden flex justify-end mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-gray-100 rounded-full text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtry
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-80">
            <ShopFilters
              categories={categories}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              totalProducts={totalProducts}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Results Info */}
            <div className="mb-6">
              <p className="text-gray-600">
                Znaleziono <span className="font-semibold">{totalProducts}</span> produktów
                {filters.category && ` w kategorii "${categories.find(c => c.id.toString() === filters.category)?.name || filters.category}"`}
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* No Results */}
            {!loading && products.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nie znaleziono produktów
                </h3>
                <p className="text-gray-600">
                  Spróbuj zmienić kryteria wyszukiwania lub filtry
                </p>
              </div>
            )}

            {/* Results Grid */}
            {!loading && products.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <KingProductCard
                    key={product.id}
                    product={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      regular_price: product.regular_price,
                      sale_price: product.sale_price,
                      images: product.images || [],
                      permalink: product.permalink,
                      slug: product.slug,
                      stock_status: product.stock_status,
                      average_rating: product.average_rating,
                      rating_count: product.rating_count,
                      categories: product.categories || []
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ładowanie...</p>
        </div>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}