import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/status';

/**
 * A headline number.
 *
 * Not a chart: one number with a label is the right form when there is nothing to compare it
 * against over time. The optional second line is where the context goes, in words, because "+12
 * this week" means something and a bare arrow does not.
 */
export function Stat({ label, value, unit, hint, tone, href, urgent, className }: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
  /** Draws attention: for a queue with something waiting in it. */
  urgent?: boolean;
  className?: string;
}) {
  const rule = tone && {
    neutral: 'before:bg-line-strong', brand: 'before:bg-brand', info: 'before:bg-info',
    warning: 'before:bg-warning', success: 'before:bg-success', danger: 'before:bg-danger',
    refund: 'before:bg-refund', brass: 'before:bg-brass',
  }[tone];

  const body = (
    <>
      <p className="flex items-center gap-1 t-label-caps">
        {label}
        {href && <ArrowUpRight className="row-arrow size-3" aria-hidden />}
      </p>
      <p className="flex items-baseline gap-1.5">
        <span className={cn('t-money text-3xl leading-none', urgent ? 'text-ink' : 'text-ink')}>{value}</span>
        {unit && <span className="text-2xs font-medium uppercase tracking-[0.08em] text-ink-muted">{unit}</span>}
      </p>
      {hint && <p className="t-meta">{hint}</p>}
    </>
  );

  const shell = cn(
    'group relative block space-y-1.5 pl-3.5',
    'before:absolute before:inset-y-0.5 before:left-0 before:w-0.5 before:rounded-full before:bg-line',
    rule,
    urgent && 'before:bg-warning',
    href && 'transition-opacity duration-base ease-ledger hover:opacity-80',
    className,
  );

  return href ? <Link href={href} className={shell}>{body}</Link> : <div className={shell}>{body}</div>;
}

/**
 * A grid of stats separated by hairlines rather than boxed into cards — the same language the rest
 * of the product uses for a set of related figures.
 */
export function StatGrid({ children, columns = 4, className }: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' };
  return (
    <div className={cn('grid grid-cols-1 gap-x-8 gap-y-7 border-y py-6', cols[columns], className)}>
      {children}
    </div>
  );
}

/** A titled block of console content, separated by a rule instead of a card. */
export function Panel({ title, description, action, children, id, className }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn('space-y-4 scroll-mt-24', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b pb-2">
        <div className="min-w-0 space-y-0.5">
          <h2 id={headingId} className="t-section-title">{title}</h2>
          {description && <p className="max-w-reading text-sm text-ink-secondary">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** Key/value facts in a tight column — the console's version of a detail sheet. */
export function Facts({ items, className }: {
  items: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn('divide-y', className)}>
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 py-2 text-sm">
          <dt className="text-ink-muted">{item.label}</dt>
          <dd className="min-w-0 break-words text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
