import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { FileText, MessagesSquare, Scale } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Money } from '@/components/common/money';
import { Facts, PageHeader, Section } from '@/components/common/page-header';
import { ContractStatusBadge, DisputeStatusBadge } from '@/components/common/status-badge';
import { Stars, TrustSignals } from '@/components/common/trust-signals';
import { ActivityFeed } from '@/components/contracts/activity-feed';
import { AgreementPdfButton } from '@/components/contracts/agreement-pdf-button';
import { CancelContractButton } from '@/components/contracts/cancel-contract-button';
import { FundingPanel } from '@/components/contracts/funding-panel';
import { MilestoneCard } from '@/components/contracts/milestone-card';
import { NextActionBanner } from '@/components/contracts/next-action-banner';
import { ContractLiveUpdates } from '@/components/contracts/pending-tx-watcher';
import { ReviewForm } from '@/components/contracts/review-form';
import { SignPanel } from '@/components/contracts/sign-panel';
import { TransactionsList } from '@/components/contracts/transactions-list';
import { requireViewer } from '@/lib/auth';
import { getContractWorkspace } from '@/lib/data/contracts';
import { disputeNumber, formatBytes, formatDate, formatDateTime } from '@/lib/format';
import { nextAction } from '@/lib/next-action';
import { cn } from '@/lib/utils';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ws = await getContractWorkspace((await params).id);
  return { title: ws?.contract.title ?? 'Contract' };
}

const TABS = [
  { key: 'overview', label: 'Milestones' },
  { key: 'documents', label: 'Agreement & files' },
  { key: 'funding', label: 'Transactions' },
  { key: 'activity', label: 'Activity' },
  { key: 'review', label: 'Review' },
];

