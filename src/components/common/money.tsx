import { cn } from '@/lib/utils';
import { CURRENCY } from '@/lib/env';
import { formatAmount } from '@/lib/money';

const sizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
  '2xl': 'text-4xl',
};

/** A monetary amount with an explicit currency label. Never shown without its unit. */
export function Money({ amount, size = 'md', className, muted }: {
  amount: string | number | null | undefined;
  size?: keyof typeof sizes;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span className={cn('t-money inline-flex items-baseline gap-1', sizes[size], muted && 'text-ink-secondary', className)}>
      <span>{formatAmount(amount, { symbol: false })}</span>
      <span className={cn('font-medium uppercase tracking-[0.08em] text-ink-muted', size === 'xl' || size === '2xl' ? 'text-sm' : 'text-[0.7em]')}>{CURRENCY}</span>
    </span>
  );
}

/** Labelled figure for summaries: "Secured in escrow — 1,200 coins". */
export function MoneyStat({ label, amount, hint, tone, className }: {
  label: string;
  amount: string | number | null | undefined;
  hint?: React.ReactNode;
  tone?: 'brand' | 'success' | 'refund' | 'warning';
  className?: string;
}) {
  const bar = { brand: 'before:bg-brand', success: 'before:bg-success', refund: 'before:bg-refund', warning: 'before:bg-warning' };
  return (
    <div className={cn('relative space-y-1 pl-3 before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-line-strong', tone && bar[tone], className)}>
      <p className="t-eyebrow">{label}</p>
      <Money amount={amount} size="lg" />
      {hint && <p className="t-meta">{hint}</p>}
    </div>
  );
}
