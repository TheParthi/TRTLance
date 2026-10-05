import { PendingEscrowWatcher } from '@/components/escrow/pending-escrow-watcher';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FileText, Gavel, History, MessagesSquare, Scale, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Money } from '@/components/common/money';
import { Facts, PageHeader } from '@/components/common/page-header';
import { DisputeStatusBadge, MilestoneStatusBadge, SettlementStatusBadge } from '@/components/common/status-badge';
import { requireViewer } from '@/lib/auth';
import { getDisputeCase, toMemberRecord } from '@/lib/data/disputes';
import { disputeNumber, formatDate, formatDateTime } from '@/lib/format';
import { AddEvidenceForm } from '../_components/add-evidence-form';
import { AiRecommendationPanel } from '../_components/ai-recommendation';
import { AuditTrail } from '../_components/audit-trail';
import { DecisionCard } from '../_components/decision-card';
import { DisputeChat } from '../_components/dispute-chat';
import { EscalateButton } from '../_components/escalate-button';
import { EvidenceList } from '../_components/evidence-list';
import { partyEscalation, roleIn } from '../_components/labels';
import { NextSteps } from '../_components/next-steps';
import { OnchainProtectionCard } from '../_components/onchain-card';
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
  const escalation = partyEscalation(d);
  const arbitrator = d.arbitrator_id ? members[d.arbitrator_id] : null;

  return (
    <>
      <PendingEscrowWatcher contractIds={[c.id]} />
      <PageHeader
        breadcrumbs={[{ label: 'Disputes', href: '/disputes' }, { label: disputeNumber(d.number) }]}
        eyebrow={<span className="font-mono">{disputeNumber(d.number)}</span>}
        title={`Milestone ${m.position}: ${m.title}`}
        description={<>On <Link className="link" href={`/contracts/${c.id}`}>{c.title}</Link>{data.projectTitle && data.projectTitle !== c.title ? ` · ${data.projectTitle}` : ''}</>}
        meta={
          <>
            <DisputeStatusBadge status={d.status} />
            <SettlementStatusBadge status={d.settlement_status} />
            <span>Opened {formatDate(d.created_at)}</span>
          </>
        }
        actions={<Money amount={d.amount} size="xl" />}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0">
          <Tabs defaultValue="overview">
            <TabsList aria-label="Case sections">
              <TabsTrigger value="overview"><Scale aria-hidden /> Overview</TabsTrigger>
              <TabsTrigger value="evidence"><FileText aria-hidden /> Evidence ({data.evidence.length})</TabsTrigger>
              <TabsTrigger value="messages"><MessagesSquare aria-hidden /> Messages</TabsTrigger>
              {data.recommendation && <TabsTrigger value="ai"><Sparkles aria-hidden /> AI analysis</TabsTrigger>}
              <TabsTrigger value="decision"><Gavel aria-hidden /> Decision</TabsTrigger>
              <TabsTrigger value="audit"><History aria-hidden /> Audit trail</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-6">
              <Statements data={data} members={members} />
            </TabsContent>
            <TabsContent value="evidence" className="space-y-6">
              <EvidenceList evidence={data.evidence} members={members} contract={c} />
              {open ? <AddEvidenceForm disputeId={d.id} /> : <p className="t-meta">This case is decided; evidence is closed.</p>}
            </TabsContent>
            <TabsContent value="messages">
              <DisputeChat disputeId={d.id} viewerId={viewer.id} initial={data.messages} members={members} roles={roles}
                canSend={open} closedReason="This case is decided. Messaging is closed." />
            </TabsContent>
            {data.recommendation && (
              <TabsContent value="ai">
                <AiRecommendationPanel disputeId={d.id} amount={d.amount} initial={data.recommendation} canGenerate={false} />
              </TabsContent>
            )}
            <TabsContent value="decision">
              <DecisionCard dispute={d} transactions={data.transactions} members={members} />
            </TabsContent>
            <TabsContent value="audit">
              <AuditTrail events={data.events} members={members} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6">
          <NextSteps dispute={d} isParty />
          <OnchainProtectionCard
            contractId={c.id}
            milestoneId={m.id}
            milestonePosition={m.position}
            milestoneTitle={m.title}
            amount={d.amount}
            escrowKey={c.escrow_key}
            requiredWallet={role === 'client' ? c.client_wallet : c.freelancer_wallet}
            settlement={d.settlement_status}
            flaggedAt={d.onchain_flagged_at}
            transactions={data.transactions}
            isParty
          />
          <section className="panel space-y-4 p-5" aria-labelledby="case-facts-title">
            <h2 id="case-facts-title" className="t-eyebrow">Case details</h2>
            <Facts className="sm:grid-cols-1" items={[
              { label: 'Contract', value: <Link className="link" href={`/contracts/${c.id}`}>{c.title}</Link> },
              { label: 'Milestone', value: <span className="flex flex-wrap items-center gap-2">{m.position}. {m.title} <MilestoneStatusBadge status={m.status} /></span> },
              { label: 'Raised by', value: `${d.raised_by === viewer.id ? 'You' : members[d.raised_by]?.display_name ?? 'Other party'} (${roles[d.raised_by] ?? ''})` },
              { label: 'Arbitrator', value: arbitrator ? `${arbitrator.display_name}${d.assigned_at ? ` · assigned ${formatDateTime(d.assigned_at)}` : ''}` : 'Not assigned yet' },
              ...(d.evidence_due_at && open ? [{ label: 'Evidence due', value: formatDateTime(d.evidence_due_at) }] : []),
              ...(d.escalation_reason ? [{ label: 'Escalation reason', value: d.escalation_reason }] : []),
            ]} />
          </section>
          {open && <EscalateButton disputeId={d.id} allowed={escalation.allowed} explanation={escalation.reason} size="sm" />}
        </aside>
      </div>
    </>
  );
}
