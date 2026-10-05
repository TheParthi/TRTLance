import Link from 'next/link';
import { cn } from '@/lib/utils';

/** A titled list separated by hairline rules — the default way to present a set of things. */
export function Ledger({ title, description, action, children, className, id, empty }: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  /** Shown instead of the list when there are no rows. */
  empty?: React.ReactNode;
}) {
  const headingId = id ? `${id}-title` : undefined;
  const hasRows = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  return (
    <section id={id} aria-labelledby={headingId} className={cn('space-y-3', className)}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 space-y-0.5">
            {title && <h2 id={headingId} className="t-section-title">{title}</h2>}
            {description && <p className="text-sm text-ink-secondary">{description}</p>}
          </div>
          {action && <div className="shrink-0 text-sm">{action}</div>}
        </div>
      )}
      {hasRows ? <ul className="ledger">{children}</ul> : empty}
    </section>
  );
}

/** One row of a ledger. With `href`, the whole row is a link (main slot holds the accessible name). */
export function LedgerRow({ href, lead, children, meta, trail, className, tone }: {
  href?: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
  meta?: React.ReactNode;
  trail?: React.ReactNode;
  className?: string;
  /** A coloured rule on the left for rows that need attention. */
  tone?: 'brand' | 'danger' | 'warning';
}) {
  const rule = tone && { brand: 'before:bg-brand', danger: 'before:bg-danger', warning: 'before:bg-warning' }[tone];
  const body = (
    <>
      {lead && <div className="shrink-0">{lead}</div>}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="min-w-0">{children}</div>
        {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">{meta}</div>}
      </div>
      {trail && <div className="shrink-0 sm:text-right">{trail}</div>}
    </>
  );
  const cls = cn(
    'ledger-row px-1',
    tone && 'pl-4 before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full',
    rule,
    className,
  );
  return (
    <li>
      {href ? (
        <Link href={href} className={cn(cls, 'ledger-row-link focus-visible:ring-inset')}>{body}</Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
