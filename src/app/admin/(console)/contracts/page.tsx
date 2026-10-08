import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/common/money';
import { ConsoleEmpty, ConsoleHeader } from '@/components/admin/console-shell';
import { FilterBar } from '@/components/admin/filters';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Cell, DataTable, Mono, type Column } from '@/components/admin/table';
import { getAdminContracts, type AdminContractRow } from '@/lib/data/admin';
import { formatDate } from '@/lib/format';
import { feePercent, formatAmount } from '@/lib/money';
import { contractStatus } from '@/lib/status';

export const metadata: Metadata = { title: 'Contracts' };

const PER_PAGE = 25;

const STATUSES = [
  { value: 'all', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'pending_signatures', label: 'Awaiting signatures' },
  { value: 'awaiting_funding', label: 'Awaiting funding' },
  { value: 'disputed', label: 'In dispute' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

type Search = { q?: string; status?: string; page?: string };

/**
 * Every contract, with the number that matters most on each row: how much is still locked in its
 * escrow. The console cannot change a contract — releasing, refunding and settling are the parties'
 * and the arbitrator's decisions, enforced in the database — so this is a reading surface.
 */
export default async function ContractsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { page, offset } = pageFrom(params.page, PER_PAGE);
  const status = STATUSES.find((s) => s.value === params.status)?.value ?? 'all';

  const { rows, total } = await getAdminContracts({ query: params.q, status, limit: PER_PAGE, offset });
  const escrowOnPage = rows.reduce((sum, c) => sum + c.escrow, 0);

  const columns: Column<AdminContractRow>[] = [
    {
      header: 'Contract',
      cell: (c) => (
        <Cell
          title={
            <span className="flex items-center gap-1.5">
              <span className="truncate">{c.title}</span>
              {c.open_disputes > 0 && <Badge tone="danger">{c.open_disputes} dispute{c.open_disputes === 1 ? '' : 's'}</Badge>}
            </span>
          }
          meta={<>{c.paid_milestones} of {c.milestones} milestones paid · {feePercent(c.fee_bps)} fee</>}
        />
      ),
    },
    {
      header: 'Parties',
      hideBelow: 'md',
      cell: (c) => (
        <div className="min-w-0 space-y-0.5">
          <Link href={`/admin/members/${c.client_id}`} className="block truncate text-ink hover:text-brand">{c.client_name} <span className="t-meta">client</span></Link>
          <Link href={`/admin/members/${c.freelancer_id}`} className="block truncate text-ink hover:text-brand">{c.freelancer_name} <span className="t-meta">freelancer</span></Link>
        </div>
      ),
    },
    { header: 'Status', hideBelow: 'sm', cell: (c) => <Badge tone={contractStatus[c.status]?.tone ?? 'neutral'}>{contractStatus[c.status]?.label ?? c.status}</Badge> },
    { header: 'Value', numeric: true, cell: (c) => <Money amount={c.total_amount} size="sm" /> },
    {
      header: 'In escrow',
      numeric: true,
      cell: (c) => (c.escrow > 0
        ? <span className="t-money text-brand">{formatAmount(c.escrow, { symbol: false })}</span>
        : <span className="text-ink-muted">—</span>),
    },
    { header: 'Started', numeric: true, hideBelow: 'lg', cell: (c) => <Mono>{formatDate(c.funded_at ?? c.created_at)}</Mono> },
  ];

  return (
    <>
      <ConsoleHeader
        title="Contracts"
        description="Every contract and how much of it is still locked in escrow. Nothing here can be changed from the console — releasing, refunding and settling belong to the parties and the arbitrator."
        meta={escrowOnPage > 0 && <span>{formatAmount(escrowOnPage)} locked across the contracts on this page</span>}
      />

      <div className="space-y-6">
        <FilterBar
          searchLabel="Search titles, or paste a contract id"
          selects={[{ name: 'status', label: 'Status', options: STATUSES }]}
        />

        <DataTable
          caption="Contracts, with their parties, value and escrow balance"
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          rowHref={(c) => `/admin/contracts/${c.id}`}
          empty={
            <ConsoleEmpty
              title={params.q ? `No contract matches “${params.q}”` : 'No contracts match this filter'}
              description={params.q ? 'The search looks through titles, and accepts a contract id.' : 'Change the filter to see more.'}
            />
          }
        />

        <Pagination total={total} page={page} perPage={PER_PAGE} params={params} />
      </div>
    </>
  );
}
