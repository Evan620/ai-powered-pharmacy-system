import * as React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Checkbox({ label, id, ...props }: Props) {
  const checkboxId = id ?? React.useId();
  return (
    <label htmlFor={checkboxId} className="inline-flex items-center gap-2 text-sm text-slate-700">
      <input
        id={checkboxId}
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        {...props}
      />
      {label}
    </label>
  );
}

