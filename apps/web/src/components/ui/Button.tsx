import * as React from 'react';
import clsx from 'clsx';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export function Button({ className, variant = 'primary', size = 'md', loading, children, ...props }: ButtonProps & { loading?: boolean }) {
  // Remove loading from props so it isn't passed to the DOM
  // Use for UI but do not spread to <button>
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-md font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        variant === 'primary' && 'text-white shadow-sm bg-brand-600 hover:bg-brand-700',
        variant === 'secondary' && 'bg-white border border-gray-300 shadow-sm hover:bg-gray-50',
        variant === 'ghost' && 'bg-transparent hover:bg-white/50',
        sizes[size],
        className
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="animate-spin mr-2 w-4 h-4 border-2 border-t-transparent border-current rounded-full inline-block align-middle"></span>
      ) : null}
      {children}
    </button>
  );
}

