import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, CircleSlash, Clock, XCircle } from 'lucide-react';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
import { DisputeStatusMark, SettlementStatusMark } from '@/components/common/status-mark';
import { requireViewer } from '@/lib/auth';
import {
  getArbitratorEligibility, getCategoryList, listArbitratorCases, type DisputeListItem, type EligibilityCheck,
} from '@/lib/data/disputes';
import { daysUntil, disputeNumber, formatDate, formatDateTime } from '@/lib/format';
import { disputeReasonLabel } from '@/lib/status';
import type { Arbitrator } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ApplyForm } from './apply-form';
import { AvailabilityPanel } from './availability';

export const metadata: Metadata = { title: 'Arbitration' };

export default async function ArbitrationPage() {
  const viewer = await requireViewer('/arbitration');
  const arb = viewer.arbitrator;
  if (arb?.status === 'approved') return <ArbitratorDesk viewerId={viewer.id} arb={arb} />;
  return <Programme arb={arb} />;
}

// ---------------------------------------------------------------------------
// Not (yet) an arbitrator
// ---------------------------------------------------------------------------

function checkValue(c: EligibilityCheck) {
  switch (c.key) {
    case 'contracts': return `${Number(c.value ?? 0)} completed`;
    case 'rating': return c.value === null ? 'No rating yet' : `${Number(c.value).toFixed(2)} average`;
    case 'disputes': return `${Number(c.value ?? 0)} lost`;
    case 'identity': return c.value ? 'Verified' : 'Not verified';
    case 'age': return typeof c.value === 'string' ? `Joined ${formatDate(c.value)}` : '—';
    default: return String(c.value ?? '—');
  }
}

const fixLinks: Partial<Record<EligibilityCheck['key'], { href: string; label: string }>> = {
  identity: { href: '/wallet#withdraw', label: 'Verify your PAN and bank' },
  contracts: { href: '/work', label: 'Find work' },
};

/** One ruled line for the state of an application. */
function StateLine({ tone, title, children }: { tone: 'info' | 'warning' | 'danger'; title: string; children: React.ReactNode }) {
  const rule = { info: 'before:bg-info', warning: 'before:bg-warning', danger: 'before:bg-danger' }[tone];
  const Icon = tone === 'info' ? Clock : AlertTriangle;
  return (
    <section aria-label={title} className={cn('relative flex items-start gap-3 py-1 pl-5 before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-full', rule)}>
      <Icon className={cn('mt-0.5 size-5 shrink-0', tone === 'info' ? 'text-info' : tone === 'warning' ? 'text-warning-strong' : 'text-danger')} aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className="font-semibold">{title}</p>
        <p className="max-w-reading text-sm text-ink-secondary">{children}</p>
      </div>
    </section>
  );
}

