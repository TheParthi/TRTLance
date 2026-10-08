import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The console's table.
 *
 * A console is a working tool, so these are denser than anything in the member app: hairline rules,
 * a sticky header, and numbers right-aligned in a tabular font so a column of amounts can be scanned
 * down rather than read across. On a phone the same table scrolls sideways inside its own box rather
 * than reflowing into cards, because comparing rows is the whole point of it.
 */

export interface Column<T> {
  /** Column heading. Keep it to one or two words. */
  header: string;
  /** Right-align and use tabular figures: for anything counted or measured. */
  numeric?: boolean;
  /** Hide below this breakpoint when the table has more columns than a phone can show. */
  hideBelow?: 'sm' | 'md' | 'lg';
  className?: string;
  cell: (row: T) => React.ReactNode;
}

const hide = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' };

export function DataTable<T>({ columns, rows, rowKey, rowHref, empty, caption, className }: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Makes the whole row navigable; an arrow appears in a final column. */
  rowHref?: (row: T) => string;
  empty: React.ReactNode;
  /** Describes the table for screen readers. */
  caption: string;
  className?: string;
}) {
  if (!rows.length) return <>{empty}</>;
  return (
    <div className={cn('console-card-flush', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap border-b border-line bg-surface-subtle/40 px-4 py-2.5 text-left align-middle',
                    'text-2xs font-semibold uppercase tracking-[0.12em] text-ink-muted',
                    column.numeric && 'text-right',
                    column.hideBelow && hide[column.hideBelow],
                  )}
                >
                  {column.header}
                </th>
              ))}
              {rowHref && (
                <th scope="col" className="w-10 border-b border-line bg-surface-subtle/40">
                  <span className="sr-only">Open</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr key={rowKey(row)} className={cn('group', href && 'console-row')}>
                  {columns.map((column, i) => (
                    <td
                      key={column.header}
                      className={cn(
                        'border-b border-line px-4 py-3 align-middle',
                        column.numeric && 'text-right tabular-nums',
                        column.hideBelow && hide[column.hideBelow],
                        column.className,
                      )}
                    >
                      {/* The first cell carries the row link, so the row has one accessible name. */}
                      {href && i === 0 ? (
                        <Link href={href} className="block rounded focus-visible:ring-inset">
                          {column.cell(row)}
                        </Link>
                      ) : (
                        column.cell(row)
                      )}
                    </td>
                  ))}
                  {href && (
                    <td className="border-b border-line px-2 py-3 align-middle">
                      <ArrowRight className="row-arrow size-4 text-ink-muted" aria-hidden />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** A table cell's main line and a quieter second line beneath it, optionally behind an avatar. */
export function Cell({ title, meta, lead, className }: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** A small mark to the left — an avatar, a status dot. */
  lead?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {lead && <span className="shrink-0">{lead}</span>}
      <span className="min-w-0 space-y-0.5">
        <span className="block truncate font-medium text-ink">{title}</span>
        {meta && <span className="block truncate text-xs text-ink-muted">{meta}</span>}
      </span>
    </div>
  );
}

/**
 * A person, as a circle of initials.
 *
 * A table of names with no faces is slow to scan and cold to read; initials give each row an anchor
 * without needing an uploaded picture. The hue is derived from the id, so the same person is the
 * same colour everywhere in the console — it is a memory aid, never the only way to tell them apart.
 */
const AVATAR_TONES = [
  'bg-brand-soft text-brand-strong ring-brand/25',
  'bg-brass-soft text-brass-strong ring-brass/25',
  'bg-info-soft text-info-strong ring-info/25',
  'bg-success-soft text-success-strong ring-success/25',
  'bg-refund-soft text-refund-strong ring-refund/25',
];

export function Initials({ name, id, className }: { name: string; id: string; className?: string }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full text-2xs font-semibold ring-1 ring-inset',
        AVATAR_TONES[hash % AVATAR_TONES.length],
        className,
      )}
    >
      {initials}
    </span>
  );
}

/** Fixed-width text for ids, references and account numbers, so digits line up and copy cleanly. */
export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('font-mono text-xs tabular-nums text-ink-secondary', className)}>{children}</span>;
}
