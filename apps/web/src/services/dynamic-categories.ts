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
  private cache: Map<string, unknown> = new Map();

  constructor() {
    // Use absolute URL on server (Node fetch requires it), relative in browser
    const isBrowser = typeof window !== 'undefined';
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    this.baseUrl = isBrowser ? '/api/woocommerce' : `${base}/api/woocommerce`;
  }

  /**
   * Pobiera wszystkie kategorie z WordPress/WooCommerce z cache
   */
  async getAllCategories(): Promise<WooCategory[]> {
    const cacheKey = 'categories';

    // Sprawdź cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as WooCategory[];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}?endpoint=products/categories&per_page=100`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const categoriesRaw = Array.isArray(data)
        ? data
        : this.toRecord(data)?.categories;

      const categories = Array.isArray(categoriesRaw)
        ? categoriesRaw
            .map(item => this.transformCategory(item))
            .filter((category): category is WooCategory => category !== null)
        : [];

      // Zapisz w cache
      this.cache.set(cacheKey, categories);

      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback - zwróć pustą tablicę zamiast crashować
      return [];
    }
  }

  /**
   * Pobiera wszystkie atrybuty z WordPress/WooCommerce z cache
   */
  async getAllAttributes(): Promise<WooAttribute[]> {
    const cacheKey = 'attributes';

    // Sprawdź cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) as WooAttribute[];
    }

    try {
      // Use local API custom attributes endpoint (maps to King Shop API)
      const response = await fetch(`${this.baseUrl}?endpoint=attributes`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const parsedData = this.toRecord(data);

      let attributesRaw: unknown[] = [];
      if (Array.isArray(data)) {
        attributesRaw = data;
      } else if (
        parsedData?.attributes &&
        typeof parsedData.attributes === 'object'
      ) {
        attributesRaw = Object.entries(
          parsedData.attributes as Record<string, unknown>
        ).map(([slug, value]) => {
          const valueRecord = this.toRecord(value);
          return {
            id: valueRecord?.id ?? slug,
            name: valueRecord?.name ?? slug,
            slug,
            type: valueRecord?.type ?? 'select',
            order_by: valueRecord?.order_by ?? 'menu_order',
            has_archives: false,
            terms: [],
          };
        });
      }

      const attributes = attributesRaw
        .map(item => this.transformAttribute(item))
        .filter((attribute): attribute is WooAttribute => attribute !== null);

      // Zapisz w cache
      this.cache.set(cacheKey, attributes);

      return attributes;
    } catch (error) {
      console.error('Error fetching attributes:', error);
      // Fallback - zwróć pustą tablicę zamiast crashować
      return [];
    }
  }

  /**
   * Pobiera terminy dla konkretnego atrybutu
   */
  async getAttributeTerms(attributeSlug: string): Promise<WooAttributeTerm[]> {
    try {
      // Use local API route for attribute terms
      const response = await fetch(
        `${this.baseUrl}?endpoint=attributes/${attributeSlug}/terms`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        // If endpoint doesn't exist for given slug, gracefully return empty
        return [];
      }

      const data = await response.json();
      const termsArray = Array.isArray(data) ? data : [];
      return termsArray
        .map(term => this.transformTerm(term))
        .filter((term): term is WooAttributeTerm => term !== null);
    } catch (error) {
      console.warn(
        `Error fetching terms for attribute ${attributeSlug}:`,
        error
      );
      return [];
    }
  }

  private transformCategory(raw: unknown): WooCategory | null {
    const record = this.toRecord(raw);
    if (!record) {
      return null;
    }

    const idValue = this.toNumber(record.id);
    const parent = this.toNumber(record.parent, 0) ?? 0;
    const count = this.toNumber(record.count, 0) ?? 0;
    const name = this.toOptionalString(record.name);
    const slug = this.toOptionalString(record.slug);
    const imageRecord = this.toRecord(record.image);

    if (idValue === undefined || !name || !slug) {
      return null;
    }

    const image = imageRecord
      ? {
          src: this.toOptionalString(imageRecord.src) || '',
          alt: this.toOptionalString(imageRecord.alt) || name,
        }
      : undefined;

    return {
      id: idValue,
      name,
      slug,
      parent,
      count,
      description: this.toOptionalString(record.description),
      image,
    };
  }

  private transformAttribute(raw: unknown): WooAttribute | null {
    const record = this.toRecord(raw);
    if (!record) {
      return null;
    }

    const idValue = this.toNumber(record.id);
    const name = this.toOptionalString(record.name);
    const slug = this.toOptionalString(record.slug);
    const type = this.toOptionalString(record.type) || 'select';
    const orderBy = this.toOptionalString(record.order_by) || 'menu_order';
    const hasArchives =
      typeof record.has_archives === 'boolean' ? record.has_archives : false;

    if (idValue === undefined || !name || !slug) {
      return null;
    }

    const termsRaw = Array.isArray(record.terms) ? record.terms : [];
    const terms = termsRaw
      .map(term => this.transformTerm(term))
      .filter((term): term is WooAttributeTerm => term !== null);

    return {
      id: idValue,
      name,
      slug,
      type,
      order_by: orderBy,
      has_archives: hasArchives,
      terms,
    };
  }

  private transformTerm(raw: unknown): WooAttributeTerm | null {
    const record = this.toRecord(raw);
    if (!record) {
      return null;
    }

    const idValue = this.toNumber(record.id);
    const name = this.toOptionalString(record.name);
    const slug = this.toOptionalString(record.slug);
    const count = this.toNumber(record.count, 0) ?? 0;

    if (idValue === undefined || !name || !slug) {
      return null;
    }

    return {
      id: idValue,
      name,
      slug,
      count,
    };
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value === 'object' && value !== null) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private toNumber(value: unknown, fallback?: number): number | undefined {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return fallback;
  }

  private toOptionalString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return undefined;
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
        image: category.image,
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
        this.getAllAttributes(),
      ]);

      // Zbuduj hierarchię kategorii
      const hierarchicalCategories = this.buildCategoryHierarchy(categories);

      // Pobierz terminy dla każdego atrybutu
      const attributesWithTerms: {
        [key: string]: {
          name: string;
          slug: string;
          terms: WooAttributeTerm[];
        };
      } = {};

      for (const attribute of attributes) {
        const terms = await this.getAttributeTerms(attribute.slug);
        attributesWithTerms[attribute.slug] = {
          name: attribute.name,
          slug: attribute.slug,
          terms: terms,
        };
      }

      return {
        categories: hierarchicalCategories,
        attributes: attributesWithTerms,
      };
    } catch (error) {
      console.error('Error fetching dynamic filters:', error);
      return {
        categories: [],
        attributes: {},
      };
    }
  }

  /**
   * Czyści cache serwisu
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Pobiera kategorie z liczbami produktów dla konkretnego filtra
   */
  async getCategoriesWithCounts(
    filters: {
      search?: string;
      category?: string;
      attributes?: { [key: string]: string[] };
      minPrice?: number;
      maxPrice?: number;
      onSale?: boolean;
    } = {}
  ): Promise<HierarchicalCategory[]> {
    try {
      // Pobierz wszystkie kategorie
      const allCategories = await this.getAllCategories();

      // Jeśli nie ma filtrów, zwróć wszystkie kategorie
      if (
        !filters.category &&
        !filters.search &&
        !filters.attributes &&
        !filters.minPrice &&
        !filters.maxPrice &&
        !filters.onSale
      ) {
        return this.buildCategoryHierarchy(allCategories);
      }

      // Pobierz produkty z filtrami aby uzyskać aktualne liczby
      const params = new URLSearchParams();
      params.append('endpoint', 'shop');
      params.append('per_page', '1'); // Tylko liczba, nie produkty

      if (filters.search) params.append('search', filters.search);
      if (filters.minPrice)
        params.append('min_price', filters.minPrice.toString());
      if (filters.maxPrice)
        params.append('max_price', filters.maxPrice.toString());
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
