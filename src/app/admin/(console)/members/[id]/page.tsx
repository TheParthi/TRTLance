import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ban, ExternalLink, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { EmptyState } from '@/components/common/states';
import { ConsoleHeader } from '@/components/admin/console-shell';
import { Facts, Panel, Stat, StatGrid } from '@/components/admin/stat';
import { Mono } from '@/components/admin/table';
import { requireConsole } from '@/lib/admin/access';
import { getMemberDetail } from '@/lib/data/admin';
import { disputeNumber, formatDate, formatDateTime, formatRelative } from '@/lib/format';
import { formatAmount, formatRupees } from '@/lib/money';
import { contractStatus, projectStatus, withdrawalStatus } from '@/lib/status';
import { MemberActions } from './member-actions';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: 'Member' };
  const detail = await getMemberDetail(id).catch(() => null);
  return { title: detail?.profile.display_name ?? 'Member' };
}

/**
 * One account, in full.
 *
 * This is the page a support question gets answered from, so it gathers the things that are
 * otherwise scattered: who they are, what the platform has verified, every coin they hold and why,
 * their contracts and disputes, their withdrawals, and every change an admin has made to the
 * account. The full bank account number and PAN are deliberately not here — the queue shows those
 * at the moment of verification, and nowhere else.
 */
