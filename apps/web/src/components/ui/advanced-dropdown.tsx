'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DropdownOption {
  id: string | number;
  label: string;
  value: string;
  count?: number;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
  group?: string;
}

export interface AdvancedDropdownProps {
  options: DropdownOption[];
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  multiSelect?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  maxHeight?: number;
  showCounts?: boolean;
  groupBy?: string;
  emptyMessage?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  renderOption?: (option: DropdownOption, isSelected: boolean) => React.ReactNode;
  renderTrigger?: (selectedOptions: DropdownOption[], isOpen: boolean) => React.ReactNode;
}

const AdvancedDropdown: React.FC<AdvancedDropdownProps> = ({
  options = [],
  value,
  onChange,
  placeholder = 'Wybierz opcję...',
  searchable = false,
  multiSelect = false,
  clearable = false,
  disabled = false,
  loading = false,
  error,
  className,
  triggerClassName,
  contentClassName,
  maxHeight = 300,
  showCounts = true,
  groupBy,
  emptyMessage = 'Brak opcji',
  onSearch,
  onClear,
  renderOption,
  renderTrigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Get selected options
  const selectedOptions = React.useMemo(() => {
    if (!value) return [];
    const values = Array.isArray(value) ? value : [value];
    return options.filter(option => values.includes(option.value));
  }, [value, options]);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  // Group options if groupBy is specified
  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return { '': filteredOptions };
    
    return filteredOptions.reduce((groups, option) => {
      const group = option.group || '';
      if (!groups[group]) groups[group] = [];
      groups[group].push(option);
      return groups;
    }, {} as Record<string, DropdownOption[]>);
  }, [filteredOptions, groupBy]);

  // Handle option selection
  const handleOptionSelect = useCallback((option: DropdownOption) => {
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
  }, [value, onChange, multiSelect]);

  // Handle clear
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiSelect) {
      onChange([]);
    } else {
      onChange('');
    }
    onClear?.();
  }, [onChange, multiSelect, onClear]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  }, [onSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const visibleOptions = Object.values(groupedOptions).flat();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < visibleOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : visibleOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < visibleOptions.length) {
          handleOptionSelect(visibleOptions[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  }, [isOpen, groupedOptions, focusedIndex, handleOptionSelect]);

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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Reset focused index when options change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredOptions]);

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && contentRef.current) {
      const focusedElement = contentRef.current.querySelector(`[data-option-index="${focusedIndex}"]`);
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  const isSelected = (option: DropdownOption) => {
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

  const defaultRenderOption = (option: DropdownOption, isSelected: boolean) => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {option.icon && (
          <div className="flex-shrink-0 text-gray-400">
            {option.icon}
          </div>
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
        {isSelected && (
          <Check className="w-4 h-4 text-blue-600" />
        )}
      </div>
    </div>
  );

  const defaultRenderTrigger = (selectedOptions: DropdownOption[], isOpen: boolean) => (
    <div className="flex items-center justify-between w-full">
      <span className={cn(
        "truncate",
        selectedOptions.length === 0 && "text-gray-500"
      )}>
        {getDisplayText()}
      </span>
      <div className="flex items-center gap-1 ml-2">
        {clearable && selectedOptions.length > 0 && (
          <button
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 rounded-full transition-colors"
            type="button"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
        )}
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </div>
    </div>
  );

  return (
    <div className={cn("relative", className)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full px-4 py-3 text-left bg-white border border-gray-200 rounded-xl",
          "hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200",
          error && "border-red-300 focus:ring-red-500/20 focus:border-red-500",
          triggerClassName
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-describedby={error ? `${triggerRef.current?.id}-error` : undefined}
      >
        {renderTrigger ? renderTrigger(selectedOptions, isOpen) : defaultRenderTrigger(selectedOptions, isOpen)}
      </button>

      {/* Error message */}
      {error && (
        <p id={`${triggerRef.current?.id}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={contentRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              "absolute top-full left-0 right-0 z-50 mt-1",
              "bg-white border border-gray-200 rounded-xl shadow-lg",
              "overflow-hidden",
              contentClassName
            )}
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {/* Search */}
            {searchable && (
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Szukaj..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <div className="overflow-y-auto" style={{ maxHeight: `${maxHeight - (searchable ? 60 : 0)}px` }}>
              {Object.keys(groupedOptions).length === 0 ? (
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
                Object.entries(groupedOptions).map(([groupName, groupOptions]) => (
                  <div key={groupName}>
                    {/* Group Header */}
                    {groupBy && groupName && (
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                        {groupName}
                      </div>
                    )}

                    {/* Group Options */}
                    {groupOptions.map((option, index) => {
                      const isSelectedOption = isSelected(option);
                      const isFocused = index === focusedIndex;
                      
                      return (
                        <button
                          key={option.id}
                          data-option-index={index}
                          type="button"
                          disabled={option.disabled}
                          onClick={() => handleOptionSelect(option)}
                          className={cn(
                            "w-full px-4 py-3 text-left transition-colors",
                            "hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                            isFocused && "bg-blue-50",
                            isSelectedOption && "bg-blue-50",
                            option.disabled && "opacity-50 cursor-not-allowed",
                            "border-b border-gray-100 last:border-b-0"
                          )}
                        >
                          {renderOption ? renderOption(option, isSelectedOption) : defaultRenderOption(option, isSelectedOption)}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedDropdown;
