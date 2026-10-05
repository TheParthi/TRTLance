'use client';

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as RadioPrimitive from '@radix-ui/react-radio-group';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Checkbox = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer size-5 shrink-0 rounded-sm border border-line-strong bg-surface shadow-xs data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
);
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

export const Switch = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-line-strong transition-colors data-[state=checked]:bg-brand disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-5 rounded-full bg-surface shadow-sm transition-transform data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = 'Switch';
