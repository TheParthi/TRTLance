import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Ledger } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { EmptyState } from '@/components/common/states';
import { DisputeStatusMark } from '@/components/common/status-mark';
import { TrustLine } from '@/components/common/trust-signals';
import { ConsoleHeader } from '@/components/admin/console-shell';
import { Mono } from '@/components/admin/table';
import { getAdminQueues } from '@/lib/data/disputes';
import { getCategoryList } from '@/lib/data/disputes';
import { disputeNumber, formatDateTime, formatRelative } from '@/lib/format';
import { formatAmount, formatRupees } from '@/lib/money';
import { disputeReasonLabel } from '@/lib/status';
import { cn } from '@/lib/utils';
import { ApplicationReview } from './application-review';
import { AssignForm, type ArbitratorOption } from './assign-form';
import { BankAccountReview, WithdrawalActions } from './payout-review';

export const metadata: Metadata = { title: 'Queues' };

/**
 * The work. Four queues, each one a thing a person has to decide, in the order they are usually
 * worked: disputes with nobody on them, then money going out, then the checks that let money go out,
 * then the people who will decide the disputes.
 *
 * Each queue is a ledger of rows with the decision on the row itself, so nothing needs opening to
 * act on. The database refuses an action an admin is not allowed to take — assigning an arbitrator
 * with a conflict of interest, paying out your own withdrawal — so these forms can stay simple.
 */
