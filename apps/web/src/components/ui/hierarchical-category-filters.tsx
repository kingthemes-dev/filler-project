'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SubCategory {
  id: string;
  name: string;
  slug: string;
  count?: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories: SubCategory[];
  count?: number;
}

interface HierarchicalCategoryFiltersProps {
  onFilterChange: (key: 'categories', value: string) => void;
  selectedCategories: string[];
  totalProducts: number;
  wooCommerceCategories?: Array<{ id: number; name: string; slug: string; parent: number; count: number }>;
}

// Mapowanie rzeczywistych kategorii WooCommerce na hierarchiczną strukturę
const mapWooCommerceCategories = (wooCategories: Array<{ id: number; name: string; slug: string; parent: number; count: number }>) => {
    // Mapowanie slugów WooCommerce na nasze hierarchiczne kategorie
    const categoryMapping: Record<string, { mainCategory: string; subcategory?: string }> = {
      // Mezoterapia
      'cellulit': { mainCategory: 'mezoterapia', subcategory: 'cellulit' },
      'lipoliza': { mainCategory: 'mezoterapia', subcategory: 'lipoliza' },
      'rewitalizacja': { mainCategory: 'mezoterapia', subcategory: 'rewitalizacja' },
      'zmarszczki': { mainCategory: 'mezoterapia', subcategory: 'zmarszczki' },
      
      // Stymulatory
      'egzosomy': { mainCategory: 'stymulatory', subcategory: 'egzosomy' },
      'hydroksyapatyt-wapnia-caha': { mainCategory: 'stymulatory', subcategory: 'hydroksyapatyt-wapnia' },
      'kolagen': { mainCategory: 'stymulatory', subcategory: 'kolagen' },
      'kwas-bursztynowy': { mainCategory: 'stymulatory', subcategory: 'kwas-bursztynowy' },
      'kwas-hialuronowy': { mainCategory: 'stymulatory', subcategory: 'kwas-hialuronowy' },
      'kwas-polimlekowy-plla': { mainCategory: 'stymulatory', subcategory: 'kwas-polimlekowy' },
      'polikaprolakton-pcl': { mainCategory: 'stymulatory', subcategory: 'polikaprolakton' },
      'polinukleotydy': { mainCategory: 'stymulatory', subcategory: 'polinukleotydy' },
      
      // Wypełniacze
      'korekcja-nosa': { mainCategory: 'wypelniacze', subcategory: 'korekcja-nosa' },
      'wypelniacze-ha-ogolne': { mainCategory: 'wypelniacze', subcategory: 'wypelniacze-ha' },
      'zmarszczki-srednie': { mainCategory: 'wypelniacze', subcategory: 'zmarszczki-srednie' },
      
      // Peelingi
      'post-peel-pielegnacja-pozabiegowa': { mainCategory: 'peelingi', subcategory: 'post-peel' }
    };

  // Hierarchiczna struktura kategorii z rzeczywistymi liczbami produktów
  const hierarchicalCategories: Category[] = [
    {
      id: 'mezoterapia',
      name: 'Mezoterapia',
      slug: 'mezoterapia',
      subcategories: [
        { id: 'cellulit', name: 'Cellulit', slug: 'cellulit', count: 0 },
        { id: 'lipoliza', name: 'Lipoliza', slug: 'lipoliza', count: 0 },
        { id: 'rewitalizacja', name: 'Rewitalizacja', slug: 'rewitalizacja', count: 0 },
        { id: 'zmarszczki', name: 'Zmarszczki', slug: 'zmarszczki', count: 0 }
      ],
      count: 0
    },
    {
      id: 'peelingi',
      name: 'Peelingi',
      slug: 'peelingi',
      subcategories: [
        { id: 'post-peel', name: 'Post peel (pielęgnacja pozabiegowa)', slug: 'post-peel', count: 0 }
      ],
      count: 0
    },
    {
      id: 'stymulatory',
      name: 'Stymulatory',
      slug: 'stymulatory',
      subcategories: [
        { id: 'egzosomy', name: 'Egzosomy', slug: 'egzosomy', count: 0 },
        { id: 'hydroksyapatyt-wapnia', name: 'Hydroksyapatyt wapnia (CaHA)', slug: 'hydroksyapatyt-wapnia', count: 0 },
        { id: 'kolagen', name: 'Kolagen', slug: 'kolagen', count: 0 },
        { id: 'kwas-bursztynowy', name: 'Kwas bursztynowy', slug: 'kwas-bursztynowy', count: 0 },
        { id: 'kwas-hialuronowy', name: 'Kwas hialuronowy', slug: 'kwas-hialuronowy', count: 0 },
        { id: 'kwas-polimlekowy', name: 'Kwas polimlekowy (PLLA)', slug: 'kwas-polimlekowy', count: 0 },
        { id: 'polikaprolakton', name: 'Polikaprolakton (PCL)', slug: 'polikaprolakton', count: 0 },
        { id: 'polinukleotydy', name: 'Polinukleotydy', slug: 'polinukleotydy', count: 0 }
      ],
      count: 0
    },
    {
      id: 'wypelniacze',
      name: 'Wypełniacze',
      slug: 'wypelniacze',
      subcategories: [
        { id: 'korekcja-nosa', name: 'Korekcja nosa', slug: 'korekcja-nosa', count: 0 },
        { id: 'wypelniacze-ha', name: 'Wypełniacze HA (ogólne)', slug: 'wypelniacze-ha', count: 0 },
        { id: 'zmarszczki-srednie', name: 'Zmarszczki średnie', slug: 'zmarszczki-srednie', count: 0 }
      ],
      count: 0
    },
  ];

  // Aktualizuj liczby produktów na podstawie rzeczywistych danych WooCommerce
  wooCategories.forEach(wooCategory => {
    const mapping = categoryMapping[wooCategory.slug];
    if (mapping) {
      const mainCategory = hierarchicalCategories.find(cat => cat.id === mapping.mainCategory);
      if (mainCategory) {
        if (mapping.subcategory) {
          const subcategory = mainCategory.subcategories.find(sub => sub.slug === mapping.subcategory);
          if (subcategory) {
            subcategory.count = wooCategory.count;
          }
        } else {
          mainCategory.count = wooCategory.count;
        }
      }
    }
  });

  // Oblicz sumy dla kategorii głównych
  hierarchicalCategories.forEach(category => {
    if (category.subcategories.length > 0) {
      category.count = category.subcategories.reduce((sum, sub) => sum + (sub.count || 0), 0);
    }
  });

  return hierarchicalCategories;
};

