import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'destructive' | 'warning';
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2',
          {
            'bg-slate-900 text-slate-50 hover:bg-slate-900/80': variant === 'default',
            'bg-slate-100 text-slate-900 hover:bg-slate-100/80': variant === 'secondary',
            'bg-green-100 text-green-800 hover:bg-green-100/80': variant === 'success',
            'bg-red-100 text-red-800 hover:bg-red-100/80': variant === 'destructive',
            'bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80': variant === 'warning',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };