import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pages a list without JavaScript: two links and a count of what you are looking at.
 *
 * The count is the number the database reported for the whole filtered set, not the length of this
 * page, so "26–50 of 318" is true even though only 25 rows were fetched.
 */
export function Pagination({ total, page, perPage, params, className }: {
  total: number;
  /** One-based. */
  page: number;
  perPage: number;
  /** The current search parameters, so a page link keeps every active filter. */
  params: Record<string, string | undefined>;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (total === 0) return null;

  const href = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== 'page') next.set(key, value);
    }
    if (target > 1) next.set('page', String(target));
    const query = next.toString();
    return query ? `?${query}` : '?';
  };

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);
  const link = 'inline-flex h-9 items-center gap-1 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink-secondary transition-colors duration-base ease-ledger hover:border-line-strong hover:bg-surface-subtle hover:text-ink';
  const off = 'pointer-events-none opacity-40';

  return (
    <nav aria-label="Pages" className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-xs text-ink-muted">
        <span className="tabular-nums">{first}–{last}</span> of <span className="tabular-nums font-medium text-ink-secondary">{total.toLocaleString('en-IN')}</span>
        {pages > 1 && <> · page <span className="tabular-nums">{page}</span> of <span className="tabular-nums">{pages}</span></>}
      </p>
      {pages > 1 && (
        <div className="flex gap-2">
          <Link href={href(page - 1)} aria-disabled={page <= 1} className={cn(link, page <= 1 && off)} rel="prev">
            <ChevronLeft className="size-4" aria-hidden /> Previous
          </Link>
          <Link href={href(page + 1)} aria-disabled={page >= pages} className={cn(link, page >= pages && off)} rel="next">
            Next <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
    </nav>
  );
}

/** Reads a one-based page number out of a search parameter, ignoring nonsense. */
export function pageFrom(value: string | undefined, perPage: number) {
  const page = Math.max(1, Math.floor(Number(value) || 1));
  return { page, offset: (page - 1) * perPage };
}
