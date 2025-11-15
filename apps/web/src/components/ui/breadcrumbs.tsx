'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  maxItems?: number;
  showHomeIcon?: boolean;
  variant?: 'default' | 'minimal' | 'elevated';
  size?: 'sm' | 'md' | 'lg';
}

export default function Breadcrumbs({
  items,
  className = '',
  maxItems = 4,
  showHomeIcon = true,
  variant = 'default',
  size = 'md',
}: BreadcrumbsProps) {
  // removed unused overflow state
  const [showOverflow, setShowOverflow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // removed overflow measurement effect

  // Size variants
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const spacingClasses = {
    sm: 'space-x-1',
    md: 'space-x-2',
    lg: 'space-x-3',
  };

  // Variant styles
  const variantClasses = {
    default: {
      container:
        'bg-gradient-to-br from-gray-50 via-gray-100 to-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm',
      item: 'text-gray-600 hover:text-gray-900',
      active: 'text-gray-900 font-semibold',
      separator: 'text-gray-400',
    },
    minimal: {
      container: 'bg-transparent',
      item: 'text-gray-500 hover:text-gray-700',
      active: 'text-gray-900 font-medium',
      separator: 'text-gray-300',
    },
    elevated: {
      container:
        'bg-gradient-to-br from-gray-50 via-gray-100 to-white border border-gray-200 rounded-xl px-4 py-3 shadow-md backdrop-blur-sm',
      item: 'text-gray-600 hover:text-gray-900',
      active: 'text-gray-900 font-semibold',
      separator: 'text-gray-400',
    },
  };

  const currentVariant = variantClasses[variant];

  // Render breadcrumb item
  const renderBreadcrumbItem = (
    item: BreadcrumbItem,
    index: number,
    isActive: boolean
  ) => {
    const ItemIcon = item.icon;

    if (isActive) {
      return (
        <motion.span
          key={index}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: index * 0.1 }}
          className={`${currentVariant.active} ${sizeClasses[size]} flex items-center`}
          aria-current="page"
        >
          {ItemIcon && <ItemIcon className={`${iconSizes[size]} mr-1.5`} />}
          <span className="truncate">{item.label}</span>
        </motion.span>
      );
    }

    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: index * 0.1 }}
        className="relative group"
      >
        <Link
          href={item.href}
          className={`${currentVariant.item} ${sizeClasses[size]} flex items-center transition-all duration-200`}
          onMouseEnter={() => setShowOverflow(false)}
        >
          {index === 0 && showHomeIcon ? (
            <Home
              className={`${iconSizes[size]} mr-1.5 group-hover:rotate-12 transition-transform duration-200`}
            />
          ) : ItemIcon ? (
            <ItemIcon
              className={`${iconSizes[size]} mr-1.5 transition-transform duration-200`}
            />
          ) : null}
          <span className="truncate">{item.label}</span>
        </Link>

        {/* Hover tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {item.label}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </motion.div>
    );
  };

  // Render separator
  const renderSeparator = (index: number) => (
    <motion.div
      key={`separator-${index}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: index * 0.1 + 0.1 }}
      className="flex items-center"
    >
      <ChevronRight
        className={`${iconSizes[size]} ${currentVariant.separator} mx-1 transition-colors duration-200`}
      />
    </motion.div>
  );

  // Handle overflow
  const shouldTruncate = items.length > maxItems;
  const displayItems = shouldTruncate ? items.slice(-maxItems) : items;
  const hiddenItems = shouldTruncate ? items.slice(0, -maxItems) : [];

  return (
    <nav
      className={`flex items-center ${currentVariant.container} ${className}`}
      aria-label="Breadcrumb"
      ref={containerRef}
    >
      <ol
        className={`flex items-center ${spacingClasses[size]} overflow-hidden`}
      >
        {/* Hidden items indicator */}
        {shouldTruncate && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="relative group"
            >
              <button
                onClick={() => setShowOverflow(!showOverflow)}
                className={`${currentVariant.item} ${sizeClasses[size]} flex items-center transition-all duration-200`}
                aria-label="Show more breadcrumbs"
              >
                <MoreHorizontal className={`${iconSizes[size]} mr-1`} />
                <span className="sr-only">More</span>
              </button>

              {/* Overflow dropdown */}
              <AnimatePresence>
                {showOverflow && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] z-20"
                  >
                    {hiddenItems.map((item, index) => (
                      <Link
                        key={index}
                        href={item.href}
                        className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200"
                        onClick={() => setShowOverflow(false)}
                      >
                        {item.icon && <item.icon className="w-4 h-4 mr-2" />}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            {renderSeparator(0)}
          </>
        )}

        {/* Display items */}
        {displayItems.map((item, index) => {
          const isActive = index === displayItems.length - 1;
          const globalIndex = shouldTruncate
            ? hiddenItems.length + index
            : index;

          return (
            <React.Fragment key={`breadcrumb-${globalIndex}`}>
              {index > 0 && renderSeparator(globalIndex)}
              {renderBreadcrumbItem(item, globalIndex, isActive)}
            </React.Fragment>
          );
        })}
      </ol>

      {/* Click outside to close overflow */}
      {showOverflow && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowOverflow(false)}
        />
      )}
    </nav>
  );
}
