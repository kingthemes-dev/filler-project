'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, ChevronDown, ChevronUp, Grid3X3, List } from 'lucide-react';
import KingProductCard from '@/components/king-product-card';
import ShopFilters from '@/components/ui/shop-filters';
import CategoryTabs from '@/components/ui/category-tabs';
import wooCommerceService from '@/services/woocommerce-optimized';
import { formatPrice } from '@/utils/format-price';

interface FilterState {
  search: string;
  categories: string[];
  capacities: string[];
  brands: string[];
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
  const [capacities, setCapacities] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(9);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categories: [],
    capacities: [],
    brands: [],
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

  // Fetch attributes (capacities and brands)
  const fetchAttributes = useCallback(async () => {
    console.log('🚀 fetchAttributes called');
    setAttributesLoading(true);
    try {
      // Fetch attributes first
      const attributesResponse = await wooCommerceService.getProductAttributes();
      console.log('📋 Attributes response:', attributesResponse);
      console.log('📋 All attributes:', attributesResponse.map((attr: any) => ({ id: attr.id, name: attr.name, slug: attr.slug })));
      
      // Find capacity attribute
      const capacityAttr = attributesResponse.find((attr: any) => 
        attr.name.toLowerCase().includes('pojemność') || attr.slug === 'pa_pojemnosc'
      );
      
      // Find brand attribute  
      const brandAttr = attributesResponse.find((attr: any) => 
        attr.name.toLowerCase().includes('marka') || attr.slug === 'pa_marka'
      );

      console.log('🔍 Found capacity attr:', capacityAttr);
      console.log('🔍 Found brand attr:', brandAttr);

      // Fetch terms for capacity attribute
      if (capacityAttr) {
        try {
          console.log('📦 Fetching capacity terms for attr ID:', capacityAttr.id);
          const capacityTermsResponse = await fetch(`/api/woocommerce?endpoint=products/attributes/${capacityAttr.id}/terms`);
          const capacityTerms = await capacityTermsResponse.json();
          console.log('📦 Capacity terms:', capacityTerms);
          setCapacities(capacityTerms || []);
        } catch (error) {
          console.error('Error fetching capacity terms:', error);
        }
      }

      // Fetch terms for brand attribute
      if (brandAttr) {
        try {
          console.log('🏷️ Fetching brand terms for attr ID:', brandAttr.id);
          const brandTermsResponse = await fetch(`/api/woocommerce?endpoint=products/attributes/${brandAttr.id}/terms`);
          const brandTerms = await brandTermsResponse.json();
          console.log('🏷️ Brand terms:', brandTerms);
          setBrands(brandTerms || []);
        } catch (error) {
          console.error('Error fetching brand terms:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching attributes:', error);
    } finally {
      setAttributesLoading(false);
    }
  }, [wooCommerceService]);

  // Fetch products with filters
  const fetchProducts = useCallback(async () => {
    console.log('fetchProducts called', { 
      wooCommerceService: !!wooCommerceService, 
      filters, 
      currentPage,
      wooCommerceServiceType: typeof wooCommerceService
    });
    setLoading(true);
    try {
      if (!wooCommerceService) {
        console.error('wooCommerceService is not available');
        setProducts([]);
        setTotalProducts(0);
        setLoading(false);
        return;
      }
      
      const query: any = {
        page: currentPage,
        per_page: productsPerPage,
        orderby: filters.sortBy,
        order: filters.sortOrder,
      };

      // Add filters
      if (filters.search) query.search = filters.search;
      if (filters.categories.length > 0) query.category = filters.categories.join(',');
      // WooCommerce expects normal currency values as strings
      if (filters.minPrice > 0) query.min_price = String(filters.minPrice);
      if (filters.maxPrice < 10000) query.max_price = String(filters.maxPrice);
      if (filters.inStock) query.stock_status = 'instock';
      if (filters.onSale) query.on_sale = true;
      if (filters.featured) query.featured = true;
      
        // Add attribute filters - allow multiple attribute pairs
        const attrKeys: string[] = [];
        const attrTerms: string[] = [];
        if (filters.capacities.length > 0) {
          attrKeys.push('pa_pojemnosc');
          attrTerms.push(filters.capacities.join(',')); // term IDs
        }
        if (filters.brands.length > 0) {
          attrKeys.push('pa_marka');
          attrTerms.push(filters.brands.join(',')); // term IDs
        }
        if (attrKeys.length === 1) {
          // Send as simple scalar pair when only one attribute is used
          (query as any).attribute = attrKeys[0];
          (query as any).attribute_term = attrTerms[0];
        } else if (attrKeys.length > 1) {
          // Multiple attributes: send as parallel arrays
          (query as any).attribute = attrKeys;
          (query as any).attribute_term = attrTerms;
        }

      console.log('🔍 Query being sent:', query);
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
  }, [filters, currentPage, productsPerPage, wooCommerceService]);

  // Fetch categories and attributes on mount
  useEffect(() => {
    console.log('🔄 useEffect: fetching categories and attributes');
    console.log('🔄 wooCommerceService available:', !!wooCommerceService);
    fetchCategories();
    fetchAttributes();
  }, [fetchCategories, fetchAttributes]);

  // Debug: log when capacities and brands change
  useEffect(() => {
    console.log('📦 Capacities updated:', capacities);
  }, [capacities]);

  useEffect(() => {
    console.log('🏷️ Brands updated:', brands);
  }, [brands]);

  // Fetch products when filters or page changes
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    if (key === 'categories' || key === 'capacities' || key === 'brands') {
      // Handle array filters (checkboxes)
      setFilters(prev => {
        const currentArray = prev[key] as string[];
        const newArray = currentArray.includes(value) 
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value];
        return { ...prev, [key]: newArray };
      });
    } else {
      // Handle other filters
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setFilters(prev => {
      const currentCategories = prev.categories;
      
      if (categoryId === '') {
        // "Wszystkie kategorie" - wyczyść wszystkie
        return { ...prev, categories: [] };
      }
      
      if (currentCategories.includes(categoryId)) {
        // Kategoria już wybrana - odznacz ją
        return { 
          ...prev, 
          categories: currentCategories.filter(id => id !== categoryId) 
        };
      } else {
        // Kategoria nie wybrana - zaznacz ją
        return { 
          ...prev, 
          categories: [categoryId] 
        };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      categories: [],
      capacities: [],
      brands: [],
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
      <div className="max-w-[95vw] mx-auto px-6 py-8">
        {/* Category Tabs Header */}
        <CategoryTabs 
          onCategoryChange={handleCategoryChange}
          selectedCategories={filters.categories}
        />

        {/* Spacing */}
        <div className="h-6"></div>

        {/* Enhanced Search and Filter Bar */}
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search */}
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-black transition-colors" />
              <input
                type="text"
                placeholder="Szukaj produktów..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-black/10 focus:border-black transition-all duration-200 bg-white/80 backdrop-blur-sm"
              />
            </div>

            {/* Sort Controls */}
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200">
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="px-4 py-3 border-0 bg-transparent focus:ring-0 focus:outline-none text-sm font-medium text-gray-700 cursor-pointer"
                >
                  <option value="date">Data dodania</option>
                  <option value="price">Cena</option>
                  <option value="name">Nazwa</option>
                  <option value="popularity">Popularność</option>
                </select>
                
                <button
                  onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                  title={filters.sortOrder === 'asc' ? 'Sortuj rosnąco' : 'Sortuj malejąco'}
                >
                  {filters.sortOrder === 'asc' ? 
                    <ChevronUp className="w-4 h-4 text-gray-600 group-hover:text-black transition-colors" /> : 
                    <ChevronDown className="w-4 h-4 text-gray-600 group-hover:text-black transition-colors" />
                  }
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-black text-white' 
                      : 'text-gray-600 hover:text-black hover:bg-gray-100'
                  }`}
                  title="Widok siatki"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-black text-white' 
                      : 'text-gray-600 hover:text-black hover:bg-gray-100'
                  }`}
                  title="Widok listy"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Clear Filters Button */}
              <button
                onClick={clearFilters}
                className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Wyczyść
              </button>
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden px-6 py-3 bg-black text-white rounded-xl flex items-center gap-2 hover:bg-gray-800 transition-all duration-200 font-medium"
            >
              <Filter className="w-4 h-4" />
              Filtry
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* New Filters Component */}
          <div className="lg:w-80">
            <ShopFilters
              categories={categories}
              capacities={capacities}
              brands={brands}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              showFilters={showFilters}
              onToggleFilters={() => setShowFilters(!showFilters)}
              totalProducts={totalProducts}
              attributesLoading={attributesLoading}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Results Info */}
            <div className="mb-6">
              <p className="text-gray-600">
                Znaleziono <span className="font-semibold">{totalProducts}</span> produktów
                {filters.category && ` w kategorii "${categories.find(c => c.slug === filters.category)?.name}"`}
              </p>
            </div>

            {/* Products Grid/List */}
            {loading ? (
              // Loading skeleton
              <div className={`grid gap-4 lg:gap-6 ${viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
                {[...Array(6)].map((_, index) => (
                  <div key={index} className={`animate-pulse ${viewMode === 'list' ? 'flex gap-4' : ''}`}>
                    <div className={`bg-gray-200 rounded-lg ${viewMode === 'list' ? 'w-32 h-32 flex-shrink-0' : 'aspect-square mb-4'}`}></div>
                    <div className={`space-y-2 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      {viewMode === 'list' && (
                        <>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              // Products grid/list
              <div className={`grid gap-4 lg:gap-6 ${viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
                {products.map((product) => (
                  <KingProductCard 
                    key={product.id} 
                    product={product} 
                    variant={viewMode === 'list' ? 'list' : 'default'}
                  />
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
