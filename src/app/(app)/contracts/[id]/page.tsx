import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ExternalLink, FileText, MessagesSquare } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Facts, PageHeader, Section } from '@/components/common/page-header';
import { ContractStatusBadge } from '@/components/common/status-badge';
import { EscrowStatement } from '@/components/common/statement';
import { Stars, TrustLine } from '@/components/common/trust-signals';
import { ActivityFeed } from '@/components/contracts/activity-feed';
import { AgreementPdfButton } from '@/components/contracts/agreement-pdf-button';
import { CancelContractButton } from '@/components/contracts/cancel-contract-button';
import { FundEscrowButton } from '@/components/contracts/fund-escrow-button';
import { MilestoneCard } from '@/components/contracts/milestone-card';
import { NextActionBanner } from '@/components/contracts/next-action-banner';
import { ContractLiveUpdates } from '@/components/contracts/pending-tx-watcher';
import { ReviewForm } from '@/components/contracts/review-form';
import { SignPanel } from '@/components/contracts/sign-panel';
import { TransactionsList } from '@/components/contracts/transactions-list';
import { SubNav } from '@/components/shell/sub-nav';
import { requireViewer } from '@/lib/auth';
import { getContractWorkspace } from '@/lib/data/contracts';
import { publicEnv } from '@/lib/env';
import { explorerAddressUrl, formatBytes, formatDate, formatDateTime, shortAddress } from '@/lib/format';
import { nextAction } from '@/lib/next-action';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ws = await getContractWorkspace((await params).id);
  return { title: ws?.contract.title ?? 'Contract' };
}

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
  const tabs = [
    { key: 'overview', label: 'Milestones' },
    { key: 'documents', label: 'Agreement & files' },
    { key: 'funding', label: 'Transactions', count: transactions.length },
    { key: 'activity', label: 'Activity' },
    ...(c.status === 'completed' ? [{ key: 'review', label: 'Review' }] : []),
  ];
  const tab = tabs.some((t) => t.key === rawTab) ? rawTab! : 'overview';
  const client = members.get(c.client_id);
  const freelancer = members.get(c.freelancer_id);
  const other = role === 'client' ? freelancer : client;
  const action = nextAction(role, c, milestones, disputes, reviews);
  const pending = transactions.filter((t) => t.status === 'pending');
  const myReview = reviews.find((r) => r.reviewer_role === role);
  const theirReview = reviews.find((r) => r.reviewer_role !== role);
  const current = action.milestoneId ?? milestones.find((m) => !['paid', 'refunded', 'settled', 'pending'].includes(m.status))?.id;
  const escrowUrl = c.escrow_address ? explorerAddressUrl(c.escrow_address) : null;
  const fundControl = role === 'client' && c.status === 'awaiting_funding'
    ? <FundEscrowButton contract={c} milestones={milestones} pending={pending.some((t) => t.kind === 'fund')} />
    : undefined;

  return (
    <div className="space-y-8">
      <ContractLiveUpdates contractId={c.id} pendingTxIds={pending.map((t) => t.id)} />
      <PageHeader
        className="mb-0 md:mb-0"
        breadcrumbs={[{ label: 'Contracts', href: '/contracts' }, { label: c.title }]}
        eyebrow={`Contract · you are the ${role}`}
        title={c.title}
        meta={
          <>
            <ContractStatusBadge status={c.status} />
            <span className="flex items-center gap-2">
              <Avatar name={other?.display_name ?? '?'} path={other?.avatar_path} size="xs" />
              {role === 'client' ? 'Freelancer' : 'Client'} <Link className="link" href={`/u/${other?.username ?? ''}`}>{other?.display_name ?? 'member'}</Link>
            </span>
            <span>Started {formatDate(c.created_at)}</span>
          </>
        }
        actions={
          <>
            {conversationId && <Button asChild variant="secondary"><Link href={`/messages/${conversationId}`}><MessagesSquare /> Messages</Link></Button>}
            <Button asChild variant="ghost"><Link href={`/projects/${c.project_id}`}>Project brief</Link></Button>
          </>
        }
      />

      <EscrowStatement
        milestones={milestones}
        title={c.funded_at ? 'Escrow' : 'Escrow — not funded yet'}
        note={c.escrow_address ? (
          <span className="inline-flex flex-wrap items-center gap-1">
            Held by {escrowUrl ? <a className="link inline-flex items-center gap-1 font-mono" href={escrowUrl} target="_blank" rel="noreferrer">{shortAddress(c.escrow_address)} <ExternalLink className="size-3" aria-hidden /></a> : <span className="font-mono">{shortAddress(c.escrow_address)}</span>}
            on {publicEnv.chain.name || `chain ${c.chain_id}`}, not by TrustLance
          </span>
        ) : c.status === 'cancelled' ? 'Cancelled before funding — no money moved.' : 'The client deposits the full amount after both parties sign.'}
      />

      <NextActionBanner action={action} control={fundControl} />

      <div>
        <SubNav
          label="Contract sections"
          active={tab}
          items={tabs.map((t) => ({ key: t.key, label: t.label, count: 'count' in t ? t.count : undefined, href: `/contracts/${c.id}${t.key === 'overview' ? '' : `?tab=${t.key}`}` }))}
        />

        {tab === 'overview' && (
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="min-w-0 space-y-10">
              {(c.status === 'pending_signatures' || c.status === 'awaiting_funding') && (
                <SignPanel contract={c} role={role} myName={viewer.profile.display_name} walletAddress={viewer.wallet?.address ?? null} />
              )}
              <section aria-label="Milestones">
                <ol>
                  {milestones.map((m, i) => {
                    const d = disputes.find((x) => x.milestone_id === m.id && (x.status !== 'resolved' || x.settlement_status !== 'settled'));
                    return (
                      <li key={m.id}>
                        <MilestoneCard
                          contract={c}
                          milestone={m}
                          submissions={submissions.filter((s) => s.milestone_id === m.id)}
                          role={role}
                          hasPendingTx={pending.some((t) => t.milestone_id === m.id)}
                          highlighted={current === m.id && c.status !== 'completed'}
                          dispute={d ? { id: d.id, number: d.number } : null}
                          last={i === milestones.length - 1}
                        />
                      </li>
                    );
                  })}
                </ol>
              </section>
              {(c.status === 'pending_signatures' || c.status === 'awaiting_funding') && (
                <div className="flex justify-end"><CancelContractButton contractId={c.id} /></div>
              )}
            </div>

            <aside className="space-y-8">
              <Ledger title={<span className="t-label-caps">Parties</span>}>
                {[{ m: client, r: 'client' as const }, { m: freelancer, r: 'freelancer' as const }].map(({ m, r }) => m && (
                  <LedgerRow key={r} href={`/u/${m.username}`} lead={<Avatar name={m.display_name} path={m.avatar_path} size="sm" />}
                    meta={m.stats ? <TrustLine stats={m.stats} role={r} /> : undefined}>
                    <p className="text-sm font-medium">{m.display_name}{m.id === viewer.id && <span className="text-ink-muted"> (you)</span>}</p>
                    <p className="text-xs capitalize text-ink-muted">{r}</p>
                  </LedgerRow>
                ))}
              </Ledger>
              <div className="space-y-3">
                <p className="t-label-caps">Contract</p>
                <Facts className="sm:grid-cols-1" items={[
                  { label: 'Total', value: `${milestones.length} milestones · ${c.terms.duration_days} days` },
                  { label: 'Funded', value: c.funded_at ? formatDateTime(c.funded_at) : 'Not yet' },
                  { label: 'Terms fingerprint', value: <span className="t-mono break-all">{c.terms_hash.slice(0, 24)}…</span> },
                ]} />
              </div>
            </aside>
          </div>
        )}

        {tab === 'documents' && (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-10">
              <Section title="Agreement" description="The exact terms both parties sign." action={<AgreementPdfButton contract={c} milestones={milestones} transactions={transactions} />}>
                <div className="space-y-6 border-t pt-6">
                  <Facts items={[
                    { label: 'Client', value: c.terms.client.name },
                    { label: 'Freelancer', value: c.terms.freelancer.name },
                    { label: 'Total', value: `${c.terms.total_amount} ${c.currency}` },
                    { label: 'Duration', value: `${c.terms.duration_days} days` },
                    { label: 'Created', value: formatDateTime(c.created_at) },
                    { label: 'Terms fingerprint', value: <span className="t-mono break-all">{c.terms_hash}</span> },
                  ]} />
                  <div className="space-y-1">
                    <p className="t-label-caps">Scope</p>
                    <p className="max-w-reading whitespace-pre-line text-sm text-ink-secondary">{c.terms.scope}</p>
                  </div>
                  {c.terms.deliverables.length > 0 && (
                    <div className="space-y-1">
                      <p className="t-label-caps">Deliverables</p>
                      <ol className="list-decimal space-y-0.5 pl-5 text-sm text-ink-secondary">{c.terms.deliverables.map((d, i) => <li key={i}>{d}</li>)}</ol>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="t-label-caps">Payment terms</p>
                    <p className="max-w-reading text-sm text-ink-secondary">{c.terms.payment_terms}</p>
                  </div>
                </div>
              </Section>
              <SignPanel contract={c} role={role} myName={viewer.profile.display_name} walletAddress={viewer.wallet?.address ?? null} />
            </div>
            <Ledger title={<span className="t-label-caps">Files</span>} empty={<p className="border-y py-4 text-sm text-ink-secondary">No files yet.</p>}>
              {files.map((f) => (
                <LedgerRow key={f.id} lead={<FileText className="size-4 text-ink-muted" aria-hidden />} meta={<span>{formatBytes(f.size_bytes)} · {formatDate(f.created_at)}</span>}>
                  {f.url ? <a href={f.url} className="link block truncate text-sm" target="_blank" rel="noreferrer">{f.file_name}</a> : <span className="block truncate text-sm">{f.file_name}</span>}
                </LedgerRow>
              ))}
            </Ledger>
          </div>
        )}

        {tab === 'funding' && (
          <Section title="Transactions" description="Every on-chain transaction for this contract. A status changes only after TrustLance verifies it on the network.">
            <TransactionsList transactions={transactions} milestones={milestones} />
          </Section>
        )}

        {tab === 'activity' && (
          <Section title="Activity" description="A permanent record of every event on this contract. Entries cannot be edited or deleted.">
            <ActivityFeed events={events} members={members} />
          </Section>
        )}

        {tab === 'review' && (
          <div className="grid gap-10 lg:grid-cols-2">
            {myReview ? (
              <section className="space-y-2">
                <p className="t-label-caps">Your review</p>
                <Stars rating={myReview.rating} size="md" />
                <p className="text-sm text-ink-secondary">{myReview.body}</p>
              </section>
            ) : (
              <ReviewForm contractId={c.id} role={role} counterpartName={other?.display_name ?? 'the other party'} />
            )}
            <section className="space-y-2">
              <p className="t-label-caps">Their review of you</p>
              {theirReview ? (
                <><Stars rating={theirReview.rating} size="md" /><p className="text-sm text-ink-secondary">{theirReview.body}</p></>
              ) : <p className="text-sm text-ink-secondary">Not written yet.</p>}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
