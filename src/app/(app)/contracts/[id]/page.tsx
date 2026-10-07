import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeftRight, FileText, MessagesSquare } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { Breadcrumbs, Facts } from '@/components/common/page-header';
import { ContractStatusMark } from '@/components/common/status-mark';
import { EscrowRail } from '@/components/common/escrow-rail';
import { MoneyCount } from '@/components/common/money-count';
import { Stars, TrustLine } from '@/components/common/trust-signals';
import { ActivityFeed } from '@/components/contracts/activity-feed';
import { AgreementPdfButton } from '@/components/contracts/agreement-pdf-button';
import { CancelContractButton } from '@/components/contracts/cancel-contract-button';
import { ContractRing } from '@/components/contracts/contract-ring';
import { FundEscrowButton, FundEscrowTrigger } from '@/components/contracts/fund-escrow-button';
import { MilestoneCard } from '@/components/contracts/milestone-card';
import { NextActionBanner } from '@/components/contracts/next-action-banner';
import { ContractLiveUpdates } from '@/components/contracts/live-updates';
import { ReviewForm } from '@/components/contracts/review-form';
import { SignPanel } from '@/components/contracts/sign-panel';
import { EscrowMovements } from '@/components/contracts/escrow-movements';
import { LedgerField } from '@/components/marketing/ledger-field';
import { Reveal, SplitWords } from '@/components/marketing/reveal';
import { SubNav } from '@/components/shell/sub-nav';
import { requireViewer } from '@/lib/auth';
import { getContractWorkspace } from '@/lib/data/contracts';
import { formatBytes, formatDate, formatDateTime } from '@/lib/format';
import { escrowStatement, milestoneSegments } from '@/lib/escrow-summary';
import { feePercent, formatAmount } from '@/lib/money';
import { nextAction } from '@/lib/next-action';
import { contractStatus, milestoneStatus } from '@/lib/status';
import { cn } from '@/lib/utils';

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
  const { contract: c, milestones, submissions, escrow, events, disputes, reviews, members, files, conversationId, settings } = ws;
  const role = c.client_id === viewer.id ? 'client' : c.freelancer_id === viewer.id ? 'freelancer' : null;
  if (!role) {
    // Arbitrators and admins read contracts through the case room of the dispute they handle.
    const caseForViewer = disputes.find((d) => d.arbitrator_id === viewer.id) ?? (viewer.isAdmin ? disputes[0] : undefined);
    if (caseForViewer) redirect(`/arbitration/cases/${caseForViewer.id}`);
    notFound();
  }

  const { tab: rawTab } = await searchParams;
  // The contract's state (money, next step, milestones) is always on the page; these tabs hold the records.
  const tabs = [
    { key: 'agreement', label: 'Agreement' },
    { key: 'funding', label: 'Escrow movements', count: escrow.length },
    { key: 'activity', label: 'Activity' },
  ];
  const tab = tabs.some((t) => t.key === rawTab) ? rawTab! : 'agreement';
  const client = members.get(c.client_id);
  const freelancer = members.get(c.freelancer_id);
  const other = role === 'client' ? freelancer : client;
  const action = nextAction(role, c, milestones, disputes, reviews);
  const myReview = reviews.find((r) => r.reviewer_role === role);
  const theirReview = reviews.find((r) => r.reviewer_role !== role);
  const current = action.milestoneId ?? milestones.find((m) => !['paid', 'refunded', 'settled', 'pending'].includes(m.status))?.id;
  const fundControl = role === 'client' && c.status === 'awaiting_funding'
    ? <FundEscrowTrigger variant="signal" size="lg" />
    : undefined;

  const signing = c.status === 'pending_signatures';
  const ordered = [...milestones].sort((a, b) => a.position - b.position);
  const focusIndex = c.status === 'completed' ? null : ordered.findIndex((m) => m.id === current);
  const focusMilestone = focusIndex !== null && focusIndex >= 0 ? ordered[focusIndex] : null;
  const money = escrowStatement(milestones);
  const figures = [
    { label: 'Total', amount: money.total },
    ...(Number(money.unfunded) > 0 ? [{ label: 'Not funded yet', amount: money.unfunded }] : []),
    { label: 'Secured', amount: money.secured },
    { label: 'Released', amount: money.released },
    { label: 'Refunded', amount: money.refunded },
    { label: 'In dispute', amount: money.disputed },
  ];

  return (
    <div className="space-y-10 md:space-y-14">
      <ContractLiveUpdates contractId={c.id} />
      {/* The funding dialog lives here, not in the next-step band, so it survives the refresh after funding. */}
      {role === 'client' && c.status === 'awaiting_funding' && <FundEscrowButton contract={c} milestones={milestones} walletBalance={viewer.coins.wallet} trigger={false} />}

      {/* The stage: who, what state, and where every coin is — with this contract's escrow as the 3D ring. */}
      <section aria-labelledby="contract-title" className="relative mx-[calc(50%-50vw)] -mt-6 overflow-hidden border-b md:-mt-10">
        <LedgerField density={18} pulses={c.funded_at ? 3 : 0} className="opacity-70 [mask-image:linear-gradient(to_bottom,black_30%,transparent_95%)]" />
        <div className="relative mx-auto max-w-content px-4 pb-10 pt-6 md:px-6 md:pt-10 lg:pb-14">
          <Breadcrumbs items={[{ label: 'Contracts', href: '/contracts' }, { label: c.title }]} />
          <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="min-w-0 space-y-6 lg:col-span-7">
              <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Contract · you are the {role}</p>
              <h1 id="contract-title" className="font-display text-[clamp(2.5rem,5.4vw,5rem)] font-medium leading-[0.95] tracking-[-0.04em]">
                <SplitWords text={c.title} immediate stagger={45} />
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-secondary">
                <span className="flex flex-wrap items-center gap-2">
                  <Party name={client?.display_name} path={client?.avatar_path} username={client?.username} you={role === 'client'} />
                  <ArrowLeftRight className="size-3.5 text-ink-muted" aria-label="and" />
                  <Party name={freelancer?.display_name} path={freelancer?.avatar_path} username={freelancer?.username} you={role === 'freelancer'} />
                </span>
                <ContractStatusMark status={c.status} />
                <span className="t-meta">Started {formatDate(c.created_at)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {conversationId && <Button asChild variant="secondary"><Link href={`/messages/${conversationId}`}><MessagesSquare /> Messages</Link></Button>}
                <Button asChild variant="ghost"><Link href={`/projects/${c.project_id}`}>Project brief</Link></Button>
              </div>
            </div>
            <ContractRing
              className="order-first -mx-4 h-[280px] sm:h-[340px] lg:order-none lg:col-span-5 lg:mx-0 lg:h-[440px]"
              milestones={ordered.map((m) => ({ amount: m.amount, status: m.status }))}
              focus={focusIndex}
              readout={focusMilestone
                ? { label: `Milestone ${String(focusMilestone.position).padStart(2, '0')}`, state: milestoneStatus[focusMilestone.status].label, amount: formatAmount(focusMilestone.amount) }
                : { label: c.status === 'completed' ? 'Contract complete' : 'Escrow', state: c.status === 'completed' ? 'All milestones closed' : contractStatus[c.status].label, amount: formatAmount(money.total) }}
            />
          </div>

          <section aria-label={c.funded_at ? 'Escrow statement' : 'Escrow statement — not funded yet'} className="mt-10 space-y-6 border-t pt-6 lg:mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="t-label-caps">{c.funded_at ? 'Escrow statement' : 'Escrow statement — not funded yet'}</h2>
              <p className="t-meta">
                {c.funded_at
                  ? `Held in TrustLance escrow since ${formatDate(c.funded_at)} · ${feePercent(c.fee_bps)} platform fee on each payment`
                  : c.status === 'cancelled' ? 'Cancelled before funding — no coins moved.' : 'The client locks the full amount after both parties sign.'}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))]">
              {figures.map((f, i) => (
                <div key={f.label} className={i === 0 ? 'col-span-2 sm:col-span-3 lg:col-span-1' : undefined}>
                  <dt className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{f.label}</dt>
                  <dd className={cn('mt-2 leading-none', Number(f.amount) === 0 && 'text-ink-muted')}>
                    <MoneyCount amount={f.amount} delay={i * 90} className={cn('leading-none', i === 0 ? 'text-[clamp(2.75rem,5vw,4.25rem)] tracking-[-0.03em]' : 'text-2xl md:text-3xl')} />
                  </dd>
                </div>
              ))}
            </dl>
            <EscrowRail segments={milestoneSegments(milestones)} size="lg" detail label="Escrow by milestone" />
          </section>
        </div>
      </section>

      <NextActionBanner action={action} control={fundControl} feature />

      {c.status === 'completed' && (
        <section id="review" aria-label="Reviews" className="grid scroll-mt-24 gap-10 lg:grid-cols-2">
          {myReview ? (
            <div className="space-y-2">
              <p className="t-label-caps">Your review of {other?.display_name ?? 'them'}</p>
              <Stars rating={myReview.rating} size="md" />
              <p className="text-sm text-ink-secondary">{myReview.body}</p>
            </div>
          ) : (
            <ReviewForm contractId={c.id} role={role} counterpartName={other?.display_name ?? 'the other party'} />
          )}
          <div className="space-y-2">
            <p className="t-label-caps">Their review of you</p>
            {theirReview ? (
              <><Stars rating={theirReview.rating} size="md" /><p className="text-sm text-ink-secondary">{theirReview.body}</p></>
            ) : <p className="text-sm text-ink-secondary">Not written yet.</p>}
          </div>
        </section>
      )}

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_17rem] xl:gap-14">
        <div className="min-w-0 space-y-10">
          {signing && <SignPanel contract={c} role={role} myName={viewer.profile.display_name} />}
          <section aria-labelledby="milestones-title" className="space-y-5">
            <div className="flex items-baseline justify-between gap-4 border-b pb-3">
              <h2 id="milestones-title" className="t-label-caps">Milestones</h2>
              <p className="t-meta">{milestones.filter((m) => ['paid', 'refunded', 'settled'].includes(m.status)).length} of {milestones.length} closed</p>
            </div>
            <ol>
              {milestones.map((m, i) => {
                const d = disputes.find((x) => x.milestone_id === m.id && x.status !== 'resolved');
                return (
                  <Reveal as="li" key={m.id} delay={i * 60}>
                    <MilestoneCard
                      contract={c}
                      milestone={m}
                      submissions={submissions.filter((s) => s.milestone_id === m.id)}
                      role={role}
                      holdDays={settings.hold_working_days}
                      autoReleaseDays={settings.auto_release_days}
                      highlighted={current === m.id && c.status !== 'completed'}
                      dispute={d ? { id: d.id, number: d.number } : null}
                      last={i === milestones.length - 1}
                    />
                  </Reveal>
                );
              })}
            </ol>
          </section>
          {(signing || c.status === 'awaiting_funding') && (
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
              { label: 'Length', value: `${milestones.length} milestones · ${c.terms.duration_days} days` },
              { label: 'Funded', value: c.funded_at ? formatDateTime(c.funded_at) : 'Not yet' },
              { label: 'Platform fee', value: `${feePercent(c.fee_bps)} of each payment` },
              { label: 'Terms fingerprint', value: <span className="t-mono break-all">{c.terms_hash.slice(0, 24)}…</span> },
            ]} />
          </div>
        </aside>
      </div>

      <section id="records" aria-label="Contract records" className="scroll-mt-24">
        <SubNav
          label="Contract records"
          active={tab}
          items={tabs.map((t) => ({ key: t.key, label: t.label, count: 'count' in t ? t.count : undefined, href: `/contracts/${c.id}${t.key === 'agreement' ? '' : `?tab=${t.key}`}#records` }))}
        />

        {tab === 'agreement' && (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14">
            <div className="min-w-0 space-y-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <p className="max-w-reading text-sm text-ink-secondary">The exact terms both parties sign. Changing them is not possible after signing.</p>
                <AgreementPdfButton contract={c} milestones={milestones} escrow={escrow} />
              </div>
              <Facts items={[
                { label: 'Client', value: c.terms.client.name },
                { label: 'Freelancer', value: c.terms.freelancer.name },
                { label: 'Total', value: <Money amount={c.terms.total_amount} /> },
                { label: 'Duration', value: `${c.terms.duration_days} days` },
                { label: 'Created', value: formatDateTime(c.created_at) },
                { label: 'Terms fingerprint', value: <span className="t-mono break-all">{c.terms_hash}</span> },
              ]} />
              <div className="space-y-2 border-t pt-6">
                <p className="t-label-caps">Scope</p>
                <p className="max-w-reading whitespace-pre-line text-sm leading-relaxed text-ink-secondary">{c.terms.scope}</p>
              </div>
              {c.terms.deliverables.length > 0 && (
                <div className="space-y-2 border-t pt-6">
                  <p className="t-label-caps">Deliverables</p>
                  <ol className="max-w-reading divide-y divide-line">
                    {c.terms.deliverables.map((d, i) => (
                      <li key={i} className="flex gap-4 py-2.5 text-sm">
                        <span className="t-mono shrink-0 pt-0.5 text-ink-muted">{String(i + 1).padStart(2, '0')}</span>
                        <span className="text-ink-secondary">{d}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="space-y-2 border-t pt-6">
                <p className="t-label-caps">Payment terms</p>
                <p className="max-w-reading text-sm text-ink-secondary">{c.terms.payment_terms}</p>
              </div>
              {!signing && <SignPanel contract={c} role={role} myName={viewer.profile.display_name} />}
            </div>
            <Ledger title={<span className="t-label-caps">Files</span>} empty={<p className="border-y py-4 text-sm text-ink-secondary">No files yet. Files attached to submissions appear here.</p>}>
              {files.map((f) => (
                <LedgerRow key={f.id} lead={<FileText className="size-4 text-ink-muted" aria-hidden />} meta={<span>{formatBytes(f.size_bytes)} · {formatDate(f.created_at)}</span>}>
                  {f.url ? <a href={f.url} className="link block truncate text-sm" target="_blank" rel="noreferrer">{f.file_name}</a> : <span className="block truncate text-sm">{f.file_name}</span>}
                </LedgerRow>
              ))}
            </Ledger>
          </div>
        )}

        {tab === 'funding' && (
          <div className="space-y-4">
            <p className="max-w-reading text-sm text-ink-secondary">Every movement of coins into and out of this contract’s escrow, straight from the TrustLance ledger. Entries cannot be edited or deleted.</p>
            <EscrowMovements entries={escrow} milestones={milestones} />
          </div>
        )}

        {tab === 'activity' && (
          <div className="space-y-4">
            <p className="max-w-reading text-sm text-ink-secondary">A permanent record of every event on this contract. Entries cannot be edited or deleted.</p>
            <ActivityFeed events={events} members={members} />
          </div>
        )}
      </section>
    </div>
  );
}

function Party({ name, path, username, you }: { name?: string; path?: string | null; username?: string; you: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar name={name ?? '?'} path={path} size="xs" />
      {username ? <Link className="font-medium text-ink hover:underline" href={`/u/${username}`}>{name}</Link> : <span>{name ?? 'member'}</span>}
      {you && <span className="text-ink-muted">(you)</span>}
    </span>
  );
}
