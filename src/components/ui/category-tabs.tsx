'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import wooCommerceService from '@/services/woocommerce-optimized';

interface Category {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface CategoryTabsProps {
  onCategoryChange: (categoryId: string) => void;
  selectedCategories: string[];
}

export default function CategoryTabs({ onCategoryChange, selectedCategories }: CategoryTabsProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Hardcoded kategorie dla szybkości - można zastąpić API call
  const hardcodedCategories: Category[] = [
    { id: 0, name: 'Wszystkie kategorie', slug: '', count: 0 },
    { id: 1, name: 'Kremy', slug: 'kremy', count: 12 },
    { id: 2, name: 'Serum', slug: 'serum', count: 8 },
    { id: 3, name: 'Toniki', slug: 'toniki', count: 6 },
    { id: 4, name: 'Oczyszczanie', slug: 'oczyszczanie', count: 10 },
    { id: 5, name: 'Ochrona przeciwsłoneczna', slug: 'ochrona-przeciwsloneczna', count: 5 },
    { id: 6, name: 'Pielęgnacja ciała', slug: 'pielegnacja-ciala', count: 7 }
  ];

  useEffect(() => {
    // Pobierz prawdziwe kategorie z API
    fetchRealCategories();
  }, []);

  const fetchRealCategories = async () => {
    try {
      const response = await wooCommerceService.getCategories();
      const realCategories = response.data || [];
      
      // Użyj tylko kategorii z API (bez dodawania "Wszystkie kategorie")
      const allCategories = realCategories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        count: cat.count || 0
      }));
      
      // Sortuj kategorie - "Wszystkie kategorie" na początku
      const sortedCategories = allCategories.sort((a, b) => {
        if (a.name === 'Wszystkie kategorie') return -1;
        if (b.name === 'Wszystkie kategorie') return 1;
        return a.name.localeCompare(b.name);
      });
      
      setCategories(sortedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback do hardcoded kategorii
      setCategories(hardcodedCategories);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 py-8 mx-6 rounded-3xl">
        <div className="max-w-[95vw] mx-auto px-6">
          <div className="text-center mb-6">
            <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto animate-pulse"></div>
          </div>
          <div className="flex justify-center gap-3 flex-wrap">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-10 bg-gray-200 rounded-full w-24 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-8 mx-6 rounded-3xl">
      <div className="max-w-[95vw] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Sklep
          </h2>
          <p className="text-lg text-gray-600">
            Odkryj nasze produkty do pielęgnacji skóry dla zdrowego blasku
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center gap-3 flex-wrap">
          {categories.map((category) => {
            const categoryId = category.name === 'Wszystkie kategorie' ? '' : category.id.toString();
            const isSelected = selectedCategories.includes(categoryId);
            
            return (
              <motion.button
                key={category.id}
                onClick={() => onCategoryChange(categoryId)}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {category.name}
                {isSelected && selectedCategories.length > 1 && (
                  <span className="ml-2 text-xs opacity-75">✓</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
