import type { Metadata } from 'next';
import Link from 'next/link';
import { Ban, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/components/common/money';
import { ConsoleEmpty, ConsoleHeader } from '@/components/admin/console-shell';
import { FilterBar } from '@/components/admin/filters';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Cell, DataTable, Mono, type Column } from '@/components/admin/table';
import { getAdminProjects, type AdminProjectRow } from '@/lib/data/admin';
import { formatDate } from '@/lib/format';
import { projectStatus } from '@/lib/status';
import { ModerateProject } from './moderate';

export const metadata: Metadata = { title: 'Projects' };

const PER_PAGE = 25;

const STATUSES = [
  { value: 'all', label: 'Any status' },
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_contract', label: 'Hired' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Closed' },
];

const MODERATION = [
  { value: 'all', label: 'Any' },
  { value: 'ok', label: 'Nothing noted' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'removed', label: 'Removed' },
];

type Search = { q?: string; status?: string; moderation?: string; page?: string };

/**
 * Moderation. Every brief on the platform, with the decision available on the row itself.
 */
export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { page, offset } = pageFrom(params.page, PER_PAGE);
  const status = STATUSES.find((s) => s.value === params.status)?.value ?? 'all';
  const moderation = MODERATION.find((m) => m.value === params.moderation)?.value ?? 'all';

  const { rows, total } = await getAdminProjects({ query: params.q, status, moderation, limit: PER_PAGE, offset });

  const columns: Column<AdminProjectRow>[] = [
    {
      header: 'Project',
      cell: (p) => (
        <Cell
          title={
            <span className="flex items-center gap-1.5">
              <span className="truncate">{p.title}</span>
              {p.moderation_state === 'flagged' && <Badge tone="warning">Flagged</Badge>}
              {p.moderation_state === 'removed' && <Badge tone="danger">Removed</Badge>}
            </span>
          }
          meta={p.moderation_reason ?? <>{p.category ?? 'No category'} · {p.visibility}</>}
        />
      ),
    },
    {
      header: 'Client',
      hideBelow: 'md',
      cell: (p) => (
        <Link href={`/admin/members/${p.client_id}`} className="group block min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-ink group-hover:text-brand">{p.client_name}</span>
            {p.client_suspended && <Badge tone="danger"><Ban /> Suspended</Badge>}
          </span>
          <span className="block truncate t-meta">@{p.client_username}</span>
        </Link>
      ),
    },
    { header: 'Status', hideBelow: 'sm', cell: (p) => <Badge tone={projectStatus[p.status as keyof typeof projectStatus]?.tone ?? 'neutral'}>{projectStatus[p.status as keyof typeof projectStatus]?.label ?? p.status}</Badge> },
    { header: 'Budget', numeric: true, hideBelow: 'lg', cell: (p) => <Money amount={p.budget_amount} size="sm" muted /> },
    { header: 'Proposals', numeric: true, hideBelow: 'lg', cell: (p) => p.proposal_count },
    { header: 'Posted', numeric: true, hideBelow: 'md', cell: (p) => <Mono>{formatDate(p.published_at ?? p.created_at)}</Mono> },
    {
      header: 'Open',
      className: 'w-10',
      cell: (p) => (
        <Link href={`/projects/${p.id}`} aria-label={`Open ${p.title} on the site`} className="inline-flex p-1 text-ink-muted hover:text-ink">
          <ExternalLink className="size-4" aria-hidden />
        </Link>
      ),
    },
    {
      header: 'Moderate',
      className: 'w-px',
      cell: (p) => <ModerateProject projectId={p.id} title={p.title} state={p.moderation_state} />,
    },
  ];

  return (
    <>
      <ConsoleHeader
        title="Projects"
        description="Every brief posted. Flagging leaves a project in the marketplace with a note to its client; removing takes it out of search and lists for everyone except the client, the hired freelancer and admins."
      />

      <div className="space-y-6">
        <FilterBar
          searchLabel="Search titles and descriptions"
          selects={[
            { name: 'status', label: 'Status', options: STATUSES },
            { name: 'moderation', label: 'Moderation', options: MODERATION },
          ]}
        />

        <DataTable
          caption="Projects, with their client, status and moderation state"
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          empty={
            <ConsoleEmpty
              title={params.q ? `No project matches “${params.q}”` : 'No projects match this filter'}
              description={params.q ? 'The search looks through titles and descriptions.' : 'Change the filters to see more.'}
            />
          }
        />

        <Pagination total={total} page={page} perPage={PER_PAGE} params={params} />
      </div>
    </>
  );
}
