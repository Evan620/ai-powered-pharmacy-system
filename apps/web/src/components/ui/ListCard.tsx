import * as React from 'react';
import { Card, CardBody, CardHeader } from './Card';
import { Button } from './Button';
import Link from 'next/link';

interface ListItem {
  label: string;
  value?: string;
  urgency?: 'expired' | 'critical' | 'warning' | 'normal';
}

interface ListCardProps {
  title: string;
  items: ListItem[];
  isLoading?: boolean;
  viewAllLink?: string;
  maxHeight?: string;
}

export function ListCard({ 
  title, 
  items, 
  isLoading = false, 
  viewAllLink,
  maxHeight = "300px" 
}: ListCardProps) {
  const getUrgencyStyles = (urgency?: string) => {
    switch (urgency) {
      case 'expired':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'warning':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-slate-700';
    }
  };

  const getValueStyles = (urgency?: string) => {
    switch (urgency) {
      case 'expired':
        return 'text-red-700 font-medium';
      case 'critical':
        return 'text-red-600 font-medium';
      case 'warning':
        return 'text-orange-600 font-medium';
      default:
        return 'text-slate-500';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-4 bg-gray-300 rounded w-24 animate-pulse" />
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 bg-gray-200 rounded flex-1 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-16 ml-4 animate-pulse" />
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
          <h3 className="text-sm font-medium text-slate-700">{title}</h3>
          {viewAllLink && items.length > 0 && (
            <Link href={viewAllLink}>
              <Button size="sm" variant="secondary">
                View All
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardBody>
        {items.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">
            No items to display
          </div>
        ) : (
          <div 
            className="space-y-2 overflow-y-auto scrollbar-hide"
            style={{ maxHeight, minHeight: '72px' }}
          >
            {items.map((item, i) => (
              <div 
                key={i} 
                className={`flex items-center justify-between text-sm p-2 rounded-md transition-colors ${
                  item.urgency === 'expired' || item.urgency === 'critical' 
                    ? getUrgencyStyles(item.urgency)
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className={`flex-1 ${getUrgencyStyles(item.urgency)}`}>
                  {item.label}
                </span>
                {item.value && (
                  <span className={`tabular-nums ml-2 ${getValueStyles(item.urgency)}`}>
                    {item.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

