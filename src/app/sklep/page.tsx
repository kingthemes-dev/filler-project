'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import KingProductCard from '@/components/king-product-card';
import wooCommerceService from '@/services/woocommerce';
import { formatPrice } from '@/utils/format-price';

interface FilterState {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  onSale: boolean;
  featured: boolean;
  sortBy: 'date' | 'price' | 'name' | 'popularity';
  sortOrder: 'asc' | 'desc';
}

interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export default function ShopPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(9);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    minPrice: 0,
    maxPrice: 10000, // 1000 zł w groszach
    inStock: false,
    onSale: false,
    featured: false,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await wooCommerceService.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  // Fetch products with filters
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const query: any = {
        page: currentPage,
        per_page: productsPerPage,
        orderby: filters.sortBy,
        order: filters.sortOrder,
      };

      // Add filters
      if (filters.search) query.search = filters.search;
      if (filters.category) query.category = filters.category;
      if (filters.minPrice > 0) query.min_price = (filters.minPrice * 100).toString(); // Convert to grosze
      if (filters.maxPrice < 10000) query.max_price = (filters.maxPrice * 100).toString(); // Convert to grosze
      if (filters.inStock) query.stock_status = 'instock';
      if (filters.onSale) query.on_sale = true;
      if (filters.featured) query.featured = true;

      const response = await wooCommerceService.getProducts(query);
      setProducts(response.data || []);
      setTotalProducts(response.total || 0);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, productsPerPage]);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Fetch products when filters or page changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      minPrice: 0,
      maxPrice: 10000,
      inStock: false,
      onSale: false,
      featured: false,
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  const totalPages = Math.ceil(totalProducts / productsPerPage);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Sklep
          </h1>
          <p className="text-lg text-gray-600">
            Odkryj naszą kolekcję profesjonalnych produktów
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Szukaj produktów..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="date">Data</option>
                <option value="price">Cena</option>
                <option value="name">Nazwa</option>
                <option value="popularity">Popularność</option>
              </select>
              
              <button
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {filters.sortOrder === 'asc' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden px-4 py-3 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filtry
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <motion.div
            className={`lg:w-80 ${showFilters ? 'block' : 'hidden lg:block'}`}
            initial={false}
            animate={{ width: showFilters ? '100%' : 'auto' }}
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
              {/* Filters Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Filtry</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-600 hover:text-black transition-colors"
                  >
                    Wyczyść
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="lg:hidden p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Categories Filter */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Kategorie</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="category"
                      value=""
                      checked={filters.category === ''}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Wszystkie</span>
                  </label>
                  {categories.map((category) => (
                    <label key={category.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="category"
                          value={category.slug}
                          checked={filters.category === category.slug}
                          onChange={(e) => handleFilterChange('category', e.target.value)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{category.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">({category.count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Zakres cen</h4>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    Zakres: {filters.minPrice} zł - {filters.maxPrice} zł
                  </div>
                </div>
              </div>

              {/* Availability Filters */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Dostępność</h4>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.inStock}
                      onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">W magazynie</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.onSale}
                      onChange={(e) => handleFilterChange('onSale', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Promocje</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.featured}
                      onChange={(e) => handleFilterChange('featured', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Polecane</span>
                  </label>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Results Info */}
            <div className="mb-6">
              <p className="text-gray-600">
                Znaleziono <span className="font-semibold">{totalProducts}</span> produktów
                {filters.category && ` w kategorii "${categories.find(c => c.slug === filters.category)?.name}"`}
              </p>
            </div>

            {/* Products Grid */}
            {loading ? (
              // Loading skeleton
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              // Products grid
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <KingProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              // Empty state
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nie znaleziono produktów
                </h3>
                <p className="text-gray-600 mb-6">
                  Spróbuj zmienić filtry lub wyszukiwanie
                </p>
                <button
                  onClick={clearFilters}
                  className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Wyczyść filtry
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Poprzednia
                  </button>
                  
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    const isCurrent = page === currentPage;
                    const isNearCurrent = Math.abs(page - currentPage) <= 2;
                    
                    if (isCurrent || isNearCurrent || page === 1 || page === totalPages) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            isCurrent
                              ? 'bg-black text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === 2 || page === totalPages - 1) {
                      return <span key={page} className="px-2">...</span>;
                    }
                    return null;
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                  >
                    Następna
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
