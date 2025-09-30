'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { Search, Filter, X, ChevronDown, Grid3X3, List } from 'lucide-react';
import dynamic from 'next/dynamic';
import KingProductCard from '@/components/king-product-card';
import CategoryTabs from '@/components/ui/category-tabs';

// Lazy load heavy components
const ShopFilters = dynamic(() => import('@/components/ui/shop-filters'), {
  loading: () => <div className="animate-pulse bg-gray-200 rounded-2xl h-96"></div>
});
import { wooCommerceOptimized as wooCommerceService } from '@/services/woocommerce-optimized';

import { WooProduct } from '@/types/woocommerce';

interface FilterState {
  search: string;
  categories: string[];
  capacities: string[];
  brands: string[];
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  onSale: boolean;
  sortBy: 'date' | 'price' | 'name' | 'popularity';
  sortOrder: 'asc' | 'desc';
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
      capacities: Array<{ id: string | number; name: string; slug: string; count: number }>;
      brands: Array<{ id: string | number; name: string; slug: string; count: number }>;
    };
  };
}

export default function ShopClient({ initialShopData }: ShopClientProps) {
  console.log('🔍 ShopClient render - wooCommerceService:', !!wooCommerceService, typeof wooCommerceService);
  console.log('🔍 ShopClient render - initialShopData:', initialShopData);
  console.log('🔍 ShopClient render - products count:', initialShopData?.products?.length);
  
  const [products, setProducts] = useState<WooProduct[]>(initialShopData?.products || []);
  const [allCategories, setAllCategories] = useState<Category[]>(initialShopData?.categories || []);
  const [capacities, setCapacities] = useState<Array<{ id: string | number; name: string; slug: string }>>(initialShopData?.attributes?.capacities || []);
  const [brands, setBrands] = useState<Array<{ id: string | number; name: string; slug: string }>>(initialShopData?.attributes?.brands || []);
  const [loading, setLoading] = useState(false);
  const [totalProducts, setTotalProducts] = useState(initialShopData?.total || 0);
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

  // Fetch products with filters
  const fetchProducts = useCallback(async () => {
    console.log('🚀 fetchProducts called', { 
      wooCommerceService: !!wooCommerceService, 
      filters, 
      currentPage,
      wooCommerceServiceType: typeof wooCommerceService,
      wooCommerceServiceValue: wooCommerceService
    });
    setLoading(true);
    try {
      // Direct API call - bypassing wooCommerceService completely
      console.log('🔄 Direct API call...');
      
      // Build API URL with filters
      const params = new URLSearchParams();
      params.append('endpoint', 'shop');
      params.append('page', currentPage.toString());
      params.append('per_page', productsPerPage.toString());
      
      if (filters.categories.length > 0) {
        params.append('category', filters.categories[0]);
      }
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
        console.log('💰 minPrice set:', filters.minPrice);
      }
      if (filters.maxPrice < 10000) {
        params.append('max_price', filters.maxPrice.toString());
        console.log('💰 maxPrice set:', filters.maxPrice);
      }
      if (filters.capacities.length > 0) {
        params.append('capacities', filters.capacities.join(','));
      }
      if (filters.brands.length > 0) {
        params.append('brands', filters.brands.join(','));
      }
      
      const apiUrl = `/api/woocommerce?${params.toString()}`;
      console.log('🌐 API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      console.log('📦 Direct API response:', data);
      
      if (data.success && data.products) {
        setProducts(data.products);
        setTotalProducts(data.total || 0);
        console.log('✅ Products set from direct API call');
        
        // Set categories and attributes
        if (data.categories && data.categories.length > 0) {
          setAllCategories(data.categories);
          console.log('📂 Categories loaded:', data.categories.length);
        }
        
        if (data.attributes && data.attributes.capacities && data.attributes.capacities.length > 0) {
          setCapacities(data.attributes.capacities);
          console.log('📏 Capacities loaded:', data.attributes.capacities.length);
        }
        
        if (data.attributes && data.attributes.brands && data.attributes.brands.length > 0) {
          setBrands(data.attributes.brands);
          console.log('🏷️ Brands loaded:', data.attributes.brands.length);
        }
        return;
      } else {
        console.error('❌ API call failed or no products:', data);
      }
      
      // Use single optimized shop endpoint that returns everything
      console.log('🔄 Calling wooCommerceService.getShopData...');
      const shopData = await wooCommerceService.getShopData(
        currentPage,
        productsPerPage,
        {
          category: filters.categories.length > 0 ? filters.categories[0] : undefined,
          search: filters.search || undefined,
          orderby: filters.sortBy === 'name' ? 'title' : filters.sortBy,
          order: filters.sortOrder,
          on_sale: filters.onSale,
          min_price: filters.minPrice || undefined,
          max_price: filters.maxPrice || undefined,
          capacities: filters.capacities,
          brands: filters.brands,
        }
      );
      
      console.log('📦 Shop data received:', shopData);
      console.log('📦 Products count:', shopData.products?.length || 0);
      console.log('📦 Categories count:', shopData.categories?.length || 0);
      console.log('📦 Capacities count:', shopData.attributes?.capacities?.length || 0);
      console.log('📦 Brands count:', shopData.attributes?.brands?.length || 0);
      
      console.log('🔄 Setting products:', shopData.products?.length || 0);
      setProducts(shopData.products || []);
      setTotalProducts(shopData.total || 0);
      console.log('✅ Products set successfully');

      // Set categories if available
      if (shopData.categories && shopData.categories.length > 0) {
        setAllCategories(shopData.categories);
      }

      // Set attributes if available
      if (shopData.attributes) {
        if (shopData.attributes.capacities && shopData.attributes.capacities.length > 0) {
          setCapacities(shopData.attributes.capacities);
          console.log('📏 Capacities loaded:', shopData.attributes.capacities.length);
        }
        
        if (shopData.attributes.brands && shopData.attributes.brands.length > 0) {
          setBrands(shopData.attributes.brands);
          console.log('🏷️ Brands loaded:', shopData.attributes.brands.length);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, productsPerPage]);

  // Debug: log when capacities and brands change
  useEffect(() => {
    console.log('📦 Capacities updated:', capacities);
  }, [capacities]);

  useEffect(() => {
    console.log('🏷️ Brands updated:', brands);
  }, [brands]);

  // Track if initial data has been loaded
  const [hasInitialData, setHasInitialData] = useState(false);

  // Fetch products when filters or page changes (but not on initial load)
  useEffect(() => {
    // Skip initial fetch if we already have data from server
    if (!hasInitialData && (initialShopData?.products?.length || 0) > 0) {
      setHasInitialData(true);
      return;
    }
    
    console.log('🔄 useEffect called - fetchProducts will be called');
    console.log('🔄 fetchProducts function:', typeof fetchProducts);
    console.log('🔄 Current filters:', filters);
    fetchProducts();
  }, [filters, currentPage, fetchProducts, hasInitialData, initialShopData]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: string | number | boolean) => {
    console.log('🔧 handleFilterChange called:', { key, value, type: typeof value });
    
    if (key === 'categories' || key === 'capacities' || key === 'brands') {
      // Handle array filters (checkboxes)
      setFilters(prev => {
        const currentArray = prev[key] as string[];
        const newArray = currentArray.includes(value as string) 
          ? currentArray.filter(item => item !== value)
          : [...currentArray, value as string];
        return { ...prev, [key]: newArray };
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
        // Kategoria nie wybrana - zaznacz ją (tylko jedna na raz)
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
      sortBy: 'date',
      sortOrder: 'desc'
    });
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
          <CategoryTabs 
            onCategoryChange={handleCategoryChange}
            selectedCategories={filters.categories}
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
              
              {/* Clear button */}
              <button
                onClick={clearFilters}
                className="px-4 py-2 sm:py-3 text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-100 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border border-gray-200"
              >
                <X className="w-4 h-4" />
                Wyczyść
              </button>
              
              {/* Mobile filter button */}
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
            capacities={capacities.map(c => ({ ...c, id: String(c.id) }))}
            brands={brands.map(b => ({ ...b, id: String(b.id) }))}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            totalProducts={totalProducts}
            attributesLoading={false}
          />
          
          {/* Products grid */}
          <div className="flex-1">
            <div className="mb-6">
              <p className="text-gray-600">
                Znaleziono <span className="font-semibold">{totalProducts}</span> produktów
              </p>
            </div>
            
            {loading ? (
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
              <div className={`grid gap-4 lg:gap-6 ${viewMode === 'grid' ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                {products.map((product) => (
                  <MemoizedProductCard
                    key={product.id}
                    product={product}
                    variant={viewMode === 'list' ? 'list' : 'default'}
                  />
                ))}
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
