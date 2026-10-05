import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
import { DisputeStatusMark, SettlementStatusMark } from '@/components/common/status-mark';
import { SubNav } from '@/components/shell/sub-nav';
import { requireViewer } from '@/lib/auth';
import { listPartyDisputes, type DisputeListItem } from '@/lib/data/disputes';
import { daysUntil, disputeNumber, formatDate } from '@/lib/format';
import { disputeReasonLabel } from '@/lib/status';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Disputes' };

/** What the case needs from a party right now, if anything. */
function needsYou(d: DisputeListItem): { tone: 'warning' | 'brand'; text: string } | null {
  if (d.settlement_status === 'awaiting_flag') return { tone: 'warning', text: `Flag milestone ${d.milestone?.position ?? ''} on-chain so the decision can be settled` };
  if (d.status === 'awaiting_evidence') {
    const days = daysUntil(d.evidence_due_at);
    return { tone: 'brand', text: days !== null && days > 0 ? `Add your evidence · ${days} day${days === 1 ? '' : 's'} left` : 'Add your evidence' };
  }
  return null;
}

const waitingText: Partial<Record<DisputeListItem['status'], string>> = {
  open: 'Waiting for an arbitrator to be assigned',
  under_review: 'The arbitrator is reviewing the case',
  escalated: 'With the TrustLance platform team',
};

export default async function DisputesPage() {
  const viewer = await requireViewer('/disputes');
  const supabase = await createClient();
  const [{ disputes, members }, contractCount] = await Promise.all([
    listPartyDisputes(viewer.id),
    supabase.from('contracts').select('id', { count: 'exact', head: true })
      .or(`client_id.eq.${viewer.id},freelancer_id.eq.${viewer.id}`)
      .then((r) => r.count ?? undefined),
  ]);
  const active = disputes.filter((d) => d.status !== 'resolved' || d.settlement_status !== 'settled');
  const closed = disputes.filter((d) => d.status === 'resolved' && d.settlement_status === 'settled');

  return (
    <>
      <PageHeader
        title="Disputes"
        description="Disagreements about a milestone, decided by an independent arbitrator. The disputed amount stays locked in escrow until the decision is settled on-chain."
      />
      <SubNav
        label="Contracts"
        active="disputes"
        items={[
          { key: 'contracts', href: '/contracts', label: 'Contracts', count: contractCount },
          { key: 'disputes', href: '/disputes', label: 'Disputes', count: disputes.length },
        ]}
      />

      {disputes.length === 0 ? (
        <EmptyState
          title="No disputes"
          description={<>If something goes wrong on a funded milestone, open the contract, choose the milestone and select <strong className="font-medium text-ink">Open a dispute</strong>. Talk to the other party first — most problems are solved in messages.</>}
          action={{ label: 'Go to contracts', href: '/contracts' }}
        />
      ) : (
        <div className="space-y-12">
          <Ledger
            id="active-disputes"
            title={`Active (${active.length})`}
            action={<Link className="link" href="/disputes/new">Open a dispute</Link>}
            empty={<p className="border-y py-5 text-sm text-ink-secondary">No active disputes.</p>}
          >
            {active.map((d) => <DisputeRow key={d.id} d={d} members={members} viewerId={viewer.id} />)}
          </Ledger>
          {closed.length > 0 && (
            <Ledger id="settled-disputes" title={`Settled (${closed.length})`}>
              {closed.map((d) => <DisputeRow key={d.id} d={d} members={members} viewerId={viewer.id} />)}
            </Ledger>
          )}
        </div>
      )}
    </>
  );
}

function DisputeRow({ d, members, viewerId }: {
  d: DisputeListItem;
  members: Awaited<ReturnType<typeof listPartyDisputes>>['members'];
  viewerId: string;
}) {
  const raisedBy = d.raised_by === viewerId ? 'you' : members.get(d.raised_by)?.display_name ?? 'the other party';
  const need = needsYou(d);
  const settled = d.status === 'resolved' && d.settlement_status === 'settled';
  const waiting = !need && !settled ? (d.status === 'resolved' ? 'Decided · waiting for the on-chain settlement' : waitingText[d.status]) : null;
  return (
    <LedgerRow
      href={`/disputes/${d.id}`}
      tone={need?.tone}
      className="group pl-4"
      trail={
        <div className="flex items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0.5">
          <Money amount={d.amount} />
          <span className="t-meta">{settled ? 'settled' : 'frozen in escrow'}</span>
        </div>
      }
    >
      <div className="space-y-1.5">
        <p className="flex min-w-0 items-center gap-2">
          <span className="t-mono shrink-0 text-ink-muted">{disputeNumber(d.number)}</span>
          <span className="row-title truncate font-medium">{d.contract?.title ?? 'Contract'}</span>
          <ArrowRight className="row-arrow size-4 shrink-0 text-ink-muted" aria-hidden />
        </p>
        <p className="text-sm text-ink-secondary">
          Milestone {d.milestone?.position}{d.milestone?.title ? ` · ${d.milestone.title}` : ''} · {disputeReasonLabel[d.reason]}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <DisputeStatusMark status={d.status} />
          {(d.status === 'resolved' || d.settlement_status === 'awaiting_flag') && <SettlementStatusMark status={d.settlement_status} />}
          <span className="t-meta">Opened {formatDate(d.created_at)} by {raisedBy}</span>
        </div>
        {need && (
          <p className={cn('flex items-center gap-1.5 text-sm font-medium', need.tone === 'warning' ? 'text-warning-strong' : 'text-brand')}>
            {need.tone === 'warning' ? <AlertTriangle className="size-3.5 shrink-0" aria-hidden /> : <ArrowRight className="size-3.5 shrink-0" aria-hidden />}
            <span><span className="sr-only">Needs you: </span>{need.text}</span>
          </p>
        )}
        {waiting && (
          <p className="flex items-center gap-1.5 text-sm text-ink-secondary">
            <Clock className="size-3.5 shrink-0 text-ink-muted" aria-hidden /> {waiting}
          </p>
        )}
      </div>
    </LedgerRow>
  );
}
