import { PendingEscrowWatcher } from '@/components/escrow/pending-escrow-watcher';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
import { DisputeStatusMark, SettlementStatusMark } from '@/components/common/status-mark';
import { TrustLine } from '@/components/common/trust-signals';
import { getAdminQueues, getCategoryList, getEscrowArbiter, type DisputeListItem } from '@/lib/data/disputes';
import { disputeNumber, formatDate, formatDateTime, formatRelative, shortAddress } from '@/lib/format';
import { disputeReasonLabel } from '@/lib/status';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { decisionLabel } from '../disputes/_components/labels';
import { SplitRows } from '../disputes/_components/split';
import { ApplicationReview } from './application-review';
import { AssignForm, type ArbitratorOption } from './assign-form';
import { SettleButton } from './settle-button';

export const metadata: Metadata = { title: 'Admin' };

const CASE_SELECT = '*, contract:contracts(id, title, client_id, freelancer_id), milestone:milestones(id, position, title)';

/** Hairlines for a 2×2 grid on phones that becomes one row of four from md. */
const QUAD = ['', 'border-l', 'border-t md:border-l md:border-t-0', 'border-l border-t md:border-t-0'];

const quietEmpty = (title: string, body: string) => <EmptyState compact title={title} description={body} />;

export default async function AdminPage() {
  const supabase = await createClient();
  const [queues, arbiter, categories, recent] = await Promise.all([
    getAdminQueues(),
    getEscrowArbiter(),
    getCategoryList().catch(() => []),
    supabase.from('disputes').select(CASE_SELECT).order('created_at', { ascending: false }).limit(50).returns<DisputeListItem[]>(),
  ]);
  const { attention, settlements, applications, arbitrators, members } = queues;
  const cases = recent.data ?? [];
  const name = (id: string | null | undefined) => (id ? members.get(id)?.display_name ?? 'Member' : '—');
  const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug;

  const queueNav = [
    { href: '#attention', label: 'Needs attention', count: attention.length, urgent: attention.length > 0 },
    { href: '#settlements', label: 'Settlements', count: settlements.length, urgent: settlements.length > 0 },
    { href: '#applications', label: 'Applications', count: applications.length, urgent: false },
    { href: '#cases', label: 'All cases', count: cases.length, urgent: false },
  ];

  return (
    <>
      <PendingEscrowWatcher contractIds={settlements.flatMap((d) => (d.contract ? [d.contract.id] : []))} />
      <PageHeader
        eyebrow="Platform admin"
        title="Disputes and arbitration"
        description="Cases that need a person from the platform team, decisions waiting to be settled on-chain, and arbitrator applications."
      />
      <nav aria-label="Queues" className="mb-10">
        <ul className="grid grid-cols-2 border-y md:grid-cols-4">
          {queueNav.map((q, i) => (
            <li key={q.href} className={cn(QUAD[i])}>
              <a href={q.href} className="flex h-full flex-col gap-1 px-4 py-3 transition-colors duration-base ease-ledger hover:bg-surface-subtle/70">
                <span className="t-label-caps">{q.label}</span>
                <span className={cn('text-2xl font-semibold tabular-nums', q.urgent ? 'text-ink' : 'text-ink-muted')}>{q.count}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-14">
        <Ledger
          id="attention"
          className="scroll-mt-24"
          title={`Needs attention (${attention.length})`}
          description="Open with no arbitrator, or escalated to the platform team. Assign an arbitrator or decide in the case room."
          empty={quietEmpty('Nothing needs attention', 'Every open dispute has an arbitrator.')}
        >
          {attention.map((d) => {
            const options: ArbitratorOption[] = arbitrators
              .filter((a) => a.user_id !== d.contract?.client_id && a.user_id !== d.contract?.freelancer_id && a.user_id !== d.arbitrator_id)
              .map((a) => ({ id: a.user_id, name: name(a.user_id), active: a.active, capacity: a.capacity, specializations: a.specializations.map(categoryLabel).join(', ') }));
            const escalated = d.status === 'escalated';
            return (
              <li key={d.id} className={cn('relative space-y-3 py-4 pl-4 before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full', escalated ? 'before:bg-danger' : 'before:bg-warning')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <span className="t-mono text-ink-muted">{disputeNumber(d.number)}</span>
                      <span className="font-medium">{d.contract?.title ?? 'Contract'}</span>
                    </p>
                    <p className="text-sm text-ink-secondary">
                      Milestone {d.milestone?.position} · {disputeReasonLabel[d.reason]} · {name(d.contract?.client_id)} (client) vs {name(d.contract?.freelancer_id)} (freelancer)
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <DisputeStatusMark status={d.status} />
                      <span className="t-meta">Opened {formatDateTime(d.created_at)} ({formatRelative(d.created_at)})</span>
                    </p>
                    {d.escalation_reason && (
                      <p className="flex items-start gap-1.5 text-sm text-danger-strong">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        <span><span className="font-medium">Escalation reason:</span> {d.escalation_reason}</span>
                      </p>
                    )}
                  </div>
                  <Money amount={d.amount} className="shrink-0" />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <AssignForm disputeId={d.id} options={options} label={d.arbitrator_id ? `Reassign (currently ${name(d.arbitrator_id)})` : 'Assign an arbitrator'} />
                  <Button asChild variant="secondary"><Link href={`/arbitration/cases/${d.id}`}><Gavel /> Review and decide <ArrowRight /></Link></Button>
                </div>
              </li>
            );
          })}
        </Ledger>

        <Ledger
          id="settlements"
          className="scroll-mt-24"
          title={`Settlements (${settlements.length})`}
          description={
            <>
              Decided disputes whose milestone is flagged on-chain. The escrow’s arbiter account sends the settlement; funds move only when it confirms.
              {!arbiter.error && <span className="t-meta mt-1 block">Arbiter account <span className="font-mono">{shortAddress(arbiter.address)}</span> — connect it in your wallet to settle.</span>}
            </>
          }
          empty={
            <>
              {arbiter.error && <p className="mb-3 text-sm text-warning-strong">Settlement is unavailable: {arbiter.error}</p>}
              {quietEmpty('No settlements waiting', 'Decided disputes appear here once a party has flagged the milestone on-chain.')}
            </>
          }
        >
          {settlements.length > 0 ? <>
          {arbiter.error && <li className="py-3 text-sm text-warning-strong">Settlement is unavailable: {arbiter.error}</li>}
          {settlements.map((d) => (
            <li key={d.id} className="relative grid grid-cols-1 gap-4 py-4 pl-4 before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-brand md:grid-cols-[minmax(0,1fr)_18rem] md:items-center md:gap-8">
              <div className="min-w-0 space-y-1">
                <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <Link href={`/arbitration/cases/${d.id}`} className="t-mono link">{disputeNumber(d.number)}</Link>
                  <span className="font-medium">{d.contract?.title ?? 'Contract'}</span>
                </p>
                <p className="text-sm text-ink-secondary">Milestone {d.milestone?.position} · {d.milestone?.title}</p>
                {d.decision && d.freelancer_pct !== null && <p className="text-sm font-medium">{decisionLabel(d.decision, d.freelancer_pct)}</p>}
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1"><SettlementStatusMark status={d.settlement_status} /><span className="t-meta">Decided {formatDate(d.decided_at)}</span></p>
              </div>
              <div className="min-w-0 space-y-3">
                {d.freelancer_pct !== null && <SplitRows amount={d.amount} pct={d.freelancer_pct} size="sm" />}
                {d.settlement_status === 'pending' ? (
                  <p className="t-meta">A settlement transaction is being verified.</p>
                ) : !d.contract?.escrow_key || !d.milestone ? (
                  <p className="t-meta">No escrow record for this contract — it cannot be settled on-chain.</p>
                ) : arbiter.address && d.freelancer_pct !== null ? (
                  <SettleButton disputeLabel={disputeNumber(d.number)} contractId={d.contract.id} milestoneId={d.milestone.id}
                    milestoneTitle={d.milestone.title} position={d.milestone.position} escrowKey={d.contract.escrow_key}
                    amount={d.milestone.amount} freelancerPct={d.freelancer_pct} arbiter={arbiter.address} />
                ) : null}
              </div>
            </li>
          ))}
          </> : null}
        </Ledger>

        <Ledger
          id="applications"
          className="scroll-mt-24"
          title={`Arbitrator applications (${applications.length})`}
          description="Eligibility was checked when they applied. Review their experience before approving."
          empty={quietEmpty('No pending applications', 'New applications appear here for review.')}
        >
          {applications.map((a) => {
            const m = members.get(a.user_id);
            return (
              <li key={a.user_id} className="space-y-2 py-4 pl-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    {m ? <Link href={`/u/${m.username}`} className="font-medium hover:text-brand">{m.display_name}</Link> : <span className="font-medium">Member</span>}
                    <p className="text-sm text-ink-secondary">{a.specializations.map(categoryLabel).join(', ')} · up to {a.capacity} case{a.capacity === 1 ? '' : 's'} at a time</p>
                    <p className="t-meta">Applied {formatDateTime(a.applied_at)}{m?.stats ? ` · ${m.stats.completed_as_client + m.stats.completed_as_freelancer} completed contracts · ${m.stats.disputes_lost} disputes lost` : ''}</p>
                    {m?.stats && <TrustLine stats={m.stats} role="freelancer" />}
                  </div>
                  <ApplicationReview userId={a.user_id} name={m?.display_name ?? 'this member'} />
                </div>
                <p className="max-w-reading whitespace-pre-line break-words text-sm text-ink-secondary">{a.statement}</p>
              </li>
            );
          })}
        </Ledger>

        <Ledger
          id="cases"
          className="scroll-mt-24"
          title="All cases"
          description={recent.error ? 'Cases could not be loaded. Refresh the page to try again.' : 'The 50 most recent disputes, newest first.'}
          empty={quietEmpty('No disputes yet', 'Disputes opened on any contract appear here.')}
        >
          {cases.map((d) => (
            <LedgerRow
              key={d.id}
              href={`/arbitration/cases/${d.id}`}
              className="group py-3 pl-4"
              trail={<Money amount={d.amount} size="sm" />}
            >
              <p className="flex min-w-0 items-center gap-2 text-sm">
                <span className="t-mono shrink-0 text-ink-muted">{disputeNumber(d.number)}</span>
                <span className="row-title truncate font-medium">{d.contract?.title ?? 'Contract'}</span>
                <ArrowRight className="row-arrow size-4 shrink-0 text-ink-muted" aria-hidden />
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <DisputeStatusMark status={d.status} />
                {(d.status === 'resolved' || d.settlement_status === 'awaiting_flag') && <SettlementStatusMark status={d.settlement_status} />}
                <span className="t-meta">Milestone {d.milestone?.position} · opened {formatDate(d.created_at)}</span>
              </p>
            </LedgerRow>
          ))}
        </Ledger>
      </div>
    </>
  );
}
