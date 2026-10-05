import { ExternalLink, Gavel, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettlementStatusMark } from '@/components/common/status-mark';
import type { MemberSummary } from '@/lib/data/disputes';
import { explorerTxUrl, formatDateTime, shortHash } from '@/lib/format';
import { settlementStatus } from '@/lib/status';
import type { Dispute, EscrowTransaction } from '@/lib/types';
import { decisionLabel } from './labels';
import { SplitRows } from './split';

/** Key/value rows separated by hairlines. */
export function FactRows({ items, className, stacked }: {
  items: { label: string; value: React.ReactNode }[];
  className?: string;
  /** Label above value at every width (for narrow columns). */
  stacked?: boolean;
}) {
  return (
    <dl className={cn('divide-y border-y text-sm', className)}>
      {items.map((i) => (
        <div key={i.label} className={cn('grid grid-cols-1 gap-0.5 py-2.5', !stacked && 'sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4')}>
          <dt className="text-ink-muted">{i.label}</dt>
          <dd className="min-w-0 break-words">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The recorded decision: outcome, reasoning and settlement. Rendered only once a case is decided. */
export function DecisionCard({ dispute, transactions, members, showSplit, id = 'decision' }: {
  dispute: Dispute;
  transactions: EscrowTransaction[];
  members: Record<string, MemberSummary>;
  /** Draw the split rail here too (when the page header does not already show it). */
  showSplit?: boolean;
  id?: string;
}) {
  if (dispute.status !== 'resolved' || !dispute.decision || dispute.freelancer_pct === null) {
    return <p className="border-y py-5 text-sm text-ink-secondary">No decision yet. When the arbitrator decides, the outcome, the exact split and their reasoning appear here.</p>;
  }
  const settled = dispute.settlement_status === 'settled';
  const resolveTx = transactions.find((t) => t.kind === 'resolve' && t.status === 'confirmed')
    ?? transactions.find((t) => t.kind === 'resolve' && t.status === 'pending');
  const byAdmin = dispute.decided_by !== dispute.arbitrator_id;
  const decider = dispute.decided_by ? members[dispute.decided_by]?.display_name : null;
  const txUrl = resolveTx ? explorerTxUrl(resolveTx.tx_hash) : null;

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="space-y-4">
      <div className="space-y-1">
        <h2 id={`${id}-title`} className="t-label-caps flex items-center gap-1.5"><Gavel className="size-3.5" aria-hidden /> {byAdmin ? 'Platform team’s decision' : 'Arbitrator’s decision'}</h2>
        <p className="text-lg font-semibold">{decisionLabel(dispute.decision, dispute.freelancer_pct)}</p>
      </div>
      {showSplit && <SplitRows amount={dispute.amount} pct={dispute.freelancer_pct} settled={settled} className="max-w-xl" />}
      <div className="space-y-1">
        <p className="t-label-caps">Reasoning</p>
        <p className="max-w-reading whitespace-pre-line break-words text-sm leading-relaxed text-ink-secondary">{dispute.decision_reason}</p>
      </div>
      <FactRows items={[
        { label: 'Decided by', value: `${decider ?? 'Unknown'} · ${byAdmin ? 'TrustLance platform team' : 'Independent arbitrator'}` },
        { label: 'Decided on', value: formatDateTime(dispute.decided_at) },
        { label: 'Settlement', value: <span className="flex flex-wrap items-center gap-2"><SettlementStatusMark status={dispute.settlement_status} /><span className="t-meta">{settlementStatus[dispute.settlement_status].description}</span></span> },
        {
          label: 'Settlement transaction',
          value: resolveTx ? (
            txUrl ? <a href={txUrl} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1 font-mono text-xs">{shortHash(resolveTx.tx_hash)} <ExternalLink className="size-3" aria-hidden /></a>
              : <span className="font-mono text-xs">{shortHash(resolveTx.tx_hash)}</span>
          ) : 'Not sent yet',
        },
      ]} />
      <p className="flex items-start gap-2 text-sm text-ink-secondary">
        <Lock className="mt-0.5 size-3.5 shrink-0 text-ink-muted" aria-hidden />
        {settled
          ? <span>Settled by the escrow contract on {formatDateTime(dispute.settled_at)}.</span>
          : <span>Funds have not moved yet. The money stays locked in escrow until the escrow contract settles this decision on-chain; the amounts shown are what each side will receive.</span>}
      </p>
    </section>
  );
}
