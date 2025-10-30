'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { analytics } from '@headless-woo/shared/utils/analytics';
import PageContainer from '@/components/ui/page-container';
import { Search, Filter, X } from 'lucide-react';
import KingProductCard from '@/components/king-product-card';

// Import filters directly for instant loading
import ShopFilters from '@/components/ui/shop-filters';
import ActiveFiltersBar from '@/components/ui/active-filters-bar';
import { wooCommerceOptimized as wooCommerceService } from '@/services/woocommerce-optimized';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import Pagination from '@/components/ui/pagination';

import { WooProduct } from '@/types/woocommerce';
import { useQuery } from '@tanstack/react-query';
import { useShopDataStore, useShopCategories, useShopAttributes } from '@/stores/shop-data-store';
import { useDebouncedCallback } from 'use-debounce';

interface FilterState {
  search: string;
  categories: string[];
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

// Hook dla contextual attributes na podstawie wybranych kategorii
const useContextualAttributes = (selectedCategories: string[]) => {
  return useQuery({
    queryKey: ['shop', 'attributes', 'contextual', selectedCategories],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('endpoint', 'attributes');
      if (selectedCategories.length > 0) {
        // WordPress API oczekuje parametru 'category' (nie 'categories')
        params.append('category', selectedCategories.join(','));
      }
      const res = await fetch(`/api/woocommerce?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    enabled: selectedCategories.length > 0,
    staleTime: 2 * 60_000, // 2 minuty cache
    retry: 2,
  });
};

export default function ShopClient({ initialShopData }: ShopClientProps) {
  // Debug logs removed for cleaner console
  
  // Zawsze wywołuj hooks - dane są prefetchowane
  const { categories, mainCategories, hierarchicalCategories, getSubCategories, isLoading: categoriesLoading } = useShopCategories();
  const { brands, capacities, zastosowanie, isLoading: attributesLoading } = useShopAttributes();
  const { totalProducts: storeTotalProducts, initialize } = useShopDataStore();
  
  const [products, setProducts] = useState<WooProduct[]>(initialShopData?.products || []);
  const [allCategories, setAllCategories] = useState<Category[]>(initialShopData?.categories || []);
  const [loading, setLoading] = useState(false);
  const [totalProducts, setTotalProducts] = useState(initialShopData?.total || 0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(12); // PRO: 12 produktów na stronę
  const [showFilters, setShowFilters] = useState(false);
  // fixed grid view – list variant removed
  const [filterLoading, setFilterLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // PRO: Separate state for refreshing
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    categories: [],
    brands: [],
    minPrice: -1, // -1 oznacza brak filtra ceny
    maxPrice: -1, // -1 oznacza brak filtra ceny
    inStock: false,
    onSale: false,
    sortBy: 'date',
    sortOrder: 'desc'
  });
  
  // Contextual attributes na podstawie wybranych kategorii
  const { data: contextualAttributes, isLoading: contextualLoading } = useContextualAttributes(filters.categories);
  
  // Debug contextual attributes
  // Contextual attributes debug removed
  
  // Inicjalizuj store przy pierwszym renderze
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  // Aktualizuj kategorie gdy store się załaduje
  useEffect(() => {
    if (categories.length > 0) {
      setAllCategories(categories);
    }
  }, [categories]);
  
  // Aktualizuj total products gdy store się załaduje
  useEffect(() => {
    if (storeTotalProducts > 0) {
      setTotalProducts(storeTotalProducts);
    }
  }, [storeTotalProducts]);
  
  // Filters state debug removed
  const router = useRouter();
  const searchParams = useSearchParams();
  // Sync filters with URL query params (category, brands, dynamic attrs)
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

    // URL useEffect debug removed

    // If URL is empty (no query params), don't update filters
    if (searchParams.toString() === '') {
      // URL is empty, skipping filter update
      return;
    }

    // Only update if URL params are different from current filters
    setFilters((prev) => {
      const currentCategories = prev.categories;
      const currentBrands = prev.brands as string[];
      
      // Check if URL categories are different from current
      const categoriesChanged = JSON.stringify(currentCategories.sort()) !== JSON.stringify(urlCategories.sort());
      const brandsChanged = JSON.stringify(currentBrands.sort()) !== JSON.stringify(urlBrands.sort());
      
      // URL comparison debug removed
      
      if (categoriesChanged || brandsChanged || Object.keys(newAttrs).length > 0) {
        // URL params changed, updating filters
        return {
          ...prev,
          categories: urlCategories,
          brands: urlBrands,
          ...newAttrs,
        };
      }
      
      // URL params unchanged, keeping current filters
      return prev; // No change needed
    });
  }, [searchParams]);

  // Sync filters -> URL (shallow) whenever filters change (avoid loops)
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.categories.length) params.set('category', filters.categories.join(','));
    if ((filters.brands as string[]).length) params.set('brands', (filters.brands as string[]).join(','));
    if (filters.minPrice > 0) params.set('min_price', String(filters.minPrice));
    if (filters.maxPrice > 0 && filters.maxPrice < 10000) params.set('max_price', String(filters.maxPrice));
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
  // Shop query debug removed
  
  const shopQuery = useQuery({
    queryKey,
    queryFn: async () => {
      // Shop query function called
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
      if (filters.minPrice > 0) params.append('min_price', String(filters.minPrice));
      if (filters.maxPrice > 0 && filters.maxPrice < 10000) params.append('max_price', String(filters.maxPrice));
      Object.keys(filters).forEach(key => {
        if (key.startsWith('pa_') && Array.isArray(filters[key]) && (filters[key] as string[]).length > 0) {
          params.append(key, (filters[key] as string[]).join(','));
        }
      });
      
      const apiUrl = `/api/woocommerce?${params.toString()}`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      // Shop data received from WordPress
      
      return data;
    },
    // Nie refetchuj od razu po hydracji – mamy dane z SSR
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    enabled: true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Update products and total from shopQuery data
  useEffect(() => {
    // useEffect shopQuery.data debug removed
    if (shopQuery.data) {
      setProducts(shopQuery.data.products || []);
      setTotalProducts(shopQuery.data.total || 0);
      setAllCategories(shopQuery.data.categories || []);
    }
    setLoading(shopQuery.isLoading);
    setFilterLoading(shopQuery.isFetching && !shopQuery.isLoading);
    setRefreshing(shopQuery.isFetching);
  }, [shopQuery.data, shopQuery.isLoading, shopQuery.isFetching]);

  // Categories query - zastąpione prefetched data z store
  // Nie potrzebujemy już API call - dane są w store

  // Dynamic filters query - zastąpione prefetched data z store
  // Używamy brands i capacities z store zamiast API call


  // useEffect dla categoriesQuery usunięty - używamy prefetched data z store

  // Reset to first page when filters change (React Query will auto fetch from key change)
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Debounced filter update dla lepszej wydajności - tylko dla produktów
  const debouncedProductUpdate = useDebouncedCallback(
    (newFilters: FilterState) => {
  // Debounced product update triggered
      // React Query automatycznie zaktualizuje produkty na podstawie zmiany queryKey
    },
    300 // 300ms debounce
  );

  const handleFilterChange = (key: string, value: string | number | boolean) => {
    // handleFilterChange debug removed
    
    // Optimistic UI update - natychmiastowa zmiana w interfejsie
    let newFilters: FilterState;
    
    if (key === 'categories' || key === 'brands') {
      // Handle array filters (checkboxes)
      const currentArray = filters[key] as string[];
      const newArray = currentArray.includes(value as string) 
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value as string];
      // Array filter change debug removed
      newFilters = { ...filters, [key]: newArray };
    } else if (key.startsWith('pa_')) {
      // Handle dynamic attribute filters (comma-separated values)
      // Handle both string (comma-separated) and array values
      let attributeValues: string[];
      if (typeof value === 'string') {
        attributeValues = value.split(',').filter(v => v.trim());
      } else if (Array.isArray(value)) {
        attributeValues = value;
      } else {
        attributeValues = [String(value)];
      }
      
      // Attribute filter change debug removed
      // PRO: If no values, remove the attribute completely
      if (attributeValues.length === 0) {
        newFilters = { ...filters };
        delete newFilters[key];
      } else {
        newFilters = { ...filters, [key]: attributeValues };
      }
    } else {
      // Handle other filters
      newFilters = { ...filters, [key]: value };
      // New filters state debug removed
    }
    
    // Natychmiastowa aktualizacja UI
    setFilters(newFilters);
    
    // Debounced update dla produktów (React Query automatycznie zaktualizuje na podstawie queryKey)
    debouncedProductUpdate(newFilters);
  };

  const handleCategoryChange = (categoryId: string, subcategoryId?: string) => {
    // handleCategoryChange debug removed
    setFilters(prev => {
      const currentCategories = prev.categories;
      
      if (subcategoryId) {
        // PRO: Podkategoria - filtruj tylko po podkategorii, nie po kategorii głównej
        const subcategoryExists = currentCategories.includes(subcategoryId);
        
        let newCategories = [...currentCategories];
        
        if (subcategoryExists) {
          // Usuń podkategorię
          newCategories = newCategories.filter(cat => cat !== subcategoryId);
        } else {
          // Dodaj tylko podkategorię (nie kategorię główną)
          newCategories.push(subcategoryId);
        }
        
        // Subcategory change debug removed
        
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
        
        // Main category change debug removed
        
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
      minPrice: -1,
      maxPrice: -1,
      inStock: false,
      onSale: false,
      sortBy: 'date' as const,
      sortOrder: 'desc' as const
    };
    
    // Usuń wszystkie dynamiczne atrybuty (pa_*)
    Object.keys(filters).forEach(key => {
      if (key.startsWith('pa_')) {
        delete clearedFilters[key];
      }
    });
    
    setFilters(clearedFilters);
    analytics.track('filters_clear_all');
    setSearchInput(''); // PRO: Also clear search input
    
    // PRO: Clear URL parameters
    router.replace('/sklep');
  };

  // Helpers: active filters and clearing single filter
  const activeFilters = () => {
    const items: Array<{ key: string; value: string; label: string }> = [];
    if (filters.search) items.push({ key: 'search', value: String(filters.search), label: `Szukaj: ${filters.search}` });
    filters.categories.forEach((c) => items.push({ key: 'category', value: c, label: `Kategoria: ${c}` }));
    if ((filters.brands as string[]).length) (filters.brands as string[]).forEach((b) => items.push({ key: 'brands', value: b, label: `Marka: ${b}` }));
    if (filters.minPrice > 0) items.push({ key: 'minPrice', value: String(filters.minPrice), label: `Min: ${filters.minPrice} zł` });
    if (filters.maxPrice > 0 && filters.maxPrice < 10000) items.push({ key: 'maxPrice', value: String(filters.maxPrice), label: `Max: ${filters.maxPrice} zł` });
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
    else if (key === 'minPrice') setFilters((p) => ({ ...p, minPrice: -1 }));
    else if (key === 'maxPrice') setFilters((p) => ({ ...p, maxPrice: -1 }));
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

  const breadcrumbs = [
    { label: 'Strona główna', href: '/' },
    { label: 'Sklep', href: '/sklep' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PageContainer className="py-4 pb-12">
        {/* Header with Title and Breadcrumbs */}
        <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-white border border-gray-200 rounded-3xl -mt-[10px] lg:mx-0 px-4 lg:px-8 pt-5 pb-6 sm:pt-6 sm:pb-8 mb-8">
          <div className="flex flex-col items-center justify-center gap-2 lg:gap-3 text-center">
            <h1 className="text-3xl font-normal text-gray-900">Sklep</h1>
            <Breadcrumbs items={breadcrumbs} variant="minimal" size="sm" />
          </div>
        </div>
        
        {/* Usunięto górną wyszukiwarkę – pozostaje ta w panelu filtrów */}
        
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Filters sidebar */}
          <ShopFilters
            categories={allCategories.map(c => ({ ...c, count: c.count || 0 }))}
            filters={filters}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            onFilterChange={handleFilterChange}
            onCategoryChange={handleCategoryChange}
            onClearFilters={clearFilters}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            totalProducts={totalProducts}
            attributesLoading={attributesLoading}
            dynamicFiltersData={{
              categories: hierarchicalCategories,
              attributes: {
                marka: { terms: brands },
                pojemnosc: { terms: capacities },
                zastosowanie: { terms: zastosowanie }
              }
            }}
            contextualAttributes={contextualAttributes}
            contextualLoading={contextualLoading}
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
            {/* Active filters bar */}
            <ActiveFiltersBar
              filters={filters}
              categories={allCategories}
              totalProducts={totalProducts}
              activeFiltersCount={activeFilters().length}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              onPriceRangeReset={() => setPriceRange({ min: 0, max: 10000 })}
            />
            
            {(products.length === 0) && (loading || filterLoading) ? (
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
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalProducts / productsPerPage)}
            onPageChange={setCurrentPage}
            showInfo={true}
            className="border-t border-gray-200 mt-8"
          />
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
