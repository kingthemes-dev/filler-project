/**
 * Dynamic Categories Service
 * Automatycznie pobiera i buduje hierarchię kategorii z WordPress/WooCommerce
 */

export interface WooCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  description?: string;
  image?: {
    src: string;
    alt: string;
  };
}

export interface WooAttribute {
  id: number;
  name: string;
  slug: string;
  type: string;
  order_by: string;
  has_archives: boolean;
  terms: WooAttributeTerm[];
}

export interface WooAttributeTerm {
  id: number;
  name: string;
  slug: string;
  count: number;
}

export interface HierarchicalCategory {
  id: string;
  name: string;
  slug: string;
  count: number;
  parent: number;
  level: number;
  subcategories: HierarchicalCategory[];
  description?: string;
  image?: {
    src: string;
    alt: string;
  };
}

export interface DynamicFilters {
  categories: HierarchicalCategory[];
  attributes: {
    [key: string]: {
      name: string;
      slug: string;
      terms: WooAttributeTerm[];
    };
  };
}

class DynamicCategoriesService {
  private baseUrl: string;

  constructor() {
    // Use absolute URL for server-side calls
    this.baseUrl = typeof window === 'undefined' ? 'http://localhost:3002/api/woocommerce' : '/api/woocommerce';
  }

  /**
   * Pobiera wszystkie kategorie z WordPress/WooCommerce
   */
  async getAllCategories(): Promise<WooCategory[]> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=products/categories&per_page=100`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : (data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Pobiera wszystkie atrybuty z WordPress/WooCommerce
   */
  async getAllAttributes(): Promise<WooAttribute[]> {
    try {
      const response = await fetch(`${this.baseUrl}?endpoint=products/attributes&per_page=100`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : (data.attributes || []);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      return [];
    }
  }

  /**
   * Pobiera terminy dla konkretnego atrybutu
   */
  async getAttributeTerms(attributeSlug: string): Promise<WooAttributeTerm[]> {
    try {
      // Use King Shop API directly - same as mobile menu and desktop dropdown
      const wordpressUrl = 'https://qvwltjhdjw.cfolks.pl';
      const response = await fetch(`${wordpressUrl}/wp-json/king-shop/v1/attributes`, { cache: 'no-store' });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract terms for specific attribute
      const attributeData = data.attributes?.[attributeSlug];
      if (attributeData?.terms) {
        return attributeData.terms.map((term: any) => ({
          id: term.id,
          name: term.name,
          slug: term.slug,
          count: term.count || 0
        }));
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching terms for attribute ${attributeSlug}:`, error);
      return [];
    }
  }

  /**
   * Buduje hierarchiczną strukturę kategorii
   */
  buildCategoryHierarchy(categories: WooCategory[]): HierarchicalCategory[] {
    // Sortuj kategorie według parent i id
    const sortedCategories = categories.sort((a, b) => {
      if (a.parent !== b.parent) {
        return a.parent - b.parent;
      }
      return a.id - b.id;
    });

    // Stwórz mapę kategorii
    const categoryMap = new Map<number, HierarchicalCategory>();
    const rootCategories: HierarchicalCategory[] = [];

    // Najpierw stwórz wszystkie kategorie bez subcategories
    sortedCategories.forEach(category => {
      const hierarchicalCategory: HierarchicalCategory = {
        id: category.slug,
        name: category.name,
        slug: category.slug,
        count: category.count,
        parent: category.parent,
        level: 0,
        subcategories: [],
        description: category.description,
        image: category.image
      };

      categoryMap.set(category.id, hierarchicalCategory);
    });

    // Następnie zbuduj hierarchię
    sortedCategories.forEach(category => {
      const hierarchicalCategory = categoryMap.get(category.id);
      if (!hierarchicalCategory) return;

      if (category.parent === 0) {
        // Kategoria główna
        hierarchicalCategory.level = 0;
        rootCategories.push(hierarchicalCategory);
      } else {
        // Kategoria podrzędna
        const parentCategory = categoryMap.get(category.parent);
        if (parentCategory) {
          hierarchicalCategory.level = parentCategory.level + 1;
          parentCategory.subcategories.push(hierarchicalCategory);
        } else {
          // Jeśli nie ma rodzica, traktuj jako główną
          hierarchicalCategory.level = 0;
          rootCategories.push(hierarchicalCategory);
        }
      }
    });

    return rootCategories;
  }

  /**
   * Pobiera wszystkie dane filtrów (kategorie + atrybuty)
   */
  async getDynamicFilters(): Promise<DynamicFilters> {
    try {
      // Pobierz kategorie i atrybuty równolegle
      const [categories, attributes] = await Promise.all([
        this.getAllCategories(),
        this.getAllAttributes()
      ]);

      // Zbuduj hierarchię kategorii
      const hierarchicalCategories = this.buildCategoryHierarchy(categories);

      // Pobierz terminy dla każdego atrybutu
      const attributesWithTerms: { [key: string]: { name: string; slug: string; terms: WooAttributeTerm[] } } = {};
      
      for (const attribute of attributes) {
        const terms = await this.getAttributeTerms(attribute.slug);
        attributesWithTerms[attribute.slug] = {
          name: attribute.name,
          slug: attribute.slug,
          terms: terms
        };
      }

      return {
        categories: hierarchicalCategories,
        attributes: attributesWithTerms
      };
    } catch (error) {
      console.error('Error fetching dynamic filters:', error);
      return {
        categories: [],
        attributes: {}
      };
    }
  }

  /**
   * Pobiera kategorie z liczbami produktów dla konkretnego filtra
   */
  async getCategoriesWithCounts(filters: {
    search?: string;
    category?: string;
    attributes?: { [key: string]: string[] };
    minPrice?: number;
    maxPrice?: number;
    onSale?: boolean;
  } = {}): Promise<HierarchicalCategory[]> {
    try {
      // Pobierz wszystkie kategorie
      const allCategories = await this.getAllCategories();
      
      // Jeśli nie ma filtrów, zwróć wszystkie kategorie
      if (!filters.category && !filters.search && !filters.attributes && !filters.minPrice && !filters.maxPrice && !filters.onSale) {
        return this.buildCategoryHierarchy(allCategories);
      }

      // Pobierz produkty z filtrami aby uzyskać aktualne liczby
      const params = new URLSearchParams();
      params.append('endpoint', 'shop');
      params.append('per_page', '1'); // Tylko liczba, nie produkty
      
      if (filters.search) params.append('search', filters.search);
      if (filters.minPrice) params.append('min_price', filters.minPrice.toString());
      if (filters.maxPrice) params.append('max_price', filters.maxPrice.toString());
      if (filters.onSale) params.append('on_sale', 'true');

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      const data = await response.json();

      // Użyj kategorii z odpowiedzi API (z aktualnymi liczbami)
      if (data.categories) {
        return this.buildCategoryHierarchy(data.categories);
      }

      // Fallback do wszystkich kategorii
      return this.buildCategoryHierarchy(allCategories);
    } catch (error) {
      console.error('Error fetching categories with counts:', error);
      const allCategories = await this.getAllCategories();
      return this.buildCategoryHierarchy(allCategories);
    }
  }
}

export const dynamicCategoriesService = new DynamicCategoriesService();
