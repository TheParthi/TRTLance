import type { Metadata } from 'next';
import { Ban, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ConsoleEmpty, ConsoleHeader } from '@/components/admin/console-shell';
import { FilterBar } from '@/components/admin/filters';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Cell, DataTable, Initials, Mono, type Column } from '@/components/admin/table';
import { getMembers, type MemberFilter, type MemberRow, type MemberSort } from '@/lib/data/admin';
import { formatDate } from '@/lib/format';
import { formatAmount } from '@/lib/money';

export const metadata: Metadata = { title: 'Members' };

const PER_PAGE = 25;

const FILTERS: { value: MemberFilter; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'new', label: 'Joined this week' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'admins', label: 'Admins' },
  { value: 'arbitrators', label: 'Arbitrators' },
  { value: 'unonboarded', label: 'Not finished onboarding' },
];

const SORTS: { value: MemberSort; label: string }[] = [
  { value: 'recent', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'By name' },
];

type Search = { q?: string; filter?: string; sort?: string; page?: string };

/**
 * Everyone on TrustLance.
 *
 * Searching accepts a name, a username or a raw account id, because support work usually starts with
 * whichever of those came in on the ticket. The filters and the page live in the URL, so a filtered
 * view can be shared with a colleague and still be the same view when they open it.
 */
export default async function MembersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { page, offset } = pageFrom(params.page, PER_PAGE);
  const filter = (FILTERS.find((f) => f.value === params.filter)?.value ?? 'all') as MemberFilter;
  const sort = (SORTS.find((s) => s.value === params.sort)?.value ?? 'recent') as MemberSort;

  const { rows, total } = await getMembers({ query: params.q, filter, sort, limit: PER_PAGE, offset });

  const columns: Column<MemberRow>[] = [
    {
      header: 'Member',
      cell: (m) => (
        <Cell
          lead={<Initials name={m.display_name} id={m.id} />}
          title={
            <span className="flex items-center gap-1.5">
              <span className="truncate">{m.display_name}</span>
              {m.is_admin && <Badge tone="brass"><ShieldCheck /> Admin</Badge>}
              {m.suspended_at && <Badge tone="danger"><Ban /> Suspended</Badge>}
            </span>
          }
          meta={<>@{m.username}{m.headline ? ` · ${m.headline}` : ''}</>}
        />
      ),
    },
    {
      header: 'Verified',
      hideBelow: 'md',
      cell: (m) => (
        <span className="flex flex-wrap gap-1">
          {m.email_verified ? <Badge tone="success">Email</Badge> : <Badge>No email</Badge>}
          {m.identity_verified && <Badge tone="brand">Bank</Badge>}
          {m.arbitrator_status === 'approved' && <Badge tone="brass">Arbitrator</Badge>}
        </span>
      ),
    },
    { header: 'Intent', hideBelow: 'lg', cell: (m) => <span className="text-ink-secondary">{{ hire: 'Hiring', work: 'Working', both: 'Both' }[m.intent]}</span> },
    { header: 'Contracts', numeric: true, hideBelow: 'sm', cell: (m) => m.contracts.toLocaleString('en-IN') },
    {
      header: 'Disputes',
      numeric: true,
      hideBelow: 'lg',
      cell: (m) => (m.open_disputes > 0 ? <span className="font-medium text-danger-strong">{m.open_disputes}</span> : <span className="text-ink-muted">—</span>),
    },
    {
      header: 'Coins',
      numeric: true,
      hideBelow: 'md',
      cell: (m) => (
        <span className="space-y-0.5">
          <span className="block">{formatAmount(m.wallet + m.pending + m.earnings, { symbol: false })}</span>
          <span className="block t-meta">{formatAmount(m.earnings, { symbol: false })} withdrawable</span>
        </span>
      ),
    },
    { header: 'Joined', numeric: true, hideBelow: 'sm', cell: (m) => <Mono>{formatDate(m.created_at)}</Mono> },
  ];

  const suspended = rows.filter((m) => m.suspended_at).length;

  return (
    <>
      <ConsoleHeader
        title="Members"
        description="Find an account, read its history, and suspend or reinstate it. A suspended member can still sign in and read their account, but cannot post, propose, sign, fund or withdraw."
        meta={
          <>
            <span><span className="font-medium text-ink tabular-nums">{total.toLocaleString('en-IN')}</span> matching</span>
            {suspended > 0 && <span className="text-danger-strong"><span className="font-medium tabular-nums">{suspended}</span> suspended on this page</span>}
          </>
        }
      />

      <div className="space-y-4">
        <FilterBar
          searchLabel="Search by name, username or account id"
          selects={[
            { name: 'filter', label: 'Show', options: FILTERS },
            { name: 'sort', label: 'Order', options: SORTS },
          ]}
        />

        <DataTable
          caption="Members, with their verification, contracts and coin balances"
          columns={columns}
          rows={rows}
          rowKey={(m) => m.id}
          rowHref={(m) => `/admin/members/${m.id}`}
          empty={
            <ConsoleEmpty
              title={params.q ? `Nobody matches “${params.q}”` : 'No members match this filter'}
              description={params.q
                ? 'Try a username without the @, or paste the account id from the ticket.'
                : 'Change the filter to see more.'}
            />
          }
        />

        <Pagination total={total} page={page} perPage={PER_PAGE} params={params} />
      </div>
    </>
  );
}
