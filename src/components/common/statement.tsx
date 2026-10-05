import { cn } from '@/lib/utils';
import { Money } from '@/components/common/money';
import { EscrowRail, RailLegend } from '@/components/common/escrow-rail';
import { escrowStatement, milestoneSegments, stateSegments } from '@/lib/escrow-summary';
import type { Milestone } from '@/lib/types';

type MilestoneMoney = Pick<Milestone, 'id' | 'position' | 'title' | 'amount' | 'status' | 'freelancer_payout' | 'client_refund'>;

/**
 * The escrow statement: rail on top, then the figures that answer "where is the money?".
 * Zero figures stay visible (muted) so the layout never shifts as money moves.
 */
export function EscrowStatement({ milestones, title = 'Escrow', note, className, compact, aggregate }: {
  milestones: MilestoneMoney[];
  title?: string;
  note?: React.ReactNode;
  className?: string;
  compact?: boolean;
  /** Totals across several contracts: one rail segment per money state instead of per milestone. */
  aggregate?: boolean;
}) {
  const s = escrowStatement(milestones);
  const figures = [
    { label: 'Total', amount: s.total, swatch: null },
    { label: 'Secured in escrow', amount: s.secured, swatch: 'bg-brand' },
    { label: 'Released', amount: s.released, swatch: 'bg-success' },
    { label: 'Refunded', amount: s.refunded, swatch: 'bg-refund' },
    { label: 'In dispute', amount: s.disputed, swatch: 'bg-danger rail-hatch' },
  ];
  if (Number(s.unfunded) > 0) figures.splice(1, 0, { label: 'Not funded yet', amount: s.unfunded, swatch: 'border border-dashed border-line-strong' });
  return (
    <section className={cn('statement space-y-4', className)} aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-label-caps">{title}</h2>
        {note && <p className="t-meta">{note}</p>}
      </div>
      <EscrowRail segments={aggregate ? stateSegments(milestones) : milestoneSegments(milestones)} size="lg" label={title} />
      <dl className={cn('grid gap-x-6 gap-y-3', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5')}>
        {figures.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
              {f.swatch && <span className={cn('inline-block size-2.5 shrink-0 rounded-sm', f.swatch)} aria-hidden />}
              {f.label}
            </dt>
            <dd><Money amount={f.amount} size={f.label === 'Total' ? 'lg' : 'md'} muted={Number(f.amount) === 0} /></dd>
          </div>
        ))}
      </dl>
      <InsideSecured milestones={milestones} />
    </section>
  );
}

/** Explains the textured parts of the "secured" money: still in escrow, but at a later step. */
function InsideSecured({ milestones }: { milestones: MilestoneMoney[] }) {
  const items = stateSegments(milestones)
    .filter((s) => ['review', 'changes', 'approved'].includes(s.parts[0].state))
    .map((s) => s.parts[0]);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3">
      <span className="text-xs text-ink-muted">Of the secured amount:</span>
      <RailLegend items={items} />
    </div>
  );
}
