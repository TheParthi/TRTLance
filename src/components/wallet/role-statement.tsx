import { EscrowRail } from '@/components/common/escrow-rail';
import { Money } from '@/components/common/money';
import { escrowStatement, stateSegments } from '@/lib/escrow-summary';
import { sumAmounts } from '@/lib/money';
import type { Milestone } from '@/lib/types';
import { cn } from '@/lib/utils';

type MilestoneMoney = Pick<Milestone, 'id' | 'position' | 'title' | 'amount' | 'status' | 'freelancer_payout' | 'client_refund'>;

interface Figure {
  label: string;
  hint?: string;
  amount: string;
  swatch: string;
}

/**
 * Money across all of a member's contracts in one role, as a statement: one rail segment per money state,
 * then the figures that role cares about. Only real totals — escrow pays out straight to wallets, so there
 * is no "available balance" to show.
 */
export function RoleStatement({ role, milestones, contractCount, wide, className }: {
  role: 'client' | 'freelancer';
  milestones: MilestoneMoney[];
  contractCount: number;
  /** Full page width: figures in one row on larger screens. */
  wide?: boolean;
  className?: string;
}) {
  const s = escrowStatement(milestones);
  // Locked right now (secured, under review, approved or frozen in a dispute) — the same figure as the wallet chip.
  const inEscrow = sumAmounts([s.secured, s.disputed]);
  const figures: Figure[] =
    role === 'client'
      ? [
          { label: 'Secured', hint: 'Locked in escrow, including work under review', amount: s.secured, swatch: 'bg-brand' },
          { label: 'Released', hint: 'Paid to freelancers', amount: s.released, swatch: 'bg-success' },
          { label: 'Refunded', hint: 'Returned to your wallet', amount: s.refunded, swatch: 'bg-refund' },
          { label: 'In dispute', hint: 'Frozen until a decision', amount: s.disputed, swatch: 'bg-danger rail-hatch' },
        ]
      : [
          { label: 'Earned', hint: 'Released to your wallet', amount: s.released, swatch: 'bg-success' },
          { label: 'Pending', hint: 'Secured in escrow for your milestones, including under review', amount: s.secured, swatch: 'bg-brand' },
          { label: 'In dispute', hint: 'Frozen until a decision', amount: s.disputed, swatch: 'bg-danger rail-hatch' },
        ];
  if (role === 'freelancer' && Number(s.refunded) > 0) figures.push({ label: 'Returned to clients', amount: s.refunded, swatch: 'bg-refund' });
  if (Number(s.unfunded) > 0) figures.push({ label: 'Not funded yet', hint: 'Agreed, not yet deposited', amount: s.unfunded, swatch: 'border border-dashed border-line-strong' });

  const title = role === 'client' ? 'As a client' : 'As a freelancer';
  const headingId = `statement-${role}`;
  return (
    <section className={cn('statement space-y-5', className)} aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} className="t-label-caps">{title}</h2>
        <p className="t-meta">
          {contractCount} contract{contractCount === 1 ? '' : 's'} · <Money amount={inEscrow} size="sm" className="text-ink-secondary" /> in escrow now · <Money amount={s.total} size="sm" className="text-ink-secondary" /> in total
        </p>
      </div>
      <EscrowRail segments={stateSegments(milestones)} size="lg" label={`${title}: escrow`} />
      <dl className={cn('grid grid-cols-2 gap-x-6 gap-y-4', wide && 'md:grid-cols-4 lg:grid-cols-5')}>
        {figures.map((f) => (
          <div key={f.label} className="min-w-0 space-y-0.5">
            <dt className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span className={cn('inline-block size-2.5 shrink-0 rounded-sm', f.swatch)} aria-hidden />
              {f.label}
            </dt>
            <dd>
              <Money amount={f.amount} size="lg" muted={Number(f.amount) === 0} />
              {f.hint && <p className="t-meta">{f.hint}</p>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
