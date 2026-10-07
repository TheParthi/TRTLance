import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExternalLink, FileText } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { PageHeader } from '@/components/common/page-header';
import { ContractStatusMark, DisputeStatusMark, MilestoneStatusMark } from '@/components/common/status-mark';
import { TrustLine } from '@/components/common/trust-signals';
import { requireViewer } from '@/lib/auth';
import { getDisputeCase, getMilestoneSubmissions, toMemberRecord, type SubmissionWithFiles } from '@/lib/data/disputes';
import { disputeNumber, formatBytes, formatDate, formatDateTime } from '@/lib/format';
import { milestoneStatus } from '@/lib/status';
import { cn } from '@/lib/utils';
import { AddEvidenceForm } from '../../../disputes/_components/add-evidence-form';
import { AiRecommendationPanel } from '../../../disputes/_components/ai-recommendation';
import { AuditTrail } from '../../../disputes/_components/audit-trail';
import { CaseMoney, CaseTimeline } from '../../../disputes/_components/case-summary';
import { DecisionCard, FactRows } from '../../../disputes/_components/decision-card';
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
  const decided = d.status === 'resolved' && d.decision !== null && d.freelancer_pct !== null;
  const before = m.status_before_dispute;
  const raiser = members[d.raised_by]?.display_name ?? 'the raising party';
  const arbitrator = d.arbitrator_id ? members[d.arbitrator_id] : null;

  const jump = [
    ['parties', 'Parties'], ['statements', 'Statements'], ['terms', 'Terms'], ['milestone', 'Milestone'], ['work', `Work (${submissions.length})`],
    ['evidence', `Evidence (${data.evidence.length})`], ['messages', 'Messages'], ['ai', 'AI recommendation'], ['audit', 'Audit log'],
  ] as const;

  return (
    <div className="space-y-10">
      <PageHeader
        className="mb-0 md:mb-0"
        breadcrumbs={[
          viewer.isAdmin && !isAssigned ? { label: 'Admin', href: '/admin' } : { label: 'Arbitration', href: '/arbitration' },
          { label: disputeNumber(d.number) },
        ]}
        eyebrow={<>Case · <span className="font-mono">{disputeNumber(d.number)}</span></>}
        title={c.title}
        description={`Milestone ${m.position}: ${m.title}`}
        meta={
          <>
            <DisputeStatusMark status={d.status} />
            <span>Opened {formatDateTime(d.created_at)}</span>
            {d.evidence_due_at && d.status === 'awaiting_evidence' && <span>Evidence due {formatDateTime(d.evidence_due_at)}</span>}
          </>
        }
      />

      <CaseMoney dispute={d} milestone={m} feeBps={c.fee_bps} raisedBy={raiser} />

      <NextSteps dispute={d} isParty={false} />

      <CaseTimeline dispute={d} arbitratorName={arbitrator?.display_name ?? null} className="border-y py-5" />

      <div className={cn('grid grid-cols-1 gap-12', open && 'lg:grid-cols-[minmax(0,1fr)_20rem]')}>
        {/* Once decided, the decision itself is shown in the case file; there are no actions left. */}
        {open && (
          <aside className="order-first lg:order-last">
            <div className="space-y-6 lg:sticky lg:top-20">
              <DecisionPanel disputeId={d.id} status={d.status} amount={d.amount} isAssigned={isAssigned} isAdmin={viewer.isAdmin} />
            </div>
          </aside>
        )}

        <div className="min-w-0 space-y-12">
          <nav aria-label="Case file sections" className="scrollbar-none -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
            <ul className="flex gap-x-5 whitespace-nowrap border-b text-sm">
              {jump.map(([href, label]) => (
                <li key={href}><a href={`#${href}`} className="-mb-px inline-flex min-h-10 items-center border-b-2 border-transparent text-ink-secondary hover:border-line-strong hover:text-ink">{label}</a></li>
              ))}
            </ul>
          </nav>

          {decided && <DecisionCard dispute={d} feeBps={c.fee_bps} members={members} />}

          <Ledger id="parties" className="scroll-mt-24" title="Parties" description="Verified by TrustLance from account and contract records.">
            {([['client', c.client_id], ['freelancer', c.freelancer_id]] as const).map(([r, uid]) => {
              const p = data.members.get(uid);
              const raised = d.raised_by === uid;
              if (!p) return <LedgerRow key={r}><p className="text-sm text-ink-muted">{r === 'client' ? 'Client' : 'Freelancer'} profile unavailable.</p></LedgerRow>;
              return (
                <LedgerRow key={r} href={`/u/${p.username}`} className="group flex-row items-center gap-3 sm:gap-4"
                  lead={<Avatar name={p.display_name} path={p.avatar_path} size="sm" />}
                  meta={p.stats ? <TrustLine stats={p.stats} role={r} /> : undefined}>
                  <p className="text-sm"><span className="row-title inline-block font-semibold">{p.display_name}</span> <span className="text-ink-muted">· {r === 'client' ? 'Client' : 'Freelancer'} · {raised ? 'opened the dispute' : 'respondent'}</span></p>
                </LedgerRow>
              );
            })}
          </Ledger>

          <section id="statements" aria-labelledby="statements-title" className="scroll-mt-24 space-y-3">
            <h2 id="statements-title" className="t-label-caps">Statements</h2>
            <Statements data={data} members={members} />
          </section>

          <section id="terms" aria-labelledby="terms-title" className="scroll-mt-24 space-y-3">
            <div className="space-y-0.5">
              <h2 id="terms-title" className="t-label-caps">Contract terms</h2>
              <p className="text-sm text-ink-secondary">What both parties signed.</p>
            </div>
            <FactRows items={[
              { label: 'Contract total', value: <Money amount={c.total_amount} size="sm" /> },
              { label: 'Contract status', value: <ContractStatusMark status={c.status} /> },
              { label: 'Payment terms', value: c.terms?.payment_terms || '—' },
              { label: 'Scope', value: <span className="whitespace-pre-line text-ink-secondary">{c.scope}</span> },
              ...(c.deliverables.length ? [{ label: 'Deliverables', value: <ol className="list-decimal space-y-0.5 pl-4 text-ink-secondary">{c.deliverables.map((x, i) => <li key={i}>{x}</li>)}</ol> }] : []),
              { label: 'Signed terms hash', value: <span className="t-mono break-all text-ink-secondary">{c.terms_hash}</span> },
            ]} />
          </section>

          <section id="milestone" aria-labelledby="milestone-title" className="scroll-mt-24 space-y-3">
            <h2 id="milestone-title" className="t-label-caps">Disputed milestone</h2>
            <FactRows items={[
              { label: 'Milestone', value: `${m.position}. ${m.title}` },
              { label: 'Frozen in escrow', value: <Money amount={m.amount} size="sm" /> },
              { label: 'Due date', value: m.due_date ? formatDate(m.due_date) : `Day ${m.due_in_days} of the contract` },
              { label: 'Status before dispute', value: before ? <span className="flex flex-wrap items-center gap-x-2 gap-y-1"><MilestoneStatusMark status={before} /><span className="t-meta">{milestoneStatus[before].description}</span></span> : '—' },
              { label: 'Revisions requested', value: String(m.revision_count) },
              { label: 'Submitted / approved', value: `${formatDateTime(m.submitted_at)} / ${formatDateTime(m.approved_at)}` },
              ...(m.description ? [{ label: 'What is delivered', value: <span className="whitespace-pre-line text-ink-secondary">{m.description}</span> }] : []),
            ]} />
          </section>

          <Submissions rows={submissions} />

          <EvidenceList evidence={data.evidence} members={members} contract={c} footer={open ? <AddEvidenceForm disputeId={d.id} /> : undefined} />

          <section id="messages" aria-labelledby="messages-title" className="scroll-mt-24 space-y-3">
            <h2 id="messages-title" className="t-label-caps">Messages</h2>
            <DisputeChat disputeId={d.id} viewerId={viewer.id} initial={data.messages} members={members} roles={roles}
              canSend={open} closedReason="This case is decided. Messaging is closed." />
          </section>

          <AiRecommendationPanel disputeId={d.id} amount={d.amount} initial={data.recommendation} canGenerate
            generateDisabledReason={open ? undefined : 'The case is decided; no new analysis is needed.'} />

          <AuditTrail events={data.events} members={members} title="Audit log" />
        </div>
      </div>
    </div>
  );
}

