import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { EscrowRail } from '@/components/common/escrow-rail';
import { Ledger } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { MoneyRing } from '@/components/common/money-ring';
import { formatAmount } from '@/lib/money';
import { PageHeader } from '@/components/common/page-header';
import { escrowStatement, moneyParts } from '@/lib/escrow-summary';
import { EmptyState } from '@/components/common/states';
import { ContractStatusMark } from '@/components/common/status-mark';
import { SubNav } from '@/components/shell/sub-nav';
import { requireViewer } from '@/lib/auth';
import { getMembers } from '@/lib/data/projects';
import { milestoneSegments } from '@/lib/escrow-summary';
import { nextAction, type NextAction } from '@/lib/next-action';
import { createClient } from '@/lib/supabase/server';
import type { Contract, ContractStatus, Dispute, Milestone, Review } from '@/lib/types';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Contracts' };

type ContractRow = Contract & { milestones: Milestone[]; reviews: Pick<Review, 'reviewer_role'>[]; disputes: Pick<Dispute, 'id' | 'status'>[] };

const FILTERS: { key: string; label: string; match: ContractStatus[] }[] = [
  { key: 'action', label: 'In progress', match: ['pending_signatures', 'awaiting_funding', 'active', 'disputed'] },
  { key: 'completed', label: 'Completed', match: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', match: ['cancelled'] },
];

const nextStyle: Record<NextAction['tone'], { Icon: typeof Clock; cls: string }> = {
  action: { Icon: ArrowRight, cls: 'font-medium text-brand' },
  alert: { Icon: AlertTriangle, cls: 'font-medium text-danger-strong' },
  waiting: { Icon: Clock, cls: 'text-ink-secondary' },
  done: { Icon: CheckCircle2, cls: 'text-ink-secondary' },
};

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const viewer = await requireViewer('/contracts');
  const { filter = 'action' } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contracts')
    .select('*, milestones(*), reviews(reviewer_role), disputes(id, status)')
    .order('created_at', { ascending: false })
    .returns<ContractRow[]>();
  if (error) throw error;
  // Only agreements the viewer is a party to (arbitrators and admins read contracts through the case room).
  const all = (data ?? []).filter((c) => c.client_id === viewer.id || c.freelancer_id === viewer.id);
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const contracts = all.filter((c) => active.match.includes(c.status));
  const members = await getMembers(contracts.map((c) => (c.client_id === viewer.id ? c.freelancer_id : c.client_id)));
  const disputeCount = all.reduce((n, c) => n + c.disputes.length, 0);
  const liveMilestones = all.filter((c) => c.status !== 'cancelled').flatMap((c) => c.milestones);
  const ringParts = moneyParts(liveMilestones);

  return (
    <>
      <PageHeader
        title="Contracts"
        description="Every agreement you are part of: where its money is and what happens next."
        aside={
          <MoneyRing
            className="-mx-4 h-[240px] sm:h-[300px] lg:mx-0 lg:h-[360px]"
            parts={ringParts.length ? ringParts : [{ amount: 1, state: 'unfunded' }]}
            readout={{ label: 'Across your contracts', state: `${all.length} contract${all.length === 1 ? '' : 's'}`, amount: `${formatAmount(escrowStatement(liveMilestones).secured)} in escrow` }}
          />
        }
      />
      <SubNav
        label="Contracts"
        active="contracts"
        items={[
          { key: 'contracts', href: '/contracts', label: 'Contracts', count: all.length },
          { key: 'disputes', href: '/disputes', label: 'Disputes', count: disputeCount },
        ]}
      />

      <nav aria-label="Contract filters" className="mb-4">
        <ul className="inline-flex max-w-full gap-0.5 rounded-md bg-surface-sunken p-0.5">
          {FILTERS.map((f) => {
            const count = all.filter((c) => f.match.includes(c.status)).length;
            const on = f.key === active.key;
            return (
              <li key={f.key} className="min-w-0">
                <Link
                  href={`/contracts?filter=${f.key}`}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded px-3 text-sm sm:min-h-8',
                    on ? 'bg-surface font-medium text-ink shadow-xs' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {f.label} <span className="tabular-nums text-ink-muted">{count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Ledger
        empty={
          <EmptyState
            title={active.key === 'action' ? 'No contracts in progress' : `No ${active.label.toLowerCase()} contracts`}
            description="Contracts are created when a client hires a freelancer from a proposal."
            action={viewer.profile.intent === 'hire' ? { label: 'Post a project', href: '/projects/new' } : { label: 'Find work', href: '/work' }}
          />
        }
      >
        {contracts.map((c) => {
          const role = c.client_id === viewer.id ? 'client' : 'freelancer';
          const other = members.get(role === 'client' ? c.freelancer_id : c.client_id);
          const closed = c.milestones.filter((m) => ['paid', 'refunded', 'settled'].includes(m.status)).length;
          const a = nextAction(role, c, c.milestones, c.disputes, c.reviews);
          const s = nextStyle[a.tone];
          const target = a.target?.startsWith('/') ? a.target : `/contracts/${c.id}${a.target ?? ''}`;
          const actionable = (a.tone === 'action' || a.tone === 'alert') && a.target;
          return (
            <li
              key={c.id}
              className={cn(
                'group relative py-4 pl-4 pr-1 transition-colors duration-base ease-ledger hover:bg-surface-subtle/70',
                actionable && 'before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full',
                actionable && (a.tone === 'alert' ? 'before:bg-danger' : 'before:bg-brand'),
              )}
            >
              <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_6rem_minmax(0,14rem)] lg:items-center lg:gap-6">
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/contracts/${c.id}`}
                      className="flex min-w-0 items-center gap-1.5 font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-brand"
                    >
                      <span className="row-title line-clamp-2 lg:line-clamp-1">{c.title}</span>
                      <ArrowRight className="row-arrow size-4 shrink-0 text-ink-muted" aria-hidden />
                    </Link>
                    <Money amount={c.total_amount} className="shrink-0 lg:hidden" />
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                    <span>{role === 'client' ? 'Freelancer' : 'Client'} {other?.display_name ?? 'member'} · you are the {role}</span>
                    <ContractStatusMark status={c.status} />
                  </p>
                </div>
                <div className="min-w-0 space-y-1">
                  <EscrowRail segments={milestoneSegments(c.milestones)} size="sm" className="max-w-md" label={c.title} />
                  <p className="t-meta">{closed} of {c.milestones.length} milestones closed</p>
                </div>
                <div className="hidden text-right lg:block"><Money amount={c.total_amount} /></div>
                <div className="min-w-0 lg:text-right">
                  {actionable ? (
                    <Link href={target} className={cn('relative z-10 inline-flex max-w-full items-start gap-1.5 text-sm underline-offset-4 hover:underline', s.cls)}>
                      <s.Icon className="mt-1 size-3.5 shrink-0" aria-hidden />
                      <span className="line-clamp-2 text-left lg:text-right"><span className="sr-only">Next: </span>{a.title}</span>
                    </Link>
                  ) : (
                    <p className={cn('inline-flex max-w-full items-start gap-1.5 text-sm', s.cls)}>
                      <s.Icon className="mt-1 size-3.5 shrink-0" aria-hidden />
                      <span className="line-clamp-2 text-left lg:text-right"><span className="sr-only">Next: </span>{a.title}</span>
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </Ledger>
    </>
  );
}
