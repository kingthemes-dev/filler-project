'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
// removed unused AdvancedDropdown import

export interface ShopDropdownOption {
  id: string | number;
  label: string;
  value: string;
  count?: number;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
  group?: string;
}

export interface ShopDropdownProps {
  options: ShopDropdownOption[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  label?: string;
  multiSelect?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  className?: string;
  showCounts?: boolean;
  searchable?: boolean;
  emptyMessage?: string;
  onClear?: () => void;
  onSearch?: (query: string) => void;
}

const ShopDropdown: React.FC<ShopDropdownProps> = ({
  options = [],
  value,
  onChange,
  placeholder = 'Wybierz opcję...',
  label,
  multiSelect = false,
  clearable = true,
  disabled = false,
  loading = false,
  error,
  className,
  showCounts = true,
  searchable = false,
  emptyMessage = 'Brak opcji',
  onClear,
  onSearch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Get selected options
  const selectedOptions = React.useMemo(() => {
    if (!value) return [];
    const values = Array.isArray(value) ? value : [value];
    return options.filter(option => values.includes(option.value));
  }, [value, options]);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    return options.filter(
      option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  // Handle option selection
  const handleOptionSelect = (option: ShopDropdownOption) => {
    if (option.disabled) return;

    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      const isSelected = currentValues.includes(option.value);

      if (isSelected) {
        onChange(currentValues.filter(v => v !== option.value));
      } else {
        onChange([...currentValues, option.value]);
      }
    } else {
      onChange(option.value);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiSelect) {
      onChange([]);
    } else {
      onChange('');
    }
    onClear?.();
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isSelected = (option: ShopDropdownOption) => {
    if (multiSelect) {
      return Array.isArray(value) && value.includes(option.value);
    }
    return value === option.value;
  };

  const getDisplayText = () => {
    if (selectedOptions.length === 0) return placeholder;
    if (multiSelect) {
      if (selectedOptions.length === 1) return selectedOptions[0].label;
      return `${selectedOptions.length} wybranych`;
    }
    return selectedOptions[0]?.label || placeholder;
  };

  const renderOption = (option: ShopDropdownOption, isSelected: boolean) => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {option.icon && (
          <div className="flex-shrink-0 text-gray-400">{option.icon}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {option.label}
          </div>
          {option.description && (
            <div className="text-sm text-gray-500 truncate">
              {option.description}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {showCounts && option.count !== undefined && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {option.count}
          </span>
        )}
        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
      </div>
    </div>
  );

  const renderTrigger = (
    selectedOptions: ShopDropdownOption[],
    isOpen: boolean
  ) => (
    <div className="flex items-center justify-between w-full">
      <span
        className={cn(
          'truncate',
          selectedOptions.length === 0 && 'text-gray-500'
        )}
      >
        {getDisplayText()}
      </span>
      <div className="flex items-center gap-1 ml-2">
        {clearable && selectedOptions.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center p-0.5 hover:bg-gray-100 rounded-full transition-colors"
            type="button"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {/* Dropdown */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={cn(
            'w-full px-4 py-3 text-left bg-white border border-gray-200 rounded-xl',
            'hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200',
            error && 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          {renderTrigger(selectedOptions, isOpen)}
        </button>

        {/* Error message */}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

        {/* Dropdown Content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={contentRef}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
              style={{ maxHeight: '300px' }}
            >
              {/* Search */}
              {searchable && (
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      placeholder="Szukaj..."
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                        <span>Ładowanie...</span>
                      </div>
                    ) : (
                      emptyMessage
                    )}
                  </div>
                ) : (
                  filteredOptions.map(option => {
                    const isSelectedOption = isSelected(option);

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={option.disabled}
                        onClick={() => handleOptionSelect(option)}
                        className={cn(
                          'w-full px-4 py-3 text-left transition-colors',
                          'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
                          isSelectedOption && 'bg-blue-50',
                          option.disabled && 'opacity-50 cursor-not-allowed',
                          'border-b border-gray-100 last:border-b-0'
                        )}
                      >
                        {renderOption(option, isSelectedOption)}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ShopDropdown;
