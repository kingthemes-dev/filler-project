'use client';

import HierarchicalCategories from './hierarchical-categories';

interface CategoryTabsProps {
  onCategoryChange: (categoryId: string, subcategoryId?: string) => void;
  selectedCategories: string[];
}

export default function CategoryTabs({
  onCategoryChange,
  selectedCategories,
}: CategoryTabsProps) {
  // Mapowanie starych selectedCategories na nową strukturę
  const selectedCategory =
    selectedCategories.length > 0 ? selectedCategories[0] : undefined;

  const handleCategoryChange = (categoryId: string, subcategoryId?: string) => {
    if (subcategoryId) {
      // Jeśli wybrano podkategorię, przekaż jej ID
      onCategoryChange(subcategoryId);
    } else {
      // Jeśli wybrano główną kategorię, przekaż jej ID
      onCategoryChange(categoryId);
    }
  };

  return (
    <HierarchicalCategories
      onCategoryChange={handleCategoryChange}
      selectedCategory={selectedCategory}
      selectedSubcategory={undefined} // Można rozszerzyć w przyszłości
    />
  );
}
