import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/status';

/**
 * A headline figure.
 *
 * Not a chart: one number with a label is the right form when there is nothing to compare it
 * against over time. The second line is where context goes, in words — "+12 this week" means
 * something, a bare arrow does not.
 *
 * Each card carries a hairline of its tone along the top edge rather than a coloured background,
 * so a row of them stays calm and the figures, not the panels, are what the eye lands on.
 */

const RULES: Record<Tone, string> = {
  neutral: 'from-line-strong',
  brand: 'from-brand',
  info: 'from-info',
  warning: 'from-warning',
  success: 'from-success',
  danger: 'from-danger',
  refund: 'from-refund',
  brass: 'from-brass',
};

export function Stat({ label, value, unit, hint, tone = 'neutral', href, urgent, aside, className }: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
  /** Draws attention: for a queue with something waiting in it. */
  urgent?: boolean;
  /** A sparkline or small mark, shown to the right of the figure. */
  aside?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <span
        aria-hidden
        className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent', RULES[urgent ? 'warning' : tone])}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
          {label}
          {href && <ArrowUpRight className="size-3 -translate-x-0.5 opacity-0 transition-all duration-base ease-ledger group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />}
        </p>
        {urgent && (
          <span aria-hidden className="mt-0.5 size-1.5 shrink-0 rounded-full bg-warning shadow-[0_0_0_3px_hsl(var(--warning)/0.2)]" />
        )}
      </div>
      <p className="mt-3 flex items-end justify-between gap-3">
        <span className="flex items-baseline gap-1.5">
          <span className="console-figure">{value}</span>
          {unit && <span className="text-2xs font-medium uppercase tracking-[0.1em] text-ink-muted">{unit}</span>}
        </span>
        {aside && <span className="shrink-0 pb-0.5">{aside}</span>}
      </p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-ink-muted">{hint}</p>}
    </>
  );

  const shell = cn('console-card group relative overflow-hidden p-4', href && 'transition-colors duration-base ease-ledger hover:border-line-strong', className);
  return href ? <Link href={href} className={shell}>{body}</Link> : <div className={shell}>{body}</div>;
}

/** A row of stat cards. */
export function StatGrid({ children, columns = 4, className }: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 xl:grid-cols-4' };
  return <div className={cn('grid grid-cols-1 gap-3', cols[columns], className)}>{children}</div>;
}

/** A titled block of console content. */
export function Panel({ title, description, action, children, id, className, bare }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
  /** Lay the content out directly instead of inside a card (for a grid of its own cards). */
  bare?: boolean;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn('scroll-mt-24', className)}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 space-y-1">
          <h2 id={headingId} className="font-sans text-base font-semibold tracking-tight text-ink">{title}</h2>
          {description && <p className="max-w-[62ch] text-xs leading-relaxed text-ink-secondary">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {bare ? children : <div className="console-card p-4 md:p-5">{children}</div>}
    </section>
  );
}

/** Key/value facts in a tight column — the console's detail sheet. */
export function Facts({ items, className }: {
  items: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn('divide-y divide-line', className)}>
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-4 py-2.5 text-sm">
          <dt className="text-xs uppercase tracking-[0.06em] text-ink-muted">{item.label}</dt>
          <dd className="min-w-0 break-words text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
