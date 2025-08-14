import * as React from 'react';
import clsx from 'clsx';
import { Button } from './Button';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  className
}: TableProps<T>) {
  if (loading) {
    return (
      <div className={clsx('border border-gray-200 rounded-lg overflow-hidden', className)}>
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="flex space-x-4">
            {columns.map((col) => (
              <div key={col.key} className="h-4 bg-gray-300 rounded animate-pulse flex-1" />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-6 py-4 border-b border-gray-200 last:border-b-0">
            <div className="flex space-x-4">
              {columns.map((col) => (
                <div key={col.key} className="h-4 bg-gray-200 rounded animate-pulse flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={clsx('border border-gray-200 rounded-lg', className)}>
        <div className="overflow-x-auto">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div 
              className="grid gap-4"
              style={{ 
                gridTemplateColumns: `repeat(${columns.length}, minmax(160px, 1fr))`,
                minWidth: `${columns.length * 160}px`
              }}
            >
              {columns.map((col) => (
                <div key={col.key} className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col.header}
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 py-12 text-center text-gray-500">
            {emptyMessage}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('border border-gray-200 rounded-lg', className)}>
      <div className="overflow-x-auto">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div 
            className="grid gap-4"
            style={{ 
              gridTemplateColumns: `repeat(${columns.length}, minmax(160px, 1fr))`,
              minWidth: `${columns.length * 160}px`
            }}
          >
            {columns.map((col) => (
              <div key={col.key} className={clsx(
                'text-xs font-medium text-gray-500 uppercase tracking-wider',
                col.className
              )}>
                {col.header}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <div key={item.id || index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div 
                className="grid gap-4"
                style={{ 
                  gridTemplateColumns: `repeat(${columns.length}, minmax(160px, 1fr))`,
                  minWidth: `${columns.length * 160}px`
                }}
              >
                {columns.map((col) => (
                  <div key={col.key} className={clsx(
                    'text-sm text-gray-900',
                    col.className
                  )}>
                    {col.render ? col.render(item) : item[col.key]}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
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

  if (totalPages <= 1) return null;

  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>

        <div className="flex items-center space-x-1">
          {getVisiblePages().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-sm text-gray-500">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className="min-w-[2.5rem]"
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}