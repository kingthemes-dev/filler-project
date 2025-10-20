'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ChevronDown, Check, X, Search, Filter, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnimatedDropdownOption {
  id: string | number;
  label: string;
  value: string;
  count?: number;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
  group?: string;
  badge?: string;
  color?: string;
}

export interface AnimatedDropdownProps {
  options: AnimatedDropdownOption[];
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
  triggerClassName?: string;
  contentClassName?: string;
  maxHeight?: number;
  showCounts?: boolean;
  searchable?: boolean;
  emptyMessage?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  renderOption?: (option: AnimatedDropdownOption, isSelected: boolean) => React.ReactNode;
  renderTrigger?: (selectedOptions: AnimatedDropdownOption[], isOpen: boolean) => React.ReactNode;
  variant?: 'default' | 'minimal' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  animation?: 'fade' | 'slide' | 'scale' | 'bounce';
}

const AnimatedDropdown: React.FC<AnimatedDropdownProps> = ({
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
  triggerClassName,
  contentClassName,
  maxHeight = 300,
  showCounts = true,
  searchable = false,
  emptyMessage = 'Brak opcji',
  onSearch,
  onClear,
  renderOption,
  renderTrigger,
  variant = 'default',
  size = 'md',
  animation = 'fade',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isHovered, setIsHovered] = useState(false);
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const controls = useAnimation();

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

  // Handle option selection
  const handleOptionSelect = useCallback((option: AnimatedDropdownOption) => {
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

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleOptionSelect(filteredOptions[focusedIndex]);
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
  }, [isOpen, filteredOptions, focusedIndex, handleOptionSelect]);

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

  // Animation variants
  const getAnimationVariants = () => {
    switch (animation) {
      case 'slide':
        return {
          initial: { opacity: 0, y: -10, scale: 0.95 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -10, scale: 0.95 }
        };
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.8 }
        };
      case 'bounce':
        return {
          initial: { opacity: 0, y: -20, scale: 0.9 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -20, scale: 0.9 }
        };
      default: // fade
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
    }
  };

  const isSelected = (option: AnimatedDropdownOption) => {
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

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-4 py-4 text-base'
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-white border border-gray-200 hover:border-gray-300',
    minimal: 'bg-transparent border-0 hover:bg-gray-50',
    outlined: 'bg-white border-2 border-gray-200 hover:border-gray-300',
    filled: 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
  };

  const defaultRenderOption = (option: AnimatedDropdownOption, isSelected: boolean) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.1 }}
      className="flex items-center justify-between w-full"
    >
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
        {option.badge && (
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
            option.color ? `bg-${option.color}-100 text-${option.color}-800` : "bg-gray-100 text-gray-600"
          )}>
            {option.badge}
          </span>
        )}
        {showCounts && option.count !== undefined && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {option.count}
          </span>
        )}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <Check className="w-4 h-4 text-blue-600" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );

  const defaultRenderTrigger = (selectedOptions: AnimatedDropdownOption[], isOpen: boolean) => (
    <motion.div
      className="flex items-center justify-between w-full"
      animate={{ scale: isHovered ? 1.02 : 1 }}
      transition={{ duration: 0.1 }}
    >
      <span className={cn(
        "truncate",
        selectedOptions.length === 0 && "text-gray-500"
      )}>
        {getDisplayText()}
      </span>
      <div className="flex items-center gap-1 ml-2">
        {clearable && selectedOptions.length > 0 && (
          <motion.button
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 rounded-full transition-colors"
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-3 h-3 text-gray-400" />
          </motion.button>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <div className={cn("relative", className)}>
      {/* Label */}
      {label && (
        <motion.label
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </motion.label>
      )}

      {/* Trigger */}
      <motion.button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "w-full text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
          "disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200",
          sizeClasses[size],
          variantClasses[variant],
          error && "border-red-300 focus:ring-red-500/20 focus:border-red-500",
          triggerClassName
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        whileHover={{ scale: disabled ? 1 : 1.01 }}
        whileTap={{ scale: disabled ? 1 : 0.99 }}
      >
        {renderTrigger ? renderTrigger(selectedOptions, isOpen) : defaultRenderTrigger(selectedOptions, isOpen)}
      </motion.button>

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={contentRef}
            {...getAnimationVariants()}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              "absolute top-full left-0 right-0 z-50 mt-1",
              "bg-white border border-gray-200 rounded-xl shadow-lg",
              "overflow-hidden backdrop-blur-sm",
              contentClassName
            )}
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {/* Search */}
            {searchable && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-3 border-b border-gray-100"
              >
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
              </motion.div>
            )}

            {/* Options */}
            <div className="overflow-y-auto" style={{ maxHeight: `${maxHeight - (searchable ? 60 : 0)}px` }}>
              {filteredOptions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ładowanie...</span>
                    </div>
                  ) : (
                    emptyMessage
                  )}
                </motion.div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelectedOption = isSelected(option);
                  const isFocused = index === focusedIndex;
                  
                  return (
                    <motion.button
                      key={option.id}
                      data-option-index={index}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => handleOptionSelect(option)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "w-full px-4 py-3 text-left transition-all duration-200",
                        "hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                        isFocused && "bg-blue-50",
                        isSelectedOption && "bg-blue-50",
                        option.disabled && "opacity-50 cursor-not-allowed",
                        "border-b border-gray-100 last:border-b-0"
                      )}
                      whileHover={{ x: 4 }}
                    >
                      {renderOption ? renderOption(option, isSelectedOption) : defaultRenderOption(option, isSelectedOption)}
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedDropdown;
