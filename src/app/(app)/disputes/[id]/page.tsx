import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MoneyRing, type RingState } from '@/components/common/money-ring';
import { formatAmount, splitByPct } from '@/lib/money';
import { PageHeader } from '@/components/common/page-header';
import { DisputeStatusMark, MilestoneStatusMark } from '@/components/common/status-mark';
import { requireViewer } from '@/lib/auth';
import { getDisputeCase, toMemberRecord } from '@/lib/data/disputes';
import { disputeNumber, formatDate, formatDateTime } from '@/lib/format';
import { AddEvidenceForm } from '../_components/add-evidence-form';
import { AiRecommendationPanel } from '../_components/ai-recommendation';
import { AuditTrail } from '../_components/audit-trail';
import { CaseMoney, CaseTimeline } from '../_components/case-summary';
import { DecisionCard, FactRows } from '../_components/decision-card';
import { DisputeChat } from '../_components/dispute-chat';
import { EscalateButton } from '../_components/escalate-button';
import { EvidenceList } from '../_components/evidence-list';
import { partyEscalation, roleIn } from '../_components/labels';
import { NextSteps } from '../_components/next-steps';
import { Statements } from '../_components/statements';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getDisputeCase((await params).id).catch(() => null);
  return { title: data ? `${disputeNumber(data.dispute.number)} · Dispute` : 'Dispute' };
}

export default async function DisputePage({ params }: Params) {
  const { id } = await params;
  const viewer = await requireViewer(`/disputes/${id}`);
  const data = await getDisputeCase(id);
  if (!data) notFound();
  const { dispute: d, contract: c, milestone: m } = data;
  const role = roleIn(c, d, viewer.id);
  // Arbitrators and admins work in the case room.
  if (role !== 'client' && role !== 'freelancer') redirect(`/arbitration/cases/${d.id}`);

  const members = toMemberRecord(data.members);
  const roles: Record<string, string> = { [c.client_id]: 'Client', [c.freelancer_id]: 'Freelancer' };
  if (d.arbitrator_id) roles[d.arbitrator_id] = 'Arbitrator';
  const open = d.status !== 'resolved';
  const decided = d.status === 'resolved' && d.decision !== null && d.freelancer_pct !== null;
  const escalation = partyEscalation(d);
  const arbitrator = d.arbitrator_id ? members[d.arbitrator_id] : null;
  const raisedByMe = d.raised_by === viewer.id;

  return (
    <div className="space-y-10">
      <PageHeader
        className="mb-0 md:mb-0"
        breadcrumbs={[{ label: 'Contracts', href: '/contracts' }, { label: 'Disputes', href: '/disputes' }, { label: disputeNumber(d.number) }]}
        eyebrow={<>Dispute · <span className="font-mono">{disputeNumber(d.number)}</span></>}
        title={c.title}
        description={<>Milestone {m.position}: {m.title}{data.projectTitle && data.projectTitle !== c.title ? ` · ${data.projectTitle}` : ''}</>}
        meta={
          <>
            <DisputeStatusMark status={d.status} />
            <span>{raisedByMe ? 'You opened this dispute' : `Opened by ${members[d.raised_by]?.display_name ?? 'the other party'}`} on {formatDate(d.created_at)}</span>
          </>
        }
        actions={<Button asChild variant="secondary"><Link href={`/contracts/${c.id}`}>View contract</Link></Button>}
        aside={(() => {
          // The frozen money as two arcs: the freelancer's share and the client's, decided or requested.
          const pct = decided ? d.freelancer_pct! : d.requested_outcome === 'release' ? 100 : d.requested_outcome === 'refund' ? 0 : d.requested_freelancer_pct ?? 50;
          const split = splitByPct(d.amount, pct);
          const parts = [
            { amount: Number(split.freelancer) || 0, state: (decided ? 'released' : 'disputed') as RingState },
            { amount: Number(split.client) || 0, state: (decided ? 'refunded' : 'disputed') as RingState },
          ].filter((x) => x.amount > 0);
          return (
            <MoneyRing
              className="-mx-4 h-[240px] sm:h-[300px] lg:mx-0 lg:h-[360px]"
              parts={parts.length ? parts : [{ amount: 1, state: 'disputed' }]}
              readout={{ label: decided ? 'Decided split' : 'Frozen in escrow', state: `${pct}% freelancer · ${100 - pct}% client`, amount: formatAmount(d.amount) }}
            />
          );
        })()}
      />

      <CaseMoney dispute={d} milestone={m} feeBps={c.fee_bps} raisedBy={raisedByMe ? 'you' : members[d.raised_by]?.display_name ?? 'the other party'} />

      <NextSteps dispute={d} isParty />

      <CaseTimeline dispute={d} arbitratorName={arbitrator?.display_name ?? null} className="border-y py-5" />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-12">
          {decided && <DecisionCard dispute={d} feeBps={c.fee_bps} members={members} />}

          <section aria-labelledby="statements-title" className="space-y-3">
            <h2 id="statements-title" className="t-label-caps">Statements</h2>
            <Statements data={data} members={members} />
          </section>

          <EvidenceList
            evidence={data.evidence}
            members={members}
            contract={c}
            footer={open ? <AddEvidenceForm disputeId={d.id} /> : <p className="t-meta">This case is decided; evidence is closed.</p>}
          />

          <section aria-labelledby="messages-title" className="space-y-3">
            <h2 id="messages-title" className="t-label-caps">Messages</h2>
            <DisputeChat disputeId={d.id} viewerId={viewer.id} initial={data.messages} members={members} roles={roles}
              canSend={open} closedReason="This case is decided. Messaging is closed." />
          </section>

          {data.recommendation && (
            <AiRecommendationPanel disputeId={d.id} amount={d.amount} initial={data.recommendation} canGenerate={false} />
          )}

          <AuditTrail events={data.events} members={members} />
        </div>

        <aside className="space-y-8" aria-labelledby="case-facts-title">
          <div className="space-y-3">
            <h2 id="case-facts-title" className="t-label-caps">Case details</h2>
            <FactRows stacked items={[
              { label: 'Contract', value: <Link className="link" href={`/contracts/${c.id}`}>{c.title}</Link> },
              { label: 'Milestone', value: <span className="flex flex-wrap items-center gap-x-2 gap-y-1">{m.position}. {m.title} <MilestoneStatusMark status={m.status} /></span> },
              { label: 'Raised by', value: `${raisedByMe ? 'You' : members[d.raised_by]?.display_name ?? 'Other party'} (${roles[d.raised_by] ?? ''})` },
              { label: 'Arbitrator', value: arbitrator ? `${arbitrator.display_name}${d.assigned_at ? ` · assigned ${formatDateTime(d.assigned_at)}` : ''}` : 'Not assigned yet' },
              ...(d.evidence_due_at && open ? [{ label: 'Evidence due', value: formatDateTime(d.evidence_due_at) }] : []),
              ...(d.escalation_reason ? [{ label: 'Escalation reason', value: d.escalation_reason }] : []),
            ]} />
          </div>
          {open && <EscalateButton disputeId={d.id} allowed={escalation.allowed} explanation={escalation.reason} size="sm" />}
        </aside>
      </div>
    </div>
  );
}
