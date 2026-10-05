import { Check, ExternalLink } from 'lucide-react';
import { EscrowRail } from '@/components/common/escrow-rail';
import { Money } from '@/components/common/money';
import { SettlementStatusMark, StatusMark } from '@/components/common/status-mark';
import { explorerTxUrl, formatDate, formatDateTime, shortHash } from '@/lib/format';
import { splitByPct } from '@/lib/money';
import { settlementStatus } from '@/lib/status';
import type { Dispute, EscrowTransaction, Milestone } from '@/lib/types';
import { cn } from '@/lib/utils';
import { flagState, requestedPct } from './labels';
import { splitSegments } from './split';

/** A transaction hash: short, mono, linked to the explorer when one is configured. */
export function TxHash({ hash, className }: { hash: string; className?: string }) {
  const url = explorerTxUrl(hash);
  return url
    ? <a href={url} target="_blank" rel="noreferrer" className={cn('inline-flex items-center gap-1 font-mono text-xs text-ink-secondary underline-offset-4 hover:text-brand hover:underline', className)}>{shortHash(hash)} <ExternalLink className="size-3" aria-hidden /></a>
    : <span className={cn('font-mono text-xs text-ink-secondary', className)}>{shortHash(hash)}</span>;
}

function SplitFigure({ amount, pct }: { amount: string; pct: number }) {
  const s = splitByPct(amount, pct);
  return (
    <span className="block space-y-0.5 text-sm">
      <span className="flex items-baseline justify-between gap-3"><span className="text-ink-secondary">Freelancer <span className="tabular-nums">{pct}%</span></span><Money amount={s.freelancer} size="sm" /></span>
      <span className="flex items-baseline justify-between gap-3"><span className="text-ink-secondary">Client <span className="tabular-nums">{100 - pct}%</span></span><Money amount={s.client} size="sm" /></span>
    </span>
  );
}

/**
 * The one boxed money summary of a case: what is frozen, what was asked for, what was decided and
 * whether the escrow contract has paid it out. The rail draws the split that currently matters.
 */