export default async function MemberDetailPage({ params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const [{ viewer }, detail] = await Promise.all([
    requireConsole(`/admin/members/${id}`),
    getMemberDetail(id).catch(() => null),
  ]);
  if (!detail) notFound();

  const { profile, stats, balances, holds, payout_account: payout } = detail;
  const total = (balances.wallet ?? 0) + (balances.pending ?? 0) + (balances.earnings ?? 0);
  const suspended = Boolean(profile.suspended_at);

  return (
    <>
      <ConsoleHeader
        breadcrumb={{ label: 'All members', href: '/admin/members' }}
        title={profile.display_name}
        description={profile.headline ?? undefined}
        meta={
          <>
            <Mono>@{profile.username}</Mono>
            {detail.is_admin && <Badge tone="brass"><ShieldCheck /> Platform admin</Badge>}
            {suspended && <Badge tone="danger"><Ban /> Suspended</Badge>}
            <span>Joined {formatDate(profile.created_at)}</span>
            {detail.last_sign_in_at && <span>Last signed in {formatRelative(detail.last_sign_in_at)}</span>}
          </>
        }
        actions={
          <Button asChild variant="secondary">
            <Link href={`/u/${profile.username}`}>Public profile <ExternalLink /></Link>
          </Button>
        }
      />

      <div className="space-y-12">
        {suspended && (
          <Callout tone="danger" title="This account is suspended">
            <p>{profile.suspended_reason}</p>
            <p className="mt-1 t-meta">
              Suspended {formatDateTime(profile.suspended_at!)}
              {detail.suspended_by_name ? ` by ${detail.suspended_by_name}` : ''}.
              They can sign in and read their account, but every change is refused.
            </p>
          </Callout>
        )}

        <Panel title="Account" description="What the platform knows and has verified.">
          <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
            <Facts
              items={[
                { label: 'Account id', value: <Mono>{profile.id}</Mono> },
                { label: 'Email', value: detail.email ? <span className="break-all">{detail.email}</span> : <span className="text-ink-muted">none</span> },
                { label: 'Email confirmed', value: detail.email_confirmed_at ? formatDate(detail.email_confirmed_at) : <span className="text-warning-strong">not confirmed</span> },
                { label: 'Phone', value: detail.phone ?? <span className="text-ink-muted">not given</span> },
                { label: 'Here to', value: { hire: 'Hire', work: 'Work', both: 'Hire and work' }[profile.intent] },
                { label: 'Location', value: profile.location ?? <span className="text-ink-muted">not given</span> },
              ]}
            />
            <Facts
              items={[
                { label: 'Onboarding', value: profile.onboarding_completed_at ? `Finished ${formatDate(profile.onboarding_completed_at)}` : <span className="text-warning-strong">Unfinished (step: {profile.onboarding_step})</span> },
                { label: 'Rating', value: stats?.rating_avg ? `${Number(stats.rating_avg).toFixed(2)} from ${stats.review_count} review${stats.review_count === 1 ? '' : 's'}` : <span className="text-ink-muted">no reviews yet</span> },
                { label: 'Completed', value: `${(stats?.completed_as_freelancer ?? 0)} as freelancer · ${(stats?.completed_as_client ?? 0)} as client` },
                { label: 'Disputes lost', value: stats?.disputes_lost ?? 0 },
                { label: 'Trust credits', value: stats?.trust_credits ?? 0 },
                { label: 'Bank verified', value: stats?.identity_verified ? <Badge tone="success">Verified</Badge> : <Badge>Not verified</Badge> },
              ]}
            />
          </div>
        </Panel>

        <Panel title="Coins" description="Every coin this member holds, and where it is.">
          <StatGrid className="border-t-0 pt-0">
            <Stat label="Spendable wallet" value={formatAmount(balances.wallet ?? 0, { symbol: false })} unit="coins" tone="info"
              hint="Bought coins, available to fund a contract." />
            <Stat label="Waiting out the hold" value={formatAmount(balances.pending ?? 0, { symbol: false })} unit="coins" tone="warning"
              hint={holds > 0 ? `${formatAmount(holds, { symbol: false })} coins in holds not yet due` : 'Nothing on hold.'} />
            <Stat label="Withdrawable" value={formatAmount(balances.earnings ?? 0, { symbol: false })} unit="coins" tone="success"
              hint={payout?.status === 'verified' ? 'Bank account verified — they can withdraw.' : 'Needs a verified bank account first.'} />
            <Stat label="Total held" value={formatAmount(total, { symbol: false })} unit="coins" tone="brand"
              hint={`Worth ${formatRupees(total * 100)}`} />
          </StatGrid>
        </Panel>

        {payout && (
          <Panel title="Bank account" description="Only the last four digits are kept here; the full details are shown once, in the verification queue.">
            <Facts
              items={[
                { label: 'Status', value: <Badge tone={payout.status === 'verified' ? 'success' : payout.status === 'rejected' ? 'danger' : 'warning'}>{payout.status}</Badge> },
                { label: 'Account holder', value: payout.account_holder },
                { label: 'Account', value: <Mono>•••• {payout.account_last4}</Mono> },
                { label: 'IFSC', value: <Mono>{payout.ifsc}</Mono> },
                { label: 'PAN', value: <Mono>•••• {payout.pan_last4}</Mono> },
                ...(payout.review_note ? [{ label: 'Review note', value: payout.review_note }] : []),
                ...(payout.verified_at ? [{ label: 'Verified', value: formatDateTime(payout.verified_at) }] : []),
              ]}
            />
          </Panel>
        )}

        <Panel title={`Contracts (${detail.contracts.length})`} description="The 20 most recent, newest first.">
          <Ledger empty={<EmptyState compact title="No contracts" description="This member has not been a party to a contract." />}>
            {detail.contracts.map((c) => (
              <LedgerRow key={c.id} href={`/admin/contracts/${c.id}`} className="group" trail={<Money amount={c.total_amount} size="sm" />}>
                <p className="truncate font-medium">{c.title}</p>
                <p className="t-meta">
                  As {c.role} · with {c.counterparty ?? 'someone'} · {contractStatus[c.status as keyof typeof contractStatus]?.label ?? c.status} · {formatDate(c.created_at)}
                </p>
              </LedgerRow>
            ))}
          </Ledger>
        </Panel>

        <Panel title={`Projects (${detail.projects.length})`} description="Briefs this member posted. The 20 most recent.">
          <Ledger empty={<EmptyState compact title="No projects" description="This member has not posted a brief." />}>
            {detail.projects.map((p) => (
              <LedgerRow key={p.id} href={`/projects/${p.id}`} className="group" trail={<Money amount={p.budget_amount} size="sm" muted />}>
                <p className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{p.title}</span>
                  {p.moderation_state !== 'ok' && <Badge tone={p.moderation_state === 'removed' ? 'danger' : 'warning'}>{p.moderation_state}</Badge>}
                </p>
                <p className="t-meta">
                  {projectStatus[p.status as keyof typeof projectStatus]?.label ?? p.status} · {p.proposal_count} proposal{p.proposal_count === 1 ? '' : 's'} · {formatDate(p.created_at)}
                </p>
              </LedgerRow>
            ))}
          </Ledger>
        </Panel>

        <Panel title={`Disputes (${detail.disputes.length})`} description="Every case this member has been part of.">
          <Ledger empty={<EmptyState compact title="No disputes" description="This member has never been in a dispute." />}>
            {detail.disputes.map((d) => (
              <LedgerRow key={d.id} href={`/arbitration/cases/${d.id}`} className="group" trail={<Money amount={d.amount} size="sm" />}>
                <p className="flex min-w-0 items-center gap-2">
                  <Mono>{disputeNumber(d.number)}</Mono>
                  <span className="truncate">{d.raised_by_them ? 'Opened by them' : 'Opened against them'}</span>
                </p>
                <p className="t-meta">{d.status.replace(/_/g, ' ')} · {formatDate(d.created_at)}</p>
              </LedgerRow>
            ))}
          </Ledger>
        </Panel>

        <div className="grid gap-12 lg:grid-cols-2">
          <Panel title={`Withdrawals (${detail.withdrawals.length})`} description="Requests to move earnings to a bank account.">
            <Ledger empty={<EmptyState compact title="No withdrawals" description="This member has not requested one." />}>
              {detail.withdrawals.map((w) => (
                <LedgerRow key={w.id} trail={<span className="t-money text-sm">{formatRupees(w.amount_paise)}</span>}>
                  <p className="flex min-w-0 items-center gap-2">
                    <Mono>WD-{String(w.number).padStart(6, '0')}</Mono>
                    <Badge tone={withdrawalStatus[w.status as keyof typeof withdrawalStatus]?.tone ?? 'neutral'}>
                      {withdrawalStatus[w.status as keyof typeof withdrawalStatus]?.label ?? w.status}
                    </Badge>
                  </p>
                  <p className="t-meta">
                    {formatAmount(w.coins)} · {formatDate(w.requested_at)}
                    {w.reference ? ` · ref ${w.reference}` : ''}
                  </p>
                </LedgerRow>
              ))}
            </Ledger>
          </Panel>

          <Panel title={`Coin purchases (${detail.purchases.length})`} description="The 20 most recent, newest first.">
            <Ledger empty={<EmptyState compact title="No purchases" description="This member has not bought coins." />}>
              {detail.purchases.map((p) => (
                <LedgerRow key={p.id} trail={<span className="t-money text-sm">{formatRupees(p.amount_paise)}</span>}>
                  <p className="flex min-w-0 items-center gap-2">
                    <span className="font-medium">{formatAmount(p.coins)}</span>
                    <Badge tone={p.status === 'paid' ? 'success' : p.status === 'failed' ? 'danger' : 'neutral'}>{p.status}</Badge>
                    {p.provider === 'mock' && <Badge tone="warning">test payment</Badge>}
                  </p>
                  <p className="t-meta">{formatDateTime(p.created_at)}</p>
                </LedgerRow>
              ))}
            </Ledger>
          </Panel>
        </div>

        <Panel title="Admin actions on this account" description="Every change an admin has made here, newest first.">
          <Ledger empty={<EmptyState compact title="Nothing recorded" description="No admin has changed this account." />}>
            {detail.audit.map((entry) => (
              <LedgerRow key={entry.id}>
                <p className="font-medium">{entry.action.replace(/[._]/g, ' ')}</p>
                <p className="t-meta">
                  {entry.actor ?? 'An admin'} · {formatDateTime(entry.created_at)}
                  {typeof entry.detail.reason === 'string' ? ` · “${entry.detail.reason}”` : ''}
                  {typeof entry.detail.note === 'string' ? ` · “${entry.detail.note}”` : ''}
                </p>
              </LedgerRow>
            ))}
          </Ledger>
        </Panel>

        <Panel title="Act on this account" description="Both of these notify the member and are written to the audit trail.">
          <MemberActions
            userId={profile.id}
            name={profile.display_name}
            suspended={suspended}
            isAdmin={detail.is_admin}
            isSelf={profile.id === viewer.id}
          />
        </Panel>
      </div>
    </>
  );
}
