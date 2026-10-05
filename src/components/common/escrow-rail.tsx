import { cn } from '@/lib/utils';
import { formatAmount, sumAmounts } from '@/lib/money';
import { partWidths, type RailPart, type RailSegment, type RailState } from '@/lib/escrow-summary';

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

const pad = (n: number) => String(n).padStart(2, '0');
const segmentState = (parts: RailPart[]) => parts.map((p) => railStyle[p.state].label).join(' · ') || railStyle.unfunded.label;
const segmentTotal = (parts: RailPart[]) => sumAmounts(parts.map((p) => p.amount));

function Parts({ parts, widths }: { parts: RailPart[]; widths: number[] }) {
  return (
    <>
      {parts.map((p, j) => (
        <span
          key={j}
          className={cn(
            'h-full transition-[flex-grow,background-color] duration-slow ease-ledger first:rounded-l-sm last:rounded-r-sm',
            railStyle[p.state].fill,
            p.state === 'unfunded' && 'border border-dashed border-line-strong',
          )}
          style={{ flexGrow: widths[j] || 1, flexBasis: 0 }}
        />
      ))}
    </>
  );
}

/**
 * The escrow rail: one segment per milestone, sized by amount, filled by its money state.
 * TrustLance's signature element — wherever a contract or proposal appears, its money story is visible.
 * `detail` adds a caption under every segment (number, state, amount); on phones the captions become
 * a list under the bar so labels never shrink below a readable size.
 */
export function EscrowRail({ segments, size = 'md', className, label, detail }: {
  segments: RailSegment[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  detail?: boolean;
}) {
  const widths = partWidths(segments);
  const h = { sm: 'h-2', md: 'h-2.5', lg: 'h-4' }[size];
  const aria = `${label ?? 'Escrow'}: ${describe(segments)}`;
  const grow = (i: number) => widths[i].reduce((a, b) => a + b, 0) || 1;

  const bar = (cls?: string) => (
    <div role="img" aria-label={aria} data-reveal="rail" className={cn('flex w-full gap-0.5', h, cls)}>
      {segments.map((s, i) => (
        <div key={s.key} className="flex h-full min-w-1.5 gap-px transition-[flex-grow] duration-slow ease-ledger" style={{ flexGrow: grow(i), flexBasis: 0 }} title={s.label}>
          <Parts parts={s.parts} widths={widths[i]} />
        </div>
      ))}
    </div>
  );

  if (!detail) return bar(className);

  return (
    <div className={className}>
      {/* Tablet and up: each caption sits under its own segment. */}
      <div role="img" aria-label={aria} className="scrollbar-none hidden gap-0.5 overflow-x-auto sm:flex">
        {segments.map((s, i) => (
          <div key={s.key} className="min-w-24 transition-[flex-grow] duration-slow ease-ledger" style={{ flexGrow: grow(i), flexBasis: 0 }}>
            <div className={cn('flex gap-px', h)}><Parts parts={s.parts} widths={widths[i]} /></div>
            <div className="mt-2.5 space-y-0.5 pr-3" aria-hidden>
              <p className="truncate text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{pad(i + 1)} · {segmentState(s.parts)}</p>
              <p className="t-money truncate text-sm">{formatAmount(segmentTotal(s.parts))}</p>
            </div>
          </div>
        ))}
      </div>
      {/* Phones: the bar, then one readable line per milestone. */}
      <div className="sm:hidden">
        {bar()}
        <ol className="mt-3 divide-y divide-line" aria-hidden>
          {segments.map((s, i) => (
            <li key={s.key} className="flex items-center gap-3 py-2">
              <span className={cn('inline-block h-6 w-1.5 shrink-0 rounded-sm', railStyle[s.parts[0]?.state ?? 'unfunded'].fill, (s.parts[0]?.state ?? 'unfunded') === 'unfunded' && 'border border-dashed border-line-strong')} />
              <span className="t-mono shrink-0 text-ink-muted">{pad(i + 1)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{s.label.replace(/^\d+\.\s*/, '')}</span>
                <span className="block text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted">{segmentState(s.parts)}</span>
              </span>
              <span className="t-money shrink-0 text-sm">{formatAmount(segmentTotal(s.parts))}</span>
            </li>
          ))}
        </ol>
      </div>
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
