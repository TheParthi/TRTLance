import { PendingEscrowWatcher } from '@/components/escrow/pending-escrow-watcher';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Gavel, Scale, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Money } from '@/components/common/money';
import { PageHeader, Section } from '@/components/common/page-header';
import { DisputeStatusBadge, SettlementStatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/states';
import { TrustSignals } from '@/components/common/trust-signals';
import { getAdminQueues, getCategoryList, getEscrowArbiter } from '@/lib/data/disputes';
import { disputeNumber, formatDate, formatDateTime, formatRelative, shortAddress } from '@/lib/format';
import { disputeReasonLabel } from '@/lib/status';
import { decisionLabel } from '../disputes/_components/labels';
import { SplitRows } from '../disputes/_components/split';
import { ApplicationReview } from './application-review';
import { AssignForm, type ArbitratorOption } from './assign-form';
import { SettleButton } from './settle-button';

export const metadata: Metadata = { title: 'Admin' };

export default async function AdminPage() {
  const [queues, arbiter, categories] = await Promise.all([getAdminQueues(), getEscrowArbiter(), getCategoryList().catch(() => [])]);
  const { attention, settlements, applications, arbitrators, members } = queues;
  const name = (id: string | null | undefined) => (id ? members.get(id)?.display_name ?? 'Member' : '—');
  const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug;

  return (
    <>
      <PendingEscrowWatcher contractIds={settlements.flatMap((d) => (d.contract ? [d.contract.id] : []))} />
      <PageHeader
        eyebrow="Platform admin"
        title="Disputes and arbitration"
        description="Cases that need a person from the platform team, decisions waiting to be settled on-chain, and arbitrator applications."
      />
      <nav aria-label="Queues" className="mb-8 flex flex-wrap gap-2 text-sm">
        <a href="#attention" className="link">Needs attention ({attention.length})</a>
        <span aria-hidden className="text-ink-muted">·</span>
        <a href="#settlements" className="link">Settlements ({settlements.length})</a>
        <span aria-hidden className="text-ink-muted">·</span>
        <a href="#applications" className="link">Applications ({applications.length})</a>
      </nav>

      <div className="space-y-12">
        <Section id="attention" title="Disputes needing attention" description="Open with no arbitrator, or escalated to the platform team. Assign an arbitrator or decide in the case room.">
          {attention.length === 0 ? <EmptyState compact icon={Scale} title="Nothing needs attention" description="Every open dispute has an arbitrator." /> : (
            <ul className="space-y-4">
              {attention.map((d) => {
                const options: ArbitratorOption[] = arbitrators
                  .filter((a) => a.user_id !== d.contract?.client_id && a.user_id !== d.contract?.freelancer_id && a.user_id !== d.arbitrator_id)
                  .map((a) => ({ id: a.user_id, name: name(a.user_id), active: a.active, capacity: a.capacity, specializations: a.specializations.map(categoryLabel).join(', ') }));
                return (
                  <li key={d.id} className="panel space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="t-mono text-ink-muted">{disputeNumber(d.number)}</span>
                          <span className="font-semibold">{d.contract?.title ?? 'Contract'}</span>
                        </p>
                        <p className="text-sm text-ink-secondary">Milestone {d.milestone?.position} · {disputeReasonLabel[d.reason]} · {name(d.contract?.client_id)} (client) vs {name(d.contract?.freelancer_id)} (freelancer)</p>
                        <p className="t-meta">Opened {formatDateTime(d.created_at)} ({formatRelative(d.created_at)})</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Money amount={d.amount} size="lg" />
                        <DisputeStatusBadge status={d.status} />
                      </div>
                    </div>
                    {d.escalation_reason && <Callout tone="danger" title="Escalation reason">{d.escalation_reason}</Callout>}
                    <div className="grid gap-4 border-t pt-4 md:grid-cols-[1fr_auto] md:items-end">
                      <AssignForm disputeId={d.id} options={options} label={d.arbitrator_id ? `Reassign (currently ${name(d.arbitrator_id)})` : 'Assign an arbitrator'} />
                      <Button asChild variant="secondary"><Link href={`/arbitration/cases/${d.id}`}><Gavel /> Review and decide <ArrowRight /></Link></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section id="settlements" title="Settlements" description="Decided disputes whose milestone is flagged on-chain. The escrow’s arbiter account sends the settlement; funds move only when it confirms.">
          {arbiter.error
            ? <Callout tone="warning" title="Settlement unavailable">{arbiter.error}</Callout>
            : <p className="t-meta">Escrow arbiter account: <span className="font-mono">{shortAddress(arbiter.address)}</span>. Connect this account in your wallet to settle.</p>}
          {settlements.length === 0 ? <EmptyState compact icon={Scale} title="No settlements waiting" description="Decided disputes appear here once a party has flagged the milestone on-chain." /> : (
            <ul className="space-y-4">
              {settlements.map((d) => (
                <li key={d.id} className="panel grid gap-4 p-5 md:grid-cols-[1fr_18rem]">
                  <div className="min-w-0 space-y-2">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link href={`/arbitration/cases/${d.id}`} className="t-mono link">{disputeNumber(d.number)}</Link>
                      <span className="font-semibold">{d.contract?.title ?? 'Contract'}</span>
                    </p>
                    <p className="text-sm text-ink-secondary">Milestone {d.milestone?.position} · {d.milestone?.title}</p>
                    {d.decision && d.freelancer_pct !== null && <p className="text-sm font-medium">{decisionLabel(d.decision, d.freelancer_pct)}</p>}
                    <div className="flex flex-wrap items-center gap-2"><SettlementStatusBadge status={d.settlement_status} /><span className="t-meta">Decided {formatDate(d.decided_at)}</span></div>
                  </div>
                  <div className="space-y-3">
                    {d.freelancer_pct !== null && <SplitRows amount={d.amount} pct={d.freelancer_pct} />}
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
            </ul>
          )}
        </Section>

        <Section id="applications" title="Arbitrator applications" description="Eligibility was checked when they applied. Review their experience before approving.">
          {applications.length === 0 ? <EmptyState compact icon={UserCheck} title="No pending applications" /> : (
            <ul className="space-y-4">
              {applications.map((a) => {
                const m = members.get(a.user_id);
                return (
                  <li key={a.user_id} className="panel space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        {m ? <Link href={`/u/${m.username}`} className="font-semibold hover:text-brand">{m.display_name}</Link> : <span className="font-semibold">Member</span>}
                        <p className="t-meta">Applied {formatDateTime(a.applied_at)} · up to {a.capacity} case{a.capacity === 1 ? '' : 's'} at a time</p>
                        <div className="flex flex-wrap gap-1.5">{a.specializations.map((s) => <Badge key={s}>{categoryLabel(s)}</Badge>)}</div>
                      </div>
                      <ApplicationReview userId={a.user_id} name={m?.display_name ?? 'this member'} />
                    </div>
                    <p className="whitespace-pre-line break-words text-sm text-ink-secondary">{a.statement}</p>
                    {m?.stats && (
                      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-3">
                        <TrustSignals stats={m.stats} role="freelancer" compact />
                        <p className="t-meta">{m.stats.completed_as_client + m.stats.completed_as_freelancer} completed contracts · {m.stats.disputes_lost} disputes lost</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