export default async function ContractPage({ params, searchParams }: Props) {
  const { id } = await params;
  const viewer = await requireViewer(`/contracts/${id}`);
  const ws = await getContractWorkspace(id);
  if (!ws) notFound();
  const { contract: c, milestones, submissions, transactions, events, disputes, reviews, members, files, conversationId } = ws;
  const role = c.client_id === viewer.id ? 'client' : c.freelancer_id === viewer.id ? 'freelancer' : null;
  if (!role) {
    // Arbitrators and admins read contracts through the case room of the dispute they handle.
    const caseForViewer = disputes.find((d) => d.arbitrator_id === viewer.id) ?? (viewer.isAdmin ? disputes[0] : undefined);
    if (caseForViewer) redirect(`/arbitration/cases/${caseForViewer.id}`);
    notFound();
  }

  const { tab: rawTab } = await searchParams;
  const tabs = TABS.filter((t) => t.key !== 'review' || c.status === 'completed');
  const tab = tabs.some((t) => t.key === rawTab) ? rawTab! : 'overview';
  const other = members.get(role === 'client' ? c.freelancer_id : c.client_id);
  const action = nextAction(role, c, milestones, disputes, reviews);
  const pending = transactions.filter((t) => t.status === 'pending');
  const openDisputes = disputes.filter((d) => d.status !== 'resolved' || d.settlement_status !== 'settled');
  const myReview = reviews.find((r) => r.reviewer_role === role);
  const theirReview = reviews.find((r) => r.reviewer_role !== role);

  return (
    <>
      <ContractLiveUpdates contractId={c.id} pendingTxIds={pending.map((t) => t.id)} />
      <PageHeader
        breadcrumbs={[{ label: 'Contracts', href: '/contracts' }, { label: c.title }]}
        eyebrow={`Contract · you are the ${role}`}
        title={c.title}
        meta={
          <>
            <ContractStatusBadge status={c.status} />
            <span className="flex items-center gap-2">
              <Avatar name={other?.display_name ?? '?'} path={other?.avatar_path} size="xs" />
              with <Link className="link" href={`/u/${other?.username ?? ''}`}>{other?.display_name ?? 'member'}</Link>
            </span>
            <span>Total <Money amount={c.total_amount} size="sm" /></span>
          </>
        }
        actions={
          <>
            {conversationId && <Button asChild variant="secondary"><Link href={`/messages/${conversationId}`}><MessagesSquare /> Messages</Link></Button>}
            <Button asChild variant="ghost"><Link href={`/projects/${c.project_id}`}>View project</Link></Button>
          </>
        }
      />

      <div className="space-y-6">
        <NextActionBanner action={action} />

        {openDisputes.length > 0 && (
          <ul className="space-y-2">
            {openDisputes.map((d) => {
              const ms = milestones.find((m) => m.id === d.milestone_id);
              return (
                <li key={d.id}>
                  <Callout tone="danger" title={<span className="flex flex-wrap items-center gap-2"><Scale className="size-4" aria-hidden /> {disputeNumber(d.number)} on milestone {ms?.position} <DisputeStatusBadge status={d.status} /></span>}
                    action={<Button asChild size="sm" variant="secondary"><Link href={`/disputes/${d.id}`}>Open dispute</Link></Button>}>
                    The milestone is frozen until the dispute is decided and settled.
                  </Callout>
                </li>
              );
            })}
          </ul>
        )}

        <nav aria-label="Contract sections" className="scrollbar-none -mb-px flex gap-1 overflow-x-auto border-b">
          {tabs.map((t) => (
            <Link key={t.key} href={`/contracts/${c.id}${t.key === 'overview' ? '' : `?tab=${t.key}`}`} aria-current={t.key === tab ? 'page' : undefined} scroll={false}
              className={cn('-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium', t.key === tab ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
              {t.label}{t.key === 'funding' && pending.length > 0 && <span className="ml-1.5 rounded-full bg-info-soft px-1.5 text-2xs text-info-strong">{pending.length} pending</span>}
            </Link>
          ))}
        </nav>

        {tab === 'overview' && (
          <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
            <div className="min-w-0 space-y-6">
              {(c.status === 'pending_signatures' || c.status === 'awaiting_funding') && (
                <SignPanel contract={c} role={role} myName={viewer.profile.display_name} walletAddress={viewer.wallet?.address ?? null} />
              )}
              <Section title="Milestones" description="Each milestone is paid separately, from escrow, when the client approves it.">
                <ol className="space-y-4">
                  {milestones.map((m) => (
                    <li key={m.id}>
                      <MilestoneCard
                        contract={c}
                        milestone={m}
                        submissions={submissions.filter((s) => s.milestone_id === m.id)}
                        role={role}
                        hasPendingTx={pending.some((t) => t.milestone_id === m.id)}
                        highlighted={action.milestoneId === m.id}
                      />
                    </li>
                  ))}
                </ol>
              </Section>
              {(c.status === 'pending_signatures' || c.status === 'awaiting_funding') && (
                <div className="flex justify-end"><CancelContractButton contractId={c.id} /></div>
              )}
            </div>
            <aside className="space-y-6">
              <FundingPanel contract={c} milestones={milestones} role={role} pendingFunding={pending.some((t) => t.kind === 'fund')} />
              {other?.stats && (
                <section className="panel space-y-3 p-5" aria-label={`About ${other.display_name}`}>
                  <p className="t-eyebrow">{role === 'client' ? 'Freelancer' : 'Client'}</p>
                  <p className="font-semibold">{other.display_name}</p>
                  <TrustSignals stats={other.stats} role={role === 'client' ? 'freelancer' : 'client'} />
                </section>
              )}
            </aside>
          </div>
        )}

        {tab === 'documents' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <Section title="Agreement" description="The exact terms both parties sign." action={<AgreementPdfButton contract={c} milestones={milestones} transactions={transactions} />}>
              <div className="panel space-y-5 p-5">
                <Facts items={[
                  { label: 'Client', value: c.terms.client.name },
                  { label: 'Freelancer', value: c.terms.freelancer.name },
                  { label: 'Total', value: <Money amount={c.terms.total_amount} /> },
                  { label: 'Duration', value: `${c.terms.duration_days} days` },
                  { label: 'Created', value: formatDateTime(c.created_at) },
                  { label: 'Terms fingerprint', value: <span className="t-mono break-all">{c.terms_hash}</span> },
                ]} />
                <div className="space-y-1">
                  <p className="t-eyebrow">Scope</p>
                  <p className="whitespace-pre-line text-sm text-ink-secondary">{c.terms.scope}</p>
                </div>
                {c.terms.deliverables.length > 0 && (
                  <div className="space-y-1">
                    <p className="t-eyebrow">Deliverables</p>
                    <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-secondary">{c.terms.deliverables.map((d, i) => <li key={i}>{d}</li>)}</ul>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="t-eyebrow">Payment terms</p>
                  <p className="text-sm text-ink-secondary">{c.terms.payment_terms}</p>
                </div>
              </div>
              <SignPanel contract={c} role={role} myName={viewer.profile.display_name} walletAddress={viewer.wallet?.address ?? null} />
            </Section>
            <Section title="Files" description="Everything delivered on this contract.">
              {files.length ? (
                <ul className="panel divide-y">
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 p-3 text-sm">
                      <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden />
                      <span className="min-w-0 flex-1">
                        {f.url ? <a href={f.url} className="link block truncate" target="_blank" rel="noreferrer">{f.file_name}</a> : <span className="block truncate">{f.file_name}</span>}
                        <span className="t-meta">{formatBytes(f.size_bytes)} · {formatDate(f.created_at)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-ink-secondary">No files yet.</p>}
            </Section>
          </div>
        )}

        {tab === 'funding' && (
          <div className="space-y-6">
            <FundingPanel contract={c} milestones={milestones} role={role} pendingFunding={pending.some((t) => t.kind === 'fund')} />
            <Section title="Transactions" description="Every on-chain transaction for this contract. Status changes only after TrustLance verifies it on the network.">
              <TransactionsList transactions={transactions} milestones={milestones} />
            </Section>
          </div>
        )}

        {tab === 'activity' && (
          <Section title="Activity" description="A permanent record of every event on this contract. Entries cannot be edited or deleted.">
            <div className="panel p-5"><ActivityFeed events={events} members={members} /></div>
          </Section>
        )}

        {tab === 'review' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {myReview ? (
              <section className="panel space-y-2 p-5">
                <p className="t-eyebrow">Your review</p>
                <Stars rating={myReview.rating} size="md" />
                <p className="text-sm text-ink-secondary">{myReview.body}</p>
              </section>
            ) : (
              <ReviewForm contractId={c.id} role={role} counterpartName={other?.display_name ?? 'the other party'} />
            )}
            <section className="panel space-y-2 p-5">
              <p className="t-eyebrow">Their review of you</p>
              {theirReview ? (
                <><Stars rating={theirReview.rating} size="md" /><p className="text-sm text-ink-secondary">{theirReview.body}</p></>
              ) : <p className="text-sm text-ink-secondary">Not written yet.</p>}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
