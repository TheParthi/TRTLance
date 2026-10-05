import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function PageHeader({ title, description, eyebrow, actions, breadcrumbs, meta, className }: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('mb-6 space-y-3 md:mb-8', className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow && <p className="t-eyebrow">{eyebrow}</p>}
          <h1 className="t-page-title break-words">{title}</h1>
          {description && <p className="max-w-reading text-sm text-ink-secondary md:text-base">{description}</p>}
          {meta && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm text-ink-secondary">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
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
