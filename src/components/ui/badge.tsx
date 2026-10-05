import * as React from 'react';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/status';

export const toneClasses: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-secondary ring-line-strong/60',
  brand: 'bg-brand-soft text-brand-strong ring-brand/25',
  info: 'bg-info-soft text-info-strong ring-info/25',
  warning: 'bg-warning-soft text-warning-strong ring-warning/30',
  success: 'bg-success-soft text-success-strong ring-success/25',
  danger: 'bg-danger-soft text-danger-strong ring-danger/25',
  refund: 'bg-refund-soft text-refund-strong ring-refund/25',
  brass: 'bg-brass-soft text-brass-strong ring-brass/30',
};

export const toneText: Record<Tone, string> = {
  neutral: 'text-ink-muted',
  brand: 'text-brand',
  info: 'text-info',
  warning: 'text-warning',
  success: 'text-success',
  danger: 'text-danger',
  refund: 'text-refund',
  brass: 'text-brass',
};

export function Badge({ tone = 'neutral', className, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset [&_svg]:size-3.5',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
