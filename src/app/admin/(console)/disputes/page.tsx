import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/common/money';
import { ConsoleEmpty, ConsoleHeader } from '@/components/admin/console-shell';
import { FilterBar } from '@/components/admin/filters';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Cell, DataTable, Mono, type Column } from '@/components/admin/table';
import { getAdminDisputes, type AdminDisputeRow } from '@/lib/data/admin';
import { disputeNumber, formatDate } from '@/lib/format';
import { disputeReasonLabel, disputeStatus, settlementStatus } from '@/lib/status';
import type { DisputeStatus, SettlementStatus } from '@/lib/types';

export const metadata: Metadata = { title: 'Disputes' };

const PER_PAGE = 25;

const STATUSES = [
  { value: 'all', label: 'Every case' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'live', label: 'Not yet resolved' },
  { value: 'open', label: 'Waiting for an arbitrator' },
  { value: 'awaiting_evidence', label: 'Collecting evidence' },
  { value: 'under_review', label: 'Under review' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'resolved', label: 'Resolved' },
];

type Search = { status?: string; page?: string };

const DECISIONS: Record<string, string> = {
  freelancer: 'For the freelancer',
  client: 'For the client',
  partial: 'Split',
};

/**
 * Every case on the platform. Assigning and deciding happen in the queues and the case room; this is
 * where you find a case, see who has it, and check how it was settled.
 */
export default async function DisputesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { page, offset } = pageFrom(params.page, PER_PAGE);
  const status = STATUSES.find((s) => s.value === params.status)?.value ?? 'all';

  const { rows, total } = await getAdminDisputes({ status, limit: PER_PAGE, offset });

  const columns: Column<AdminDisputeRow>[] = [
    {
      header: 'Case',
      cell: (d) => (
        <Cell
          title={<span className="flex items-center gap-2"><Mono>{disputeNumber(d.number)}</Mono><span className="truncate">{d.contract_title}</span></span>}
          meta={<>Milestone {d.milestone_position ?? '—'} · {disputeReasonLabel[d.reason as keyof typeof disputeReasonLabel] ?? d.reason}</>}
        />
      ),
    },
    {
      header: 'Parties',
      hideBelow: 'md',
      cell: (d) => (
        <div className="min-w-0 space-y-0.5">
          <span className="block truncate">{d.client_name} <span className="t-meta">client</span></span>
          <span className="block truncate">{d.freelancer_name} <span className="t-meta">freelancer</span></span>
        </div>
      ),
    },
    {
      header: 'Status',
      hideBelow: 'sm',
      cell: (d) => (
        <span className="flex flex-col items-start gap-1">
          <Badge tone={disputeStatus[d.status as DisputeStatus]?.tone ?? 'neutral'}>
            {disputeStatus[d.status as DisputeStatus]?.label ?? d.status}
          </Badge>
          {d.status === 'resolved' && (
            <Badge tone={settlementStatus[d.settlement_status as SettlementStatus]?.tone ?? 'neutral'}>
              {settlementStatus[d.settlement_status as SettlementStatus]?.label ?? d.settlement_status}
            </Badge>
          )}
        </span>
      ),
    },
    {
      header: 'Arbitrator',
      hideBelow: 'lg',
      cell: (d) => (d.arbitrator_id
        ? <Link href={`/admin/members/${d.arbitrator_id}`} className="truncate text-ink hover:text-brand">{d.arbitrator_name}</Link>
        : <span className="font-medium text-warning-strong">not assigned</span>),
    },
    {
      header: 'Decision',
      hideBelow: 'lg',
      cell: (d) => (d.decision
        ? <span>{DECISIONS[d.decision] ?? d.decision}{d.decision === 'partial' && d.freelancer_pct !== null ? ` (${d.freelancer_pct}%)` : ''}</span>
        : <span className="text-ink-muted">—</span>),
    },
    { header: 'Amount', numeric: true, cell: (d) => <Money amount={d.amount} size="sm" /> },
    { header: 'Opened', numeric: true, hideBelow: 'md', cell: (d) => <Mono>{formatDate(d.created_at)}</Mono> },
  ];

  return (
    <>
      <ConsoleHeader
        title="Disputes"
        description="Every case, who is deciding it, and how it was settled. Assign an arbitrator from the queues; decide a case in its case room."
      />

      <div className="space-y-6">
        <FilterBar selects={[{ name: 'status', label: 'Show', options: STATUSES }]} />

        <DataTable
          caption="Disputes, with their parties, arbitrator and decision"
          columns={columns}
          rows={rows}
          rowKey={(d) => d.id}
          rowHref={(d) => `/arbitration/cases/${d.id}`}
          empty={<ConsoleEmpty title="No cases match this filter" description="Disputes opened on any contract appear here." />}
        />

        <Pagination total={total} page={page} perPage={PER_PAGE} params={params} />
      </div>
    </>
  );
}
