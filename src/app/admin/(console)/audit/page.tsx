import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Callout } from '@/components/ui/callout';
import { ConsoleEmpty, ConsoleHeader } from '@/components/admin/console-shell';
import { FilterBar } from '@/components/admin/filters';
import { Pagination, pageFrom } from '@/components/admin/pagination';
import { Cell, DataTable, Mono, type Column } from '@/components/admin/table';
import { getAuditTrail, type AuditEntry } from '@/lib/data/admin';
import { formatDateTime, formatRelative } from '@/lib/format';

export const metadata: Metadata = { title: 'Audit trail' };

const PER_PAGE = 50;

const ACTIONS = [
  { value: '', label: 'Everything' },
  { value: 'console.unsealed', label: 'Console unsealed' },
  { value: 'member.suspended', label: 'Member suspended' },
  { value: 'member.reinstated', label: 'Member reinstated' },
  { value: 'admin.granted', label: 'Admin role granted' },
  { value: 'admin.revoked', label: 'Admin role removed' },
  { value: 'project.moderated', label: 'Project moderated' },
  { value: 'setting.changed', label: 'Setting changed' },
  { value: 'holiday.set', label: 'Holiday added' },
  { value: 'holiday.removed', label: 'Holiday removed' },
];

const SUBJECTS = [
  { value: '', label: 'Anything' },
  { value: 'member', label: 'Members' },
  { value: 'project', label: 'Projects' },
  { value: 'setting', label: 'Settings' },
  { value: 'holiday', label: 'Holidays' },
  { value: 'console', label: 'The console' },
];

const TONES: Record<string, 'danger' | 'warning' | 'success' | 'brass' | 'neutral'> = {
  'member.suspended': 'danger',
  'admin.revoked': 'danger',
  'member.reinstated': 'success',
  'admin.granted': 'brass',
  'project.moderated': 'warning',
  'setting.changed': 'warning',
};

type Search = { action?: string; subject?: string; page?: string };

/**
 * What the platform team has done.
 *
 * The table is append-only in the database — a trigger refuses any update or delete, including from
 * the database owner — so this is a record rather than a log that can be tidied up. Each row says
 * who, what, when and, where it matters, the reason they gave and the value they replaced.
 */
export default async function AuditPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { page, offset } = pageFrom(params.page, PER_PAGE);
  const action = ACTIONS.find((a) => a.value === params.action)?.value ?? '';
  const subject = SUBJECTS.find((s) => s.value === params.subject)?.value ?? '';

  const { rows, total } = await getAuditTrail({ action, subjectType: subject, limit: PER_PAGE, offset });

  const describe = (entry: AuditEntry) => {
    const d = entry.detail;
    if (entry.action === 'setting.changed') return `${entry.subject_id}: ${d.from} → ${d.to}`;
    if (entry.action === 'project.moderated') return `${d.title ?? 'a project'}: ${d.from} → ${d.to}${d.reason ? ` — “${d.reason}”` : ''}`;
    if (entry.action === 'console.unsealed') return [d.ip, d.user_agent].filter(Boolean).join(' · ') || 'no request details';
    if (typeof d.reason === 'string') return `${d.name ?? ''} — “${d.reason}”`.trim();
    if (typeof d.note === 'string' && d.note) return `${d.name ?? ''} — “${d.note}”`.trim();
    if (typeof d.label === 'string') return d.label;
    if (typeof d.name === 'string') return d.name;
    return '';
  };

  const subjectHref = (entry: AuditEntry) => {
    if (!entry.subject_id) return undefined;
    if (entry.subject_type === 'member') return `/admin/members/${entry.subject_id}`;
    if (entry.subject_type === 'project') return `/admin/projects?q=${entry.subject_id}`;
    return undefined;
  };

  const columns: Column<AuditEntry>[] = [
    {
      header: 'What',
      cell: (entry) => (
        <Cell
          title={
            <Badge tone={TONES[entry.action] ?? 'neutral'}>
              {ACTIONS.find((a) => a.value === entry.action)?.label ?? entry.action.replace(/[._]/g, ' ')}
            </Badge>
          }
          meta={describe(entry)}
        />
      ),
    },
    {
      header: 'Who',
      hideBelow: 'sm',
      cell: (entry) => (
        <Link href={`/admin/members/${entry.actor_id}`} className="group block min-w-0">
          <span className="block truncate text-ink group-hover:text-brand">{entry.actor_name}</span>
          <span className="block truncate t-meta">@{entry.actor_username}</span>
        </Link>
      ),
    },
    {
      header: 'Subject',
      hideBelow: 'lg',
      cell: (entry) => {
        const href = subjectHref(entry);
        const id = entry.subject_id ? <Mono>{entry.subject_id.slice(0, 8)}</Mono> : <span className="text-ink-muted">—</span>;
        return (
          <span className="space-y-0.5">
            <span className="block capitalize text-ink-secondary">{entry.subject_type}</span>
            <span className="block">{href ? <Link href={href} className="hover:text-brand">{id}</Link> : id}</span>
          </span>
        );
      },
    },
    {
      header: 'When',
      numeric: true,
      cell: (entry) => (
        <span className="space-y-0.5 text-right">
          <Mono className="block">{formatDateTime(entry.created_at)}</Mono>
          <span className="block t-meta">{formatRelative(entry.created_at)}</span>
        </span>
      ),
    },
  ];

  return (
    <>
      <ConsoleHeader
        title="Audit trail"
        description="Every change an admin has made, in order, with who made it and why."
      />

      <div className="space-y-6">
        <Callout tone="secure" title="This record cannot be edited">
          The audit table is append-only in the database: a trigger refuses any update or delete,
          including from the database owner. Nothing here can be tidied up after the fact.
        </Callout>

        <FilterBar
          selects={[
            { name: 'action', label: 'Action', options: ACTIONS },
            { name: 'subject', label: 'Subject', options: SUBJECTS },
          ]}
        />

        <DataTable
          caption="Admin actions, with the admin who made each one and when"
          columns={columns}
          rows={rows}
          rowKey={(entry) => String(entry.id)}
          empty={<ConsoleEmpty title="Nothing recorded yet" description="Admin actions appear here as they happen." />}
        />

        <Pagination total={total} page={page} perPage={PER_PAGE} params={params} />
      </div>
    </>
  );
}