export default async function QueuesPage() {
  const [queues, categories] = await Promise.all([getAdminQueues(), getCategoryList().catch(() => [])]);
  const { attention, bankAccounts, withdrawals, applications, arbitrators, members } = queues;

  const name = (id: string | null | undefined) => (id ? members.get(id)?.display_name ?? 'Member' : '—');
  const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug;
  const quiet = (title: string, body: string) => <EmptyState compact title={title} description={body} />;

  const total = attention.length + withdrawals.length + bankAccounts.length + applications.length;
  const jump = [
    { href: '#attention', label: 'Needs an arbitrator', count: attention.length },
    { href: '#withdrawals', label: 'Withdrawals', count: withdrawals.length },
    { href: '#bank-accounts', label: 'Bank accounts', count: bankAccounts.length },
    { href: '#applications', label: 'Applications', count: applications.length },
  ];

  return (
    <>
      <ConsoleHeader
        title="Queues"
        description={total === 0
          ? 'Nothing is waiting for a person right now.'
          : `${total} thing${total === 1 ? '' : 's'} waiting for someone on the platform team.`}
      />

      <nav aria-label="Queues" className="mb-10">
        <ul className="grid grid-cols-2 border-y md:grid-cols-4">
          {jump.map((item, i) => (
            <li key={item.href} className={cn(i > 0 && 'border-l', i >= 2 && 'border-t md:border-t-0')}>
              <a href={item.href} className="flex h-full flex-col gap-1 px-4 py-3 transition-colors duration-base ease-ledger hover:bg-surface-subtle/70">
                <span className="t-label-caps">{item.label}</span>
                <span className={cn('text-2xl font-semibold tabular-nums', item.count > 0 ? 'text-ink' : 'text-ink-muted')}>
                  {item.count}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-14">
        <Ledger
          id="attention"
          className="scroll-mt-28"
          title={`Needs an arbitrator (${attention.length})`}
          description="Open with nobody assigned, or escalated to the platform team. Assign an arbitrator, or decide it yourself in the case room."
          empty={quiet('Nothing needs attention', 'Every open dispute has an arbitrator.')}
        >
          {attention.map((d) => {
            // The database refuses a conflicted assignment; filtering here keeps those names out of
            // the list so nobody picks one and gets an error back.
            const options: ArbitratorOption[] = arbitrators
              .filter((a) => a.user_id !== d.contract?.client_id && a.user_id !== d.contract?.freelancer_id && a.user_id !== d.arbitrator_id)
              .map((a) => ({
                id: a.user_id,
                name: name(a.user_id),
                active: a.active,
                capacity: a.capacity,
                specializations: a.specializations.map(categoryLabel).join(', '),
              }));
            const escalated = d.status === 'escalated';
            return (
              <li
                key={d.id}
                className={cn(
                  'relative space-y-3 py-4 pl-4 before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full',
                  escalated ? 'before:bg-danger' : 'before:bg-warning',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <Mono>{disputeNumber(d.number)}</Mono>
                      <Link href={`/admin/contracts/${d.contract_id}`} className="font-medium hover:text-brand">
                        {d.contract?.title ?? 'Contract'}
                      </Link>
                    </p>
                    <p className="text-sm text-ink-secondary">
                      Milestone {d.milestone?.position} · {disputeReasonLabel[d.reason]} · {name(d.contract?.client_id)} (client)
                      vs {name(d.contract?.freelancer_id)} (freelancer)
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
                  <AssignForm
                    disputeId={d.id}
                    options={options}
                    label={d.arbitrator_id ? `Reassign (currently ${name(d.arbitrator_id)})` : 'Assign an arbitrator'}
                  />
                  <Button asChild variant="secondary">
                    <Link href={`/arbitration/cases/${d.id}`}><Gavel /> Review and decide <ArrowRight /></Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </Ledger>

        <Ledger
          id="withdrawals"
          className="scroll-mt-28"
          title={`Withdrawals to pay (${withdrawals.length})`}
          description="Send each amount by bank transfer to the account shown, then mark it as paid with the transfer reference. You cannot pay out your own withdrawal."
          empty={quiet('No withdrawals waiting', 'Members’ withdrawal requests appear here.')}
        >
          {withdrawals.map((w) => {
            const label = `WD-${String(w.number).padStart(6, '0')}`;
            return (
              <li
                key={w.id}
                className="relative grid grid-cols-1 gap-4 py-4 pl-4 before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-brand md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8"
              >
                <div className="min-w-0 space-y-1">
                  <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <Mono>{label}</Mono>
                    <Link href={`/admin/members/${w.user_id}`} className="font-medium hover:text-brand">{w.display_name}</Link>
                    <span className="t-money">{formatRupees(w.amount_paise)}</span>
                    <span className="t-meta">({formatAmount(w.coins)})</span>
                  </p>
                  <BankFacts items={[['Account holder', w.account_holder], ['Account number', w.account_number], ['IFSC', w.ifsc], ['PAN', w.pan]]} />
                  <p className="t-meta">Requested {formatDateTime(w.requested_at)} ({formatRelative(w.requested_at)})</p>
                </div>
                <WithdrawalActions id={w.id} label={label} coins={w.coins} amountPaise={w.amount_paise} />
              </li>
            );
          })}
        </Ledger>

        <Ledger
          id="bank-accounts"
          className="scroll-mt-28"
          title={`Bank accounts to verify (${bankAccounts.length})`}
          description="Check that the name, PAN and bank account belong together before the member’s first withdrawal."
          empty={quiet('Nothing to verify', 'New bank details appear here for review.')}
        >
          {bankAccounts.map((a) => (
            <li key={a.user_id} className="relative grid grid-cols-1 gap-4 py-4 pl-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8">
              <div className="min-w-0 space-y-1">
                <Link href={`/admin/members/${a.user_id}`} className="font-medium hover:text-brand">{a.display_name}</Link>
                <BankFacts items={[['Account holder', a.account_holder], ['Account number', a.account_number], ['IFSC', a.ifsc], ['PAN', a.pan]]} />
                <p className="t-meta">Submitted {formatDateTime(a.updated_at)}</p>
              </div>
              <BankAccountReview userId={a.user_id} name={a.display_name} />
            </li>
          ))}
        </Ledger>

        <Ledger
          id="applications"
          className="scroll-mt-28"
          title={`Arbitrator applications (${applications.length})`}
          description="Eligibility was checked when they applied. Read their experience before approving."
          empty={quiet('No pending applications', 'New applications appear here for review.')}
        >
          {applications.map((a) => {
            const m = members.get(a.user_id);
            return (
              <li key={a.user_id} className="space-y-2 py-4 pl-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <Link href={`/admin/members/${a.user_id}`} className="font-medium hover:text-brand">
                      {m?.display_name ?? 'Member'}
                    </Link>
                    <p className="text-sm text-ink-secondary">
                      {a.specializations.map(categoryLabel).join(', ')} · up to {a.capacity} case{a.capacity === 1 ? '' : 's'} at a time
                    </p>
                    <p className="t-meta">
                      Applied {formatDateTime(a.applied_at)}
                      {m?.stats ? ` · ${m.stats.completed_as_client + m.stats.completed_as_freelancer} completed contracts · ${m.stats.disputes_lost} disputes lost` : ''}
                    </p>
                    {m?.stats && <TrustLine stats={m.stats} role="freelancer" />}
                  </div>
                  <ApplicationReview userId={a.user_id} name={m?.display_name ?? 'this member'} />
                </div>
                <p className="max-w-reading whitespace-pre-line break-words text-sm text-ink-secondary">{a.statement}</p>
              </li>
            );
          })}
        </Ledger>
      </div>
    </>
  );
}

/** Bank details on one wrapped line, in a fixed-width font so digits are easy to compare and copy. */
function BankFacts({ items }: { items: [string, string][] }) {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {items.map(([label, value]) => (
        <span key={label}>
          <span className="text-ink-muted">{label}</span> <span className="font-mono">{value}</span>
        </span>
      ))}
    </p>
  );
}
