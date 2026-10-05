import type { Metadata } from 'next';
import Link from 'next/link';
import { FileSignature } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Money } from '@/components/common/money';
import { PageHeader } from '@/components/common/page-header';
import { ContractStatusBadge } from '@/components/common/status-badge';
import { EmptyState } from '@/components/common/states';
import { Progress } from '@/components/ui/progress';
import { requireViewer } from '@/lib/auth';
import { listContracts } from '@/lib/data/contracts';
import { getMembers } from '@/lib/data/projects';
import { formatRelative } from '@/lib/format';
import { sumAmounts } from '@/lib/money';
import type { ContractStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Contracts' };

const FILTERS: { key: string; label: string; match: ContractStatus[] }[] = [
  { key: 'action', label: 'In progress', match: ['pending_signatures', 'awaiting_funding', 'active', 'disputed'] },
  { key: 'completed', label: 'Completed', match: ['completed'] },
  { key: 'cancelled', label: 'Cancelled', match: ['cancelled'] },
];

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const viewer = await requireViewer('/contracts');
  const { filter = 'action' } = await searchParams;
  const all = await listContracts();
  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const contracts = all.filter((c) => active.match.includes(c.status));
  const members = await getMembers(contracts.map((c) => (c.client_id === viewer.id ? c.freelancer_id : c.client_id)));

  return (
    <>
      <PageHeader title="Contracts" description="Every agreement you are part of, with its signing, funding and milestone status." />
      <nav aria-label="Contract filters" className="mb-6 flex gap-1 border-b">
        {FILTERS.map((f) => {
          const count = all.filter((c) => f.match.includes(c.status)).length;
          return (
            <Link key={f.key} href={`/contracts?filter=${f.key}`} aria-current={f.key === active.key ? 'page' : undefined}
              className={cn('-mb-px border-b-2 px-3 py-2 text-sm font-medium', f.key === active.key ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink')}>
              {f.label} <span className="text-ink-muted">({count})</span>
            </Link>
          );
        })}
      </nav>
      {contracts.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title={active.key === 'action' ? 'No contracts in progress' : `No ${active.label.toLowerCase()} contracts`}
          description="Contracts are created when a client hires a freelancer from a proposal."
          action={viewer.profile.intent === 'hire' ? { label: 'Post a project', href: '/projects/new' } : { label: 'Find work', href: '/work' }}
        />
      ) : (
        <ul className="space-y-3">
          {contracts.map((c) => {
            const role = c.client_id === viewer.id ? 'client' : 'freelancer';
            const other = members.get(role === 'client' ? c.freelancer_id : c.client_id);
            const released = sumAmounts(c.milestones.filter((m) => m.status === 'paid').map((m) => m.amount));
            const closed = c.milestones.filter((m) => ['paid', 'refunded', 'settled'].includes(m.status)).length;
            return (
              <li key={c.id}>
                <Link href={`/contracts/${c.id}`} className="panel grid gap-4 p-5 transition-shadow hover:shadow-md md:grid-cols-[1fr_12rem_10rem] md:items-center">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2"><ContractStatusBadge status={c.status} /><span className="t-meta">You are the {role}</span></div>
                    <p className="truncate font-semibold">{c.title}</p>
                    <p className="flex items-center gap-2 text-sm text-ink-secondary">
                      <Avatar name={other?.display_name ?? '?'} path={other?.avatar_path} size="xs" />
                      with {other?.display_name ?? 'member'} · updated {formatRelative(c.created_at)}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="t-meta">{closed} of {c.milestones.length} milestones closed</p>
                    <Progress value={closed} max={Math.max(1, c.milestones.length)} label={`${closed} of ${c.milestones.length} milestones closed`} />
                  </div>
                  <div className="md:text-right">
                    <Money amount={c.total_amount} size="lg" />
                    <p className="t-meta"><Money amount={released} size="sm" muted /> released</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
