import { Money } from '@/components/common/money';
import { splitByPct } from '@/lib/money';
import { cn } from '@/lib/utils';

/** Exact split of a milestone, computed like the escrow contract (freelancer share rounds down, in wei). */
export function SplitRows({ amount, pct, settled, className }: { amount: string; pct: number; settled?: boolean; className?: string }) {
  const split = splitByPct(amount, pct);
  return (
    <dl className={cn('divide-y rounded-lg border text-sm', className)} aria-live="polite">
      <div className="flex items-center justify-between gap-4 p-3">
        <dt className="text-ink-muted">{settled ? 'Paid to the freelancer' : 'To the freelancer'} ({pct}%)</dt>
        <dd><Money amount={split.freelancer} size="sm" /></dd>
      </div>
      <div className="flex items-center justify-between gap-4 p-3">
        <dt className="text-ink-muted">{settled ? 'Refunded to the client' : 'Back to the client'} ({100 - pct}%)</dt>
        <dd><Money amount={split.client} size="sm" /></dd>
      </div>
      <div className="flex items-center justify-between gap-4 p-3">
        <dt className="text-ink-muted">Milestone amount in escrow</dt>
        <dd><Money amount={amount} size="sm" /></dd>
      </div>
    </dl>
  );
}
