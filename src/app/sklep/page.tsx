'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, ChevronDown, ChevronUp, Grid3X3, List, SlidersHorizontal, Heart, ShoppingCart } from 'lucide-react';
import KingProductCard from '@/components/king-product-card';
import CategoryTabs from '@/components/ui/category-tabs';
import ShopFilters from '@/components/ui/shop-filters';
import wooCommerceService from '@/services/woocommerce-optimized';
import { formatPrice } from '@/utils/format-price';
import { ProductGridSkeleton, ProductListSkeletons } from '@/components/ui/skeleton';
import { useCartStore } from '@/stores/cart-store';
import { useFavoritesStore } from '@/stores/favorites-store';

interface FilterState {
  search: string;
  categories: string[]; // Changed from single category to array
  minPrice: number;
  maxPrice: number;
  inStock: boolean;
  onSale: boolean;
  featured: boolean;
  sortBy: 'date' | 'price' | 'name' | 'popularity';
  // New attribute filters
  capacities: string[]; // Pojemności (30ml, 50ml, 100ml)
  brands: string[]; // Marki (Bidalli, Filler)
}

interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export default function ShopPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [capacities, setCapacities] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attributesLoading, setAttributesLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(9);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [productVariants, setProductVariants] = useState<Record<number, { showVariants: boolean; selectedVariant: string }>>({});

  // Store hooks
  const { addItem } = useCartStore();
  const { addToFavorites, removeFromFavorites, favorites } = useFavoritesStore();
  const [filters, setFilters] = useState<FilterState>({
    search: searchQuery,
    categories: [], // Changed from single category to empty array
    minPrice: 0,
    maxPrice: 999999, // 9999 zł w groszach
    inStock: false,
    onSale: false,
    featured: false,
    sortBy: 'date',
    // New attribute filters
    capacities: [],
    brands: []
  });

  // Update filters when search query from URL changes
  useEffect(() => {
    if (searchQuery) {
      setFilters(prev => ({
        ...prev,
        search: searchQuery
      }));
    }
  }, [searchQuery]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await wooCommerceService.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  // Fetch attribute terms (capacities and brands)
  const fetchAttributes = useCallback(async () => {
    setAttributesLoading(true);
    try {
      // Fetch both attributes in parallel
      const [capacitiesResponse, brandsResponse] = await Promise.all([
        wooCommerceService.getAttributeTerms(4),
        wooCommerceService.getAttributeTerms(5)
      ]);

      // Process capacities
      const capacitiesData = Array.isArray(capacitiesResponse) ? capacitiesResponse : [];
      const mappedCapacities = capacitiesData.map((term: any) => ({
        id: term.id,
        name: term.name,
        slug: term.slug,
        count: term.count || 0
      }));
      setCapacities(mappedCapacities);

      // Process brands
      const brandsData = Array.isArray(brandsResponse) ? brandsResponse : [];
      const mappedBrands = brandsData.map((term: any) => ({
        id: term.id,
        name: term.name,
        slug: term.slug,
        count: term.count || 0
      }));
      setBrands(mappedBrands);
    } catch (error) {
      console.error('Error fetching attributes:', error);
    } finally {
      setAttributesLoading(false);
    }
  }, []);

  // Fetch products with filters
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Map sortBy values to WooCommerce API values
      const sortByMapping: Record<string, string> = {
        'date': 'date',
        'price': 'price',
        'name': 'title', // WooCommerce uses 'title' instead of 'name'
        'popularity': 'popularity'
      };

      const query: any = {
        page: currentPage,
        per_page: productsPerPage,
        orderby: sortByMapping[filters.sortBy] || 'date',
        order: 'desc',
      };

      // Add filters
      if (filters.search) query.search = filters.search;
      if (filters.categories.length > 0) query.category = filters.categories.join(',');
      if (filters.minPrice > 0) query.min_price = (filters.minPrice / 100).toString(); // Convert grosze to PLN
      if (filters.maxPrice < 999999) query.max_price = (filters.maxPrice / 100).toString(); // Convert grosze to PLN
      if (filters.inStock) query.stock_status = 'instock';
      if (filters.onSale) query.on_sale = true;
      if (filters.featured) query.featured = true;
      
      // Note: WooCommerce API doesn't filter variable products by attributes properly
      // We'll filter client-side instead

      const response = await wooCommerceService.getProducts(query);
      let products = response.data || [];
      
      // Client-side filtering for attributes (WooCommerce API doesn't filter variable products properly)
      if (filters.capacities.length > 0 || filters.brands.length > 0) {
        products = products.filter((product: any) => {
          if (!product.attributes || !Array.isArray(product.attributes)) return false;
          
          let matchesCapacity = true;
          let matchesBrand = true;
          
          // Check capacity filter
          if (filters.capacities.length > 0) {
            const capacityAttribute = product.attributes.find((attr: any) => 
              attr.name === 'Pojemność' || attr.slug === 'pa_pojemnosc'
            );
            
            if (capacityAttribute && capacityAttribute.options) {
              const selectedCapacityNames = filters.capacities.map(capacityId => {
                const capacity = capacities.find(c => c.id.toString() === capacityId);
                return capacity ? capacity.name : '';
              }).filter(name => name);
              
              matchesCapacity = capacityAttribute.options.some((option: string) => 
                selectedCapacityNames.includes(option)
              );
            } else {
              matchesCapacity = false;
            }
          }
          
          // Check brand filter
          if (filters.brands.length > 0) {
            const brandAttribute = product.attributes.find((attr: any) => 
              attr.name === 'Marka' || attr.slug === 'pa_marka'
            );
            
            if (brandAttribute && brandAttribute.options) {
              const selectedBrandNames = filters.brands.map(brandId => {
                const brand = brands.find(b => b.id.toString() === brandId);
                return brand ? brand.name : '';
              }).filter(name => name);
              
              matchesBrand = brandAttribute.options.some((option: string) => 
                selectedBrandNames.includes(option)
              );
            } else {
              matchesBrand = false;
            }
          }
          
          return matchesCapacity && matchesBrand;
        });
      }
      
      // Additional client-side sorting for price to handle sale prices correctly
      if (filters.sortBy === 'price') {
        products = products.sort((a, b) => {
          // Get the actual price (sale_price if exists, otherwise regular price)
          const getActualPrice = (product: any) => {
            const price = product.sale_price || product.price || '0';
            // Try both formats - direct float and grosze conversion
            const directPrice = parseFloat(price);
            const groszePrice = parseFloat(price) / 100;
            
            // If the price seems too high (like 10000+), it's probably in grosze
            return directPrice > 1000 ? groszePrice : directPrice;
          };
          
          const priceA = getActualPrice(a);
          const priceB = getActualPrice(b);
          
          return priceB - priceA; // Descending order (highest first)
        });
      }
      
      setProducts(products);
      setTotalProducts(response.total || 0);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, productsPerPage, capacities, brands]);

  // Fetch categories and attributes on mount
  useEffect(() => {
    fetchCategories();
    fetchAttributes();
  }, [fetchCategories, fetchAttributes]);

  // Fetch products after attributes are loaded
  useEffect(() => {
    if (capacities.length > 0 || brands.length > 0) {
      fetchProducts();
    }
  }, [capacities, brands, fetchProducts]);

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
      // Handle multi-select arrays (categories, capacities, brands)
      setFilters(prev => {
        const currentArray = prev[key] as string[];
        const itemId = value.toString();
        
        return currentArray.includes(itemId)
          ? { ...prev, [key]: currentArray.filter(id => id !== itemId) }
          : { ...prev, [key]: [...currentArray, itemId] };
      });
    } else {
      setFilters(prev => ({ ...prev, [key]: value }));
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      categories: [], // Changed from single category to empty array
      minPrice: 0,
      maxPrice: 999999,
      inStock: false,
      onSale: false,
      featured: false,
      sortBy: 'date',
      // New attribute filters
      capacities: [],
      brands: []
    });
  };

  // Handle add to cart
  const handleAddToCart = async (product: any) => {
    try {
      let cartItem;
      
      if (product.type === 'variable' && productVariants[product.id]?.selectedVariant) {
        // For variable products with selected variant, get the specific variation
        const variations = await wooCommerceService.getProductVariations(product.id);
        const selectedVariation = variations.find((variation: any) => 
          variation.attributes.some((attr: any) => 
            attr.slug === 'pa_pojemnosc' && attr.option === productVariants[product.id].selectedVariant
          )
        );
        
        if (selectedVariation) {
          cartItem = {
            id: selectedVariation.id,
            name: `${product.name} - ${productVariants[product.id].selectedVariant}`,
            price: parseFloat(selectedVariation.price),
            sale_price: parseFloat(selectedVariation.sale_price),
            image: product.images && product.images[0] ? product.images[0].src : '',
            permalink: product.permalink
          };
        } else {
          // Fallback to main product if variation not found
          cartItem = {
            id: product.id,
            name: product.name,
            price: product.sale_price || product.price,
            sale_price: product.sale_price,
            image: product.images && product.images[0] ? product.images[0].src : '',
            permalink: product.permalink
          };
        }
      } else {
        // For simple products or variable products without selected variant
        cartItem = {
          id: product.id,
          name: product.name,
          price: product.sale_price || product.price,
          sale_price: product.sale_price,
          image: product.images && product.images[0] ? product.images[0].src : '',
          permalink: product.permalink
        };
      }

      console.log('🛒 Adding to cart from list:', cartItem);
      addItem(cartItem);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  // Handle add to favorites
  const handleToggleFavorite = (product: any) => {
    const isFavorite = favorites.some(fav => fav.id === product.id);
    if (isFavorite) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product);
    }
  };

  // Handle variant selection for list view
  const handleVariantSelect = (productId: number, variant: string) => {
    setProductVariants(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        selectedVariant: variant,
        showVariants: false
      }
    }));
  };

  const handleShowVariants = (productId: number) => {
    setProductVariants(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        showVariants: true
      }
    }));
  };

  const handleAddToCartWithVariant = (product: any) => {
    if (product.type === 'variable' && !productVariants[product.id]?.selectedVariant) {
      handleShowVariants(product.id);
      return;
    }
    handleAddToCart(product);
  };

  // Get available variants from product attributes
  const getAvailableVariants = (product: any) => {
    if (!product.attributes) return [];
    const capacityAttr = product.attributes.find((attr: any) => 
      attr.name === 'Pojemność' || attr.slug === 'pa_pojemnosc'
    );
    return capacityAttr ? capacityAttr.options : [];
  };

  const totalPages = Math.ceil(totalProducts / productsPerPage);

  return (
    <div className="bg-white">
      {/* Category Tabs Section */}
      <CategoryTabs 
        onCategoryChange={(categoryId) => handleFilterChange('categories', categoryId)}
        selectedCategories={filters.categories}
      />

      <div className="max-w-[95vw] mx-auto px-6 py-8">

        {/* Enhanced Search and Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-row gap-3">
            {/* Search Section */}
            <div className="flex-1 relative min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Szukaj..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 placeholder-gray-500 bg-gray-50 focus:bg-white transition-all duration-200 text-sm"
                />
                {filters.search && (
                  <button
                    onClick={() => handleFilterChange('search', '')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex-shrink-0">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="appearance-none px-3 py-4 pr-8 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-200 text-gray-900 cursor-pointer text-sm min-w-[100px]"
              >
                <option value="date">Data</option>
                <option value="price">Cena</option>
                <option value="name">Nazwa</option>
                <option value="popularity">Popularność</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-200 rounded-xl overflow-hidden flex-shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-4 transition-all duration-200 flex items-center justify-center ${
                  viewMode === 'grid'
                    ? 'bg-black text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                title="Widok siatki"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-4 transition-all duration-200 flex items-center justify-center ${
                  viewMode === 'list'
                    ? 'bg-black text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                title="Widok listy"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.search || filters.categories.length > 0 || filters.capacities.length > 0 || filters.brands.length > 0 || filters.minPrice > 0 || filters.maxPrice < 999999 || filters.inStock || filters.onSale || filters.featured) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Aktywne filtry:</span>
                {filters.search && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-black text-white text-sm rounded-full">
                    Wyszukiwanie: "{filters.search}"
                    <button
                      onClick={() => handleFilterChange('search', '')}
                      className="ml-1 hover:text-gray-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.categories.map(categoryId => {
                  const category = categories.find(c => c.id.toString() === categoryId);
                  return (
                    <span key={categoryId} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      Kategoria: {category?.name || categoryId}
                      <button
                        onClick={() => handleFilterChange('categories', categoryId)}
                        className="ml-1 hover:text-gray-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                {filters.capacities.map(capacityId => {
                  const capacity = capacities.find(c => c.id.toString() === capacityId);
                  return (
                    <span key={capacityId} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      Pojemność: {capacity?.name || capacityId}
                      <button
                        onClick={() => handleFilterChange('capacities', capacityId)}
                        className="ml-1 hover:text-gray-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                {filters.brands.map(brandId => {
                  const brand = brands.find(b => b.id.toString() === brandId);
                  return (
                    <span key={brandId} className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      Marka: {brand?.name || brandId}
                      <button
                        onClick={() => handleFilterChange('brands', brandId)}
                        className="ml-1 hover:text-gray-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
                {(filters.minPrice > 0 || filters.maxPrice < 999999) && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    Cena: {filters.minPrice/100}-{filters.maxPrice/100} zł
                    <button
                      onClick={() => {
                        handleFilterChange('minPrice', 0);
                        handleFilterChange('maxPrice', 999999);
                      }}
                      className="ml-1 hover:text-gray-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.inStock && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    W magazynie
                    <button
                      onClick={() => handleFilterChange('inStock', false)}
                      className="ml-1 hover:text-gray-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.onSale && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    Promocje
                    <button
                      onClick={() => handleFilterChange('onSale', false)}
                      className="ml-1 hover:text-gray-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.featured && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    Polecane
                    <button
                      onClick={() => handleFilterChange('featured', false)}
                      className="ml-1 hover:text-gray-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-black transition-colors underline"
                >
                  Wyczyść wszystkie
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
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
                {filters.categories.length > 0 && ` w kategoriach: ${filters.categories.map(id => categories.find(c => c.id.toString() === id)?.name).filter(Boolean).join(', ')}`}
              </p>
            </div>

            {/* Products Grid */}
            {loading ? (
              // Loading skeleton
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
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
              // Products display based on view mode
              viewMode === 'grid' ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {products.map((product) => (
                    <KingProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                // List view
                <div className="space-y-4 -mt-4">
                  {products.map((product) => (
                    <div 
                      key={product.id} 
                      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => window.location.href = `/produkt/${product.slug}`}
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Product Image */}
                        <div className="w-full sm:w-48 h-48 sm:h-32 bg-white relative overflow-hidden flex-shrink-0">
                          {product.images && product.images[0] ? (
                            <img
                              src={product.images[0].src}
                              alt={product.name}
                              className="w-full h-full object-contain object-center bg-white transform translate-y-[10%]"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Search className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between h-full">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                                {product.name}
                              </h3>
                              
                              <div className="flex items-center mb-2">
                                <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < Math.floor(parseFloat(product.average_rating || '0'))
                                          ? 'text-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    >
                                      ★
                                    </div>
                                  ))}
                                </div>
                                <span className="text-sm text-gray-500 ml-2">
                                  ({product.rating_count} opinii)
                                </span>
                              </div>
                              
                              
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span>Kategoria:</span>
                                <span className="font-medium">
                                  {product.categories && product.categories.length > 0 
                                    ? (() => {
                                        // Znajdź pierwszą kategorię, która nie jest "Wszystkie kategorie"
                                        const mainCategory = product.categories.find(cat => 
                                          cat.name !== 'Wszystkie kategorie' && cat.name !== 'Wszystkie'
                                        );
                                        return mainCategory ? mainCategory.name : product.categories[0].name;
                                      })()
                                    : 'Brak kategorii'
                                  }
                                </span>
                              </div>
                            </div>
                            
                            {/* Price and Actions */}
                            <div className="flex flex-col sm:items-end mt-4 sm:mt-0">
                              <div className="flex items-center gap-2 mb-4">
                                {product.sale_price ? (
                                  <>
                                    <span className="text-xl font-bold text-red-600">
                                      {formatPrice(product.sale_price)}
                                    </span>
                                    <span className="text-sm text-gray-500 line-through">
                                      {formatPrice(product.price)}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xl font-bold text-gray-900">
                                    {formatPrice(product.price)}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  className={`p-2 rounded-lg transition-colors ${
                                    favorites.some(fav => fav.id === product.id)
                                      ? 'text-red-500'
                                      : 'text-gray-400 hover:text-red-500'
                                  }`}
                                  title={favorites.some(fav => fav.id === product.id) ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFavorite(product);
                                  }}
                                >
                                  <Heart className={`w-5 h-5 ${favorites.some(fav => fav.id === product.id) ? 'fill-current' : ''}`} />
                                </button>
                                
                                {product.type === 'variable' && productVariants[product.id]?.showVariants ? (
                                  <div className="flex flex-col gap-2">
                                    <div className="text-sm font-medium text-gray-700">Wybierz pojemność:</div>
                                    <div className="flex flex-wrap gap-2">
                                      {getAvailableVariants(product).map((variant: string) => (
                                        <button
                                          key={variant}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleVariantSelect(product.id, variant);
                                          }}
                                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                            productVariants[product.id]?.selectedVariant === variant
                                              ? 'bg-black text-white border-black'
                                              : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                                          }`}
                                        >
                                          {variant}
                                        </button>
                                      ))}
                                    </div>
                                    {productVariants[product.id]?.selectedVariant && (
                                      <button
                                        className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAddToCart(product);
                                        }}
                                      >
                                        <ShoppingCart className="w-4 h-4" />
                                        Dodaj {productVariants[product.id]?.selectedVariant} do koszyka
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    className="bg-black text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToCartWithVariant(product);
                                    }}
                                  >
                                    <ShoppingCart className="w-4 h-4" />
                                    {product.type === 'variable' ? 'Wybierz wariant' : 'Dodaj do koszyka'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
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
