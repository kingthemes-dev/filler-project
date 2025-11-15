'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = true,
  className,
}: PaginationProps) {
  // Generowanie zakresu stron do wyświetlenia
  const getVisiblePages = () => {
    const delta = 2; // Liczba stron po każdej stronie aktualnej
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = getVisiblePages();
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 py-6',
        className
      )}
    >
      {/* Informacje o stronach */}
      {showInfo && (
        <div className="text-sm text-gray-600 order-2 sm:order-1">
          Strona{' '}
          <span className="font-semibold text-gray-900">{currentPage}</span> z{' '}
          <span className="font-semibold text-gray-900">{totalPages}</span>
        </div>
      )}

      {/* Kontrolki paginacji */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Poprzednia strona */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          className={cn(
            'h-9 px-3 gap-2 font-medium transition-all duration-300',
            'border-gray-300 text-gray-700 hover:bg-gray-50',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            'hover:border-gray-400 hover:text-gray-900'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Poprzednia</span>
        </Button>

        {/* Numery stron */}
        <div className="flex items-center gap-1 mx-2">
          {visiblePages.map((page, index) => {
            if (page === '...') {
              return (
                <div
                  key={`dots-${index}`}
                  className="flex items-center justify-center w-9 h-9"
                >
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </div>
              );
            }

            const pageNumber = page as number;
            const isActive = currentPage === pageNumber;

            return (
              <Button
                key={pageNumber}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(pageNumber)}
                className={cn(
                  'h-9 w-9 p-0 font-medium transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-r from-gray-900 to-black text-white shadow-sm hover:bg-gradient-to-l hover:from-gray-800 hover:to-gray-900'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                {pageNumber}
              </Button>
            );
          })}
        </div>

        {/* Następna strona */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          className={cn(
            'h-9 px-3 gap-2 font-medium transition-all duration-300',
            'border-gray-300 text-gray-700 hover:bg-gray-50',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            'hover:border-gray-400 hover:text-gray-900'
          )}
        >
          <span className="hidden sm:inline">Następna</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Hook do zarządzania stanem paginacji
export function usePagination<T>(totalItems: number, itemsPerPage: number) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    totalPages,
    hasNextPage: (currentPage: number) => currentPage < totalPages,
    hasPrevPage: (currentPage: number) => currentPage > 1,
    getPageItems: (currentPage: number, allItems: T[]) => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return allItems.slice(startIndex, endIndex);
    },
  };
}
