import * as React from 'react';
import { Card, CardBody, CardHeader } from './Card';
import { Button } from './Button';
import Link from 'next/link';

interface MiniTableColumn {
  key: string;
  header: string;
  width?: string;
  className?: string;
}

interface MiniTableRow {
  [key: string]: any;
  urgency?: 'expired' | 'critical' | 'warning' | 'normal';
}

interface MiniTableProps {
  title: string;
  columns: MiniTableColumn[];
  data: MiniTableRow[];
  isLoading?: boolean;
  viewAllLink?: string;
  maxHeight?: string;
  emptyMessage?: string;
}

export function MiniTable({
  title,
  columns,
  data,
  isLoading = false,
  viewAllLink,
  maxHeight = "320px",
  emptyMessage = "No data available"
}: MiniTableProps) {
  const getRowStyles = (urgency?: string) => {
    switch (urgency) {
      case 'expired':
        return 'bg-red-50 border-red-100';
      case 'critical':
        return 'bg-red-25 border-red-50';
      case 'warning':
        return 'bg-orange-25 border-orange-50';
      default:
        return 'hover:bg-gray-50';
    }
  };

  const getCellStyles = (urgency?: string, isValue = false) => {
    if (isValue) {
      switch (urgency) {
        case 'expired':
          return 'text-red-700 font-semibold';
        case 'critical':
          return 'text-red-600 font-medium';
        case 'warning':
          return 'text-orange-600 font-medium';
        default:
          return 'text-gray-600';
      }
    }
    
    switch (urgency) {
      case 'expired':
        return 'text-red-800';
      case 'critical':
        return 'text-red-700';
      case 'warning':
        return 'text-orange-700';
      default:
        return 'text-gray-900';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-4 bg-gray-300 rounded w-32 animate-pulse" />
        </CardHeader>
        <CardBody>
          <div className="space-y-2">
            {/* Header skeleton */}
            <div className="grid gap-2 pb-2 border-b" style={{ gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ') }}>
              {columns.map((col, i) => (
                <div key={i} className="h-3 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
            {/* Rows skeleton */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid gap-2 py-2" style={{ gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ') }}>
                {columns.map((col, j) => (
                  <div key={j} className="h-3 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          {viewAllLink && data.length > 0 && (
            <Link href={viewAllLink}>
              <Button size="sm" variant="secondary">
                View All
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {data.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <div 
            className="overflow-y-auto scrollbar-hide"
            style={{ maxHeight }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
              <div className="grid gap-3 text-xs font-medium text-gray-500 uppercase tracking-wider" 
                   style={{ gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ') }}>
                {columns.map((col) => (
                  <div key={col.key} className={col.className}>
                    {col.header}
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="divide-y divide-gray-100">
              {data.map((row, index) => (
                <div 
                  key={index} 
                  className={`px-4 py-3 transition-colors ${getRowStyles(row.urgency)}`}
                >
                  <div className="grid gap-3 text-sm" 
                       style={{ gridTemplateColumns: columns.map(col => col.width || '1fr').join(' ') }}>
                    {columns.map((col) => (
                      <div key={col.key} className={`${col.className} ${getCellStyles(row.urgency, col.key.includes('value') || col.key.includes('days') || col.key.includes('stock'))}`}>
                        {row[col.key]}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}