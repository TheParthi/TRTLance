import { cn } from '@/lib/utils';
import { formatAmount } from '@/lib/money';
import { partWidths, type RailSegment, type RailState } from '@/lib/escrow-summary';

/** Fill, texture and label for each money state. Colour is paired with texture and a text legend. */
export const railStyle: Record<RailState, { fill: string; label: string }> = {
  released: { fill: 'bg-success', label: 'Released' },
  approved: { fill: 'bg-success/45', label: 'Approved' },
  review: { fill: 'bg-info rail-stripes', label: 'Under review' },
  changes: { fill: 'bg-warning rail-stripes', label: 'Changes requested' },
  secured: { fill: 'bg-brand', label: 'Secured' },
  disputed: { fill: 'bg-danger rail-hatch', label: 'Disputed' },
  refunded: { fill: 'bg-refund', label: 'Refunded' },
  unfunded: { fill: 'bg-transparent', label: 'Not funded' },
  proposed: { fill: 'bg-ink-muted/35', label: 'Proposed' },
};

function describe(segments: RailSegment[]) {
  return segments
    .map((s) => `${s.label}: ${s.parts.map((p) => `${railStyle[p.state].label.toLowerCase()} ${formatAmount(p.amount)}`).join(' and ')}`)
    .join('; ');
}

/**
 * The escrow rail: one segment per milestone, sized by amount, filled by its money state.
 * TrustLance's signature element — wherever a contract or proposal appears, its money story is visible.
 */
export function EscrowRail({ segments, size = 'md', className, label }: {
  segments: RailSegment[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}) {
  const widths = partWidths(segments);
  const h = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }[size];
  return (
    <div
      role="img"
      aria-label={`${label ?? 'Escrow'}: ${describe(segments)}`}
      className={cn('flex w-full gap-0.5', h, className)}
    >
      {segments.map((s, i) => (
        <div key={s.key} className="flex h-full min-w-1.5 gap-px" style={{ flexGrow: widths[i].reduce((a, b) => a + b, 0) || 1, flexBasis: 0 }} title={s.label}>
          {s.parts.map((p, j) => (
            <span
              key={j}
              className={cn(
                'h-full first:rounded-l-sm last:rounded-r-sm',
                railStyle[p.state].fill,
                p.state === 'unfunded' && 'border border-dashed border-line-strong',
              )}
              style={{ flexGrow: widths[i][j] || 1, flexBasis: 0 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Visible legend for the states present on a rail, with their amounts. */
export function RailLegend({ items, className }: { items: { state: RailState; amount: string }[]; className?: string }) {
  const shown = items.filter((i) => Number(i.amount) > 0);
  if (!shown.length) return null;
  return (
    <ul className={cn('flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary', className)}>
      {shown.map((i) => (
        <li key={i.state} className="flex items-center gap-1.5">
          <span className={cn('inline-block size-2.5 rounded-sm', railStyle[i.state].fill, i.state === 'unfunded' && 'border border-dashed border-line-strong')} aria-hidden />
          {railStyle[i.state].label} <span className="t-money text-ink">{formatAmount(i.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
