import { PendingEscrowWatcher } from '@/components/escrow/pending-escrow-watcher';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, FileText, FolderOpen, Gavel, History, MessagesSquare, Sparkles } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Money } from '@/components/common/money';
import { Facts, PageHeader, Section } from '@/components/common/page-header';
import { DisputeStatusBadge, MilestoneStatusBadge, SettlementStatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/states';
import { TrustSignals } from '@/components/common/trust-signals';
import { requireViewer } from '@/lib/auth';
import { getDisputeCase, getMilestoneSubmissions, toMemberRecord, type SubmissionWithFiles } from '@/lib/data/disputes';
import type { PublicMember } from '@/lib/data/projects';
import { disputeNumber, formatBytes, formatDate, formatDateTime } from '@/lib/format';
import { milestoneStatus } from '@/lib/status';
import { AddEvidenceForm } from '../../../disputes/_components/add-evidence-form';
import { AiRecommendationPanel } from '../../../disputes/_components/ai-recommendation';
import { AuditTrail } from '../../../disputes/_components/audit-trail';
import { DecisionCard } from '../../../disputes/_components/decision-card';
import { DisputeChat } from '../../../disputes/_components/dispute-chat';
import { EvidenceList } from '../../../disputes/_components/evidence-list';
import { NextSteps } from '../../../disputes/_components/next-steps';
import { Statements } from '../../../disputes/_components/statements';
import { DecisionPanel } from './decision-panel';

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: 'Case room' };

export default async function CaseRoomPage({ params }: Params) {
  const { id } = await params;
  const viewer = await requireViewer(`/arbitration/cases/${id}`);
  const data = await getDisputeCase(id);
  if (!data) notFound();
  const { dispute: d, contract: c, milestone: m } = data;
  const isAssigned = d.arbitrator_id === viewer.id;
  if (!isAssigned && !viewer.isAdmin) notFound();

  const submissions = await getMilestoneSubmissions(c.id, m.id);
  const members = toMemberRecord(data.members);
  const roles: Record<string, string> = { [c.client_id]: 'Client', [c.freelancer_id]: 'Freelancer' };
  if (d.arbitrator_id) roles[d.arbitrator_id] = 'Arbitrator';
  const open = d.status !== 'resolved';
  const before = m.status_before_dispute;

  return (
    <>
      <PendingEscrowWatcher contractIds={[c.id]} />
      <PageHeader
        breadcrumbs={[
          viewer.isAdmin && !isAssigned ? { label: 'Admin', href: '/admin' } : { label: 'Arbitration', href: '/arbitration' },
          { label: disputeNumber(d.number) },
        ]}
        eyebrow={<span className="font-mono">Case {disputeNumber(d.number)}</span>}
        title={c.title}
        description={`Milestone ${m.position}: ${m.title}`}
        meta={
          <>
            <DisputeStatusBadge status={d.status} />
            <SettlementStatusBadge status={d.settlement_status} />
            <span>Opened {formatDateTime(d.created_at)}</span>
            {d.evidence_due_at && d.status === 'awaiting_evidence' && <span>Evidence due {formatDateTime(d.evidence_due_at)}</span>}
          </>
        }
        actions={<Money amount={d.amount} size="xl" />}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_21rem]">
        <div className="min-w-0">
          <Tabs defaultValue="file">
            <TabsList aria-label="Case room sections">
              <TabsTrigger value="file"><FolderOpen aria-hidden /> Case file</TabsTrigger>
              <TabsTrigger value="evidence"><FileText aria-hidden /> Evidence ({data.evidence.length})</TabsTrigger>
              <TabsTrigger value="messages"><MessagesSquare aria-hidden /> Messages</TabsTrigger>
              <TabsTrigger value="ai"><Sparkles aria-hidden /> AI analysis</TabsTrigger>
              <TabsTrigger value="decision"><Gavel aria-hidden /> Decision</TabsTrigger>
              <TabsTrigger value="audit"><History aria-hidden /> Audit log</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-8">
              <Section title="Statements">
                <Statements data={data} members={members} />
              </Section>
              <Section title="Contract terms" description="What both parties signed.">
                <div className="panel space-y-5 p-5">
                  <Facts items={[
                    { label: 'Contract total', value: <Money amount={c.total_amount} size="sm" /> },
                    { label: 'Signed terms hash', value: <span className="t-mono break-all">{c.terms_hash}</span> },
                    { label: 'Payment terms', value: c.terms?.payment_terms || '—' },
                    { label: 'Full contract', value: <Link className="link" href={`/contracts/${c.id}`}>Open contract</Link> },
                  ]} />
                  <div className="space-y-1">
                    <p className="t-eyebrow">Scope</p>
                    <p className="whitespace-pre-line break-words text-sm text-ink-secondary">{c.scope}</p>
                  </div>
                  {c.deliverables.length > 0 && (
                    <div className="space-y-1">
                      <p className="t-eyebrow">Deliverables</p>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-ink-secondary">{c.deliverables.map((x, i) => <li key={i}>{x}</li>)}</ul>
                    </div>
                  )}
                </div>
              </Section>
              <Section title="Disputed milestone">
                <div className="panel space-y-4 p-5">
                  <Facts items={[
                    { label: 'Milestone', value: `${m.position}. ${m.title}` },
                    { label: 'Amount in escrow', value: <Money amount={m.amount} size="sm" /> },
                    { label: 'Due date', value: m.due_date ? formatDate(m.due_date) : `Day ${m.due_in_days} of the contract` },
                    { label: 'Status before dispute', value: before ? <span className="flex flex-col items-start gap-1"><MilestoneStatusBadge status={before} /><span className="t-meta">{milestoneStatus[before].description}</span></span> : '—' },
                    { label: 'Revisions requested', value: String(m.revision_count) },
                    { label: 'Submitted / approved', value: `${formatDateTime(m.submitted_at)} / ${formatDateTime(m.approved_at)}` },
                  ]} />
                  {m.description && <p className="whitespace-pre-line text-sm text-ink-secondary">{m.description}</p>}
                </div>
              </Section>
              <Section title="Submitted work" description="Every version the freelancer delivered for this milestone.">
                <Submissions rows={submissions} />
              </Section>
            </TabsContent>

            <TabsContent value="evidence" className="space-y-6">
              <EvidenceList evidence={data.evidence} members={members} contract={c} />
              {open && <AddEvidenceForm disputeId={d.id} />}
            </TabsContent>

            <TabsContent value="messages">
              <DisputeChat disputeId={d.id} viewerId={viewer.id} initial={data.messages} members={members} roles={roles}
                canSend={open} closedReason="This case is decided. Messaging is closed." />
            </TabsContent>

            <TabsContent value="ai">
              <AiRecommendationPanel disputeId={d.id} amount={d.amount} initial={data.recommendation} canGenerate
                generateDisabledReason={open ? undefined : 'The case is decided; no new analysis is needed.'} />
            </TabsContent>

            <TabsContent value="decision">
              <DecisionCard dispute={d} transactions={data.transactions} members={members} />
            </TabsContent>

            <TabsContent value="audit">
              <AuditTrail events={data.events} members={members} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-6">
          <DecisionPanel disputeId={d.id} status={d.status} amount={d.amount} isAssigned={isAssigned} isAdmin={viewer.isAdmin} />
          <NextSteps dispute={d} isParty={false} />
          <section className="panel space-y-5 p-5" aria-labelledby="parties-title">
            <h2 id="parties-title" className="t-eyebrow">Parties</h2>
            <Party member={data.members.get(c.client_id)} role="client" raised={d.raised_by === c.client_id} />
            <Party member={data.members.get(c.freelancer_id)} role="freelancer" raised={d.raised_by === c.freelancer_id} />
            <p className="text-xs text-ink-muted">Verified by TrustLance from account and contract records.</p>
          </section>
        </aside>
      </div>
    </>
  );
}

