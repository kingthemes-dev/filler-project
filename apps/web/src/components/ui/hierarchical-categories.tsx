'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowRight } from 'lucide-react';

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

interface HierarchicalCategoriesProps {
  onCategoryChange: (categoryId: string, subcategoryId?: string) => void;
  selectedCategory?: string;
  selectedSubcategory?: string;
}

// Hierarchiczna struktura kategorii zgodna z wymaganiami
const hierarchicalCategories: Category[] = [
  {
    id: 'mezoterapia',
    name: 'Mezoterapia',
    slug: 'mezoterapia',
    subcategories: [
      { id: 'cellulit', name: 'Cellulit', slug: 'cellulit' },
      { id: 'lipoliza', name: 'Lipoliza', slug: 'lipoliza' },
      { id: 'rewitalizacja', name: 'Rewitalizacja', slug: 'rewitalizacja' },
      { id: 'zmarszczki', name: 'Zmarszczki', slug: 'zmarszczki' },
    ],
  },
  {
    id: 'peelingi',
    name: 'Peelingi',
    slug: 'peelingi',
    subcategories: [
      {
        id: 'post-peel',
        name: 'Post peel (pielęgnacja pozabiegowa)',
        slug: 'post-peel',
      },
    ],
  },
  {
    id: 'stymulatory',
    name: 'Stymulatory',
    slug: 'stymulatory',
    subcategories: [
      { id: 'egzosomy', name: 'Egzosomy', slug: 'egzosomy' },
      {
        id: 'hydroksyapatyt',
        name: 'Hydroksyapatyt wapnia (CaHA)',
        slug: 'hydroksyapatyt-wapnia',
      },
      { id: 'kolagen', name: 'Kolagen', slug: 'kolagen' },
      {
        id: 'kwas-bursztynowy',
        name: 'Kwas bursztynowy',
        slug: 'kwas-bursztynowy',
      },
      {
        id: 'kwas-hialuronowy',
        name: 'Kwas hialuronowy',
        slug: 'kwas-hialuronowy',
      },
      {
        id: 'kwas-polimlekowy',
        name: 'Kwas polimlekowy (PLLA)',
        slug: 'kwas-polimlekowy',
      },
      {
        id: 'polikaprolakton',
        name: 'Polikaprolakton (PCL)',
        slug: 'polikaprolakton',
      },
      { id: 'polinukleotydy', name: 'Polinukleotydy', slug: 'polinukleotydy' },
    ],
  },
  {
    id: 'wypelniacze',
    name: 'Wypełniacze',
    slug: 'wypelniacze',
    subcategories: [
      { id: 'korekcja-nosa', name: 'Korekcja nosa', slug: 'korekcja-nosa' },
      {
        id: 'wypelniacze-ha',
        name: 'Wypełniacze HA (ogólne)',
        slug: 'wypelniacze-ha',
      },
      {
        id: 'zmarszczki-srednie',
        name: 'Zmarszczki średnie',
        slug: 'zmarszczki-srednie',
      },
    ],
  },
];

export default function HierarchicalCategories({
  onCategoryChange,
  selectedCategory,
  selectedSubcategory,
}: HierarchicalCategoriesProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

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
    onCategoryChange(categoryId, subcategoryId);
  };

  const isCategoryExpanded = (categoryId: string) =>
    expandedCategories.has(categoryId);
  const isCategorySelected = (categoryId: string) =>
    selectedCategory === categoryId;
  const isSubcategorySelected = (subcategoryId: string) =>
    selectedSubcategory === subcategoryId;

  return (
    <div className="w-full max-w-6xl mx-auto px-6">
      {/* Wszystkie kategorie button */}
      <motion.button
        onClick={() => handleCategoryClick('')}
        className={`w-full mb-4 px-6 py-4 rounded-2xl text-left font-semibold text-lg transition-all duration-300 ${
          !selectedCategory
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl'
            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:shadow-lg'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <span>Wszystkie kategorie</span>
          {!selectedCategory && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"
            >
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          )}
        </div>
      </motion.button>

      {/* Hierarchiczne kategorie */}
      <div className="space-y-3">
        {hierarchicalCategories.map(category => (
          <motion.div
            key={category.id}
            className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Główna kategoria */}
            <motion.button
              onClick={() => {
                toggleCategory(category.id);
                handleCategoryClick(category.id);
              }}
              className={`w-full px-6 py-4 text-left transition-all duration-300 ${
                isCategorySelected(category.id)
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{
                      rotate: isCategoryExpanded(category.id) ? 90 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </motion.div>
                  <span className="font-semibold text-lg">{category.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isCategorySelected(category.id) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.button>

            {/* Podkategorie */}
            <AnimatePresence>
              {isCategoryExpanded(category.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-gray-100 bg-gray-50/50">
                    {category.subcategories.map((subcategory, index) => (
                      <motion.button
                        key={subcategory.id}
                        onClick={() =>
                          handleCategoryClick(category.id, subcategory.id)
                        }
                        className={`w-full px-6 py-3 text-left transition-all duration-200 flex items-center gap-3 ${
                          isSubcategorySelected(subcategory.id)
                            ? 'bg-purple-100 text-purple-700 border-l-4 border-purple-500'
                            : 'text-gray-600 hover:bg-white hover:text-gray-800'
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 4 }}
                      >
                        <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                        <span className="font-medium">{subcategory.name}</span>
                        {isSubcategorySelected(subcategory.id) && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"
                          >
                            <ArrowRight className="w-3 h-3 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Dodatkowe kategorie (jeśli są) */}
      <motion.div
        className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <p className="text-sm text-gray-500 text-center">
          💡 <strong>Wskazówka:</strong> Kliknij na kategorię, aby zobaczyć
          podkategorie
        </p>
      </motion.div>
    </div>
  );
}