async function Programme({ arb }: { arb: Arbitrator | null }) {
  const [eligibility, categories] = await Promise.all([getArbitratorEligibility(), getCategoryList()]);
  const canApply = !arb || arb.status === 'rejected';

  return (
    <>
      <PageHeader
        eyebrow="Arbitrator programme"
        title="Help settle disputes fairly"
        description="Arbitrators are experienced TrustLance members who review disputed milestones and decide how the coins frozen in escrow are split. A person always makes the decision; AI analysis is only an advisory aid."
      />
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-12">
          {arb?.status === 'pending' && (
            <StateLine tone="info" title="Your application is under review">
              Submitted {formatDateTime(arb.applied_at)}. The platform team will notify you when it has been reviewed.
            </StateLine>
          )}
          {arb?.status === 'rejected' && (
            <StateLine tone="warning" title="Your last application was not approved">
              {arb.review_note ? <>Note from the platform team: “{arb.review_note}”. </> : null}You can apply again below once you meet the requirements.
            </StateLine>
          )}
          {arb?.status === 'suspended' && (
            <StateLine tone="danger" title="Your arbitrator role is suspended">
              You are not assigned new cases. {arb.review_note ? `Reason: ${arb.review_note}` : 'Contact the platform team for details.'}
            </StateLine>
          )}

          <Ledger id="how" title="How it works">
            {[
              ['Assigned without conflicts', 'You are only assigned cases where you have never worked with either party, matched to your specialisations and capacity.'],
              ['Review the case file', 'Contract terms, the milestone, submitted work, both statements, evidence and the case chat — all in one case room.'],
              ['Decide and explain', 'Choose full release, full refund or a split, and write reasoning both parties will read. The coins are paid out exactly that way as soon as you decide.'],
            ].map(([t, b], i) => (
              <LedgerRow key={t} className="flex-row items-start gap-4" lead={<span className="t-mono text-ink-muted">{String(i + 1).padStart(2, '0')}</span>}>
                <p className="text-sm font-medium">{t}</p>
                <p className="text-sm text-ink-secondary">{b}</p>
              </LedgerRow>
            ))}
          </Ledger>

          {canApply && <ApplyForm categories={categories} eligible={eligibility.eligible} />}
          {arb?.status === 'pending' && (
            <section aria-labelledby="application-title" className="space-y-3">
              <h2 id="application-title" className="t-label-caps">Your application</h2>
              <dl className="divide-y border-y text-sm">
                <div className="grid grid-cols-1 gap-0.5 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"><dt className="text-ink-muted">Specialisations</dt><dd>{arb.specializations.map((s) => categories.find((c) => c.slug === s)?.label ?? s).join(', ')}</dd></div>
                <div className="grid grid-cols-1 gap-0.5 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"><dt className="text-ink-muted">Capacity</dt><dd>{arb.capacity} case{arb.capacity === 1 ? '' : 's'} at a time</dd></div>
                <div className="grid grid-cols-1 gap-0.5 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4"><dt className="text-ink-muted">Statement</dt><dd className="whitespace-pre-line text-ink-secondary">{arb.statement}</dd></div>
              </dl>
            </section>
          )}
        </div>

        <aside>
          <section className="space-y-3" aria-labelledby="eligibility-title">
            <div className="space-y-0.5">
              <h2 id="eligibility-title" className="t-label-caps">Requirements</h2>
              <p className={cn('text-sm font-medium', eligibility.eligible ? 'text-success-strong' : 'text-ink-secondary')}>
                {eligibility.eligible ? 'You meet every requirement.' : `${eligibility.checks.filter((c) => c.met).length} of ${eligibility.checks.length} met`}
              </p>
            </div>
            <ul className="divide-y border-y">
              {eligibility.checks.map((c) => {
                const fix = !c.met ? fixLinks[c.key] : undefined;
                return (
                  <li key={c.key} className="flex gap-3 py-3 text-sm">
                    {c.met
                      ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                      : <XCircle className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />}
                    <span className="min-w-0 flex-1">
                      <span className={cn('block', c.met ? 'text-ink' : 'text-ink-secondary')}>{c.label}<span className="sr-only">{c.met ? ' — met' : ' — not met'}</span></span>
                      <span className="t-meta block">{checkValue(c)}</span>
                    </span>
                    {fix && <Link href={fix.href} className="link shrink-0 text-xs">{fix.label}</Link>}
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Approved arbitrator
// ---------------------------------------------------------------------------

async function ArbitratorDesk({ viewerId, arb }: { viewerId: string; arb: Arbitrator }) {
  const cases = await listArbitratorCases(viewerId);
  const active = cases.filter((c) => c.status !== 'resolved');
  const decided = cases.filter((c) => c.status === 'resolved');
  const count = (s: DisputeListItem['status']) => cases.filter((c) => c.status === s).length;
  const stats = [
    { label: 'Active', value: active.length },
    { label: 'Awaiting evidence', value: count('awaiting_evidence') },
    { label: 'Under review', value: count('under_review') },
    { label: 'Decided', value: decided.length },
  ];

  return (
    <>
      <PageHeader eyebrow="Arbitrator" title="Your cases" description="Disputes assigned to you. Review the case file, ask for evidence when needed, and record a reasoned decision." />
      <div className="space-y-12">
        <dl className="grid grid-cols-2 border-y md:grid-cols-4">
          {stats.map(({ label, value }, i) => (
            <div key={label} className={cn('flex min-w-0 flex-col justify-between gap-1 px-4 py-4', ['', 'border-l', 'border-t md:border-l md:border-t-0', 'border-l border-t md:border-t-0'][i])}>
              <dt className="t-label-caps">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-12">
            <Ledger
              id="active-cases"
              title="Active cases"
              empty={<EmptyState compact title="No active cases" description={arb.is_available ? 'New disputes matching your specialisations will appear here.' : 'Turn on availability to receive new cases.'} />}
            >
              {active.map((d) => <CaseRow key={d.id} d={d} />)}
            </Ledger>
            <Ledger id="decided-cases" title="Decided cases" empty={<p className="border-y py-5 text-sm text-ink-secondary">No decided cases yet.</p>}>
              {decided.map((d) => <CaseRow key={d.id} d={d} />)}
            </Ledger>
          </div>
          <aside><AvailabilityPanel available={arb.is_available} capacity={arb.capacity} active={active.length} /></aside>
        </div>
      </div>
    </>
  );
}

function CaseRow({ d }: { d: DisputeListItem }) {
  const days = d.status === 'awaiting_evidence' ? daysUntil(d.evidence_due_at) : null;
  // The arbitrator's move: decide once under review, or start the review once the evidence window has closed.
  const yourMove = d.status === 'under_review' || (d.status === 'awaiting_evidence' && days !== null && days <= 0);
  return (
    <LedgerRow
      href={`/arbitration/cases/${d.id}`}
      tone={yourMove ? 'brand' : undefined}
      className="group pl-4"
      trail={<Money amount={d.amount} />}
    >
      <div className="space-y-1.5">
        <p className="flex min-w-0 items-center gap-2">
          <span className="t-mono shrink-0 text-ink-muted">{disputeNumber(d.number)}</span>
          <span className="row-title truncate font-medium">{d.contract?.title ?? 'Contract'}</span>
          <ArrowRight className="row-arrow size-4 shrink-0 text-ink-muted" aria-hidden />
        </p>
        <p className="text-sm text-ink-secondary">Milestone {d.milestone?.position}{d.milestone?.title ? ` · ${d.milestone.title}` : ''} · {disputeReasonLabel[d.reason]}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <DisputeStatusMark status={d.status} />
          {d.status === 'resolved' && <SettlementStatusMark status={d.settlement_status} />}
          <span className="t-meta inline-flex items-center gap-1.5">
            {d.status === 'resolved' ? <>Decided {formatDate(d.decided_at)}</> : d.evidence_due_at && d.status === 'awaiting_evidence' ? (
              <><CalendarClock className="size-3.5" aria-hidden /> Evidence due {formatDateTime(d.evidence_due_at)}{days !== null && (days > 0 ? ` (${days} day${days === 1 ? '' : 's'})` : ' (closed)')}</>
            ) : d.status === 'escalated' ? <><CircleSlash className="size-3.5" aria-hidden /> Escalated to the platform team</> : <>Assigned {formatDate(d.assigned_at)}</>}
          </span>
        </div>
        {yourMove && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-brand">
            <ArrowRight className="size-3.5 shrink-0" aria-hidden />
            <span><span className="sr-only">Needs you: </span>{d.status === 'under_review' ? 'Review the case file and record a decision' : 'Evidence window closed — start the review'}</span>
          </p>
        )}
      </div>
    </LedgerRow>
  );
}
