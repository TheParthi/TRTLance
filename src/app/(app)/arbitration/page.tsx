import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, CircleSlash, Gavel, Scale, ShieldCheck, XCircle } from 'lucide-react';
import { Callout } from '@/components/ui/callout';
import { Money } from '@/components/common/money';
import { PageHeader, Section } from '@/components/common/page-header';
import { DisputeStatusBadge, SettlementStatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/states';
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
    case 'wallet': return c.value ? 'Verified' : 'Not verified';
    case 'age': return typeof c.value === 'string' ? `Joined ${formatDate(c.value)}` : '—';
    default: return String(c.value ?? '—');
  }
}

const fixLinks: Partial<Record<EligibilityCheck['key'], { href: string; label: string }>> = {
  wallet: { href: '/wallet', label: 'Verify a wallet' },
  contracts: { href: '/work', label: 'Find work' },
};

async function Programme({ arb }: { arb: Arbitrator | null }) {
  const [eligibility, categories] = await Promise.all([getArbitratorEligibility(), getCategoryList()]);
  const canApply = !arb || arb.status === 'rejected';

  return (
    <>
      <PageHeader
        eyebrow="Arbitrator programme"
        title="Help settle disputes fairly"
        description="Arbitrators are experienced TrustLance members who review disputed milestones and decide how the escrowed funds are split. A person always makes the decision; AI analysis is only an advisory aid."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-8">
          {arb?.status === 'pending' && (
            <Callout tone="info" title="Your application is under review">
              Submitted {formatDateTime(arb.applied_at)}. The platform team will notify you when it has been reviewed.
            </Callout>
          )}
          {arb?.status === 'rejected' && (
            <Callout tone="warning" title="Your last application was not approved">
              {arb.review_note ? <>Note from the platform team: “{arb.review_note}”. </> : null}You can apply again below once you meet the requirements.
            </Callout>
          )}
          {arb?.status === 'suspended' && (
            <Callout tone="danger" title="Your arbitrator role is suspended">
              You are not assigned new cases. {arb.review_note ? `Reason: ${arb.review_note}` : 'Contact the platform team for details.'}
            </Callout>
          )}

          <Section title="How it works">
            <ol className="panel divide-y text-sm">
              {[
                ['Assigned without conflicts', 'You are only assigned cases where you have never worked with either party, matched to your specialisations and capacity.'],
                ['Review the case file', 'Contract terms, the milestone, submitted work, both statements, evidence and the case chat — all in one case room.'],
                ['Decide and explain', 'Choose full release, full refund or a split, and write reasoning both parties will read. The escrow contract pays out exactly that split.'],
              ].map(([t, b], i) => (
                <li key={t} className="flex gap-3 p-4">
                  <span className="t-mono text-ink-muted">{String(i + 1).padStart(2, '0')}</span>
                  <span><span className="block font-medium">{t}</span><span className="text-ink-secondary">{b}</span></span>
                </li>
              ))}
            </ol>
          </Section>

          {canApply && <ApplyForm categories={categories} eligible={eligibility.eligible} />}
          {arb?.status === 'pending' && (
            <Section title="Your application">
              <div className="panel space-y-3 p-5 text-sm">
                <p><span className="text-ink-muted">Specialisations:</span> {arb.specializations.map((s) => categories.find((c) => c.slug === s)?.label ?? s).join(', ')}</p>
                <p><span className="text-ink-muted">Capacity:</span> {arb.capacity} case{arb.capacity === 1 ? '' : 's'} at a time</p>
                <p className="whitespace-pre-line text-ink-secondary">{arb.statement}</p>
              </div>
            </Section>
          )}
        </div>

        <aside>
          <section className="panel space-y-4 p-5" aria-labelledby="eligibility-title">
            <h2 id="eligibility-title" className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-brand" aria-hidden /> Requirements</h2>
            <ul className="space-y-3">
              {eligibility.checks.map((c) => {
                const fix = !c.met ? fixLinks[c.key] : undefined;
                return (
                  <li key={c.key} className="flex gap-3 text-sm">
                    {c.met
                      ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                      : <XCircle className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />}
                    <span className="min-w-0">
                      <span className={cn('block', c.met ? 'text-ink' : 'text-ink-secondary')}>{c.label}<span className="sr-only">{c.met ? ' — met' : ' — not met'}</span></span>
                      <span className="t-meta block">{checkValue(c)}</span>
                      {fix && <Link href={fix.href} className="link text-xs">{fix.label}</Link>}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className={cn('text-sm font-medium', eligibility.eligible ? 'text-success-strong' : 'text-ink-secondary')}>
              {eligibility.eligible ? 'You meet every requirement.' : 'You do not meet every requirement yet.'}
            </p>
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
    { label: 'Active', value: active.length, Icon: Scale },
    { label: 'Awaiting evidence', value: count('awaiting_evidence'), Icon: CalendarClock },
    { label: 'Under review', value: count('under_review'), Icon: Gavel },
    { label: 'Decided', value: decided.length, Icon: CheckCircle2 },
  ];

  return (
    <>
      <PageHeader eyebrow="Arbitrator" title="Your cases" description="Disputes assigned to you. Review the case file, ask for evidence when needed, and record a reasoned decision." />
      <div className="space-y-8">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(({ label, value, Icon }) => (
            <div key={label} className="panel space-y-1 p-4">
              <dt className="t-eyebrow flex items-center gap-1.5"><Icon className="size-3.5" aria-hidden /> {label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-8">
            <Section title="Active cases">
              {active.length === 0
                ? <EmptyState compact icon={Scale} title="No active cases" description={arb.is_available ? 'New disputes matching your specialisations will appear here.' : 'Turn on availability to receive new cases.'} />
                : <CaseList rows={active} />}
            </Section>
            <Section title="Decided cases">
              {decided.length === 0 ? <p className="text-sm text-ink-secondary">No decided cases yet.</p> : <CaseList rows={decided} />}
            </Section>
          </div>
          <aside><AvailabilityPanel available={arb.is_available} capacity={arb.capacity} active={active.length} /></aside>
        </div>
      </div>
    </>
  );
}

function CaseList({ rows }: { rows: DisputeListItem[] }) {
  return (
    <ul className="panel divide-y">
      {rows.map((d) => {
        const days = d.status === 'awaiting_evidence' ? daysUntil(d.evidence_due_at) : null;
        return (
          <li key={d.id}>
            <Link href={`/arbitration/cases/${d.id}`} className="grid gap-2 p-4 hover:bg-surface-subtle sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0 space-y-1.5">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="t-mono text-ink-muted">{disputeNumber(d.number)}</span>
                  <span className="font-semibold">{d.contract?.title ?? 'Contract'}</span>
                </p>
                <p className="text-sm text-ink-secondary">Milestone {d.milestone?.position} · {disputeReasonLabel[d.reason]}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <DisputeStatusBadge status={d.status} />
                  {d.status === 'resolved' && <SettlementStatusBadge status={d.settlement_status} />}
                </div>
                <p className="t-meta flex items-center gap-1.5">
                  {d.status === 'resolved' ? <>Decided {formatDate(d.decided_at)}</> : d.evidence_due_at && d.status === 'awaiting_evidence' ? (
                    <><CalendarClock className="size-3.5" aria-hidden /> Evidence due {formatDateTime(d.evidence_due_at)}{days !== null && (days > 0 ? ` (${days} day${days === 1 ? '' : 's'})` : ' (closed)')}</>
                  ) : d.status === 'escalated' ? <><CircleSlash className="size-3.5" aria-hidden /> Escalated to the platform team</> : <>Assigned {formatDate(d.assigned_at)}</>}
                </p>
              </div>
              <Money amount={d.amount} size="lg" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
