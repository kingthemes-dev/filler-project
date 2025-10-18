'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { analytics } from '@headless-woo/shared/utils/analytics';
import PageContainer from '@/components/ui/page-container';
import { useSearchParams } from 'next/navigation';
import { Search, Filter, X } from 'lucide-react';
import KingProductCard from '@/components/king-product-card';

// Import filters directly for instant loading
import ShopFilters from '@/components/ui/shop-filters';
import { wooCommerceOptimized as wooCommerceService } from '@/services/woocommerce-optimized';

import { WooProduct } from '@/types/woocommerce';
import { useQuery } from '@tanstack/react-query';

interface FilterState {
  search: string;
  categories: string[];
  brands: string[];
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  onSale: boolean;
  sortBy: 'date' | 'price' | 'name' | 'popularity';
  sortOrder: 'asc' | 'desc';
  [key: string]: string[] | string | number | boolean; // Dynamiczne atrybuty (brands, pa_*, etc.)
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
  
  const [products, setProducts] = useState<WooProduct[]>(initialShopData?.products || []);
  const [allCategories, setAllCategories] = useState<Category[]>(initialShopData?.categories || []);
  
  
  // INSTANT LOADING: If no initial data, fetch categories immediately
  useEffect(() => {
    if (!initialShopData?.categories || initialShopData.categories.length === 0) {
      wooCommerceService.getCategories().then(response => {
        if (response.success && response.categories) {
          setAllCategories(response.categories);
        }
      }).catch(error => {
        console.error('Error fetching categories:', error);
      });
    }
  }, [initialShopData]);
  const [loading, setLoading] = useState(false);
  const [totalProducts, setTotalProducts] = useState(initialShopData?.total || 0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(12); // PRO: 12 produktów na stronę
  const [showFilters, setShowFilters] = useState(false);
  // fixed grid view – list variant removed
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // PRO: Separate state for refreshing
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categories: [],
    brands: [],
    minPrice: 0,
    maxPrice: 10000, // 1000 zł w groszach
    inStock: false,
    onSale: false,
    sortBy: 'date',
    sortOrder: 'desc'
  });
  
  const router = useRouter();
  const nextSearchParams = useNextSearchParams();
  // Sync filters with URL query params (category, brands, dynamic attrs)
  const searchParams = useSearchParams();
  useEffect(() => {
    if (!searchParams) return;
    const categoryParam = searchParams.get('category') || '';
    const brandsParam = searchParams.get('brands') || '';

    const urlCategories = categoryParam
      ? categoryParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const urlBrands = brandsParam
      ? brandsParam.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    // Collect any pa_* attribute filters from URL as well
    const newAttrs: Record<string, string[]> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('pa_')) {
        newAttrs[key] = value.split(',').map((s) => s.trim()).filter(Boolean);
      }
    });

    setFilters((prev) => ({
      ...prev,
      categories: urlCategories,
      brands: urlBrands,
      ...newAttrs,
    }));
  }, [searchParams]);

  // Sync filters -> URL (shallow) whenever filters change (avoid loops)
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.categories.length) params.set('category', filters.categories.join(','));
    if ((filters.brands as string[]).length) params.set('brands', (filters.brands as string[]).join(','));
    if (filters.minPrice > 0) params.set('min_price', String(filters.minPrice));
    if (filters.maxPrice < 10000) params.set('max_price', String(filters.maxPrice));
    if (filters.inStock) params.set('in_stock', 'true');
    if (filters.onSale) params.set('on_sale', 'true');
    params.set('sort', filters.sortBy);
    params.set('order', filters.sortOrder);
    Object.keys(filters).forEach((key) => {
      if (key.startsWith('pa_')) {
        const v = filters[key];
        if (Array.isArray(v) && v.length) params.set(key, v.join(','));
        else if (typeof v === 'string' && v) params.set(key, v);
      }
    });
    const qs = params.toString();
    const url = qs ? `/sklep?${qs}` : '/sklep';
    const current = typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : '';
    if (current !== qs) {
      router.replace(url, { scroll: false });
    }
  }, [filters, router]);


  // Debounced search
  const [searchInput, setSearchInput] = useState(filters.search);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Categories and attributes are now fetched together with products

  // React Query for products with SSR hydration
  const queryKey = ['shop','products',{ page: currentPage, perPage: productsPerPage, filters: JSON.stringify(filters) }];
  
  const shopQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('endpoint', 'shop');
      params.append('page', currentPage.toString());
      params.append('per_page', productsPerPage.toString());
      if (filters.categories.length > 0) params.append('category', filters.categories.join(','));
      if (filters.brands && (filters.brands as string[]).length > 0) params.append('brands', (filters.brands as string[]).join(','));
      if (filters.search) params.append('search', filters.search);
      params.append('orderby', filters.sortBy === 'name' ? 'title' : filters.sortBy);
      params.append('order', filters.sortOrder);
      if (filters.onSale) params.append('on_sale', 'true');
      if (filters.minPrice >= 0) params.append('min_price', String(filters.minPrice));
      if (filters.maxPrice < 10000) params.append('max_price', String(filters.maxPrice));
      Object.keys(filters).forEach(key => {
        if (key.startsWith('pa_') && Array.isArray(filters[key]) && (filters[key] as string[]).length > 0) {
          params.append(key, (filters[key] as string[]).join(','));
        }
      });
      
      const apiUrl = `/api/woocommerce?${params.toString()}`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      console.log('✅ Shop data received from WordPress:', { 
        products: data.products?.length || 0, 
        total: data.total, 
        categories: data.categories?.length || 0, 
        attributes: Object.keys(data.attributes || {}).length 
      });
      
      return data;
    },
    staleTime: 30000,
    enabled: true,
    refetchOnMount: true,
  });

  // Update products and total from shopQuery data
  useEffect(() => {
    if (shopQuery.data) {
      setProducts(shopQuery.data.products || []);
      setTotalProducts(shopQuery.data.total || 0);
      console.log('🔧 ShopClient - shopQuery.data.categories:', shopQuery.data.categories);
      setAllCategories(shopQuery.data.categories || []);
    }
    setLoading(shopQuery.isLoading);
    setFilterLoading(shopQuery.isFetching && !shopQuery.isLoading);
    setRefreshing(shopQuery.isFetching);
  }, [shopQuery.data, shopQuery.isLoading, shopQuery.isFetching]);

  // Categories query (separate, cached long-term)
  const categoriesQuery = useQuery({
    queryKey: ['shop','categories'],
    queryFn: async () => {
      const res = await wooCommerceService.getCategories();
      return res;
    },
    staleTime: 30 * 60_000,
    enabled: allCategories.length === 0,
  });
  


  useEffect(() => {
    if (categoriesQuery.data?.data && allCategories.length === 0) {
      setAllCategories(categoriesQuery.data.data as any);
    }
  }, [categoriesQuery.data, allCategories.length]);

  // Reset to first page when filters change (React Query will auto fetch from key change)
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (key: string, value: string | number | boolean | string[]) => {
    console.log('🔧 handleFilterChange called:', { key, value, type: typeof value });
    
    if (key === 'categories' || key === 'brands') {
      // Handle array filters (checkboxes)
      setFilters(prev => {
        if (Array.isArray(value)) {
          // If value is already an array, replace the entire array
          return { ...prev, [key]: value };
        } else {
          // If value is a single item, toggle it in the array
          const currentArray = prev[key] as string[];
          const newArray = currentArray.includes(value as string) 
            ? currentArray.filter(item => item !== value)
            : [...currentArray, value as string];
          return { ...prev, [key]: newArray };
        }
      });
    } else if (key.startsWith('pa_')) {
      // Handle dynamic attribute filters (comma-separated values)
      setFilters(prev => {
        // Handle both string (comma-separated) and array values
        let attributeValues: string[];
        if (typeof value === 'string') {
          attributeValues = value.split(',').filter(v => v.trim());
        } else if (Array.isArray(value)) {
          attributeValues = value;
        } else {
          attributeValues = [String(value)];
        }
        
        console.log('🔧 Attribute filter change:', { key, value, attributeValues });
        // PRO: If no values, remove the attribute completely
        if (attributeValues.length === 0) {
          const newFilters = { ...prev };
          delete newFilters[key];
          return newFilters;
        }
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
      const currentCategories = prev.categories;
      
      if (subcategoryId) {
        // PRO: Podkategoria - dodaj zarówno kategorię główną jak i podkategorię
        const mainCategoryExists = currentCategories.includes(categoryId);
        const subcategoryExists = currentCategories.includes(subcategoryId);
        
        let newCategories = [...currentCategories];
        
        if (subcategoryExists) {
          // Usuń podkategorię
          newCategories = newCategories.filter(cat => cat !== subcategoryId);
        } else {
          // Dodaj podkategorię i kategorię główną jeśli nie istnieje
          if (!mainCategoryExists) {
            newCategories.push(categoryId);
          }
          newCategories.push(subcategoryId);
        }
        
        console.log('🔧 Subcategory change:', { 
          currentCategories, 
          categoryId, 
          subcategoryId, 
          newCategories 
        });
        
        return { ...prev, categories: newCategories };
      } else {
        // PRO: Kategoria główna - toggle tylko tej kategorii
        if (categoryId === '') {
          // "Wszystkie kategorie" - wyczyść wszystkie
          return { ...prev, categories: [] };
        }
        
        const newCategories = currentCategories.includes(categoryId)
          ? currentCategories.filter(cat => cat !== categoryId)
          : [...currentCategories, categoryId];
        
        console.log('🔧 Main category change:', { 
          currentCategories, 
          categoryId, 
          newCategories 
        });
        
        const nextState = { ...prev, categories: newCategories };
        analytics.track('filter_change', { key: 'categories', value: nextState.categories });
        return nextState;
      }
    });
  };

  const clearFilters = () => {
    // PRO: Clear all filters including dynamic attributes
    const clearedFilters: FilterState = {
      search: '',
      categories: [],
      brands: [],
      minPrice: 0,
      maxPrice: 10000,
      inStock: false,
      onSale: false,
      sortBy: 'date' as const,
      sortOrder: 'desc' as const
    };
    
    setFilters(clearedFilters);
    analytics.track('filters_clear_all');
    setSearchInput(''); // PRO: Also clear search input
  };

  // Helpers: active filters and clearing single filter
  const activeFilters = () => {
    const items: Array<{ key: string; value: string; label: string }> = [];
    if (filters.search) items.push({ key: 'search', value: String(filters.search), label: `Szukaj: ${filters.search}` });
    filters.categories.forEach((c) => items.push({ key: 'category', value: c, label: `Kategoria: ${c}` }));
    if ((filters.brands as string[]).length) (filters.brands as string[]).forEach((b) => items.push({ key: 'brands', value: b, label: `Marka: ${b}` }));
    if (filters.minPrice > 0) items.push({ key: 'minPrice', value: String(filters.minPrice), label: `Min: ${filters.minPrice} zł` });
    if (filters.maxPrice < 10000) items.push({ key: 'maxPrice', value: String(filters.maxPrice), label: `Max: ${filters.maxPrice} zł` });
    if (filters.inStock) items.push({ key: 'inStock', value: 'true', label: 'W magazynie' });
    if (filters.onSale) items.push({ key: 'onSale', value: 'true', label: 'Promocje' });
    Object.keys(filters).forEach((key) => {
      if (key.startsWith('pa_')) {
        const v = filters[key];
        const values = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').filter(Boolean) : [];
        values.forEach((val) => items.push({ key, value: val, label: `${key.replace('pa_', '')}: ${val}` }));
      }
    });
    return items;
  };

  const clearSingleFilter = (key: string, value: string) => {
    if (key === 'search') setFilters((p) => { analytics.track('filter_remove', { key, value }); return ({ ...p, search: '' }); });
    else if (key === 'category') setFilters((p) => ({ ...p, categories: p.categories.filter((c) => c !== value) }));
    else if (key === 'brands') setFilters((p) => ({ ...p, brands: (p.brands as string[]).filter((b) => b !== value) }));
    else if (key === 'minPrice') setFilters((p) => ({ ...p, minPrice: 0 }));
    else if (key === 'maxPrice') setFilters((p) => ({ ...p, maxPrice: 10000 }));
    else if (key === 'inStock') setFilters((p) => ({ ...p, inStock: false }));
    else if (key === 'onSale') setFilters((p) => ({ ...p, onSale: false }));
    else if (key.startsWith('pa_')) setFilters((p) => {
      const v = p[key];
      const values = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').filter(Boolean) : [];
      const next = values.filter((val) => val !== value);
      analytics.track('filter_remove', { key, value });
      return { ...p, [key]: next } as any;
    });
  };

  // totalPages is now managed by state

  return (
    <div className="min-h-screen bg-white">
      <PageContainer className="py-4 pb-12">
        {/* Minimal header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Sklep</h1>
        </div>
        
        {/* Usunięto górną wyszukiwarkę – pozostaje ta w panelu filtrów */}
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters sidebar */}
          <ShopFilters
            categories={Array.isArray(allCategories) ? allCategories.map(c => ({ 
              id: c.id,
              name: c.name,
              slug: c.slug,
              count: c.count || 0,
              parent: (c as any).parent || 0 // Zachowaj parent dla hierarchii
            })) : []}
            filters={filters}
            onFilterChange={handleFilterChange}
            onCategoryChange={handleCategoryChange}
            onClearFilters={clearFilters}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            totalProducts={totalProducts}
            attributesLoading={false}
            wooCommerceCategories={Array.isArray(allCategories) ? allCategories.map(c => ({ 
              id: c.id, 
              name: c.name, 
              slug: c.slug, 
              parent: c.parent || 0, // Use real parent data from API
              count: c.count || 0 
            })) : []}
            products={products}
          />
          
          {/* Products grid */}
          <div className="flex-1">
            {/* Active filter chips (compact, desktop only) */}
            {activeFilters().length > 0 && (
              <div className="hidden lg:flex flex-wrap gap-2 mb-3 items-center">
                {(() => {
                  const chips = activeFilters();
                  const importantKeys = new Set(['category', 'brands', 'minPrice', 'maxPrice']);
                  const prioritized = chips.filter(c => importantKeys.has(c.key));
                  const visible = prioritized.slice(0, 6);
                  const hiddenCount = chips.length - visible.length;
                  return (
                    <>
                      {visible.map(({ key, label, value }) => (
                        <button
                          key={key + ':' + value}
                          onClick={() => clearSingleFilter(key, value)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs hover:bg-gray-200"
                          title={`Usuń filtr: ${label}`}
                        >
                          <span className="truncate max-w-[180px]">{label}</span>
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                      {hiddenCount > 0 && (
                        <span className="text-xs text-gray-500">+{hiddenCount} więcej</span>
                      )}
                      <button
                        onClick={clearFilters}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black text-white text-xs hover:bg-gray-900"
                      >
                        Wyczyść wszystkie
                      </button>
                    </>
                  );
                })()}
              </div>
            )}
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
              <div className={`grid mobile-grid grid-cols-2 lg:grid-cols-3 relative`}>
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
                    variant={'default'}
                  />
                ))}
              </div>
            )}
            
        {/* PRO: Paginacja */}
        {!filterLoading && products.length > 0 && totalProducts > productsPerPage && (
          <div className="flex justify-center items-center space-x-3 py-6">
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
      </PageContainer>
    </div>
  );
}

// Memoized product card to prevent unnecessary re-renders
const MemoizedProductCard = memo(KingProductCard);
