import { Money } from '@/components/common/money';
import { EscrowRail } from '@/components/common/escrow-rail';
import type { RailSegment } from '@/lib/escrow-summary';
import { feePercent, feeSplit, formatAmount, splitByPct, toCoins } from '@/lib/money';
import { cn } from '@/lib/utils';

/** Two-part rail: the freelancer's share (released colour) next to the client's (refund colour). */
export function splitSegments(amount: string, pct: number): RailSegment[] {
  const split = splitByPct(amount, pct);
  return [
    { key: 'freelancer', label: `To the freelancer (${pct}%)`, parts: [{ state: 'released' as const, amount: split.freelancer }] },
    { key: 'client', label: `Back to the client (${100 - pct}%)`, parts: [{ state: 'refunded' as const, amount: split.client }] },
  ].filter((s) => toCoins(s.parts[0].amount) > 0n);
}

/**
 * Exact split of a milestone, computed like the database (freelancer share rounds down, in whole coins):
 * a two-part rail with the freelancer's share on the left and the client's on the right.
 */
export function SplitRows({ amount, pct, feeBps, settled, className, size = 'md', showTotal }: {
  amount: string;
  pct: number;
  /** The contract's platform fee; when given, the freelancer's share also shows what they receive after it. */
  feeBps?: number;
  settled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Adds the milestone amount held in escrow under the figures. */
  showTotal?: boolean;
}) {
  const split = splitByPct(amount, pct);
  const fee = feeBps !== undefined && pct > 0 ? feeSplit(split.freelancer, feeBps) : null;
  return (
    <div className={cn('min-w-0 space-y-2.5', className)} aria-live="polite">
      <EscrowRail segments={splitSegments(amount, pct)} size={size} label={settled ? 'Settled split' : 'Split'} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="inline-block size-2.5 shrink-0 rounded-sm bg-success" aria-hidden />
            {settled ? 'Paid to the freelancer' : 'To the freelancer'} ({pct}%)
          </dt>
          <dd><Money amount={split.freelancer} muted={pct === 0} /></dd>
          {fee && <dd className="t-meta">{formatFee(fee, feeBps!)}</dd>}
        </div>
        <div className="min-w-0 text-right">
          <dt className="flex items-center justify-end gap-1.5 text-xs text-ink-muted">
            {settled ? 'Returned to the client' : 'Back to the client'} ({100 - pct}%)
            <span className="inline-block size-2.5 shrink-0 rounded-sm bg-refund" aria-hidden />
          </dt>
          <dd><Money amount={split.client} muted={pct === 100} /></dd>
        </div>
      </dl>
      {showTotal && <p className="t-meta">Milestone amount frozen in escrow: <Money amount={amount} size="sm" className="text-ink" /></p>}
    </div>
  );
}

/** "900 coins after the 10% platform fee (100 coins)". */
export function formatFee(fee: { fee: string; net: string }, feeBps: number) {
  return `${formatAmount(fee.net)} after the ${feePercent(feeBps)} platform fee (${formatAmount(fee.fee)})`;
}