function Submissions({ rows }: { rows: SubmissionWithFiles[] }) {
  return (
    <Ledger
      id="work"
      className="scroll-mt-24"
      title="Submitted work"
      description="Every version the freelancer delivered for this milestone."
      empty={<p className="border-y py-5 text-sm text-ink-secondary">No work submitted. The freelancer has not submitted anything for this milestone.</p>}
    >
      {rows.map((s) => (
        <li key={s.id} className="space-y-3 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-sm font-semibold">Version {s.version}</p>
            <p className="t-meta">{formatDateTime(s.created_at)} · {s.review_status === 'approved' ? 'Approved' : s.review_status === 'revision_requested' ? 'Changes requested' : 'Pending review'}</p>
          </div>
          <p className="whitespace-pre-line break-words text-sm text-ink-secondary">{s.note}</p>
          {(s.links.length > 0 || s.files.length > 0) && (
            <ul className="space-y-1.5 text-sm">
              {s.links.map((l) => <li key={l}><a href={l} target="_blank" rel="noreferrer nofollow ugc" className="link inline-flex items-center gap-1 break-all">{l} <ExternalLink className="size-3 shrink-0" aria-hidden /></a></li>)}
              {s.files.map((f) => (
                <li key={f.id} className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden />
                  {f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="link min-w-0 truncate">{f.file_name}</a> : <span className="min-w-0 truncate">{f.file_name}</span>}
                  <span className="t-meta shrink-0">{formatBytes(f.size_bytes)}</span>
                </li>
              ))}
            </ul>
          )}
          {s.review_comment && <p className="border-l-2 border-line-strong pl-3 text-sm"><span className="font-medium">Client’s review:</span> <span className="text-ink-secondary">{s.review_comment}</span></p>}
        </li>
      ))}
    </Ledger>
  );
}
