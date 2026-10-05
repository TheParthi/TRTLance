import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LedgerField } from '@/components/marketing/ledger-field';
import { SplitWords } from '@/components/marketing/reveal';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-muted">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="hover:text-ink hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink-secondary">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * The stage every page opens with: a full-bleed band of moving ledger lines, a large serif title whose
 * words rise in, and an optional `aside` (the escrow ring where the page is about money).
 * `bleed={false}` keeps it inside a narrow page column.
 */
export function PageHeader({ title, description, eyebrow, actions, breadcrumbs, meta, className, aside, bleed = true }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  meta?: React.ReactNode;
  className?: string;
  aside?: React.ReactNode;
  bleed?: boolean;
}) {
  return (
    <header
      className={cn(
        'relative mb-8 md:mb-12',
        bleed && 'mx-[calc(50%-50vw)] -mt-6 overflow-hidden border-b md:-mt-10',
        className,
      )}
    >
      {bleed && <LedgerField density={18} pulses={2} className="opacity-60 [mask-image:linear-gradient(to_bottom,black_15%,transparent_95%)]" />}
      <div className={cn('relative', bleed && 'mx-auto max-w-content px-4 pb-10 pt-8 md:px-6 md:pb-14 md:pt-12')}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className={cn('grid gap-8 lg:grid-cols-12 lg:items-center', breadcrumbs && 'mt-6')}>
          <div className={cn('min-w-0 space-y-5', aside ? 'lg:col-span-7' : 'lg:col-span-10')}>
            {eyebrow && <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{eyebrow}</p>}
            <h1 className="break-words font-display text-[clamp(2.6rem,5.8vw,5.25rem)] font-medium leading-[0.95] tracking-[-0.04em]">
              {typeof title === 'string' ? <SplitWords text={title} immediate stagger={45} /> : title}
            </h1>
            {description && <p className="max-w-xl text-base text-ink-secondary md:text-lg">{description}</p>}
            {meta && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-secondary">{meta}</div>}
            {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
          </div>
          {aside && <div className="order-first lg:order-none lg:col-span-5">{aside}</div>}
        </div>
      </div>
    </header>
  );
}

export function Section({ title, description, action, children, className, id }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section className={cn('space-y-4', className)} aria-labelledby={headingId} id={id}>
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-0.5">
          <h2 id={headingId} className="t-section-title">{title}</h2>
          {description && <p className="text-sm text-ink-secondary">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Key/value facts, two columns on wide screens. */
export function Facts({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2', className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-0.5">
          <dt className="t-eyebrow">{item.label}</dt>
          <dd className="break-words text-sm text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