// Domyślna hierarchiczna struktura kategorii (używana gdy nie ma danych z WooCommerce)
const defaultHierarchicalCategories: Category[] = [
  {
    id: 'mezoterapia',
    name: 'Mezoterapia',
    slug: 'mezoterapia',
    subcategories: [
      { id: 'cellulit', name: 'Cellulit', slug: 'cellulit', count: 0 },
      { id: 'lipoliza', name: 'Lipoliza', slug: 'lipoliza', count: 0 },
      { id: 'rewitalizacja', name: 'Rewitalizacja', slug: 'rewitalizacja', count: 0 },
      { id: 'zmarszczki', name: 'Zmarszczki', slug: 'zmarszczki', count: 0 }
    ],
    count: 0
  },
  {
    id: 'peelingi',
    name: 'Peelingi',
    slug: 'peelingi',
    subcategories: [
      { id: 'post-peel', name: 'Post peel (pielęgnacja pozabiegowa)', slug: 'post-peel', count: 0 }
    ],
    count: 0
  },
  {
    id: 'stymulatory',
    name: 'Stymulatory',
    slug: 'stymulatory',
    subcategories: [
      { id: 'egzosomy', name: 'Egzosomy', slug: 'egzosomy', count: 0 },
      { id: 'hydroksyapatyt-wapnia', name: 'Hydroksyapatyt wapnia (CaHA)', slug: 'hydroksyapatyt-wapnia', count: 0 },
      { id: 'kolagen', name: 'Kolagen', slug: 'kolagen', count: 0 },
      { id: 'kwas-bursztynowy', name: 'Kwas bursztynowy', slug: 'kwas-bursztynowy', count: 0 },
      { id: 'kwas-hialuronowy', name: 'Kwas hialuronowy', slug: 'kwas-hialuronowy', count: 0 },
      { id: 'kwas-polimlekowy', name: 'Kwas polimlekowy (PLLA)', slug: 'kwas-polimlekowy', count: 0 },
      { id: 'polikaprolakton', name: 'Polikaprolakton (PCL)', slug: 'polikaprolakton', count: 0 },
      { id: 'polinukleotydy', name: 'Polinukleotydy', slug: 'polinukleotydy', count: 0 }
    ],
    count: 0
  },
  {
    id: 'wypelniacze',
    name: 'Wypełniacze',
    slug: 'wypelniacze',
    subcategories: [
      { id: 'korekcja-nosa', name: 'Korekcja nosa', slug: 'korekcja-nosa', count: 0 },
      { id: 'wypelniacze-ha', name: 'Wypełniacze HA (ogólne)', slug: 'wypelniacze-ha', count: 0 },
      { id: 'zmarszczki-srednie', name: 'Zmarszczki średnie', slug: 'zmarszczki-srednie', count: 0 }
    ],
    count: 0
  }
];

