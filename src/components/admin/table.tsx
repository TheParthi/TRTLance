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
    <div className={cn('-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={cn(
                  'sticky top-0 z-10 border-b bg-canvas/95 px-3 py-2 text-left align-bottom backdrop-blur',
                  't-label-caps',
                  column.numeric && 'text-right',
                  column.hideBelow && hide[column.hideBelow],
                )}
              >
                {column.header}
              </th>
            ))}
            {rowHref && <th scope="col" className="sticky top-0 z-10 w-8 border-b bg-canvas/95 backdrop-blur"><span className="sr-only">Open</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr key={rowKey(row)} className={cn('group border-b', href && 'transition-colors duration-base ease-ledger hover:bg-surface-subtle/70')}>
                {columns.map((column, i) => (
                  <td
                    key={column.header}
                    className={cn(
                      'border-b px-3 py-2.5 align-top',
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
                  <td className="border-b px-2 py-2.5 align-middle">
                    <ArrowRight className="row-arrow size-4 text-ink-muted" aria-hidden />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A table cell's main line and a quieter second line beneath it. */
export function Cell({ title, meta, className }: { title: React.ReactNode; meta?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 space-y-0.5', className)}>
      <div className="truncate font-medium text-ink">{title}</div>
      {meta && <div className="truncate t-meta">{meta}</div>}
    </div>
  );
}

/** Fixed-width text for ids, references and account numbers, so digits line up and copy cleanly. */
export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('font-mono text-xs tabular-nums text-ink-secondary', className)}>{children}</span>;
}
