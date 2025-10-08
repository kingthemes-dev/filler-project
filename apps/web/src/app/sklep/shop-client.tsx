'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { Search, Filter, X, ChevronDown, Grid3X3, List } from 'lucide-react';
import dynamic from 'next/dynamic';
import KingProductCard from '@/components/king-product-card';
import HierarchicalCategories from '@/components/ui/hierarchical-categories';

// Lazy load heavy components
const ShopFilters = dynamic(() => import('@/components/ui/shop-filters'), {
  loading: () => <div className="animate-pulse bg-gray-200 rounded-2xl h-96"></div>
});
import { wooCommerceOptimized as wooCommerceService } from '@/services/woocommerce-optimized';

import { WooProduct } from '@/types/woocommerce';

interface FilterState {
  search: string;
  categories: string[];
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  onSale: boolean;
  sortBy: 'date' | 'price' | 'name' | 'popularity';
  sortOrder: 'asc' | 'desc';
  [key: string]: string[] | string | number | boolean; // Dynamiczne atrybuty
}

interface Category {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

interface ShopClientProps {
  initialShopData?: {
    success: boolean;
    products: WooProduct[];
    total: number;
    categories: Category[];
        attributes: {
        };
  };
}

export default function ShopClient({ initialShopData }: ShopClientProps) {
  console.log('🔍 ShopClient render - wooCommerceService:', !!wooCommerceService, typeof wooCommerceService);
  console.log('🔍 ShopClient render - initialShopData:', initialShopData);
  console.log('🔍 ShopClient render - products count:', initialShopData?.products?.length);
  
  const [products, setProducts] = useState<WooProduct[]>(initialShopData?.products || []);
  const [allCategories, setAllCategories] = useState<Category[]>(initialShopData?.categories || []);
  const [loading, setLoading] = useState(false);
  const [totalProducts, setTotalProducts] = useState(initialShopData?.total || 0);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(12); // PRO: 12 produktów na stronę
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // PRO: Separate state for refreshing
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categories: [],
    minPrice: 0,
    maxPrice: 10000, // 1000 zł w groszach
    inStock: false,
    onSale: false,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Debounced search
  const [searchInput, setSearchInput] = useState(filters.search);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Categories and attributes are now fetched together with products

  // Fetch products with filters - PRO Architecture: WordPress robi całe filtrowanie
  const fetchProducts = useCallback(async () => {
    console.log('🚀 fetchProducts called - START', { 
      filters, 
      currentPage,
      productsPerPage
    });
    
    // PRO: Set loading state based on whether it's a filter change or page change
    if (products.length > 0) {
      setRefreshing(true);
    } else {
      setFilterLoading(true);
    }
    setLoading(true);
    
    try {
      // PRO Architecture: Build API URL with all filters - WordPress zrobi resztę
      const params = new URLSearchParams();
      params.append('endpoint', 'shop');
      params.append('page', currentPage.toString());
      params.append('per_page', productsPerPage.toString());
      
      // Categories - WordPress obsłuży wielokrotne kategorie
      if (filters.categories.length > 0) {
        params.append('category', filters.categories.join(','));
      }
      
      // Search, sorting, prices
      if (filters.search) {
        params.append('search', filters.search);
      }
      params.append('orderby', filters.sortBy === 'name' ? 'title' : filters.sortBy);
      params.append('order', filters.sortOrder);
      
      if (filters.onSale) {
        params.append('on_sale', 'true');
      }
      if (filters.minPrice >= 0) {
        params.append('min_price', filters.minPrice.toString());
      }
      if (filters.maxPrice < 10000) {
        params.append('max_price', filters.maxPrice.toString());
      }
      
      // Dynamic attribute filters - WordPress obsłuży pa_* parametry
      Object.keys(filters).forEach(key => {
        if (key.startsWith('pa_') && Array.isArray(filters[key]) && (filters[key] as string[]).length > 0) {
          params.append(key, (filters[key] as string[]).join(','));
        }
      });
      
      const apiUrl = `/api/woocommerce?${params.toString()}`;
      console.log('🌐 API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log('📦 API response:', data);
      
      if (data.success && data.products) {
        // PRO: Pagination - zawsze zastępuj produkty (nie append)
        const uniqueProducts = data.products.filter((product: WooProduct, index: number, self: WooProduct[]) => 
          index === self.findIndex((p: WooProduct) => p.id === product.id)
        );
        setProducts(uniqueProducts);
        
        setTotalProducts(data.total || 0);
        
        console.log('✅ Products set:', { currentPage, loaded: data.products.length, total: data.total });
        
        // Set categories and attributes only on first page
        if (currentPage === 1 && data.categories && data.categories.length > 0) {
          setAllCategories(data.categories);
        }
      } else {
        console.error('❌ API call failed or no products:', data);
        setProducts([]);
        setTotalProducts(0);
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      setProducts([]);
      setTotalProducts(0);
    } finally {
      console.log('🚀 fetchProducts called - END');
      setLoading(false);
      setFilterLoading(false);
      setRefreshing(false); // PRO: Reset refreshing state
    }
  }, [filters, currentPage, productsPerPage]);

  // Always fetch products on initial load
  useEffect(() => {
    console.log('🔄 Initial load - fetching products');
    fetchProducts();
  }, []); // Empty dependency array - only run once on mount

  // Reset to first page and fetch products when filters change - PRO: Debounced
  useEffect(() => {
    setCurrentPage(1);
    
    // PRO: Debounce product fetching to prevent excessive API calls
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 500); // 500ms debounce for product fetching
    
    return () => clearTimeout(timeoutId);
  }, [filters, fetchProducts]);

  // Fetch products when page changes (PRO: Pagination)
  useEffect(() => {
    if (currentPage > 1) {
      fetchProducts();
    }
  }, [currentPage, fetchProducts]);

  const handleFilterChange = (key: string, value: string | number | boolean) => {
    console.log('🔧 handleFilterChange called:', { key, value, type: typeof value });
    
    if (key === 'categories') {
      // Handle array filters (checkboxes)
      setFilters(prev => {
        const currentArray = prev[key] as string[];
        const newArray = currentArray.includes(value as string) 
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value as string];
        return { ...prev, [key]: newArray };
      });
    } else if (key.startsWith('pa_')) {
      // Handle dynamic attribute filters (comma-separated values)
      setFilters(prev => {
        const attributeValues = (value as string).split(',').filter(v => v.trim());
        return { ...prev, [key]: attributeValues };
      });
    } else {
      // Handle other filters
      setFilters(prev => {
        const newFilters = { ...prev, [key]: value };
        console.log('🔧 New filters state:', newFilters);
        return newFilters;
      });
    }
  };

  const handleCategoryChange = (categoryId: string, subcategoryId?: string) => {
    console.log('🔧 handleCategoryChange called:', { categoryId, subcategoryId });
    setFilters(prev => {
      // Użyj subcategoryId jeśli jest dostępne, w przeciwnym razie categoryId
      const finalCategoryId = subcategoryId || categoryId;
      
      if (finalCategoryId === '') {
        // "Wszystkie kategorie" - wyczyść wszystkie
        return { ...prev, categories: [] };
      }
      
      // Toggle category (dodaj jeśli nie ma, usuń jeśli jest)
      const currentCategories = prev.categories;
      const newCategories = currentCategories.includes(finalCategoryId)
        ? currentCategories.filter(cat => cat !== finalCategoryId)
        : [...currentCategories, finalCategoryId];
      
      console.log('🔧 Category change:', { 
        currentCategories, 
        finalCategoryId, 
        newCategories 
      });
      
      return { 
        ...prev, 
        categories: newCategories
      };
    });
  };

  const clearFilters = () => {
    // PRO: Clear all filters including dynamic attributes
    const clearedFilters: FilterState = {
      search: '',
      categories: [],
      minPrice: 0,
      maxPrice: 10000,
      inStock: false,
      onSale: false,
      sortBy: 'date' as const,
      sortOrder: 'desc' as const
    };
    
    setFilters(clearedFilters);
    setSearchInput(''); // PRO: Also clear search input
  };

  // totalPages is now managed by state

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[95vw] mx-auto px-6 py-8 pb-16">
        {/* Category tabs section */}
        <div className="bg-gray-50 py-8 rounded-3xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sklep</h1>
            <p className="text-gray-600">Odkryj nasze najlepsze produkty</p>
          </div>
          <HierarchicalCategories 
            onCategoryChange={handleCategoryChange}
            selectedCategory={filters.categories[0]}
            selectedSubcategory={filters.categories[1]}
          />
        </div>
        
        <div className="h-6"></div>
        
        {/* Search and controls - Mobile optimized */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col gap-4">
            {/* Search bar */}
            <div className="relative group">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-black transition-colors" />
              <input
                type="text"
                placeholder="Szukaj produktów..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black/10 focus:border-black transition-all duration-200 bg-gray-50 text-sm sm:text-base"
              />
            </div>
            
            {/* Controls row */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              {/* Sort dropdown */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-200 flex-1 sm:flex-none">
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="px-3 sm:px-4 py-2 sm:py-3 border-0 bg-transparent focus:ring-0 focus:outline-none text-sm font-medium text-gray-700 cursor-pointer flex-1"
                >
                  <option value="date">Data dodania</option>
                  <option value="price">Cena</option>
                  <option value="name">Nazwa</option>
                  <option value="popularity">Popularność</option>
                </select>
                <button
                  onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors group"
                  title={filters.sortOrder === 'asc' ? 'Sortuj malejąco' : 'Sortuj rosnąco'}
                >
                  <ChevronDown className={`w-4 h-4 text-gray-600 group-hover:text-black transition-colors ${filters.sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                </button>
              </div>
              
              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-black text-white' : 'text-gray-600 hover:text-black hover:bg-gray-100'}`}
                  title="Widok siatki"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-black text-white' : 'text-gray-600 hover:text-black hover:bg-gray-100'}`}
                  title="Widok listy"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              
              {/* Mobile filter button - only show on mobile */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden px-4 py-2 sm:py-3 bg-black text-white rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all duration-200 font-medium"
              >
                <Filter className="w-4 h-4" />
                Filtry
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters sidebar */}
          <ShopFilters
            categories={allCategories.map(c => ({ ...c, count: c.count || 0 }))}
            filters={filters}
            onFilterChange={handleFilterChange}
            onCategoryChange={handleCategoryChange}
            onClearFilters={clearFilters}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            totalProducts={totalProducts}
            attributesLoading={false}
            wooCommerceCategories={allCategories.map(c => ({ 
              id: c.id, 
              name: c.name, 
              slug: c.slug, 
              parent: 0, // For now, assume all are top-level
              count: c.count || 0 
            }))}
            products={products}
          />
          
          {/* Products grid */}
          <div className="flex-1">
            <div className="mb-6">
              <p className="text-gray-600">
                Znaleziono <span className="font-semibold">{totalProducts}</span> produktów
              </p>
            </div>
            
            {loading || filterLoading ? (
              <div className="grid gap-4 lg:gap-6 grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 rounded-lg aspect-square mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`grid gap-4 lg:gap-6 ${viewMode === 'grid' ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} relative`}>
                {/* PRO: Subtle refreshing indicator */}
                {refreshing && (
                  <div className="absolute top-0 right-0 z-10 bg-white/80 backdrop-blur-sm rounded-lg p-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                  </div>
                )}
                {products.map((product) => (
                  <MemoizedProductCard
                    key={product.id}
                    product={product}
                    variant={viewMode === 'list' ? 'list' : 'default'}
                  />
                ))}
              </div>
            )}
            
            {/* PRO: Paginacja */}
            {!filterLoading && products.length > 0 && totalProducts > productsPerPage && (
              <div className="flex justify-center items-center space-x-2 py-8">
                {/* Poprzednia strona */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Poprzednia
                </button>

                {/* Numery stron */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.ceil(totalProducts / productsPerPage) }, (_, i) => i + 1)
                    .filter(page => {
                      // Pokaż pierwsze 2, ostatnie 2, i 2 wokół aktualnej strony
                      const totalPages = Math.ceil(totalProducts / productsPerPage);
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, index, array) => {
                      // Dodaj "..." między grupami stron
                      const prevPage = array[index - 1];
                      const showDots = prevPage && page - prevPage > 1;
                      
                      return (
                        <div key={page} className="flex items-center">
                          {showDots && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[40px] h-10 rounded-lg font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-black text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}
                </div>

                {/* Następna strona */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalProducts / productsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(totalProducts / productsPerPage)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Następna
                </button>
              </div>
            )}
            
            {!loading && products.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Search className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nie znaleziono produktów</h3>
                <p className="text-gray-500 mb-4">Spróbuj zmienić kryteria wyszukiwania</p>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Wyczyść filtry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoized product card to prevent unnecessary re-renders
const MemoizedProductCard = memo(KingProductCard);
