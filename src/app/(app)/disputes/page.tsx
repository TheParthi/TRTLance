import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Scale } from 'lucide-react';
import { Money } from '@/components/common/money';
import { PageHeader } from '@/components/common/page-header';
import { DisputeStatusBadge, SettlementStatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/states';
import { requireViewer } from '@/lib/auth';
import { listPartyDisputes } from '@/lib/data/disputes';
import { disputeNumber, formatDate, formatRelative } from '@/lib/format';
import { disputeReasonLabel } from '@/lib/status';

export const metadata: Metadata = { title: 'Disputes' };

export default async function DisputesPage() {
  const viewer = await requireViewer('/disputes');
  const { disputes, members } = await listPartyDisputes(viewer.id);
  const active = disputes.filter((d) => d.status !== 'resolved' || d.settlement_status !== 'settled');
  const closed = disputes.filter((d) => d.status === 'resolved' && d.settlement_status === 'settled');

  return (
    <>
      <PageHeader
        title="Disputes"
        description="Disagreements about a milestone, reviewed by an independent arbitrator. The disputed amount stays locked in escrow until the decision is settled on-chain."
      />
      {disputes.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No disputes"
          description={<>If something goes wrong on a funded milestone, open the contract, choose the milestone and select <strong>Open a dispute</strong>. Talk to the other party first — most problems are solved in messages.</>}
          action={{ label: 'Go to contracts', href: '/contracts' }}
        />
      ) : (
        <div className="space-y-10">
          <DisputeTable title={`Active (${active.length})`} rows={active} members={members} viewerId={viewer.id} empty="No active disputes." />
          {closed.length > 0 && <DisputeTable title={`Settled (${closed.length})`} rows={closed} members={members} viewerId={viewer.id} empty="" />}
        </div>
      )}
    </>
  );
}

function DisputeTable({ title, rows, members, viewerId, empty }: {
  title: string;
  rows: Awaited<ReturnType<typeof listPartyDisputes>>['disputes'];
  members: Awaited<ReturnType<typeof listPartyDisputes>>['members'];
  viewerId: string;
  empty: string;
}) {
  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className="t-section-title">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-ink-secondary">{empty}</p> : (
        <ul className="panel divide-y">
          {rows.map((d) => {
            const raisedBy = d.raised_by === viewerId ? 'You' : members.get(d.raised_by)?.display_name ?? 'The other party';
            return (
              <li key={d.id}>
                <Link href={`/disputes/${d.id}`} className="grid gap-3 p-4 hover:bg-surface-subtle md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0 space-y-1.5">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="t-mono text-ink-muted">{disputeNumber(d.number)}</span>
                      <span className="font-semibold">{d.contract?.title ?? 'Contract'}</span>
                    </p>
                    <p className="text-sm text-ink-secondary">
                      Milestone {d.milestone?.position}{d.milestone?.title ? ` · ${d.milestone.title}` : ''} · {disputeReasonLabel[d.reason]}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <DisputeStatusBadge status={d.status} />
                      {(d.status === 'resolved' || d.settlement_status === 'awaiting_flag') && <SettlementStatusBadge status={d.settlement_status} />}
                    </div>
                    <p className="t-meta">Raised by {raisedBy} · opened {formatDate(d.created_at)} · updated {formatRelative(d.decided_at ?? d.assigned_at ?? d.created_at)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                    <Money amount={d.amount} size="lg" />
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-brand">Open case <ArrowRight className="size-4" aria-hidden /></span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {title.startsWith('Active') && rows.length > 0 && (
        <p className="t-meta">Need to raise a new dispute? Start from the milestone on its contract page, or <Link className="link" href="/disputes/new">choose a contract here</Link>.</p>
      )}
    </section>
  );
}