export default function HierarchicalCategoryFilters({ 
  onFilterChange, 
  selectedCategories,
  totalProducts,
  wooCommerceCategories
}: HierarchicalCategoryFiltersProps) {
  // Użyj mapowania WooCommerce kategorii lub domyślnej struktury
  const hierarchicalCategories = wooCommerceCategories 
    ? mapWooCommerceCategories(wooCommerceCategories)
    : defaultHierarchicalCategories;
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleCategoryClick = (categoryId: string, subcategoryId?: string) => {
    const finalCategoryId = subcategoryId || categoryId;
    onFilterChange('categories', finalCategoryId);
  };

  const isCategoryExpanded = (categoryId: string) => expandedCategories.has(categoryId);
  const isSubcategorySelected = (subcategoryId: string) => selectedCategories.includes(subcategoryId);

  return (
    <div className="space-y-2">
          {/* Wszystkie kategorie - ukryte */}
          <label className="hidden items-center p-2 sm:p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              name="categories"
              value=""
              checked={selectedCategories.length === 0}
              onChange={() => onFilterChange('categories', '')}
              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
            />
            <span className="ml-3 text-xs sm:text-sm font-medium text-gray-700">Wszystkie kategorie</span>
            <span className="ml-auto text-xs text-gray-500">({totalProducts})</span>
          </label>

      {/* Hierarchiczne kategorie */}
      {hierarchicalCategories.map((category) => (
        <div key={category.id} className="border border-gray-100 rounded-lg overflow-hidden">
          {/* Główna kategoria - tylko do rozwijania */}
          <div className="bg-gray-50">
            <button
              onClick={() => toggleCategory(category.id)}
              className="flex items-center justify-between w-full p-2 sm:p-3 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <span className="text-xs sm:text-sm font-semibold text-gray-800">{category.name}</span>
                <span className="ml-2 text-xs text-gray-500">({category.count || 0})</span>
              </div>
              {isCategoryExpanded(category.id) ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          </div>

          {/* Podkategorie */}
          <AnimatePresence>
            {isCategoryExpanded(category.id) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden bg-white"
              >
                <div className="border-t border-gray-100">
                  {category.subcategories.map((subcategory, index) => (
                    <motion.label
                      key={subcategory.id}
                      className="flex items-center p-2 sm:p-3 pl-8 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <input
                        type="checkbox"
                        name="categories"
                        value={subcategory.slug}
                        checked={isSubcategorySelected(subcategory.slug)}
                        onChange={() => handleCategoryClick(category.slug, subcategory.slug)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 rounded"
                      />
                      <span className="ml-3 text-xs sm:text-sm font-medium text-gray-700 text-left">{subcategory.name}</span>
                      <span className="ml-auto text-xs text-gray-500">({subcategory.count || 0})</span>
                    </motion.label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
