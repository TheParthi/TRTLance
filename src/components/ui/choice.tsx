'use client';

import * as React from 'react';
import * as RadioPrimitive from '@radix-ui/react-radio-group';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Native checkbox styled to match the design system (no hidden form proxy, so it hydrates cleanly).
 * Same props as before: `checked` and `onCheckedChange`.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'checked' | 'type'> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}>(({ className, checked, onCheckedChange, ...props }, ref) => (
  <span className={cn('relative inline-flex size-5 shrink-0', className)}>
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className="peer size-5 cursor-pointer appearance-none rounded-sm border border-line-strong bg-surface shadow-xs checked:border-brand checked:bg-brand disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
    <Check className="pointer-events-none absolute inset-0 m-auto size-3.5 text-brand-foreground opacity-0 peer-checked:opacity-100" strokeWidth={3} aria-hidden />
  </span>
));
Checkbox.displayName = 'Checkbox';

export const RadioGroup = RadioPrimitive.Root;

/** A large selectable card used for choices that need explanation. */
export const RadioCard = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof RadioPrimitive.Item> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
}>(({ className, title, description, icon, ...props }, ref) => (
  <RadioPrimitive.Item
    ref={ref}
    className={cn(
      'group flex w-full items-start gap-3 rounded-lg border bg-surface p-4 text-left shadow-xs transition-colors hover:border-line-strong',
      'data-[state=checked]:border-brand data-[state=checked]:bg-brand-soft/50 data-[state=checked]:ring-1 data-[state=checked]:ring-brand',
      className,
    )}
    {...props}
  >
    {icon && <span className="mt-0.5 text-brand [&_svg]:size-5">{icon}</span>}
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold text-ink">{title}</span>
      {description && <span className="mt-0.5 block text-sm text-ink-secondary">{description}</span>}
    </span>
    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface group-data-[state=checked]:border-brand">
      <RadioPrimitive.Indicator className="size-2.5 rounded-full bg-brand" />
    </span>
  </RadioPrimitive.Item>
));
RadioCard.displayName = 'RadioCard';

/** Accessible switch: a button with role="switch" (no hidden form proxy, hydrates cleanly). */
export const Switch = React.forwardRef<HTMLButtonElement, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}>(({ className, checked, onCheckedChange, disabled, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn(
      'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'bg-brand' : 'bg-line-strong',
      className,
    )}
    {...props}
  >
    <span className={cn('block size-5 rounded-full bg-surface shadow-sm transition-transform', checked && 'translate-x-5')} />
  </button>
));
Switch.displayName = 'Switch';