export function CaseMoney({ dispute: d, milestone: m, transactions, raisedBy }: {
  dispute: Dispute;
  milestone: Pick<Milestone, 'position' | 'title'>;
  transactions: EscrowTransaction[];
  /** "you" or the raising party's name. */
  raisedBy: string;
}) {
  const decided = d.status === 'resolved' && d.decision !== null && d.freelancer_pct !== null;
  const settled = d.settlement_status === 'settled';
  const asked = requestedPct(d);
  const railPct = decided ? d.freelancer_pct! : asked;
  const flag = flagState(d.settlement_status, transactions);
  const resolveTx = transactions.find((t) => t.kind === 'resolve' && t.status === 'confirmed')
    ?? transactions.find((t) => t.kind === 'resolve' && t.status === 'pending');

  const settlementDetail = settled
    ? <>Verified on-chain{d.settled_at ? ` ${formatDate(d.settled_at)}` : ''}{resolveTx && <> · <TxHash hash={resolveTx.tx_hash} /></>}</>
    : resolveTx
      ? <>Transaction confirming · <TxHash hash={resolveTx.tx_hash} /></>
      : flag.flagged
        ? <>{decided ? 'Milestone flagged on-chain' : 'Frozen on-chain, waiting for the decision'}{d.onchain_flagged_at ? ` · ${formatDate(d.onchain_flagged_at)}` : ''}{flag.flagTx && <> · <TxHash hash={flag.flagTx.tx_hash} /></>}</>
        : flag.pendingFlag
          ? <>Flag confirming · <TxHash hash={flag.pendingFlag.tx_hash} /></>
          : 'Milestone not flagged on-chain yet. No funds have moved.';

  return (
    <section className="statement space-y-5" aria-labelledby="case-money-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="case-money-title" className="t-label-caps">Money in this case</h2>
        <p className="t-meta">Held by the escrow contract, not by TrustLance</p>
      </div>
      <div className="space-y-2">
        <EscrowRail segments={splitSegments(d.amount, railPct)} size="lg" label={decided ? 'Decided split' : 'Requested split'} />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-ink-secondary">
          <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-success" aria-hidden />To the freelancer</span>
          <span className="t-meta order-last w-full text-center sm:order-none sm:w-auto">{decided ? (settled ? 'Paid out as decided' : 'Showing the decided split') : 'Showing the requested split — not decided'}</span>
          <span className="flex items-center gap-1.5">Back to the client<span className="inline-block size-2.5 rounded-sm bg-refund" aria-hidden /></span>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-5 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 space-y-1">
          <dt className="text-xs text-ink-muted">{settled ? 'Was frozen in escrow' : 'Frozen in escrow'}</dt>
          <dd className="space-y-0.5"><Money amount={d.amount} size="lg" /><span className="t-meta block">Milestone {m.position} · {m.title}</span></dd>
        </div>
        <div className="min-w-0 space-y-1">
          <dt className="text-xs text-ink-muted">Requested split <span className="text-ink-muted">· by {raisedBy}</span></dt>
          <dd><SplitFigure amount={d.amount} pct={asked} /></dd>
        </div>
        <div className="min-w-0 space-y-1">
          <dt className="text-xs text-ink-muted">Decided split</dt>
          <dd>{decided ? <SplitFigure amount={d.amount} pct={d.freelancer_pct!} /> : <span className="text-sm text-ink-muted">Not decided yet</span>}</dd>
        </div>
        <div className="min-w-0 space-y-1">
          <dt className="text-xs text-ink-muted">Settlement</dt>
          <dd className="space-y-1">
            {!decided && d.settlement_status === 'ready'
              ? <StatusMark meta={{ ...settlementStatus.ready, label: 'Flagged on-chain', description: 'The milestone is frozen in the escrow contract and can be settled once the case is decided.' }} />
              : <SettlementStatusMark status={d.settlement_status} />}
            <span className="block text-xs text-ink-secondary">{settlementDetail}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

type StepState = 'done' | 'current' | 'upcoming';

function timeline(d: Dispute, arbitratorName: string | null): { label: string; state: StepState; detail?: string }[] {
  const s = d.status;
  const resolved = s === 'resolved';
  const pastEvidence = s === 'under_review' || resolved;
  return [
    { label: 'Opened', state: 'done', detail: formatDate(d.created_at) },
    s === 'escalated'
      ? { label: 'Arbitration', state: 'current', detail: 'With the platform team' }
      : d.arbitrator_id
        ? { label: 'Arbitration', state: 'done', detail: arbitratorName ? `${arbitratorName}${d.assigned_at ? ` · ${formatDate(d.assigned_at)}` : ''}` : 'Arbitrator assigned' }
        : { label: 'Arbitration', state: resolved ? 'done' : 'current', detail: resolved ? 'Platform team' : 'Assigning an arbitrator' },
    pastEvidence
      ? { label: 'Evidence', state: 'done', detail: 'Window closed' }
      : s === 'awaiting_evidence'
        ? { label: 'Evidence', state: 'current', detail: d.evidence_due_at ? `Due ${formatDateTime(d.evidence_due_at)}` : 'Window open' }
        : { label: 'Evidence', state: 'upcoming', detail: 'Can be added already' },
    resolved ? { label: 'Review', state: 'done' } : s === 'under_review' ? { label: 'Review', state: 'current', detail: 'Arbitrator reviewing' } : { label: 'Review', state: 'upcoming' },
    resolved ? { label: 'Decision', state: 'done', detail: formatDate(d.decided_at) } : { label: 'Decision', state: 'upcoming' },
    d.settlement_status === 'settled'
      ? { label: 'Settlement', state: 'done', detail: formatDate(d.settled_at) }
      : resolved ? { label: 'Settlement', state: 'current', detail: d.settlement_status === 'awaiting_flag' ? 'Needs on-chain flag' : d.settlement_status === 'failed' ? 'Needs a retry' : 'On-chain payout' } : { label: 'Settlement', state: 'upcoming' },
  ];
}

const stateText: Record<StepState, string> = { done: 'Done', current: 'Now', upcoming: 'Upcoming' };

/** Opened → Arbitration → Evidence → Review → Decision → Settlement. State is shown by marker and text, not colour alone. */
export function CaseTimeline({ dispute, arbitratorName, className }: { dispute: Dispute; arbitratorName: string | null; className?: string }) {
  const steps = timeline(dispute, arbitratorName);
  return (
    <ol aria-label="Case progress" className={cn('grid grid-cols-1 md:grid-cols-6', className)}>
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0 md:block md:pb-0 md:pr-3" aria-current={s.state === 'current' ? 'step' : undefined}>
          {i < steps.length - 1 && (
            <span
              className={cn('absolute bottom-0 left-2.5 top-6 w-px md:bottom-auto md:left-7 md:right-1 md:top-2.5 md:h-px md:w-auto', s.state === 'done' ? 'bg-success/60' : 'bg-line-strong')}
              aria-hidden
            />
          )}
          <span
            className={cn(
              'relative flex size-5 shrink-0 items-center justify-center rounded-full',
              s.state === 'done' && 'bg-success text-white',
              s.state === 'current' && 'border-2 border-brand bg-surface',
              s.state === 'upcoming' && 'border border-dashed border-line-strong bg-canvas',
            )}
            aria-hidden
          >
            {s.state === 'done' && <Check className="size-3" strokeWidth={3} />}
            {s.state === 'current' && <span className="size-2 rounded-full bg-brand" />}
          </span>
          <div className="min-w-0 md:mt-2">
            <p className={cn('text-sm', s.state === 'current' ? 'font-semibold text-ink' : s.state === 'done' ? 'font-medium text-ink' : 'text-ink-muted')}>{s.label}</p>
            <p className="t-meta">
              <span className={cn(s.state === 'current' && 'font-semibold text-brand-strong')}>{stateText[s.state]}</span>
              {s.detail && <> · {s.detail}</>}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
