'use client';

import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchModal from './search-modal';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  onExpand?: () => void;
  value?: string;
  onChange?: (value: string) => void;
  isExpanded?: boolean;
  onClose?: () => void;
}

export default function SearchBar({ 
  placeholder = "Szukaj produktów...", 
  className = "",
  onSearch,
  onExpand,
  value,
  onChange,
  isExpanded,
  onClose
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
          className="block w-full pl-10 pr-12 py-3 leading-5 bg-white placeholder-gray-500 text-sm border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        
        {/* Close Button - tylko gdy expanded */}
        <AnimatePresence>
          {isExpanded && onClose && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full transition-all duration-200 group"
              whileHover={{ 
                scale: 1.15,
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)"
              }}
              whileTap={{ 
                scale: 0.85,
                backgroundColor: "rgba(239, 68, 68, 0.2)"
              }}
            >
              <motion.div
                whileHover={{ rotate: 90 }}
                transition={{ duration: 0.2 }}
              >
                <X className="h-4 w-4 text-gray-500 group-hover:text-red-500 transition-colors duration-200" />
              </motion.div>
            </motion.button>
          )}
        </AnimatePresence>
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