function Party({ member, role, raised }: { member: PublicMember | undefined; role: 'client' | 'freelancer'; raised: boolean }) {
  if (!member) return <p className="text-sm text-ink-muted">{role === 'client' ? 'Client' : 'Freelancer'} profile unavailable.</p>;
  return (
    <div className="space-y-2">
      <Link href={`/u/${member.username}`} className="flex items-center gap-3 hover:text-brand">
        <Avatar name={member.display_name} path={member.avatar_path} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{member.display_name}</span>
          <span className="t-meta block">{role === 'client' ? 'Client' : 'Freelancer'}{raised ? ' · opened the dispute' : ' · respondent'}</span>
        </span>
      </Link>
      {member.stats && <TrustSignals stats={member.stats} role={role} compact />}
    </div>
  );
}

function Submissions({ rows }: { rows: SubmissionWithFiles[] }) {
  if (!rows.length) return <EmptyState compact icon={FileText} title="No work submitted" description="The freelancer has not submitted anything for this milestone." />;
  return (
    <ol className="space-y-4">
      {rows.map((s) => (
        <li key={s.id} className="panel space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Version {s.version}</p>
            <p className="t-meta">{formatDateTime(s.created_at)} · {s.review_status === 'approved' ? 'Approved' : s.review_status === 'revision_requested' ? 'Changes requested' : 'Pending review'}</p>
          </div>
          <p className="whitespace-pre-line break-words text-sm text-ink-secondary">{s.note}</p>
          {s.links.length > 0 && (
            <ul className="space-y-1 text-sm">
              {s.links.map((l) => <li key={l}><a href={l} target="_blank" rel="noreferrer nofollow ugc" className="link inline-flex items-center gap-1 break-all">{l} <ExternalLink className="size-3" aria-hidden /></a></li>)}
            </ul>
          )}
          {s.files.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {s.files.map((f) => (
                <li key={f.id} className="flex items-center gap-3 p-3 text-sm">
                  <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden />
                  {f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="link min-w-0 flex-1 truncate">{f.file_name}</a> : <span className="min-w-0 flex-1 truncate">{f.file_name}</span>}
                  <span className="t-meta">{formatBytes(f.size_bytes)}</span>
                </li>
              ))}
            </ul>
          )}
          {s.review_comment && <p className="rounded-lg bg-surface-subtle p-3 text-sm"><span className="font-medium">Client’s review:</span> {s.review_comment}</p>}
        </li>
      ))}
    </ol>
  );
}
