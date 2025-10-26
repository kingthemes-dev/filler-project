'use client';

import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import SearchModal from './search-modal';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  onExpand?: () => void;
  value?: string;
  onChange?: (value: string) => void;
}

export default function SearchBar({ 
  placeholder = "Szukaj produktów...", 
  className = "",
  onSearch,
  onExpand,
  value,
  onChange
}: SearchBarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSearchClick = useCallback(() => {
    if (onExpand) {
      onExpand();
    } else {
      setIsModalOpen(true);
    }
  }, [onExpand]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleSearch = useCallback((query: string) => {
    if (onSearch) {
      onSearch(query);
    }
  }, [onSearch]);

  return (
    <>
      {/* Search Input - Active input field */}
      <div className={`relative ${className}`}>
        <input
          type="text"
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={handleSearchClick}
          className="block w-full pl-10 pr-4 py-3 leading-5 bg-white placeholder-gray-500 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        placeholder={placeholder}
        onSearch={handleSearch}
      />
    </>
  );
}