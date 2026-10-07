import * as React from 'react';
import { cn } from '@/lib/utils';

export const controlClass =
  'w-full rounded border border-line-strong bg-surface text-sm text-ink shadow-xs transition-colors ' +
  'placeholder:text-ink-muted/80 hover:border-ink-muted/60 focus-visible:border-brand focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-focus/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed ' +
  'disabled:bg-surface-subtle disabled:opacity-70 aria-[invalid=true]:border-danger';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = 'text', ...props }, ref) => (
    <input ref={ref} type={type} className={cn(controlClass, 'h-10 px-3', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(controlClass, 'min-h-20 px-3 py-2 leading-relaxed', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        controlClass,
        'h-10 appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pl-3 pr-9',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

/** Input with a fixed unit suffix, e.g. an amount in coins. */
export const AmountInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { unit: string }>(
  ({ className, unit, ...props }, ref) => (
    <div className="relative">
      <input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        className={cn(controlClass, 'h-10 pl-3 pr-14 tabular-nums', className)}
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-ink-muted">
        {unit}
      </span>
    </div>
  ),
);
AmountInput.displayName = 'AmountInput';
