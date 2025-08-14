import * as React from 'react';
import clsx from 'clsx';

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  options?: Array<{ label: string; value: string }>;
};

export const Select = React.forwardRef<HTMLSelectElement, Props>(
  ({ className, label, hint, error, id, options = [], children, ...props }, ref) => {
    const selectId = id ?? React.useId();
    const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">{label}</label>
        )}
        <select
          id={selectId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={clsx(
            'w-full rounded-md border border-gray-300 px-3 py-2 text-sm',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
            error && 'border-red-300',
            className
          )}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          {children}
        </select>
        {hint && !error && <p id={`${selectId}-hint`} className="text-xs text-slate-500">{hint}</p>}
        {error && <p id={`${selectId}-error`} className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

